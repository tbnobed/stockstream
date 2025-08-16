#!/bin/sh

# Simplified Docker entrypoint that avoids interactive prompts
echo "🚀 Starting InventoryPro application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "✅ Database connection established"

# Check if we need to run migrations by looking for users table specifically
echo "📊 Checking database schema..."
USERS_TABLE_EXISTS=$(psql $DATABASE_URL -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'users';" 2>/dev/null | tr -d ' ')

if [ "$USERS_TABLE_EXISTS" = "0" ] || [ -z "$USERS_TABLE_EXISTS" ]; then
  echo "🔧 No tables found, creating database schema..."
  
  # Use drizzle-kit push with --force to skip prompts
  npx drizzle-kit push --force
  
  # Wait for schema creation to complete
  sleep 3
  
  echo "🌱 Creating default admin user..."
  psql $DATABASE_URL -c "
    INSERT INTO users (username, associate_code, first_name, last_name, email, role, is_active)
    VALUES ('admin', 'ADMIN1', 'System', 'Administrator', 'admin@inventorypro.com', 'admin', true)
    ON CONFLICT (username) DO NOTHING;
    
    INSERT INTO sales_associates (id, name, email, user_id, is_active)
    SELECT u.id, 'System Administrator', 'admin@inventorypro.com', u.id, true
    FROM users u WHERE u.username = 'admin'
    ON CONFLICT (id) DO NOTHING;
  " 2>/dev/null && echo "✅ Admin user created!" || echo "⚠️  Admin user creation skipped (may already exist)"
  
  echo "✅ Database setup completed!"
else
  echo "✅ Database already initialized (users table found)"
fi

# Start the application
echo "🌐 Starting application server..."
exec "$@"