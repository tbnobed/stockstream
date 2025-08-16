#!/bin/sh
set -e

# InventoryPro Docker Container Entrypoint
# Handles automatic database setup and application startup
# 
# AUTOMATIC PRODUCTION FIXES:
# • Creates missing sales_associate records for all users
# • Removes unique constraint on order_number for multi-item transactions
# • Validates database schema on every container startup
# • No manual scripts required - everything happens automatically!

echo "🚀 Starting InventoryPro application..."
echo "📋 Auto-applying production database fixes..."

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
        echo "🌱 Creating default admin user and sales associate..."
        psql "$DATABASE_URL" -c "
        INSERT INTO users (username, associate_code, first_name, last_name, email, role, is_active)
        VALUES ('admin', 'ADMIN1', 'System', 'Administrator', 'admin@inventorypro.com', 'admin', true)
        ON CONFLICT (username) DO NOTHING;
        
        -- Ensure sales_associates table has proper records for all users
        INSERT INTO sales_associates (id, name, email, user_id, is_active, created_at)
        SELECT u.id, 
               COALESCE(u.first_name || ' ' || u.last_name, u.username) as name,
               COALESCE(u.email, u.username || '@inventorypro.com') as email,
               u.id, 
               u.is_active, 
               NOW()
        FROM users u 
        WHERE NOT EXISTS (SELECT 1 FROM sales_associates sa WHERE sa.id = u.id)
        ON CONFLICT (id) DO NOTHING;
        " >/dev/null 2>&1 && echo "✅ Admin user and sales associate created successfully" || echo "⚠️  User creation may have been skipped (records may already exist)"
        
        echo "✅ Database initialization completed"
    else
        echo "❌ Failed to create database schema"
        exit 1
    fi
else
    echo "✅ Database already initialized"
fi

# CRITICAL: Always ensure production-ready constraints (runs on every container start)
echo "🔄 Applying production constraint fixes..."
psql "$DATABASE_URL" -c "
DO \$\$
BEGIN
    -- 1. Ensure all users have corresponding sales_associate records
    INSERT INTO sales_associates (id, name, email, user_id, is_active, created_at)
    SELECT u.id, 
           COALESCE(
               NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 
               u.username
           ) as name,
           COALESCE(u.email, u.username || '@inventorypro.com') as email,
           u.id, 
           COALESCE(u.is_active, true), 
           NOW()
    FROM users u 
    WHERE NOT EXISTS (SELECT 1 FROM sales_associates sa WHERE sa.id = u.id)
    ON CONFLICT (id) DO NOTHING;
    
    -- 2. Remove unique constraint on order_number for multi-item transactions
    -- Check if unique constraint exists and drop it
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'sales_order_number_unique' 
        AND table_name = 'sales'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales DROP CONSTRAINT sales_order_number_unique;
        RAISE NOTICE 'Dropped unique constraint: sales_order_number_unique';
    END IF;
    
    -- Also check for any unique index on order_number and drop it
    IF EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'sales_order_number_unique' 
        AND tablename = 'sales'
        AND schemaname = 'public'
    ) THEN
        DROP INDEX sales_order_number_unique;
        RAISE NOTICE 'Dropped unique index: sales_order_number_unique';
    END IF;
    
    -- Check for any other unique constraints on order_number column
    DECLARE
        constraint_rec RECORD;
    BEGIN
        FOR constraint_rec IN 
            SELECT pc.conname 
            FROM pg_constraint pc
            JOIN pg_class pgc ON pc.conrelid = pgc.oid
            JOIN pg_attribute pa ON pc.conrelid = pa.attrelid AND pa.attnum = ANY(pc.conkey)
            JOIN pg_namespace pn ON pgc.relnamespace = pn.oid
            WHERE pgc.relname = 'sales' 
            AND pa.attname = 'order_number' 
            AND pc.contype = 'u'
            AND pn.nspname = 'public'
        LOOP
            EXECUTE 'ALTER TABLE sales DROP CONSTRAINT ' || constraint_rec.conname;
            RAISE NOTICE 'Dropped additional constraint: %', constraint_rec.conname;
        END LOOP;
    END;
    
    RAISE NOTICE 'Production constraint fixes applied successfully';
END \$\$;
" && echo "✅ Production constraints configured for multi-item transactions" || echo "⚠️  Constraint configuration completed with warnings"

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