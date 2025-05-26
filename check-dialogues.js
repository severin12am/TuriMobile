// Script to check dialogue IDs in phrases_1 table
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

const checkDialogueIds = async () => {
  try {
    console.log('Checking dialogue IDs in phrases_1 table...');
    
    // Get all dialogue_id values
    const { data, error } = await supabase
      .from('phrases_1')
      .select('dialogue_id');
      
    if (error) {
      console.error('Error checking dialogue IDs:', error);
      return;
    }
    
    if (data && data.length > 0) {
      // Extract unique dialogue IDs
      const uniqueDialogueIds = [...new Set(data.map(item => item.dialogue_id))].sort((a, b) => a - b);
      console.log('Unique dialogue IDs:', uniqueDialogueIds);
      
      // Check count of dialogues per id
      const dialogueCountByID = {};
      data.forEach(item => {
        if (!dialogueCountByID[item.dialogue_id]) {
          dialogueCountByID[item.dialogue_id] = 0;
        }
        dialogueCountByID[item.dialogue_id]++;
      });
      
      console.log('\nNumber of phrases per dialogue:');
      for (const [dialogueId, count] of Object.entries(dialogueCountByID)) {
        console.log(`Dialogue ID ${dialogueId}: ${count} phrases`);
      }
      
      // Check if these dialogues have corresponding entries in words_quiz
      const { data: quizData, error: quizError } = await supabase
        .from('words_quiz')
        .select('dialogue_id');
        
      if (quizError) {
        console.error('Error checking words_quiz data:', quizError);
      } else if (quizData && quizData.length > 0) {
        const uniqueQuizDialogueIds = [...new Set(quizData.map(item => item.dialogue_id))].sort((a, b) => a - b);
        console.log('\nDialogues with words in words_quiz table:', uniqueQuizDialogueIds);
        
        // Show which dialogues don't have quiz words
        const dialoguesWithoutQuiz = uniqueDialogueIds.filter(id => !uniqueQuizDialogueIds.includes(id));
        if (dialoguesWithoutQuiz.length > 0) {
          console.log('\nDialogues without quiz words:', dialoguesWithoutQuiz);
        } else {
          console.log('\nAll dialogues have quiz words.');
        }
      } else {
        console.log('\nNo words found in words_quiz table.');
      }
    } else {
      console.log('No phrases found in the phrases_1 table.');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the check
checkDialogueIds(); 