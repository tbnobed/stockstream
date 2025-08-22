# InventoryPro Docker Deployment Guide

## Latest Features Included

### ✅ Complete Database Schema
- **User Authentication**: JWT-based authentication with role management
- **Inventory Management**: Full CRUD operations with category management
- **Sales Processing**: Multi-item transactions with order tracking
- **Logo Library**: Upload and manage logos with object storage integration
- **Label Template Persistence**: Save and load label configurations across devices

### ✅ New in This Version
- **Label Templates Table**: User-specific label template storage in database
- **Media Files Table**: Logo library with file management
- **Cross-System Persistence**: Label settings sync across different browsers/devices
- **Object Storage Integration**: Support for external object storage providers
- **Enhanced Authentication**: JWT tokens with proper session management

## Quick Start

1. **Clone and Setup**
   ```bash
   git clone <repository>
   cd inventorypro
   cp .env.docker.example .env.docker
   # Edit .env.docker with your settings
   ```

2. **Build and Run**
   ```bash
   docker-compose up --build -d
   ```

3. **Access Application**
   - Application: http://localhost:5000
   - Default Admin: username `admin`, code `ADMIN1`

## Database Tables

### Core Tables
- `users` - User authentication and management
- `sales_associates` - Sales associate records linked to users
- `inventory_items` - Product inventory with categories
- `sales` - Sales transactions (supports multi-item orders)
- `suppliers` - Supplier management
- `categories` - Dynamic category management (6 types)

### New Tables
- `media_files` - Logo library with file metadata and object storage paths
- `label_templates` - User-specific label template configurations
- `sessions` - Session storage for authentication

### Supported Features
- **Multi-item Transactions**: No unique constraint on order numbers
- **Category Management**: Dynamic categories (type, color, size, design, groupType, styleGroup)
- **Archive Functionality**: Soft delete with is_active flags
- **Logo Library**: Upload, manage, and use logos in label designs
- **Label Template Persistence**: Save label configurations to database

## Environment Variables

### Required
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `JWT_SECRET`: JWT token signing key

### Optional (Object Storage)
- `PRIVATE_OBJECT_DIR`: Private object storage directory
- `PUBLIC_OBJECT_SEARCH_PATHS`: Public asset search paths
- `DEFAULT_OBJECT_STORAGE_BUCKET_ID`: Default storage bucket

## Logo Library Features
- **Supported Formats**: PNG, JPG, JPEG, GIF, SVG
- **File Size Limit**: 5MB per file
- **Storage**: Database records with object storage integration
- **User Management**: Each user can upload and manage their own logos
- **Label Integration**: Direct integration with label designer

## Label Template Persistence
- **User-Specific**: Each user has their own templates
- **Auto-Save**: Changes automatically saved every 2 seconds
- **Cross-Device**: Templates sync across different browsers/devices
- **Default Template**: Each user gets a default template that persists

## Health Checks
- Application: GET `/api/health`
- Database: Automatic connection validation
- Container: Built-in Docker health checks

## Production Notes
- All tables auto-created on container startup
- Existing data preserved during updates
- Multi-item transaction support enabled by default
- Archive functionality included
- Object storage integration ready for external providers