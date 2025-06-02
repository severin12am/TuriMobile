-- IMMEDIATE FIX - DISABLE RLS COMPLETELY
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "users_select_own" ON users;
DROP POLICY IF EXISTS "users_insert_own" ON users;
DROP POLICY IF EXISTS "users_update_own" ON users;
DROP POLICY IF EXISTS "users_delete_own" ON users;
DROP POLICY IF EXISTS "language_levels_select_own" ON language_levels;
DROP POLICY IF EXISTS "language_levels_insert_own" ON language_levels;
DROP POLICY IF EXISTS "language_levels_update_own" ON language_levels;
DROP POLICY IF EXISTS "language_levels_delete_own" ON language_levels; 