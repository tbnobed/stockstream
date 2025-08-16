# InventoryPro - Retail Inventory Management System

A comprehensive inventory and sales management application designed for small to medium businesses, featuring real-time analytics, QR code tracking, and automated Docker deployment.

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Git

### Deployment

1. Clone the repository:
```bash
git clone <repository-url>
cd inventorypro
```

2. Deploy with one command:
```bash
./scripts/deploy.sh
```

3. Access the application:
- **URL**: http://localhost:5000
- **Admin Login**: username `admin`, password `ADMIN1`

## Features

- **Inventory Management**: Stock tracking, SKU generation, supplier management
- **Sales Processing**: Transaction recording, payment tracking, revenue analytics
- **Dashboard Analytics**: Real-time reporting with charts and insights
- **QR Code Generation**: Label printing for inventory tracking
- **User Management**: Role-based access control
- **Automated Deployment**: Zero-configuration Docker setup

## Architecture

- **Frontend**: React 18 with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Express.js with Drizzle ORM
- **Database**: PostgreSQL with automated schema management
- **Deployment**: Docker with multi-stage builds and health checks

## Management Commands

```bash
# View logs
docker compose logs -f

# Stop services
docker compose down

# Restart application
docker compose restart app

# Database access
docker compose exec postgres psql -U postgres -d inventorypro

# Clean deployment
docker compose down -v && ./scripts/deploy.sh
```

## Configuration

Copy `.env.example` to `.env` and modify as needed:

```bash
cp .env.example .env
```

Key environment variables:
- `POSTGRES_PASSWORD`: Database password
- `SESSION_SECRET`: Session encryption key
- `APP_PORT`: Application port (default: 5000)

## Development

For development with hot reload:

```bash
npm install
npm run dev
```

## Support

- Check logs for troubleshooting: `docker compose logs app`
- Verify database connection: `docker compose exec postgres pg_isready -U postgres`
- Reset database: `docker compose down -v && docker compose up -d`