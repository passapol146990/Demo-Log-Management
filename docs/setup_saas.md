# SaaS Deployment Guide

## Prerequisites
- Oracle Cloud VM with SSH access
- Domain name (or DuckDNS/nip.io for free)
- Oracle Cloud Security List configured to allow:
  - TCP 443 (HTTPS)
  - UDP 514 (Syslog)
  - TCP 22 (SSH)

## Deployment Steps

### 1. SSH into VM
```bash
ssh -i <your-ssh-key> opc@<VM_IP>
```

### 2. Install Docker and Docker Compose
```bash
sudo apt-get update
sudo apt-get install -y docker.io docker-compose-plugin
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker $USER
```

### 3. Clone Repository
```bash
git clone https://github.com/passapol146990/Demo-Log-Management.git
cd Demo-Log-Management
```

### 4. Configure .env for Production
```bash
cp .env.example .env
# Edit .env with production values
```

### 5. Set up Reverse Proxy with Caddy
```bash
sudo apt-get install -y curl
sudo install -m 0755 /usr/local/bin/caddy /usr/bin/caddy
```

Create `/etc/caddy/Caddyfile`:
```
logmanagement.yourdomain.com {
    reverse_proxy backend:3000
}
```

### 6. Start Services
```bash
docker compose up -d
```

### 7. Verify Deployment
```bash
curl -k https://logmanagement.yourdomain.com/api/auth/me
docker compose ps
```

### 8. Open Security List
In Oracle Cloud Console:
- Navigate to Networking → Virtual Cloud Networks → Security Lists
- Add inbound rules:
  - TCP 443 (HTTPS)
  - UDP 514 (Syslog)
  - TCP 22 (SSH)

### 9. Test External Syslog
```bash
echo "<134>1 2024-01-15T10:30:00.000Z fw01 firewall - - - msg='TEST'" | nc -u <VM_IP> 514
```

## Notes
- For free TLS: use nip.io or DuckDNS
- For Let's Encrypt: configure Caddy with your domain
- The same docker-compose.yml works for both Appliance and SaaS
