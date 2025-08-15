-- Initialize InventoryPro Database
-- This script sets up the database with proper permissions and extensions

-- Create application database if it doesn't exist
SELECT 'CREATE DATABASE inventorypro'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inventorypro')\gexec

-- Connect to the application database
\c inventorypro;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Create application user if needed (for non-container setups)
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_user WHERE usename = 'app_user') THEN
        CREATE USER app_user WITH PASSWORD 'app_password';
        GRANT CONNECT ON DATABASE inventorypro TO app_user;
        GRANT USAGE ON SCHEMA public TO app_user;
        GRANT CREATE ON SCHEMA public TO app_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
        ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE ON SEQUENCES TO app_user;
    END IF;
END
$$;

-- Create logs table for application logging
CREATE TABLE IF NOT EXISTS app_logs (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    level VARCHAR(10) NOT NULL,
    message TEXT NOT NULL,
    meta JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_app_logs_timestamp ON app_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_app_logs_level ON app_logs(level);

COMMENT ON TABLE app_logs IS 'Application logging table for debugging and monitoring';