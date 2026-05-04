-- PostgreSQL initialization script
-- This script runs when the database container is first created
-- Add your custom initialization SQL here

-- Example: Create extensions
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Example: Create custom types
-- CREATE TYPE user_status AS ENUM ('active', 'inactive', 'suspended');

-- Example: Create initial roles/permissions
-- CREATE ROLE readonly;
-- GRANT CONNECT ON DATABASE db_commune_tuyphuoc TO readonly;
-- GRANT USAGE ON SCHEMA public TO readonly;
-- GRANT SELECT ON ALL TABLES IN SCHEMA public TO readonly;

-- Note: TypeORM migrations should handle schema creation
-- This file is for additional setup that needs to run before migrations
