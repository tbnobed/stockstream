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

### Inventory Categorization Enhancement (August 16, 2025)
- **Enhanced inventory schema**: Added three new categorization fields to inventory_items table
- **Design field**: Support for visual themes like Lipstick, Cancer, Event-Specific
- **Group Type field**: Customer segmentation like Supporter, Ladies, Member-Only
- **Style Group field**: Product variations like T-Shirt, V-Neck, Tank Top
- **Automated migration**: Updated docker-entrypoint.sh to automatically add new columns on container startup
- **Category deployment script**: Created deploy-category-fields.sh for production deployment of new fields
- **Enhanced search functionality**: Updated search to include all category fields and descriptions
- **Form improvements**: Added new fields to inventory creation and editing forms with proper validation
- **Display enhancements**: Updated both mobile and desktop inventory views to show descriptions
- **Backward compatibility**: All migrations safely handle existing data and missing columns

### Archive/Disable Functionality Enhancement (August 16, 2025)
- **Soft delete system**: Added is_active boolean field to inventory_items table for archive functionality
- **Archive/restore API endpoints**: New PATCH endpoints for /archive and /restore operations
- **Frontend archive interface**: Toggle button to switch between active and archived items view
- **Enhanced inventory management**: Archive button for active items, restore button for archived items
- **Database schema migration**: Automated addition of is_active column with proper defaults in docker-entrypoint.sh
- **Production deployment script**: Created deploy-archive-functionality.sh for safe production deployment with backup
- **Archive status preservation**: Archived items maintain all data and transaction history while being hidden from normal operations
- **API query parameter**: Backend accepts includeArchived query parameter to control item visibility
- **Mobile and desktop support**: Archive functionality works across all device interfaces with appropriate buttons
- **Backward compatibility**: All existing items automatically marked as active during migration
- **Docker integration**: Archive functionality fully integrated into containerized deployment with automated schema updates

### Pagination Controls for Sales and Inventory Enhancement (August 16, 2025)
- **Comprehensive pagination system**: Added pagination functionality to both sales and inventory pages with customizable items per page options (25, 50, 100)
- **Advanced pagination logic**: Implemented proper pagination calculations with page range display and navigation controls
- **Search and filter integration**: Pagination automatically resets when search terms or filters change to maintain data consistency
- **Mobile and desktop optimization**: Pagination controls work seamlessly across all device sizes with responsive design
- **User experience improvements**: Added pagination info display showing current item range and total counts
- **Performance optimization**: Large datasets now load efficiently with client-side pagination reducing rendering load
- **Navigation controls**: Previous/Next buttons with disabled states and numbered page buttons for direct navigation
- **Items per page selection**: Users can customize view density with dropdown selector for optimal browsing experience

### Advanced Sales Filtering System (August 17, 2025)
- **Comprehensive sales filters**: Added extensive filtering capabilities to sales page including sales associate, payment method, and date range filters
- **Date range filtering**: Multiple preset options including Today, Last 7/30/60/90 days, This/Last month, and custom date range selection
- **Associate filtering**: Filter sales by specific sales associates with dropdown selection from all available associates
- **Payment method filtering**: Filter transactions by Cash or Venmo payment methods for payment analysis
- **Custom date range**: Advanced date picker interface for selecting specific start and end dates for detailed period analysis
- **Active filter display**: Visual badges showing currently applied filters with individual removal options for easy filter management
- **Clear all filters**: Single-click option to reset all filters and return to complete dataset view
- **Integrated with pagination**: All filters work seamlessly with existing pagination system, automatically resetting to first page when filters change
- **Responsive filter panel**: Collapsible filter interface that works across mobile and desktop devices with optimized layout

### Enhanced Category-Based Reporting System (August 17, 2025)
- **Comprehensive category dropdown**: Reports now include all predefined categories (Types, Colors, Designs, Group Types, Style Groups) with organized sections
- **Advanced category filtering**: Enhanced report generation with proper category-based sales filtering that takes priority over other filters
- **Specific category performance**: When a specific category is selected, reports focus exclusively on items within that category showing individual item performance
- **Dual reporting modes**: Reports handle both all-categories overview (showing performance across all category types) and specific category deep-dive analysis
- **Improved category performance display**: Visual indicators showing selected category type with sorted results by revenue performance
- **Enhanced CSV exports**: Category reports export with proper structure for both general category analysis and specific category item breakdowns
- **Category type detection**: Automatic detection of category type (Type/Color/Design/Group/Style) for proper filtering and display organization
- **No data handling**: Graceful handling of empty results when no sales exist for selected categories in date ranges
- **Revenue-based sorting**: All category performance reports automatically sort by revenue to highlight top performers within categories

### Contextual Report System Implementation (August 17, 2025)
- **Contextual report buttons**: Report types now contextually filter based on which main report button was clicked (Sales/Inventory/Revenue)
- **Sales reports category**: Shows only sales-related reports including Sales Summary, Sales by Associate, Top Selling Items, Payment Methods, and Seasonal Trends
- **Inventory reports category**: Shows only inventory-related reports including Inventory Status, Low Stock Report, Inventory Adjustments, and Category Performance
- **Revenue reports category**: Shows only revenue-related reports including Cost Analysis, Profit Margins, Category Performance, and Seasonal Trends
- **Dynamic modal headers**: Report modal title updates to reflect the selected category (Sales Reports, Inventory Reports, Revenue Reports)
- **Automatic report type reset**: When switching between report categories, the selected report type automatically resets to the appropriate default for that category
- **Category-specific defaults**: Each category has its own default report type (Sales Summary for sales, Inventory Status for inventory, Cost Analysis for revenue)
- **Admin permission handling**: Sales by Associate report only appears for admin users within the sales reports category
- **Improved user experience**: Users now see only relevant report types based on their selection, reducing confusion and improving workflow efficiency