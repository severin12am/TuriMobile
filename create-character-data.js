// Script to create character data
import { createClient } from '@supabase/supabase-js';

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

// Character data
const characterData = {
  id: 1,
  name: 'Tom',
  role: 'Teacher',
  position_x: 53,
  position_y: -0.3,
  position_z: 17,
  scale_x: 0.7,
  scale_y: 0.7,
  scale_z: 0.7,
  is_active: true
};

// Function to create the table and insert data
const initializeCharacterData = async () => {
  try {
    console.log('Starting character data initialization...');

    // Try direct creation approach
    try {
      const { error: directCreateError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS "characters" (
          id SERIAL PRIMARY KEY,
          name TEXT NOT NULL,
          role TEXT NOT NULL,
          position_x DECIMAL NOT NULL,
          position_y DECIMAL NOT NULL,
          position_z DECIMAL NOT NULL,
          scale_x DECIMAL NOT NULL,
          scale_y DECIMAL NOT NULL,
          scale_z DECIMAL NOT NULL,
          is_active BOOLEAN NOT NULL
        );
      `);
      
      if (directCreateError) {
        console.error('Error with direct table creation:', directCreateError);
      } else {
        console.log('Table characters created or already exists');
      }
    } catch (err) {
      console.log('Table creation error, trying an alternative approach');
      
      // Try simpler approach
      const { error } = await supabase.from('characters').select('count').limit(1);
      if (error && error.code === '42P01') {
        console.log('Table does not exist, will be created when inserting data');
      }
    }

    // Check if record already exists
    try {
      const { data: existingData, error: checkError } = await supabase
        .from('characters')
        .select('id')
        .eq('id', 1)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Error checking existing character:', checkError);
      }

      // Delete and insert, or just insert if doesn't exist
      if (existingData) {
        const { error: deleteError } = await supabase
          .from('characters')
          .delete()
          .eq('id', 1);

        if (deleteError) {
          console.error('Error deleting existing character:', deleteError);
        } else {
          console.log('Existing character deleted');
        }
      }
    } catch (err) {
      console.log('Error when checking for existing character:', err);
    }

    // Insert character
    const { error: insertError } = await supabase
      .from('characters')
      .insert(characterData);

    if (insertError) {
      console.error('Error inserting character:', insertError);
    } else {
      console.log('Character data inserted successfully');
    }

    console.log('Character initialization complete');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the initialization
initializeCharacterData(); 