-- Simple SQL script to create admin user directly
-- This avoids the module loading issues

INSERT INTO users (id, username, associate_code, first_name, last_name, email, role, is_active)
VALUES (
  gen_random_uuid(),
  'admin',
  'ADMIN1', 
  'System',
  'Administrator',
  'admin@inventorypro.com',
  'admin',
  true
) ON CONFLICT (username) DO NOTHING;

-- Also create sales associate entry
INSERT INTO sales_associates (id, name, email, user_id, is_active)
SELECT 
  u.id,
  'System Administrator',
  'admin@inventorypro.com',
  u.id,
  true
FROM users u 
WHERE u.username = 'admin'
ON CONFLICT (id) DO NOTHING;