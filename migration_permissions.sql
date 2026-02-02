-- Run this script in your Supabase SQL Editor

-- 1. Add new columns for granular permissions and distinct auth role
ALTER TABLE staff 
ADD COLUMN IF NOT EXISTS auth_role TEXT DEFAULT 'User',
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{}'::jsonb;

-- 2. Ensure username and password columns exist (if not already present)
ALTER TABLE staff
ADD COLUMN IF NOT EXISTS username TEXT,
ADD COLUMN IF NOT EXISTS password TEXT;

-- 3. Optional: Comment to document the permissions structure
COMMENT ON COLUMN staff.permissions IS 'JSON object storing module permissions, e.g., {"/assets": "edit", "/inventory": "view"}';
