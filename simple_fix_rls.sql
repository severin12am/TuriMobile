-- SIMPLE FIX: Only disable RLS for existing tables

-- Step 1: Disable RLS for existing tables only
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE language_levels DISABLE ROW LEVEL SECURITY;
ALTER TABLE words_quiz DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL policies for existing tables
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on users table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'users') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
    
    -- Drop all policies on language_levels table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'language_levels') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON language_levels';
    END LOOP;
    
    -- Drop all policies on words_quiz table
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'words_quiz') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON words_quiz';
    END LOOP;
END $$;

-- Step 3: Grant full access to all roles for existing tables
GRANT ALL ON users TO authenticated, anon, service_role;
GRANT ALL ON language_levels TO authenticated, anon, service_role;
GRANT ALL ON words_quiz TO authenticated, anon, service_role;

-- Step 4: Remove duplicate language_levels entries (keep the latest one)
DELETE FROM language_levels a USING language_levels b 
WHERE a.ctid < b.ctid 
AND a.user_id = b.user_id 
AND a.target_language = b.target_language;

-- Step 5: Update NULL values to defaults in language_levels
UPDATE language_levels 
SET 
    dialogue_number = COALESCE(dialogue_number, 1),
    word_progress = COALESCE(word_progress, 0),
    level = COALESCE(level, 1)
WHERE dialogue_number IS NULL 
   OR word_progress IS NULL 
   OR level IS NULL;

-- Step 6: Verify everything is working
SELECT 'RLS Status:' as info;
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('users', 'language_levels', 'words_quiz');

SELECT 'Language Levels Data:' as info;
SELECT user_id, target_language, level, dialogue_number, word_progress, email
FROM language_levels 
ORDER BY user_id, target_language; 