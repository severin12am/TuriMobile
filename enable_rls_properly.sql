-- Enable RLS with proper Supabase policies
-- Following Supabase best practices for performance and security

-- First, enable RLS on both tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "Users can view own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can update own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can insert own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can delete own language levels" ON language_levels;

-- USERS TABLE POLICIES
-- Following Supabase best practices: separate policies for each operation, use (select auth.uid()), specify roles

CREATE POLICY "Users can view their own profile"
ON users
FOR SELECT
TO authenticated
USING ( (select auth.uid()) = id );

CREATE POLICY "Users can insert their own profile"
ON users
FOR INSERT
TO authenticated
WITH CHECK ( (select auth.uid()) = id );

CREATE POLICY "Users can update their own profile"
ON users
FOR UPDATE
TO authenticated
USING ( (select auth.uid()) = id )
WITH CHECK ( (select auth.uid()) = id );

CREATE POLICY "Users can delete their own profile"
ON users
FOR DELETE
TO authenticated
USING ( (select auth.uid()) = id );

-- LANGUAGE_LEVELS TABLE POLICIES
-- Following Supabase best practices: separate policies for each operation, use (select auth.uid()), specify roles

CREATE POLICY "Users can view their own language levels"
ON language_levels
FOR SELECT
TO authenticated
USING ( (select auth.uid()) = user_id );

CREATE POLICY "Users can insert their own language levels"
ON language_levels
FOR INSERT
TO authenticated
WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can update their own language levels"
ON language_levels
FOR UPDATE
TO authenticated
USING ( (select auth.uid()) = user_id )
WITH CHECK ( (select auth.uid()) = user_id );

CREATE POLICY "Users can delete their own language levels"
ON language_levels
FOR DELETE
TO authenticated
USING ( (select auth.uid()) = user_id );

-- Create indexes for performance (as recommended in the documentation)
CREATE INDEX IF NOT EXISTS idx_users_id ON users USING btree (id);
CREATE INDEX IF NOT EXISTS idx_language_levels_user_id ON language_levels USING btree (user_id);

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'language_levels'); 