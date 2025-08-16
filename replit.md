# InventoryPro - Retail Inventory Management System

## Overview
InventoryPro is a full-stack retail inventory management system for small to medium businesses. It provides comprehensive functionality for inventory tracking, sales transaction management, supplier handling, and sales associate monitoring. Key capabilities include a responsive dashboard with real-time analytics, QR code label generation for inventory tracking, and detailed reporting. The project's vision is to offer a robust, modern solution for efficient retail inventory management.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
The system is built as a monorepo with shared TypeScript types and schemas for end-to-end type safety.

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **UI Components**: Radix UI primitives with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables
- **State Management**: TanStack Query (React Query)
- **Forms**: React Hook Form with Zod for validation

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL (with Drizzle ORM for type-safe queries)
- **Build System**: Vite for fast development and optimized production builds
- **Development**: tsx for TypeScript execution

### Database Design
A relational schema is used with four main entities: Sales Associates, Suppliers, Inventory Items, and Sales. UUIDs are used for primary keys and proper foreign key relationships are established.

### API Structure
A RESTful API design is implemented with clear endpoint patterns for dashboard statistics, sales associate management, supplier management, inventory item management (including low stock alerts), and sales transaction processing. Endpoints feature error handling, Zod validation, and JSON responses.

### Feature Specifications
- **Inventory Management**: SKU generation, stock level monitoring, supplier tracking, multi-item transaction support, QR code scanning for adding items to cart.
- **Sales Processing**: Order number generation, payment method tracking, inventory updates, real-time stock validation during cart operations.
- **Reporting**: Dashboard analytics including revenue, sales volume, and stock alerts.
- **QR Code Generation**: Label printing system for inventory tracking.
- **Search and Filtering**: Real-time search across inventory and sales data.

### Deployment Architecture
The application uses Docker for containerization, with multi-stage builds for optimized images. Docker Compose orchestrates services. Production deployment includes Nginx for reverse proxying with SSL/TLS, PostgreSQL with connection pooling, application monitoring, Systemd service management, and firewall configuration. Security implementations include environment variable management, database access controls, SSL certificate automation (Let's Encrypt), and Fail2ban protection.

## External Dependencies

### Core Technologies
- **Frontend**: React 18, React DOM, TypeScript
- **Backend**: Express.js
- **Build Tool**: Vite

### Database & ORM
- **PostgreSQL Driver**: `@neondatabase/serverless` (for cloud, replaced with `postgres-js` for Docker deployments)
- **ORM**: `drizzle-orm`, `drizzle-kit`

### UI & Design
- **UI Primitives**: `@radix-ui/*`
- **Styling**: `tailwindcss`, `class-variance-authority`
- **Icons**: `lucide-react`

### Data Management & Validation
- **Server State**: `@tanstack/react-query`
- **Forms**: `react-hook-form`, `@hookform/resolvers`
- **Validation**: `zod`, `drizzle-zod`

### Charts
- **Charting Library**: `recharts`

### Utilities
- **Date Handling**: `date-fns`
- **ID Generation**: `nanoid`
- **Conditional ClassNames**: `clsx`, `tailwind-merge`

## Recent Changes

### Multi-Item Transaction System (August 16, 2025)
- **Shopping cart functionality**: Complete rewrite of sales modal to support multiple items per transaction
- **Database schema fix**: Removed unique constraint on order_number field to allow multiple sales records with same order number
- **Cart management**: Added/remove items, adjust quantities, stock validation, and real-time total calculation
- **QR scanner integration**: Enhanced QR scanning to add items directly to cart with quantity selection
- **Price type conversion**: Fixed string-to-number conversion for database price fields to prevent display errors
- **Transaction processing**: All items in cart processed as separate sales records sharing single order number
- **Inventory validation**: Prevents overselling with real-time stock level checks during cart operations
- **Enhanced UX**: Clear cart display, quantity controls, item removal, and comprehensive transaction confirmation

### Docker Deployment for Multi-Item Transactions (August 16, 2025)
- **Production deployment scripts**: Created deploy-multi-item.sh for new deployments with comprehensive feature verification
- **Update mechanism**: Built update-multi-item.sh for upgrading existing deployments with database backup and rollback capability
- **Automated constraint fixes**: Enhanced docker-entrypoint.sh to automatically handle all production database issues on container startup
- **User-sales associate mapping**: Automatic creation of missing sales_associate records for all users during startup
- **Order number constraint removal**: Automatic removal of unique constraints blocking multi-item transactions
- **Zero-manual intervention**: All database fixes applied automatically during build/startup - no manual scripts required
- **Feature verification**: Added automated checks to ensure multi-item transaction functionality is properly configured
- **Deployment documentation**: Created comprehensive README-DOCKER-DEPLOYMENT.md with troubleshooting and maintenance guides
- **Backup integration**: Automated database backup during updates to prevent data loss
- **Health monitoring**: Enhanced health checks to verify API endpoints and database connectivity
- **Environment configuration**: Extended environment variables for multi-item cart and QR scanner settings
- **Production hardening**: Security considerations, resource limits, and monitoring capabilities for production deployment