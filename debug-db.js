// Script to check database tables
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
  global: {
    headers: {
      apikey: supabaseKey
    }
  }
});

async function checkDatabase() {
  try {
    console.log('=== CHECKING LANGUAGE_LEVELS TABLE ===');
    
    // Check language_levels table
    const { data: levels, error: levelsError } = await supabase
      .from('language_levels')
      .select('*');
      
    if (levelsError) {
      console.error('Error fetching language levels:', levelsError);
    } else if (levels && levels.length > 0) {
      console.log(`Found ${levels.length} language_levels entries`);
      
      // Display each entry
      levels.forEach(level => {
        console.log(`Entry ID: ${level.id}`);
        console.log(`  User ID: ${level.user_id}`);
        console.log(`  Target Language: ${level.target_language}`);
        console.log(`  Mother Language: ${level.mother_language || 'Not set'}`);
        console.log(`  Level: ${level.level}`);
        console.log(`  Word Progress: ${level.word_progress}`);
        console.log(`  Dialogue Number: ${level.dialogue_number}`);
        console.log('-----------------------------------');
      });
    } else {
      console.log('No language_levels entries found');
    }
    
    console.log('\n=== CHECKING WORDS_QUIZ TABLE ===');
    
    // Count words by dialogue_id
    const { data: dialogueWords, error: dialogueWordsError } = await supabase
      .from('words_quiz')
      .select('dialogue_id');
      
    if (dialogueWordsError) {
      console.error('Error fetching dialogue words:', dialogueWordsError);
    } else if (dialogueWords && dialogueWords.length > 0) {
      // Group by dialogue_id
      const wordsByDialogue = {};
      dialogueWords.forEach(word => {
        const dialogueId = word.dialogue_id;
        wordsByDialogue[dialogueId] = (wordsByDialogue[dialogueId] || 0) + 1;
      });
      
      console.log('Word count by dialogue_id:');
      Object.keys(wordsByDialogue)
        .sort((a, b) => parseInt(a) - parseInt(b))
        .forEach(dialogueId => {
          console.log(`  Dialogue ${dialogueId}: ${wordsByDialogue[dialogueId]} words`);
        });
      
      // Calculate total words in dialogues 1-10
      let totalWords = 0;
      for (let i = 1; i <= 10; i++) {
        totalWords += wordsByDialogue[i] || 0;
      }
      console.log(`Total words in dialogues 1-10: ${totalWords}`);
      
      // Get words for dialogue 1
      const { data: words1, error: words1Error } = await supabase
        .from('words_quiz')
        .select('*')
        .eq('dialogue_id', 1);
        
      if (!words1Error && words1) {
        console.log(`\nDetails for dialogue 1 (${words1.length} words):`);
        words1.forEach(word => {
          console.log(`  ID: ${word.id} | English: "${word.entry_in_en}" | Russian: "${word.entry_in_ru}"`);
        });
      }
    } else {
      console.log('No words found in words_quiz table');
    }
    
    // Check if checkAndUpdateUserProgress function exists
    console.log('\n=== CHECKING AUTH FUNCTIONS ===');
    const { data: functions, error: functionsError } = await supabase.rpc('get_user_functions');
    
    if (functionsError) {
      console.log('Cannot check database functions:', functionsError.message);
    } else {
      console.log('Database functions available:', functions?.length || 0);
    }
    
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkDatabase(); 