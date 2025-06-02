// Script to check language_levels table
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

async function checkLanguageLevels() {
  try {
    console.log('Checking language_levels table...');
    
    // Get all language_levels
    const { data: levels, error: levelsError } = await supabase
      .from('language_levels')
      .select('*');
      
    if (levelsError) {
      console.error('Error fetching language levels:', levelsError);
      return;
    }
    
    if (levels && levels.length > 0) {
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
    
    // Check words_quiz table for dialogue 1
    const { data: words, error: wordsError } = await supabase
      .from('words_quiz')
      .select('*')
      .eq('dialogue_id', 1);
      
    if (wordsError) {
      console.error('Error fetching words:', wordsError);
      return;
    }
    
    if (words && words.length > 0) {
      console.log(`Found ${words.length} words with dialogue_id = 1`);
      
      // Display word count per dialogue
      const { data: allWords, error: allWordsError } = await supabase
        .from('words_quiz')
        .select('dialogue_id');
        
      if (!allWordsError && allWords) {
        // Count words per dialogue
        const wordsByDialogue = {};
        allWords.forEach(word => {
          wordsByDialogue[word.dialogue_id] = (wordsByDialogue[word.dialogue_id] || 0) + 1;
        });
        
        console.log('Word count by dialogue_id:');
        Object.keys(wordsByDialogue).sort((a, b) => a - b).forEach(dialogueId => {
          console.log(`  Dialogue ${dialogueId}: ${wordsByDialogue[dialogueId]} words`);
        });
        
        // Count total words from dialogue 1 to 10
        let totalWords = 0;
        for (let i = 1; i <= 10; i++) {
          totalWords += wordsByDialogue[i] || 0;
        }
        console.log(`Total words in dialogues 1-10: ${totalWords}`);
      }
    } else {
      console.log('No words with dialogue_id = 1 found');
    }
  } catch (error) {
    console.error('Error checking database:', error);
  }
}

checkLanguageLevels(); 