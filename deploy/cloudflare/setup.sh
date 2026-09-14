#!/bin/bash
set -e

echo "Setting up Cloudflare tunnel for Demo Log Management"

# Install cloudflared
if ! command -v cloudflared &> /dev/null; then
    echo "Installing cloudflared..."
    wget -q https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64 -O /usr/local/bin/cloudflared
    chmod +x /usr/local/bin/cloudflared
fi

# Authenticate
if [ ! -f "/root/.cloudflare/cloudflared.json" ]; then
    echo "Please authenticate with Cloudflare"
    echo "Run: cloudflared tunnel login"
    exit 1
fi

# Create tunnel if doesn't exist
if ! cloudflared tunnel list | grep -q "demo-log-management"; then
    echo "Creating tunnel..."
    cloudflared tunnel create demo-log-management
fi

# Configure tunnel
echo "Configuring tunnel..."
cat > /etc/cloudflared/config.yml << EOF
tunnel: demo-log-management
credentials-file: /root/.cloudflare/cloudflared.json

ingress:
  - hostname: ${DOMAIN}
    service: http://backend:3000
  - hostname: dashboard.${DOMAIN}
    service: http://opensearch-dashboards:5601
  - service: http_status:404
EOF

# Setup systemd service
cat > /etc/systemd/system/cloudflared.service << EOF
[Unit]
Description=Cloudflare Tunnel
After=network.target

[Service]
Type=simple
ExecStart=/usr/local/bin/cloudflared --config /etc/cloudflared/config.yml tunnel run
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable cloudflared
systemctl restart cloudflared

echo "Cloudflare tunnel setup complete!"
echo "Run: cloudflared tunnel route dns demo-log-management ${DOMAIN}"
echo "Run: cloudflared tunnel route dns demo-log-management dashboard.${DOMAIN}"
