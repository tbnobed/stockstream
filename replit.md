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
- **Inventory Management**: SKU generation, stock level monitoring, supplier tracking, multi-item transaction support, QR code scanning for adding items to cart, inventory categorization, archive/disable functionality, pagination, and enhanced search.
- **Sales Processing**: Order number generation, payment method tracking, inventory updates, real-time stock validation during cart operations, multi-item transactions, sales associate management, and mobile terminal QR integration.
- **Reporting**: Dashboard analytics including revenue, sales volume, and stock alerts. Includes comprehensive sales filtering (sales associate, payment method, date range), enhanced category-based reporting, and contextual report system based on sales/inventory/revenue.
- **QR Code Generation**: Label printing system for inventory tracking.

### Deployment Architecture
The application uses Docker for containerization, with multi-stage builds for optimized images. Docker Compose orchestrates services. Production deployment includes Nginx for reverse proxying with SSL/TLS, PostgreSQL with connection pooling, application monitoring, Systemd service management, and firewall configuration. Security implementations include environment variable management, database access controls, SSL certificate automation (Let's Encrypt), and Fail2ban protection. Automated database schema updates and data migrations are integrated into the Docker entrypoint.

## External Dependencies

### Core Technologies
- **Frontend**: React 18, React DOM, TypeScript
- **Backend**: Express.js
- **Build Tool**: Vite

### Database & ORM
- **PostgreSQL Driver**: `@neondatabase/serverless` (cloud), `postgres-js` (Docker)
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