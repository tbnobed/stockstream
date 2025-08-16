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
- **Path resolution fix**: Fixed import.meta.dirname issue in Docker bundled environment using sed replacement
- **Docker compatibility**: Updated Dockerfile to properly handle Node.js path resolution in production containers
- **Admin account seeding**: Added automatic admin user creation during Docker deployment
- **Production scripts**: Created seed-docker.js and seed-production.sh for reliable admin setup
- **Deployment enhancement**: Updated deploy.sh and update.sh to automatically seed admin account
- **Automated deployment**: Created docker-entrypoint.sh for automatic database setup and admin creation
- **Self-contained Docker**: Application now handles all database migrations and seeding during container startup
- **Zero-configuration deployment**: Docker containers automatically set up database schema and admin user
- **Database driver fix**: Replaced Neon serverless driver with postgres-js for Docker compatibility
- **Connection resolution**: Fixed WebSocket connection errors by using standard PostgreSQL drivers in containers
- **Deployment pattern**: Always use standard database drivers (not cloud drivers) for Docker deployments

## Docker Deployment Best Practices

### Critical Docker Deployment Checklist
When deploying full-stack applications with Docker, always follow this comprehensive checklist:

#### 1. Database Driver Compatibility (CRITICAL)
- **Replace cloud drivers** (Neon, PlanetScale, Supabase) with standard PostgreSQL drivers BEFORE bundling
- **Never use WebSocket connections** in Docker containers - they fail in containerized environments
- **Perform replacement during build stage** using echo commands in Dockerfile:
  ```dockerfile
  RUN echo "import { drizzle } from 'drizzle-orm/postgres-js';" > server/db.ts && \
      echo "import postgres from 'postgres';" >> server/db.ts
  ```
- **Verify no WebSocket imports** remain in bundled code

#### 2. Database Schema and User Creation
- **Use snake_case column names** in SQL INSERT statements to match Drizzle ORM output
- **Critical field mapping**:
  - Schema: `associateCode` → SQL: `associate_code`
  - Schema: `firstName` → SQL: `first_name`
  - Schema: `lastName` → SQL: `last_name`
  - Schema: `isActive` → SQL: `is_active`
  - Schema: `userId` → SQL: `user_id`
  - Schema: `createdAt` → SQL: `created_at`
- **Handle interactive prompts** in drizzle-kit: `echo "yes" | npx drizzle-kit push --force`
- **Clean database conflicts** by dropping/recreating public schema before migrations
- **Always verify schema creation** before attempting user creation

#### 3. Static File Serving (CRITICAL)
- **Check Vite build output location** in `vite.config.ts` - look for `build.outDir` setting
- **Common build patterns**:
  - If `outDir: "dist/public"` → copy from `dist/public/*`
  - If `outDir: "client/dist"` → copy from `client/dist/*`
- **Verify build output exists** before copying:
  ```dockerfile
  RUN ls -la dist/public/ || (echo "Build failed" && exit 1)
  ```
- **Create target directory** before copying: `mkdir -p server/public`
- **Match serveStatic expectations** - check what path `serveStatic()` function expects

#### 4. Build Process Order (MUST FOLLOW)
1. **Frontend build**: `npm run build` (outputs static files)
2. **Database driver replacement**: Replace cloud drivers with postgres-js
3. **Backend bundling**: `esbuild server/index.ts --bundle`
4. **Path fixes**: Replace `import.meta.dirname` with absolute paths
5. **Static file copying**: Copy frontend build to expected server directory
6. **Verification**: Check all files exist before container startup

#### 5. Container Initialization Script (CRITICAL - DATA PRESERVATION)
- **Wait for database** with `pg_isready` before any operations
- **NEVER DROP EXISTING DATA** - Only create schema if tables don't exist
- **Check table existence** before running any schema operations
- **Handle interactive prompts** with `echo "yes" |` for non-interactive execution
- **Use correct column names** (snake_case) in SQL INSERT statements
- **Verify admin user creation** with health checks
- **Fail fast** on any initialization errors

⚠️ **CRITICAL**: Never use `DROP SCHEMA CASCADE` in production - this wipes all user data on every restart!

#### 6. Common Failure Patterns to Avoid
- **"Column does not exist"**: Using camelCase instead of snake_case in SQL
- **"Build directory not found"**: Copying from wrong path or before build completion  
- **Interactive prompt hangs**: Not providing input to drizzle-kit push
- **WebSocket connection errors**: Using cloud drivers instead of postgres-js
- **Schema conflicts**: Not cleaning existing tables before migration
- **Permission errors**: Not setting proper file ownership with chown

#### 7. Deployment Verification Steps
1. **Database connection** - verify container can connect to PostgreSQL
2. **Schema creation** - confirm all tables exist with correct structure
3. **Admin user creation** - verify admin account exists and has correct role
4. **Static file serving** - test that frontend assets are accessible
5. **API endpoints** - verify all backend routes respond correctly
6. **Health checks** - confirm application passes all health check endpoints

### Emergency Troubleshooting Guide
- **Database errors**: Always check column names match schema (snake_case vs camelCase)
- **Build failures**: Verify Vite output directory path in vite.config.ts
- **Interactive hangs**: Add `echo "yes" |` before any drizzle-kit commands
- **Missing files**: Check build output exists before attempting to copy
- **Container restarts**: Review all initialization logs for specific error messages