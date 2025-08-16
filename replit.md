# InventoryPro - Retail Inventory Management System

## Overview

InventoryPro is a full-stack retail inventory management system designed for small to medium businesses. The application provides comprehensive functionality for tracking inventory items, managing sales transactions, handling suppliers, and monitoring sales associates. Built with modern web technologies, it features a responsive dashboard with real-time analytics, QR code label generation for inventory tracking, and detailed reporting capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and component-based architecture
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: Radix UI primitives with shadcn/ui design system for consistent, accessible components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod for validation and type-safe form handling

### Backend Architecture
- **Runtime**: Node.js with Express.js framework for RESTful API endpoints
- **Database**: PostgreSQL with Neon serverless driver for scalable cloud database
- **ORM**: Drizzle ORM for type-safe database queries and schema management
- **Build System**: Vite for fast development and optimized production builds
- **Development**: tsx for TypeScript execution and hot reloading

### Database Design
The application uses a relational database schema with four main entities:
- **Sales Associates**: User management for tracking who made sales
- **Suppliers**: Vendor information for inventory sourcing
- **Inventory Items**: Product catalog with stock levels, pricing, and SKU management
- **Sales**: Transaction records linking items, associates, and payment methods

The schema includes proper foreign key relationships and uses UUIDs for primary keys to ensure scalability and avoid conflicts.

### API Structure
RESTful API design with clear endpoint patterns:
- `/api/dashboard/stats` - Aggregated dashboard metrics
- `/api/associates` - Sales associate CRUD operations
- `/api/suppliers` - Supplier management
- `/api/inventory` - Inventory item management with low stock alerts
- `/api/sales` - Sales transaction processing

Each endpoint implements proper error handling, input validation using Zod schemas, and returns JSON responses with appropriate HTTP status codes.

### Feature Architecture
- **Inventory Management**: SKU generation, stock level monitoring, supplier tracking
- **Sales Processing**: Order number generation, payment method tracking, inventory updates
- **Reporting**: Dashboard analytics with revenue, sales volume, and stock alerts
- **QR Code Generation**: Label printing system for inventory tracking
- **Search and Filtering**: Real-time search across inventory and sales data

## External Dependencies

### Core Framework Dependencies
- **React Ecosystem**: React 18, React DOM, TypeScript for frontend development
- **Express.js**: Web framework for backend API development
- **Vite**: Build tool and development server with hot module replacement

### Database and ORM
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for cloud database
- **drizzle-orm**: Type-safe ORM for database operations
- **drizzle-kit**: Database migration and schema management tools

### UI and Design System
- **@radix-ui/***: Complete set of accessible UI primitives (dialogs, forms, navigation)
- **tailwindcss**: Utility-first CSS framework for styling
- **class-variance-authority**: Utility for managing component variants
- **lucide-react**: Icon library for consistent iconography

### Data Management
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form**: Form state management and validation
- **@hookform/resolvers**: Integration between React Hook Form and Zod
- **zod**: TypeScript-first schema validation
- **drizzle-zod**: Integration between Drizzle ORM and Zod schemas

### Charts and Visualization
- **recharts**: React chart library for dashboard analytics and reporting

### Development Tools
- **@replit/vite-plugin-runtime-error-modal**: Development error overlay
- **@replit/vite-plugin-cartographer**: Replit-specific development tools
- **ws**: WebSocket library for database connections

### Date and Utility Libraries
- **date-fns**: Date manipulation and formatting
- **nanoid**: URL-safe unique ID generation
- **clsx**: Conditional className utility
- **tailwind-merge**: Utility for merging Tailwind classes

The application is structured as a monorepo with shared TypeScript types and schemas between frontend and backend, ensuring type safety across the entire stack. The architecture supports both development and production deployments with proper environment configuration and build optimization.

## Production Deployment

### Docker Containerization
- **Multi-stage Docker build** for optimized production images
- **Docker Compose** configuration for orchestrating application and database services
- **Health check endpoints** for monitoring and load balancer integration
- **Security hardening** with non-root user and minimal attack surface

### Deployment Scripts
- **Automated deployment** (`deploy.sh`) - Complete setup from scratch
- **Update mechanism** (`update.sh`) - Zero-downtime updates with rollback capability
- **Database backup** (`backup.sh`) - Automated daily backups with retention policy
- **Server setup** (`setup-production.sh`) - Ubuntu server configuration with security hardening

### Production Features
- **Nginx reverse proxy** configuration with SSL/TLS support
- **PostgreSQL database** with proper connection pooling and optimizations
- **Application monitoring** through health endpoints and logging
- **Systemd service** for automatic startup and process management
- **Firewall configuration** and security best practices
- **Log rotation** and maintenance automation

### Security Implementation
- **Environment variable management** for sensitive configuration
- **Database access controls** and user permissions
- **SSL certificate automation** with Let's Encrypt integration
- **Fail2ban protection** against brute force attacks
- **Regular security updates** and monitoring

The deployment system is production-ready and includes comprehensive documentation, automated scripts, and monitoring capabilities for reliable operation in Ubuntu environments.

## Recent Changes

### Docker Build Fix (August 16, 2025)
- **Fixed Docker build failure**: Updated Dockerfile to install all dependencies (including dev dependencies) during build stage
- **Build process**: Changed from `npm ci --only=production` to `npm ci` in builder stage to ensure vite and other build tools are available
- **Production optimization**: Kept production-only dependencies in final production stage for minimal image size
- **Import resolution**: Fixed TypeScript import path for edit-supplier-modal component using relative imports
- **Error handling**: Improved error type handling in server routes.ts for better TypeScript compliance

The Docker configuration now properly handles the two-stage build process where dev dependencies are needed for building but excluded from the final production image.

### Additional Docker Improvements
- **Static file serving**: Fixed static asset copying to match the expected server directory structure
- **Production paths**: Ensured built frontend assets are available at `server/public/` for production serving
- **Build optimization**: Maintained correct file ownership and permissions for Docker security
- **Database migrations**: Updated deployment script to use correct `npm run db:push` command instead of `db:migrate`
- **Deployment success**: Docker build now completes successfully as confirmed by user testing
- **Migration fix**: Updated Dockerfile to include dev dependencies needed for drizzle-kit migrations
- **Docker Compose**: Removed obsolete version attribute and improved migration handling
- **Emergency fix**: Created fix-deployment.sh script for immediate migration resolution