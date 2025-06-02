-- =====================================================
-- FINAL RLS SETUP - COMPREHENSIVE SOLUTION
-- =====================================================

-- Step 1: Clean up existing policies completely
DROP POLICY IF EXISTS "users_policy" ON users;
DROP POLICY IF EXISTS "language_levels_policy" ON language_levels;
DROP POLICY IF EXISTS "Users can access their own data" ON users;
DROP POLICY IF EXISTS "Users can access their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Enable read access for own data" ON users;
DROP POLICY IF EXISTS "Enable insert for own data" ON users;
DROP POLICY IF EXISTS "Enable update for own data" ON users;
DROP POLICY IF EXISTS "Enable delete for own data" ON users;
DROP POLICY IF EXISTS "Enable read access for own language levels" ON language_levels;
DROP POLICY IF EXISTS "Enable insert for own language levels" ON language_levels;
DROP POLICY IF EXISTS "Enable update for own language levels" ON language_levels;
DROP POLICY IF EXISTS "Enable delete for own language levels" ON language_levels;

-- Step 2: Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels ENABLE ROW LEVEL SECURITY;

-- Step 4: Create comprehensive policies for users table
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "users_insert_own" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_delete_own" ON users
  FOR DELETE USING (auth.uid() = id);

-- Step 5: Create comprehensive policies for language_levels table
CREATE POLICY "language_levels_select_own" ON language_levels
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "language_levels_insert_own" ON language_levels
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "language_levels_update_own" ON language_levels
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "language_levels_delete_own" ON language_levels
  FOR DELETE USING (auth.uid() = user_id);

-- Step 6: Grant necessary permissions to authenticated users
GRANT ALL ON users TO authenticated;
GRANT ALL ON language_levels TO authenticated;

-- Step 7: Grant necessary permissions to anon users (for signup)
GRANT INSERT ON users TO anon;
GRANT INSERT ON language_levels TO anon;

-- Verification queries (run these to check if policies work)
-- SELECT * FROM users WHERE id = auth.uid();
-- SELECT * FROM language_levels WHERE user_id = auth.uid(); 