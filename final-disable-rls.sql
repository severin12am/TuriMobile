-- FINAL DISABLE RLS - GET APP WORKING
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;

-- Remove all policies
DROP POLICY IF EXISTS "users_all_operations" ON users;
DROP POLICY IF EXISTS "language_levels_all_operations" ON language_levels; 