-- Completely disable RLS for both tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can insert their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can update their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can delete their own language levels" ON language_levels;

-- Verify RLS is disabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'language_levels'); 