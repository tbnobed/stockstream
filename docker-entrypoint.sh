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
    
    # Debug: List created tables
    echo "🔍 Verifying created tables..."
    psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;" 2>/dev/null | head -20
    
    # Ensure categories table exists
    echo "📂 Ensuring categories table exists..."
    psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        type VARCHAR NOT NULL,
        value VARCHAR NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    " >/dev/null 2>&1 && echo "✅ Categories table verified" || echo "⚠️  Categories table creation warning"
    
    # Ensure media_files table exists (for logo library)
    echo "🖼️  Ensuring media_files table exists..."
    psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS media_files (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        file_name TEXT NOT NULL,
        original_name TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        object_path TEXT NOT NULL,
        category TEXT DEFAULT 'logo',
        uploaded_by UUID REFERENCES users(id),
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW()
    );
    " >/dev/null 2>&1 && echo "✅ Media files table verified" || echo "⚠️  Media files table creation warning"
    
    # Ensure label_templates table exists (for label template persistence)
    echo "🏷️  Ensuring label_templates table exists..."
    psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS label_templates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id),
        name TEXT NOT NULL DEFAULT 'Default Template',
        is_default BOOLEAN DEFAULT false,
        selected_inventory_id UUID REFERENCES inventory_items(id),
        product_name TEXT DEFAULT 'Product Name',
        product_code TEXT DEFAULT 'PRD-001',
        price TEXT DEFAULT '25.00',
        qr_content TEXT DEFAULT 'PRD-001',
        custom_message TEXT DEFAULT 'Thank you for your purchase',
        size_indicator TEXT DEFAULT 'M',
        logo_url TEXT DEFAULT '',
        show_qr BOOLEAN DEFAULT true,
        show_logo BOOLEAN DEFAULT false,
        show_price BOOLEAN DEFAULT true,
        show_message BOOLEAN DEFAULT true,
        show_size BOOLEAN DEFAULT true,
        layout_positions TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
    );
    " >/dev/null 2>&1 && echo "✅ Label templates table verified" || echo "⚠️  Label templates table creation warning"
    
    # Ensure volunteer_sessions table exists (for volunteer system)
    echo "🎯 Ensuring volunteer_sessions table exists..."
    psql "$DATABASE_URL" -c "
    CREATE TABLE IF NOT EXISTS volunteer_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        session_token VARCHAR(128) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
    );
    " >/dev/null 2>&1 && echo "✅ Volunteer sessions table verified" || echo "⚠️  Volunteer sessions table creation warning"
    
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
    -- 0. Ensure categories table exists (for existing databases that don't have it)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories' 
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE categories (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            type VARCHAR NOT NULL,
            value VARCHAR NOT NULL,
            display_order INTEGER DEFAULT 0,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing categories table';
    END IF;
    
    -- 0a. Ensure media_files table exists (for logo library functionality)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'media_files' 
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE media_files (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            file_name TEXT NOT NULL,
            original_name TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            object_path TEXT NOT NULL,
            category TEXT DEFAULT 'logo',
            uploaded_by UUID REFERENCES users(id),
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing media_files table';
    END IF;
    
    -- 0b. Ensure label_templates table exists (for label template persistence)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'label_templates' 
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE label_templates (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id),
            name TEXT NOT NULL DEFAULT 'Default Template',
            is_default BOOLEAN DEFAULT false,
            selected_inventory_id UUID REFERENCES inventory_items(id),
            product_name TEXT DEFAULT 'Product Name',
            product_code TEXT DEFAULT 'PRD-001',
            price TEXT DEFAULT '25.00',
            qr_content TEXT DEFAULT 'PRD-001',
            custom_message TEXT DEFAULT 'Thank you for your purchase',
            size_indicator TEXT DEFAULT 'M',
            logo_url TEXT DEFAULT '',
            show_qr BOOLEAN DEFAULT true,
            show_logo BOOLEAN DEFAULT false,
            show_price BOOLEAN DEFAULT true,
            show_message BOOLEAN DEFAULT true,
            show_size BOOLEAN DEFAULT true,
            layout_positions TEXT,
            created_at TIMESTAMP DEFAULT NOW(),
            updated_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing label_templates table';
    END IF;
    
    -- 0c. Ensure volunteer_sessions table exists (for volunteer system)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'volunteer_sessions' 
        AND table_schema = 'public'
    ) THEN
        CREATE TABLE volunteer_sessions (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            email TEXT NOT NULL,
            session_token VARCHAR(128) NOT NULL UNIQUE,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT NOW()
        );
        RAISE NOTICE 'Created missing volunteer_sessions table';
    END IF;
    
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
    
    -- 3. Add new category fields to inventory_items if they don't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'design' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN design TEXT;
        RAISE NOTICE 'Added design column to inventory_items';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'group_type' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN group_type TEXT;
        RAISE NOTICE 'Added group_type column to inventory_items';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'style_group' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN style_group TEXT;
        RAISE NOTICE 'Added style_group column to inventory_items';
    END IF;
    
    -- 4. Add is_active field for archive functionality
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'inventory_items' 
        AND column_name = 'is_active' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE inventory_items ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE 'Added is_active column to inventory_items';
        
        -- Set all existing items as active
        UPDATE inventory_items SET is_active = true WHERE is_active IS NULL;
        RAISE NOTICE 'Set all existing inventory items as active';
    ELSE
        -- Ensure existing items without is_active set are marked as active
        UPDATE inventory_items SET is_active = true WHERE is_active IS NULL;
        RAISE NOTICE 'Ensured all inventory items have is_active set';
    END IF;
    
    -- 5. Add receipt fields to sales table for QR code receipt functionality
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'receipt_token' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN receipt_token VARCHAR(50);
        RAISE NOTICE 'Added receipt_token column to sales table';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'receipt_expires_at' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN receipt_expires_at TIMESTAMP;
        RAISE NOTICE 'Added receipt_expires_at column to sales table';
    END IF;
    
    -- 6. Add volunteer email field to sales table for volunteer system support
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'volunteer_email' 
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE sales ADD COLUMN volunteer_email TEXT;
        RAISE NOTICE 'Added volunteer_email column to sales table';
    END IF;
    
    -- 6a. Make sales_associate_id nullable for volunteer sales support
    -- Check if sales_associate_id is currently NOT NULL and make it nullable
    DECLARE
        column_nullable TEXT;
    BEGIN
        SELECT is_nullable INTO column_nullable
        FROM information_schema.columns 
        WHERE table_name = 'sales' 
        AND column_name = 'sales_associate_id' 
        AND table_schema = 'public';
        
        IF column_nullable = 'NO' THEN
            ALTER TABLE sales ALTER COLUMN sales_associate_id DROP NOT NULL;
            RAISE NOTICE 'Made sales_associate_id column nullable for volunteer system';
        ELSE
            RAISE NOTICE 'sales_associate_id column is already nullable';
        END IF;
    END;
    
    -- 7. Fix category display orders to be sequential (only if categories table exists)
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'categories' 
        AND table_schema = 'public'
    ) THEN
        WITH ordered_categories AS (
            SELECT 
                id,
                type,
                ROW_NUMBER() OVER (PARTITION BY type ORDER BY display_order, value) - 1 AS new_display_order
            FROM categories 
            WHERE is_active = true
        )
        UPDATE categories 
        SET display_order = ordered_categories.new_display_order,
            updated_at = NOW()
        FROM ordered_categories 
        WHERE categories.id = ordered_categories.id;
        RAISE NOTICE 'Fixed category display orders to be sequential';
    ELSE
        RAISE NOTICE 'Categories table does not exist yet, skipping display order fix';
    END IF;
    
    RAISE NOTICE 'Production constraint fixes and schema updates applied successfully';
END \$\$;
" && echo "✅ Production constraints and schema configured for multi-item transactions, category fields, volunteer system, and QR code receipts" || echo "⚠️  Constraint and schema configuration completed with warnings"

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