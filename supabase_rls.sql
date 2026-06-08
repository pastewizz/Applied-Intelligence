-- Rename legacy column to match Supabase architecture
ALTER TABLE IF EXISTS users RENAME COLUMN firebase_uid TO supabase_uid;

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 1. Users Table Policies
-- Users can read their own data
CREATE POLICY "Users can view own profile" 
ON users FOR SELECT 
USING (auth.uid()::text = supabase_uid);

-- Users can update their own data
CREATE POLICY "Users can update own profile" 
ON users FOR UPDATE 
USING (auth.uid()::text = supabase_uid);

-- 2. API Keys Table Policies
-- Users can view their own API keys
CREATE POLICY "Users can view own API keys" 
ON api_keys FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM users WHERE supabase_uid = auth.uid()::text
  )
);

-- Users can update their own API keys (e.g. changing names or deactivating)
CREATE POLICY "Users can update own API keys" 
ON api_keys FOR UPDATE 
USING (
  user_id IN (
    SELECT id FROM users WHERE supabase_uid = auth.uid()::text
  )
);

-- 3. Usage Table Policies
-- Users can view their own usage stats
CREATE POLICY "Users can view own usage" 
ON usage FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM users WHERE supabase_uid = auth.uid()::text
  )
);

-- 4. Payments Table Policies
-- Users can view their own payments
CREATE POLICY "Users can view own payments" 
ON payments FOR SELECT 
USING (
  user_id IN (
    SELECT id FROM users WHERE supabase_uid = auth.uid()::text
  )
);

-- 5. Audit Logs Table Policies
-- Only admins (service role) can view or insert audit logs. No public or authenticated user access.
-- By default, if no policy exists, RLS denies all access. 
-- The backend (using Service Role Key or direct DB connection) bypasses RLS.

-- Note: 
-- These policies ensure that if your frontend connects directly to Supabase via supabase-js, 
-- users can only access their own data.
-- The FastAPI backend uses the database connection URL directly (via SQLAlchemy), 
-- which acts as a superuser and bypasses RLS to perform administrative actions (like inserting payments).
