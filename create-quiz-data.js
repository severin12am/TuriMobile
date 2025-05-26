// Script to create words_quiz data for dialogue 1
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// First check the structure of the words_quiz table
const checkTableStructure = async () => {
  try {
    console.log('Checking words_quiz table structure...');
    
    // Try to get a single record to see the structure
    const { data, error } = await supabase
      .from('words_quiz')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('Error checking table structure:', error);
      console.log('Attempting to create table with expected structure...');
      return null;
    }
    
    if (data && data.length > 0) {
      console.log('Found existing table structure:', Object.keys(data[0]));
      return Object.keys(data[0]);
    }
    
    return null;
  } catch (error) {
    console.error('Error:', error);
    return null;
  }
};

// Modified words_quiz data for dialogue 1
// Using the actual table structure with entry_in_en and entry_in_ru columns
// Removed the hardcoded IDs to let the database assign them
const createQuizData = (columns) => {
  return [
    {
      entry_in_en: 'hello',
      entry_in_ru: 'привет',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'welcome',
      entry_in_ru: 'добро пожаловать',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'nice to meet you',
      entry_in_ru: 'приятно познакомиться',
      dialogue_id: 1,
      is_from_500: false
    },
    {
      entry_in_en: 'language',
      entry_in_ru: 'язык',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'learn',
      entry_in_ru: 'учить',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'name',
      entry_in_ru: 'имя',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'my',
      entry_in_ru: 'мой',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'your',
      entry_in_ru: 'твой',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'thank you',
      entry_in_ru: 'спасибо',
      dialogue_id: 1,
      is_from_500: true
    },
    {
      entry_in_en: 'excuse me',
      entry_in_ru: 'простите',
      dialogue_id: 1,
      is_from_500: false
    }
  ];
};

// Function to create the table and insert data
const initializeQuizData = async () => {
  try {
    console.log('Starting words_quiz data initialization...');
    
    // Check the existing table structure
    const columns = await checkTableStructure();
    
    // If no existing table, create it with our expected structure
    if (!columns) {
      try {
        const { error: createError } = await supabase.query(`
          CREATE TABLE IF NOT EXISTS "words_quiz" (
            id SERIAL PRIMARY KEY,
            dialogue_id INTEGER NOT NULL,
            word_en TEXT NOT NULL,
            word_ru TEXT NOT NULL,
            word_en_ru TEXT,
            word_ru_en TEXT
          );
        `);
        
        if (createError) {
          console.error('Error creating table:', createError);
          return;
        } else {
          console.log('Table words_quiz created successfully');
        }
      } catch (err) {
        console.error('Error creating table:', err);
        return;
      }
    }
    
    // Create words_quiz data based on the detected table structure
    const quizData = createQuizData(columns);

    // Clear existing data for dialogue 1
    try {
      const { error: clearError } = await supabase
        .from('words_quiz')
        .delete()
        .eq('dialogue_id', 1);

      if (clearError) {
        console.error('Error clearing existing data:', clearError);
      } else {
        console.log('Existing words_quiz data for dialogue 1 cleared');
      }
    } catch (err) {
      console.log('Error when clearing data, proceeding with insert:', err);
    }

    // Insert new data
    const { error: insertError } = await supabase
      .from('words_quiz')
      .insert(quizData);

    if (insertError) {
      console.error('Error inserting words_quiz data:', insertError);
      console.log('Data attempted to insert:', JSON.stringify(quizData, null, 2));
    } else {
      console.log('Words_quiz data inserted successfully');
    }

    console.log('Words_quiz data initialization complete');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the initialization
initializeQuizData(); 