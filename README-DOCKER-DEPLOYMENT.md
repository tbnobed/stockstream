# InventoryPro Docker Deployment Guide

## Multi-Item Transaction Support

This deployment guide covers the enhanced InventoryPro system with multi-item transaction support, shopping cart functionality, and QR code scanning integration.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB+ RAM available
- 10GB+ disk space

## Quick Start - New Deployment

```bash
# Clone the repository
git clone <your-repo-url>
cd inventorypro

# Deploy with multi-item transaction support
./deploy-multi-item.sh
```

The deployment script will:
- Set up environment variables
- Build optimized Docker images
- Create PostgreSQL database
- Apply schema migrations
- Create admin user
- Verify multi-item transaction functionality

### Default Credentials
- **URL**: http://localhost:5000
- **Username**: admin
- **Password**: ADMIN1
- **Email**: admin@inventorypro.com

## Updating Existing Deployment

### Multi-Item Transaction Support

```bash
# Update existing deployment to support multi-item transactions
./update-multi-item.sh
```

This will:
- Create database backup
- Remove order number unique constraint
- Update application code
- Test functionality
- Provide rollback if needed

### Category Fields Support

```bash
# Add inventory categorization fields to existing deployment
./deploy-category-fields.sh
```

This will:
- Create database backup
- Add Design, Group Type, and Style Group fields to inventory_items
- Update application with enhanced categorization support
- Verify deployment functionality
- Provide rollback if needed

### Archive Functionality Support

```bash
# Add archive/disable functionality to existing deployment
./deploy-archive-functionality.sh
```

This will:
- Create database backup
- Add is_active boolean field to inventory_items table
- Deploy archive and restore API endpoints
- Update frontend with archive toggle and buttons
- Verify archive functionality works correctly
- Provide rollback if needed

## Architecture Overview

### Multi-Item Transaction Features

- **Shopping Cart**: Add multiple items to cart before processing
- **QR Code Integration**: Scan items directly into cart
- **Stock Validation**: Real-time inventory checking
- **Quantity Management**: Individual quantity controls per item
- **Order Grouping**: Multiple items share single order number
- **Price Calculation**: Automatic total computation

### Database Schema Changes

#### Multi-Item Transaction Support

The system removes the unique constraint on `order_number` to allow multiple sale records per transaction:

```sql
-- Old schema (single item per transaction)
orderNumber varchar(20) NOT NULL UNIQUE

-- New schema (multi-item transactions)  
orderNumber varchar(20) NOT NULL
```

#### Inventory Categorization Fields

Enhanced inventory_items table with new categorization columns:

```sql
-- Added columns for advanced categorization
ALTER TABLE inventory_items ADD COLUMN design TEXT;
ALTER TABLE inventory_items ADD COLUMN group_type TEXT; 
ALTER TABLE inventory_items ADD COLUMN style_group TEXT;

-- Added column for archive functionality
ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN DEFAULT true;
```

**Category Field Examples:**
- **Design**: Lipstick, Cancer, Event-Specific
- **Group Type**: Supporter, Ladies, Member-Only
- **Style Group**: T-Shirt, V-Neck, Tank Top

**Archive Functionality:**
- **is_active**: Boolean field for soft delete (true = active, false = archived)
- **Archive/Restore**: Items can be archived and restored while maintaining data integrity
- **Toggle View**: Frontend can switch between showing active and archived items

### Container Architecture

```
┌─────────────────┐    ┌──────────────────┐
│   PostgreSQL    │◄──►│  InventoryPro    │
│   Database      │    │  Application     │
│                 │    │                  │
│ • Inventory     │    │ • React Frontend │
│ • Sales         │    │ • Express API    │
│ • Users         │    │ • QR Scanner     │
│ • Associates    │    │ • Cart System    │
└─────────────────┘    └──────────────────┘
        │                        │
        └────────────────────────┘
              Port 5432      Port 5000
```

## Environment Configuration

Create `.env` file for customization:

```env
# Database Configuration
POSTGRES_DB=inventorypro
POSTGRES_USER=postgres
POSTGRES_PASSWORD=SecureInventoryPassword2025!
POSTGRES_PORT=5432

# Application Configuration
APP_PORT=5000
NODE_ENV=production
SESSION_SECRET=your_session_secret_here

# Multi-Item Transaction Features
ENABLE_MULTI_ITEM_CART=true
DEFAULT_QUANTITY=1
MAX_CART_ITEMS=50

# QR Scanner Configuration
QR_SCANNER_TIMEOUT=8000
MOBILE_DEVICE_SUPPORT=true
REPLIT_IFRAME_SUPPORT=true
```

