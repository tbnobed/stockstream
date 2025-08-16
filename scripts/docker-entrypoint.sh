#!/bin/sh

# Docker entrypoint script that handles database setup automatically
echo "🚀 Starting InventoryPro application..."

# Wait for database to be ready
echo "⏳ Waiting for database connection..."
until pg_isready -h postgres -p 5432 -U postgres; do
  echo "Database not ready, waiting..."
  sleep 2
done

echo "✅ Database connection established"

# Check if we need to run migrations
echo "📊 Checking database schema..."
if ! psql $DATABASE_URL -c "SELECT 1 FROM users LIMIT 1;" >/dev/null 2>&1; then
  echo "🔧 Database schema not found, running migrations..."
  npm run db:push
  
  echo "🌱 Creating default admin user..."
  psql $DATABASE_URL -c "
    INSERT INTO users (username, associate_code, first_name, last_name, email, role, is_active)
    VALUES ('admin', 'ADMIN1', 'System', 'Administrator', 'admin@inventorypro.com', 'admin', true)
    ON CONFLICT (username) DO NOTHING;
    
    INSERT INTO sales_associates (id, name, email, user_id, is_active)
    SELECT u.id, 'System Administrator', 'admin@inventorypro.com', u.id, true
    FROM users u WHERE u.username = 'admin'
    ON CONFLICT (id) DO NOTHING;
  "
  
  echo "✅ Database setup completed!"
else
  echo "✅ Database already initialized"
fi

# Start the application
echo "🌐 Starting application server..."
exec "$@"