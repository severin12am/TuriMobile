// Script to create and initialize the user_progress table
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase configuration from environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

// Validate environment configuration
if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration. Please check your .env file.');
  process.exit(1);
}

// Log warning if using fallback credentials
if (supabaseUrl === 'https://fjvltffpcafcbbpwzyml.supabase.co') {
  console.warn('⚠️ Using fallback Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const createUserProgressTable = async () => {
  try {
    console.log('Setting up user_progress table...');
    
    // Check if table already exists
    const { data: existingTable, error: checkError } = await supabase
      .from('user_progress')
      .select('*')
      .limit(1);
      
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking user_progress table:', checkError);
      return;
    }
    
    // Create table if it doesn't exist
    const createTableQuery = `
    CREATE TABLE IF NOT EXISTS "user_progress" (
      "id" SERIAL PRIMARY KEY,
      "user_id" UUID NOT NULL,
      "character_id" INTEGER NOT NULL,
      "dialogue_id" INTEGER NOT NULL,
      "completed" BOOLEAN DEFAULT false,
      "score" FLOAT,
      "passed" BOOLEAN DEFAULT false,
      "language_id" TEXT,
      "completed_at" TIMESTAMP WITH TIME ZONE,
      UNIQUE ("user_id", "character_id", "dialogue_id")
    );
    `;
    
    // Execute the query
    const { error: createError } = await supabase.query(createTableQuery);
    
    if (createError) {
      console.error('Error creating user_progress table:', createError);
      return;
    }
    
    console.log('User progress table created successfully');
    
    // Create sample data
    console.log('Creating sample user progress data...');
    
    // Use default user ID since we don't have a real auth system yet
    const defaultUserId = '00000000-0000-0000-0000-000000000000';
    
    // Generate sample progress data
    const sampleProgressData = [
      {
        user_id: defaultUserId,
        character_id: 1,
        dialogue_id: 1,
        completed: true,
        score: 85,
        passed: true,
        language_id: 'ru',
        completed_at: new Date().toISOString()
      }
    ];
    
    // Insert sample data
    const { error: insertError } = await supabase
      .from('user_progress')
      .upsert(sampleProgressData);
      
    if (insertError) {
      console.error('Error inserting sample progress data:', insertError);
      return;
    }
    
    console.log('Sample progress data inserted successfully');
    
    // Check the created table
    const { data, error } = await supabase
      .from('user_progress')
      .select('*');
      
    if (error) {
      console.error('Error retrieving user progress data:', error);
      return;
    }
    
    console.log('Current user progress data:', data);
    
  } catch (error) {
    console.error('Error setting up user_progress table:', error);
  }
};

createUserProgressTable(); 