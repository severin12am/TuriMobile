import { createClient } from '@supabase/supabase-js';
import type { User, LanguageLevel, Phrase, WordExplanation, WordInPhrase, Instruction } from '../types';
import { logger } from './logger';

const supabaseUrl = 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  global: {
    headers: {
      apikey: supabaseKey
    }
  }
});

// Cache mechanism
const cache: Record<string, { data: any; timestamp: number }> = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const getCachedData = (key: string) => {
  logger.info('Checking cache', { key });
  const item = cache[key];
  if (item && Date.now() - item.timestamp < CACHE_DURATION) {
    logger.info('Cache hit', { key });
    return item.data;
  }
  logger.info('Cache miss', { key });
  return null;
};

const setCachedData = (key: string, data: any) => {
  cache[key] = { data, timestamp: Date.now() };
  logger.info('Data cached', { key, dataSize: Array.isArray(data) ? data.length : 1 });
};

// User related functions
export const getUser = async (username: string, password: string) => {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('password', password)
    .single();
  
  if (error) throw error;
  return data as User;
};

export const createUser = async (user: Omit<User, 'id'>) => {
  const { data, error } = await supabase
    .from('users')
    .insert([user])
    .select()
    .single();
  
  if (error) throw error;
  return data as User;
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  const { data, error } = await supabase
    .from('users')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data as User;
};

// Language levels
export const getUserLevel = async (userId: string, motherLanguage: string, targetLanguage: string) => {
  const { data, error } = await supabase
    .from('language_levels')
    .select('*')
    .eq('user_id', userId)
    .eq('target_language', targetLanguage)
    .single();
  
  if (error) {
    if (error.code === 'PGRST116') {
      // Not found, create initial level
      return createUserLevel(userId, targetLanguage);
    }
    throw error;
  }
  
  return data as LanguageLevel;
};

export const createUserLevel = async (userId: string, targetLanguage: string) => {
  const newLevel = {
    user_id: userId,
    level: 1,
    word_progress: 0,
    target_language: targetLanguage
  };
  
  const { data, error } = await supabase
    .from('language_levels')
    .insert([newLevel])
    .select()
    .single();
  
  if (error) throw error;
  return data as LanguageLevel;
};

export const updateUserLevel = async (userId: string, updates: Partial<LanguageLevel>) => {
  const { data, error } = await supabase
    .from('language_levels')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data as LanguageLevel;
};

// Phrases
export const getPhrases = async (dialogueId: number) => {
  const cacheKey = `phrases_dialogue_${dialogueId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as Phrase[];
  
  try {
    const { data, error } = await supabase
      .from('phrases_1')
      .select('*')
      .eq('dialogue_id', dialogueId)
      .order('dialogue_step');
    
    if (error) {
      logger.error('Failed to fetch phrases', { error, dialogueId });
      throw error;
    }
    
    setCachedData(cacheKey, data);
    return data as Phrase[];
  } catch (error) {
    logger.error('Failed to fetch phrases', {
      error: error instanceof Error ? error.message : 'Unknown error',
      dialogueId
    });
    throw error;
  }
};

// Word explanations
export const getWordExplanations = async (language: 'en' | 'ru') => {
  const cacheKey = `word_explanations_${language}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as WordExplanation[];
  
  const { data, error } = await supabase
    .from(`word_explanations_${language}`)
    .select('*');
  
  if (error) throw error;
  setCachedData(cacheKey, data);
  return data as WordExplanation[];
};

// Words in phrases
export const getWordsInPhrases = async (phraseId: number) => {
  const cacheKey = `words_in_phrase_${phraseId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as WordInPhrase[];
  
  const { data, error } = await supabase
    .from('words_in_phrases')
    .select('*')
    .eq('phrase_id', phraseId);
  
  if (error) throw error;
  setCachedData(cacheKey, data);
  return data as WordInPhrase[];
};

// Instructions
export const getInstructions = async () => {
  const cacheKey = 'instructions';
  const cached = getCachedData(cacheKey);
  if (cached) return cached as Instruction[];
  
  const { data, error } = await supabase
    .from('instructions')
    .select('*');
  
  if (error) throw error;
  setCachedData(cacheKey, data);
  return data as Instruction[];
};

// Clear cache
export const clearCache = () => {
  Object.keys(cache).forEach(key => {
    delete cache[key];
  });
  logger.info('Cache cleared');
};