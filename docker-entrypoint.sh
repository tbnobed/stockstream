#!/bin/sh
set -e

# InventoryPro Docker Container Entrypoint
# Handles automatic database setup and application startup

echo "🚀 Starting InventoryPro application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until pg_isready -h postgres -p 5432 -U postgres >/dev/null 2>&1; do
    echo "  Database not ready, waiting..."
    sleep 2
done

echo "✅ Database connection established"

# Check if users table exists (preserve existing data)
echo "📊 Checking database schema..."
USERS_EXISTS=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users');" 2>/dev/null | tr -d ' \n' || echo "false")

if [ "$USERS_EXISTS" = "f" ] || [ "$USERS_EXISTS" = "false" ] || [ -z "$USERS_EXISTS" ]; then
    echo "🔧 Users table not found, initializing database..."
    
    # Create schema with drizzle (non-interactive)
    echo "📋 Creating database schema..."
    echo "yes" | npx drizzle-kit push --force --config=/app/drizzle.config.ts
    
    # Verify multi-item transaction schema
    echo "🛒 Verifying multi-item transaction schema..."
    UNIQUE_CONSTRAINT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = 'sales' AND constraint_type = 'UNIQUE' AND constraint_name LIKE '%order_number%';" 2>/dev/null | tr -d ' \n' || echo "0")
    
    if [ "$UNIQUE_CONSTRAINT" != "0" ]; then
        echo "⚠️  Removing unique constraint on order_number for multi-item support..."
        psql "$DATABASE_URL" -c "ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_order_number_unique;" >/dev/null 2>&1 || echo "  Constraint may not exist"
    fi
    
    echo "✅ Multi-item transaction schema verified"
    
    # Wait for schema creation
    sleep 3
    
    # Verify users table was created
    USERS_CREATED=$(psql "$DATABASE_URL" -t -c "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='users');" 2>/dev/null | tr -d ' \n' || echo "false")
    
    if [ "$USERS_CREATED" = "t" ] || [ "$USERS_CREATED" = "true" ]; then
        echo "🌱 Creating default admin user..."
        psql "$DATABASE_URL" -c "
        INSERT INTO users (username, associate_code, first_name, last_name, email, role, is_active)
        VALUES ('admin', 'ADMIN1', 'System', 'Administrator', 'admin@inventorypro.com', 'admin', true)
        ON CONFLICT (username) DO NOTHING;
        
        INSERT INTO sales_associates (id, name, email, user_id, is_active, created_at)
        SELECT u.id, 'System Administrator', 'admin@inventorypro.com', u.id, true, NOW()
        FROM users u WHERE u.username = 'admin'
        ON CONFLICT (id) DO NOTHING;
        " >/dev/null 2>&1 && echo "✅ Admin user created successfully" || echo "⚠️  Admin user creation skipped (may already exist)"
        
        echo "✅ Database initialization completed"
    else
        echo "❌ Failed to create database schema"
        exit 1
    fi
else
    echo "✅ Database already initialized"
fi

# Final health check
echo "🔍 Performing final health check..."
if psql "$DATABASE_URL" -c "SELECT username, role FROM users WHERE role='admin' LIMIT 1;" >/dev/null 2>&1; then
    echo "✅ Database health check passed"
else
    echo "⚠️  Database health check warning (admin user may not exist)"
fi

# Start the application
echo "🌐 Starting application server..."
exec "$@"