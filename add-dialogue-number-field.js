/**
 * Migration script to add dialogue_number column to language_levels table
 * 
 * Run with: node add-dialogue-number-field.js
 */

const { createClient } = require('@supabase/supabase-js');

// Replace with your actual Supabase URL and service role key (from Project Settings > API)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project-url.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Ensure we have the necessary credentials
if (!SUPABASE_SERVICE_KEY) {
  console.error('Please provide the Supabase service role key as SUPABASE_SERVICE_KEY environment variable');
  process.exit(1);
}

// Create Supabase client with service role key (admin privileges)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Main migration function
 */
async function addDialogueNumberField() {
  console.log('Starting migration to add dialogue_number field to language_levels table...');
  
  try {
    // First check if the column already exists
    const { data: columns, error: columnError } = await supabase
      .from('language_levels')
      .select('dialogue_number')
      .limit(1);
      
    if (!columnError) {
      console.log('The dialogue_number column already exists in the language_levels table.');
      await updateExistingRecords();
      return;
    }
    
    // Column doesn't exist, determine how to add it
    if (columnError.message && columnError.message.includes('dialogue_number')) {
      console.log('Adding dialogue_number column to language_levels table...');
      
      // Use SQL extension to add the column
      // Note: This requires enabling the pg_sql extension in your Supabase project
      const { error } = await supabase.rpc('execute_sql', {
        sql: 'ALTER TABLE language_levels ADD COLUMN dialogue_number INTEGER DEFAULT 0;'
      });
      
      if (error) {
        console.error('Error adding dialogue_number column:', error);
        
        // Alternative approach if RPC fails
        console.log('Attempting to add column using direct SQL query...');
        const { error: sqlError } = await supabase.rpc('run_sql_query', {
          query: 'ALTER TABLE language_levels ADD COLUMN dialogue_number INTEGER DEFAULT 0;'
        });
        
        if (sqlError) {
          console.error('Failed to add dialogue_number column using direct SQL. Please add it manually in the Supabase dashboard.');
          console.error(sqlError);
          return;
        }
      }
      
      console.log('Successfully added dialogue_number column.');
      
      // Now update the existing records
      await updateExistingRecords();
    } else {
      console.error('Unexpected error checking for dialogue_number column:', columnError);
    }
  } catch (error) {
    console.error('Migration failed:', error);
  }
}

/**
 * Update existing records to set dialogue_number based on word_progress
 */
async function updateExistingRecords() {
  console.log('Updating existing records to set dialogue_number based on word_progress...');
  
  try {
    // Fetch all language level records that have word_progress but no dialogue_number
    const { data: levels, error } = await supabase
      .from('language_levels')
      .select('*')
      .is('dialogue_number', null)
      .order('id');
      
    if (error) {
      console.error('Error fetching language levels:', error);
      return;
    }
    
    if (!levels || levels.length === 0) {
      console.log('No records need updating.');
      return;
    }
    
    console.log(`Found ${levels.length} records to update.`);
    
    // Define words per dialogue (must match the application definition)
    const dialogueWordCounts = {
      1: 7, 2: 6, 3: 7, 4: 7, 5: 7,
      6: 8, 7: 8, 8: 8, 9: 8, 10: 8
    };
    
    // Process each record
    for (const level of levels) {
      if (!level.word_progress) {
        // Skip records with no word progress
        continue;
      }
      
      // Estimate dialogue number from word progress
      // This is an approximation - we'll try to reverse engineer the dialogue number
      let runningTotal = 0;
      let estimatedDialogue = 0;
      
      for (let i = 1; i <= 30; i++) { // Maximum of 30 dialogues in the app
        const wordCount = dialogueWordCounts[i] || 7; // Default to 7 words per dialogue
        runningTotal += wordCount;
        
        if (runningTotal >= level.word_progress) {
          estimatedDialogue = i;
          break;
        }
      }
      
      // If we couldn't estimate, use a simple approach based on word_progress
      if (estimatedDialogue === 0 && level.word_progress > 0) {
        estimatedDialogue = Math.max(1, Math.floor(level.word_progress / 7));
      }
      
      if (estimatedDialogue > 0) {
        console.log(`Updating user ${level.user_id}: Setting dialogue_number to ${estimatedDialogue} based on word_progress ${level.word_progress}`);
        
        // Update the record
        const { error: updateError } = await supabase
          .from('language_levels')
          .update({ dialogue_number: estimatedDialogue })
          .eq('user_id', level.user_id);
          
        if (updateError) {
          console.error(`Error updating record for user ${level.user_id}:`, updateError);
        }
      }
    }
    
    console.log('Finished updating existing records.');
  } catch (error) {
    console.error('Error updating existing records:', error);
  }
}

// Run the migration
addDialogueNumberField().then(() => {
  console.log('Migration completed.');
  process.exit(0);
}).catch((error) => {
  console.error('Migration failed with error:', error);
  process.exit(1);
}); 