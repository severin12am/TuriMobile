-- Disable RLS and remove all policies for users and language_levels tables

-- Drop all existing policies for users table
DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Users can delete own profile" ON users;
DROP POLICY IF EXISTS "users_select_policy" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_update_policy" ON users;
DROP POLICY IF EXISTS "users_delete_policy" ON users;
DROP POLICY IF EXISTS "users_all_policy" ON users;

-- Drop all existing policies for language_levels table
DROP POLICY IF EXISTS "Users can view own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can update own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can insert own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can delete own language levels" ON language_levels;
DROP POLICY IF EXISTS "language_levels_select_policy" ON language_levels;
DROP POLICY IF EXISTS "language_levels_insert_policy" ON language_levels;
DROP POLICY IF EXISTS "language_levels_update_policy" ON language_levels;
DROP POLICY IF EXISTS "language_levels_delete_policy" ON language_levels;
DROP POLICY IF EXISTS "language_levels_all_policy" ON language_levels;

-- Disable RLS on both tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'language_levels'); 