## Manual Deployment Commands

### Build and Start
```bash
docker-compose build --no-cache
docker-compose up -d
```

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
docker-compose logs -f postgres
```

### Database Operations
```bash
# Connect to database
docker-compose exec postgres psql -U postgres -d inventorypro

# Create backup
docker-compose exec postgres pg_dump -U postgres inventorypro > backup.sql

# Restore backup
docker-compose exec -T postgres psql -U postgres -d inventorypro < backup.sql
```

### Application Management
```bash
# Restart application
docker-compose restart app

# Rebuild application
docker-compose build --no-cache app
docker-compose up -d app

# Scale application (if needed)
docker-compose up -d --scale app=2
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database status
docker-compose exec postgres pg_isready -U postgres

# Verify database exists
docker-compose exec postgres psql -U postgres -l
```

#### 2. Schema Migration Issues
```bash
# Manually apply schema
docker-compose exec app npx drizzle-kit push --force

# Check tables exist
docker-compose exec postgres psql -U postgres -d inventorypro -c "\dt"
```

#### 3. Multi-Item Transaction Errors
```bash
# Verify order number constraint is removed
docker-compose exec postgres psql -U postgres -d inventorypro -c "
SELECT constraint_name FROM information_schema.table_constraints 
WHERE table_name = 'sales' AND constraint_type = 'UNIQUE';"
```

#### 4. Port Conflicts
```bash
# Check what's using port 5000
lsof -i :5000

# Change port in docker-compose.yml
ports:
  - "5001:5000"  # Use port 5001 instead
```

### Performance Optimization

#### Resource Limits
```yaml
# Add to docker-compose.yml under app service
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
    reservations:
      memory: 256M
      cpus: '0.25'
```

#### Database Optimization
```sql
-- Connect to database and run:
VACUUM ANALYZE;
REINDEX DATABASE inventorypro;
```

## Security Considerations

### Production Hardening

1. **Change Default Passwords**
   ```bash
   # Update admin password after first login
   # Set strong POSTGRES_PASSWORD in .env
   ```

2. **Network Security**
   ```yaml
   # Limit database access in docker-compose.yml
   postgres:
     ports: []  # Remove external port exposure
   ```

3. **Environment Variables**
   ```bash
   # Use strong session secret
   SESSION_SECRET=$(openssl rand -hex 32)
   ```

## Monitoring and Maintenance

### Health Checks
```bash
# Application health
curl http://localhost:5000/api/health

# Database health
docker-compose exec postgres pg_isready -U postgres
```

### Backup Strategy
```bash
#!/bin/bash
# backup-cron.sh - Add to crontab
DATE=$(date +%Y%m%d_%H%M%S)
docker-compose exec postgres pg_dump -U postgres inventorypro > "backup_$DATE.sql"
# Keep only last 30 days
find ./backups -name "*.sql" -mtime +30 -delete
```

### Log Rotation
```bash
# Configure Docker logging
docker-compose up -d --log-opt max-size=10m --log-opt max-file=3
```

## Support and Documentation

### API Documentation
- **Base URL**: http://localhost:5000/api
- **Health Check**: GET /api/health
- **Inventory**: GET /api/inventory
- **Sales**: GET /api/sales
- **Search**: GET /api/inventory/search/:term

### Multi-Item Transaction Workflow

1. **Open Sales Modal**: Click "Quick Sale" button
2. **Add Items**: Search/scan items and add to cart
3. **Adjust Quantities**: Use +/- buttons for each item
4. **Review Cart**: Check items and total amount
5. **Process Transaction**: Submit with payment method
6. **Verify Results**: Check sales records with same order number

### Development vs Production

| Feature | Development | Production |
|---------|-------------|------------|
| Database | Neon Cloud Driver | postgres-js |
| Build | Hot Reload | Optimized Bundle |
| Assets | Dev Server | Static Files |
| Logs | Console | Docker Logs |
| Health Checks | None | Automated |

For additional support, refer to the main documentation or deployment logs.