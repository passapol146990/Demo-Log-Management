terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "aws" {
  region = var.region
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "demo-log-management-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["us-east-1a", "us-east-1b", "us-east-1c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  enable_vpn_gateway = true

  tags = {
    Project     = "demo-log-management"
    Environment = var.environment
  }
}

module "opensearch" {
  source  = "terraform-aws-modules/elasticsearch/aws"
  version = ">= 2.0, < 4.0"

  domain_name = var.domain_name

  domain_endpoint_options = {
    enforce_https = true
  }

  vpc_options = {
    security_group_ids = [module.vpc.default_security_group_id]
    subnet_ids         = module.vpc.private_subnets
  }

  ebs_options = {
    ebs_enabled = true
    volume_size = 100
    volume_type = "gp3"
  }

  advanced_security_options = {
    enabled                        = true
    internal_user_database_enabled = true
    saml_enabled                   = false
  }

  tags = {
    Project     = "demo-log-management"
    Environment = var.environment
  }
}

module "redis" {
  source  = "terraform-aws-modules/elasticache/aws"
  version = "~> 3.0"

  name = "demo-log-management-redis"

  subnet_ids = module.vpc.private_subnets

  security_group_ids = [module.vpc.default_security_group_id]

  family = "redis6.x"
  instance_class = "cache.t3.micro"
  at_rest_encryption_enabled = true

  tags = {
    Project     = "demo-log-management"
    Environment = var.environment
  }
}

module "nextjs" {
  source  = "terraform-aws-modules/ec2/aws"
  version = "~> 5.0"

  name                       = "backend-server"
  ami                        = "ami-0c55b159cbfafe1f0"
  instance_type              = var.instance_type
  vpc_security_group_ids     = [module.vpc.default_security_group_id]
  subnet_id                  = module.vpc.public_subnets[0]

  iam_instance_profile = aws_iam_instance_profile.backend_instance_profile.name

  tags = {
    Project     = "demo-log-management"
    Environment = var.environment
  }
}

module "vector" {
  source  = "terraform-aws-modules/ec2/aws"
  version = "~> 5.0"

  name                       = "vector-agent"
  ami                        = "ami-0c55b159cbfafe1f0"
  instance_type              = "t3.micro"
  vpc_security_group_ids     = [module.vpc.default_security_group_id]
  subnet_id                  = module.vpc.private_subnets[0]

  tags = {
    Project     = "demo-log-management"
    Environment = var.environment
  }
}

resource "aws_cognito_user_pool" "os_user_pool" {
  name = "${var.domain_name}-users"

  auto_verified_attributes = ["email"]
  username_attributes      = ["email"]

  schema = [
    {
      name               = "email"
      required          = true
      mutable           = true
      attribute_data_type = "String"
    },
    {
      name               = "role"
      required          = true
      mutable           = true
      attribute_data_type = "String"
    }
  ]
}

resource "aws_cognito_user_pool_client" "os_client" {
  name                       = "${var.domain_name}-web-client"
  user_pool_id               = aws_cognito_user_pool.os_user_pool.id
  allowed_oauth_flows       = ["code", "implicit"]
  allowed_oauth_scopes       = ["email", "openid"]
  allowed_oauth_flows_user_pool_client = true

  generate_secret = false

  callback_urls = [
    "https://${var.domain_name}/auth/callback"
  ]
}

resource "aws_iam_role" "opensearch_cognito_role" {
  name = "opensearch_cognito_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "es.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "opensearch_cognito_attachment" {
  role       = aws_iam_role.opensearch_cognito_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonOpenSearchServiceCognitoAccess"
}

resource "aws_iam_role" "backend_instance_role" {
  name = "backend_instance_role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

resource "aws_iam_role_policy_attachment" "backend_instance_attachment" {
  role       = aws_iam_role.backend_instance_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonSSMManagedInstanceCore"
}

resource "aws_iam_instance_profile" "backend_instance_profile" {
  name = "backend_instance_profile"
  roles = [aws_iam_role.backend_instance_role.name]
}

resource "aws_secretsmanager_secret" "secrets" {
  name = "demo-log-management-secrets"

  description = "Secrets for Demo Log Management application"

  tags = {
    Project     = "demo-log-management"
    Environment = var.environment
  }
}

resource "aws_secretsmanager_secret_version" "secrets_version" {
  secret_id = aws_secretsmanager_secret.secrets.id
  secret_string = jsonencode({
    JWT_SECRET = var.jwt_secret
    REDIS_PASSWORD = module.redis.auth_token
    OPENSEARCH_USERNAME = module.opensearch.master_user_arn
    OPENSEARCH_PASSWORD = module.opensearch.master_user_password
  })
}

data "aws_caller_identity" "current" {}

resource "cloudflare_record" "frontend" {
  zone_id = var.cloudflare_zone_id
  name    = var.domain_name
  value   = module.nextjs.public_ip
  type    = "A"
  ttl     = 300
  proxied = true
}

output "opensearch_endpoint" {
  value = module.opensearch.domain_endpoint
}

output "nextjs_public_ip" {
  value = module.nextjs.public_ip
}

output "redis_endpoint" {
  value = module.redis.endpoint
}

output "cloudflare_zone_id" {
  value = var.cloudflare_zone_id
}
