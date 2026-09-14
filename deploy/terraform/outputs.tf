output "opensearch_endpoint" {
  description = "OpenSearch domain endpoint"
  value       = module.opensearch.domain_endpoint
}

output "opensearch_kibana_endpoint" {
  description = "OpenSearch Dashboards endpoint"
  value       = "https://${module.opensearch.domain_endpoint}"
}

output "backend_public_ip" {
  description = "Backend server public IP"
  value       = module.nextjs.public_ip
}

output "backend_public_dns" {
  description = "Backend public DNS"
  value       = module.nextjs.public_dns
}

output "cloudflare_tunnel_name" {
  description = "Cloudflare tunnel name"
  value       = "demo-log-management"
}
