#!/bin/bash

# Production Setup Script
# Configures Ubuntu server for optimal production deployment

set -e

echo "🔧 Setting up Ubuntu server for InventoryPro production..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install required packages
echo "🛠️  Installing required packages..."
sudo apt install -y curl wget git ufw fail2ban nginx certbot python3-certbot-nginx

# Configure firewall
echo "🔥 Configuring firewall..."
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw allow 5000
sudo ufw --force enable

# Configure fail2ban for SSH protection
echo "🛡️  Configuring fail2ban..."
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    echo "🐳 Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    echo "🐙 Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create nginx configuration
echo "🌐 Configuring Nginx reverse proxy..."
sudo tee /etc/nginx/sites-available/inventorypro << EOF
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;

    location / {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
EOF

# Enable nginx site
sudo ln -sf /etc/nginx/sites-available/inventorypro /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Set up log rotation
echo "📝 Setting up log rotation..."
sudo tee /etc/logrotate.d/inventorypro << EOF
/home/$USER/inventorypro/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f /home/$USER/inventorypro/docker-compose.yml restart app
    endscript
}
EOF

# Set up automatic backups
echo "💾 Setting up automatic backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * /home/$USER/inventorypro/scripts/backup.sh") | crontab -

# Create systemd service for auto-start
echo "🚀 Creating systemd service..."
sudo tee /etc/systemd/system/inventorypro.service << EOF
[Unit]
Description=InventoryPro Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/$USER/inventorypro
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl enable inventorypro.service

echo "✅ Production server setup completed!"
echo ""
echo "📋 Next steps:"
echo "   1. Update domain in /etc/nginx/sites-available/inventorypro"
echo "   2. Get SSL certificate: sudo certbot --nginx -d your-domain.com"
echo "   3. Clone your application to /home/$USER/inventorypro"
echo "   4. Run: ./scripts/deploy.sh"
echo "   5. Start on boot: sudo systemctl start inventorypro"
echo ""
echo "🔒 Security reminders:"
echo "   - Change default passwords in .env"
echo "   - Set up regular security updates"
echo "   - Monitor logs regularly"
echo "   - Keep backups in multiple locations"