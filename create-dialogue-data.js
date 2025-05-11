// Script to create test dialogue data for character 1
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

// Sample dialogue data for character 1
const dialogueData = [
  {
    id: 1,
    dialogue_id: 1,
    dialogue_step: 1,
    speaker: 'NPC',
    english_text: 'Hello! Welcome to the language learning app!',
    phonetic_text_en: 'Hello! Welcome to the language learning app!',
    russian_text: 'Привет! Добро пожаловать в приложение для изучения языка!',
    phonetic_text_ru: 'Privet! Dobro pozhalovat v prilozheniye dlya izucheniya yazyka!'
  },
  {
    id: 2,
    dialogue_id: 1,
    dialogue_step: 2,
    speaker: 'User',
    english_text: 'Hello! Nice to meet you!',
    phonetic_text_en: 'Hello! Nice to meet you!',
    russian_text: 'Привет! Приятно познакомиться!',
    phonetic_text_ru: 'Privet! Priyatno poznakomitsya!'
  },
  {
    id: 3,
    dialogue_id: 1,
    dialogue_step: 3,
    speaker: 'NPC',
    english_text: 'My name is Tom. I will help you learn.',
    phonetic_text_en: 'My name is Tom. I will help you learn.',
    russian_text: 'Меня зовут Том. Я помогу тебе учиться.',
    phonetic_text_ru: 'Menya zovut Tom. Ya pomogu tebe uchitsya.'
  },
  {
    id: 4,
    dialogue_id: 1,
    dialogue_step: 4,
    speaker: 'User',
    english_text: 'Thank you! I want to learn a new language.',
    phonetic_text_en: 'Thank you! I want to learn a new language.',
    russian_text: 'Спасибо! Я хочу выучить новый язык.',
    phonetic_text_ru: 'Spasibo! Ya khochu vyuchit novyy yazyk.'
  },
  {
    id: 5,
    dialogue_id: 1,
    dialogue_step: 5,
    speaker: 'NPC',
    english_text: 'Great! Let\'s start with some basic phrases.',
    phonetic_text_en: 'Great! Let\'s start with some basic phrases.',
    russian_text: 'Отлично! Давай начнем с некоторых основных фраз.',
    phonetic_text_ru: 'Otlichno! Davay nachnem s nekotorykh osnovnykh fraz.'
  }
];

// Function to create the table and insert data
const initializeDialogueData = async () => {
  try {
    console.log('Starting dialogue data initialization...');

    // Try direct creation as fallback
    try {
      const { error: directCreateError } = await supabase.query(`
        CREATE TABLE IF NOT EXISTS "1_phrases" (
          id SERIAL PRIMARY KEY,
          dialogue_id INTEGER NOT NULL,
          dialogue_step INTEGER NOT NULL,
          speaker TEXT NOT NULL,
          english_text TEXT NOT NULL,
          phonetic_text_en TEXT NOT NULL,
          russian_text TEXT NOT NULL,
          phonetic_text_ru TEXT NOT NULL
        );
      `);
      
      if (directCreateError) {
        console.error('Error with direct table creation:', directCreateError);
      } else {
        console.log('Table 1_phrases created or already exists');
      }
    } catch (err) {
      console.log('Table creation error, trying an alternative approach');
      
      // Try simpler approach
      const { error } = await supabase.from('1_phrases').select('count').limit(1);
      if (error && error.code === '42P01') {
        console.log('Table does not exist, will be created when inserting data');
      }
    }

    // Clear existing data
    try {
      const { error: clearError } = await supabase
        .from('1_phrases')
        .delete()
        .gte('id', 0);

      if (clearError) {
        console.error('Error clearing existing data:', clearError);
      } else {
        console.log('Existing data cleared');
      }
    } catch (err) {
      console.log('Error when clearing data, proceeding with insert:', err);
    }

    // Insert new data
    const { error: insertError } = await supabase
      .from('1_phrases')
      .insert(dialogueData);

    if (insertError) {
      console.error('Error inserting data:', insertError);
    } else {
      console.log('Dialogue data inserted successfully');
    }

    console.log('Dialogue initialization complete');
  } catch (error) {
    console.error('Error:', error);
  }
};

// Run the initialization
initializeDialogueData(); 