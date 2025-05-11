// Script to check quiz data
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const checkQuizData = async () => {
  try {
    console.log('Checking all quiz data structure in the table...');
    
    // Get entire quiz table data
    const { data, error } = await supabase
      .from('quiz')
      .select('*');
      
    if (error) {
      console.error('Error checking quiz data:', error);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('Total words in quiz table:', data.length);
      
      // Group by dialogue_id
      const wordsByDialogue = {};
      data.forEach(word => {
        if (!wordsByDialogue[word.dialogue_id]) {
          wordsByDialogue[word.dialogue_id] = [];
        }
        wordsByDialogue[word.dialogue_id].push(word);
      });
      
      // Print summary by dialogue
      console.log('\nWords by dialogue_id:');
      Object.keys(wordsByDialogue).forEach(dialogueId => {
        console.log(`Dialogue ID ${dialogueId}: ${wordsByDialogue[dialogueId].length} words`);
      });
      
      // Print details for dialogue 1
      console.log('\nDetails for dialogue_id = 1:');
      const dialogue1Words = wordsByDialogue[1] || [];
      dialogue1Words.forEach(word => {
        console.log(`ID: ${word.id} | EN: "${word.entry_in_en}" | RU: "${word.entry_in_ru}" | is_from_500: ${word.is_from_500}`);
      });
    } else {
      console.log('No quiz data found in the table');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the check
checkQuizData(); 