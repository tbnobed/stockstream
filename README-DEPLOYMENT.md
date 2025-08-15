# InventoryPro Deployment Guide

This guide explains how to deploy InventoryPro to your Ubuntu server using Docker.

## Prerequisites

- Ubuntu 18.04+ server
- Root or sudo access
- Internet connection
- Domain name (optional but recommended)

## Quick Start

### 1. Initial Server Setup

Run the production setup script to configure your Ubuntu server:

```bash
# Clone the repository
git clone <your-repo-url> inventorypro
cd inventorypro

# Make scripts executable
chmod +x scripts/*.sh

# Run server setup (installs Docker, Nginx, security tools)
sudo ./scripts/setup-production.sh
```

### 2. Configure Environment

Create your environment configuration:

```bash
# Copy the environment template
cp .env.production .env

# Edit with your values
nano .env
```

**Important Environment Variables:**

```bash
# Database
POSTGRES_DB=inventorypro
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password_here

# Application
NODE_ENV=production
SESSION_SECRET=your_long_random_secret_64_characters_minimum

# Authentication (if using Replit Auth)
REPL_ID=your_repl_id
REPLIT_DOMAINS=your-domain.com
ISSUER_URL=https://replit.com/oidc

# Ports
PORT=5000
APP_PORT=5000
POSTGRES_PORT=5432
```

### 3. Deploy Application

```bash
# Run the deployment script
./scripts/deploy.sh
```

The deployment script will:
- Install Docker and Docker Compose
- Create environment file with secure passwords
- Build the application
- Start database and run migrations
- Start the application

### 4. Access Your Application

- **Local Access:** http://localhost:5000
- **With Domain:** http://your-domain.com (after SSL setup)

## Manual Deployment Steps

If you prefer manual deployment:

### 1. Build and Start Services

```bash
# Build the application
docker-compose build

# Start database
docker-compose up -d postgres

# Run migrations
docker-compose run --rm app npm run db:migrate

# Start application
docker-compose up -d app
```

### 2. Health Check

```bash
# Check application health
curl http://localhost:5000/api/health

# View logs
docker-compose logs -f
```

## SSL/HTTPS Setup

### With Nginx (Recommended)

1. Update your domain in `/etc/nginx/sites-available/inventorypro`
2. Get SSL certificate:

```bash
sudo certbot --nginx -d your-domain.com -d www.your-domain.com
```

### Direct SSL (Alternative)

Update `docker-compose.yml` to include SSL certificates:

```yaml
app:
  volumes:
    - ./ssl:/app/ssl
  environment:
    - SSL_CERT_PATH=/app/ssl/cert.pem
    - SSL_KEY_PATH=/app/ssl/key.pem
```

## Database Management

### Backups

```bash
# Manual backup
./scripts/backup.sh

# Automatic daily backups at 2 AM
crontab -e
# Add: 0 2 * * * /path/to/inventorypro/scripts/backup.sh
```

### Restore

```bash
# Stop application
docker-compose down

# Restore database
docker-compose up -d postgres
cat backup.sql.gz | gunzip | docker-compose exec -T postgres psql -U postgres inventorypro

# Start application
docker-compose up -d
```

## Monitoring and Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Update Application

```bash
# Run update script (includes backup, build, migrate, restart)
./scripts/update.sh
```

### System Service (Auto-start on boot)

The setup script creates a systemd service:

```bash
# Start on boot
sudo systemctl enable inventorypro

# Manual control
sudo systemctl start inventorypro
sudo systemctl stop inventorypro
sudo systemctl restart inventorypro
```

## Security Considerations

### Firewall Configuration

```bash
# Basic firewall setup
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Regular Updates

```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update application
./scripts/update.sh
```

### Database Security

1. Change default passwords in `.env`
2. Limit database access to localhost
3. Regular backups to secure location
4. Monitor logs for suspicious activity

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check logs
docker-compose logs app

# Check disk space
df -h

# Check memory
free -m
```

**Database connection failed:**
```bash
# Check database status
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Test connection
docker-compose exec postgres psql -U postgres inventorypro
```

**Permission denied:**
```bash
# Fix ownership
sudo chown -R $USER:$USER .
chmod +x scripts/*.sh
```

### Health Monitoring

The application includes a health endpoint at `/api/health`:

```bash
# Check application health
curl http://localhost:5000/api/health

# Set up monitoring (example with simple cron job)
echo "*/5 * * * * curl -f http://localhost:5000/api/health || echo 'App down' | mail -s 'InventoryPro Alert' admin@yourcompany.com" | crontab -
```

## Scaling and Performance

### For High Traffic

1. **Use Load Balancer:**
```yaml
# Add multiple app instances
app1:
  # ... same config as app
app2:
  # ... same config as app
```

2. **Database Optimization:**
```bash
# Adjust PostgreSQL settings for production
# Edit postgresql.conf in container or use custom config
```

3. **Static File Serving:**
```bash
# Serve static files through Nginx
# Update nginx config to serve /client/dist directly
```

## Support

For issues:
1. Check logs first: `docker-compose logs -f`
2. Verify environment variables
3. Test database connection
4. Check disk space and memory
5. Review firewall settings

## Quick Reference

| Command | Description |
|---------|-------------|
| `./scripts/deploy.sh` | Full deployment |
| `./scripts/update.sh` | Update application |
| `./scripts/backup.sh` | Backup database |
| `docker-compose up -d` | Start services |
| `docker-compose down` | Stop services |
| `docker-compose logs -f` | View logs |
| `docker-compose restart` | Restart services |

Default credentials:
- Admin Code: `ADMIN1` (create associates through admin interface)