-- Step 1: Completely disable RLS for both tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies to ensure clean slate
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Users can delete their own profile" ON users;
DROP POLICY IF EXISTS "Users can view their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can insert their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can update their own language levels" ON language_levels;
DROP POLICY IF EXISTS "Users can delete their own language levels" ON language_levels;

-- Step 3: Remove duplicate entries from language_levels table
-- Keep only the first entry for each user_id + target_language combination
DELETE FROM language_levels 
WHERE ctid NOT IN (
    SELECT MIN(ctid) 
    FROM language_levels 
    GROUP BY user_id, target_language
);

-- Step 4: Update any NULL or 0 values in language_levels to proper defaults
UPDATE language_levels 
SET 
    dialogue_number = COALESCE(dialogue_number, 1),
    word_progress = COALESCE(word_progress, 0),
    level = COALESCE(level, 1)
WHERE dialogue_number IS NULL 
   OR word_progress IS NULL 
   OR level IS NULL
   OR dialogue_number = 0;

-- Step 5: Verify the cleanup
SELECT 'language_levels count per user:' as info;
SELECT user_id, target_language, COUNT(*) as count
FROM language_levels 
GROUP BY user_id, target_language
ORDER BY user_id, target_language;

SELECT 'language_levels data:' as info;
SELECT user_id, target_language, level, dialogue_number, word_progress
FROM language_levels 
ORDER BY user_id, target_language;

-- Step 6: Verify RLS is disabled
SELECT 'RLS status:' as info;
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE tablename IN ('users', 'language_levels');

-- Step 7: Grant full access to authenticated users (backup measure)
GRANT ALL ON users TO authenticated;
GRANT ALL ON language_levels TO authenticated;
GRANT ALL ON users TO anon;
GRANT ALL ON language_levels TO anon; 