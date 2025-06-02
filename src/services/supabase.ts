import { createClient } from '@supabase/supabase-js';
import type { User, LanguageLevel, Phrase, WordExplanation, WordInPhrase, Instruction } from '../types';
import type { SupportedLanguage } from '../constants/translations';
import { logger } from './logger';
import { secureQuery, validateAndSanitizeUserInput, SecurityError } from './security';

// Get Supabase configuration from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://fjvltffpcafcbbpwzyml.supabase.co';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZqdmx0ZmZwY2FmY2JicHd6eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDI0MjUxNTQsImV4cCI6MjA1ODAwMTE1NH0.uuhJLxTJL26r2jfD9Cb5IMKYaScDNsJeHYJue4pfWRk';

// Validate environment configuration
if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration. Please check your environment variables.');
}

// Log warning if using fallback credentials (development only)
if (import.meta.env.DEV && supabaseUrl === 'https://fjvltffpcafcbbpwzyml.supabase.co') {
  console.warn('⚠️ Using fallback Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: {
      getItem: (key: string) => {
        try {
          return localStorage.getItem(key);
        } catch (error) {
          console.warn('Failed to get item from localStorage:', error);
          return null;
        }
      },
      setItem: (key: string, value: string) => {
        try {
          localStorage.setItem(key, value);
        } catch (error) {
          console.warn('Failed to set item in localStorage:', error);
        }
      },
      removeItem: (key: string) => {
        try {
          localStorage.removeItem(key);
        } catch (error) {
          console.warn('Failed to remove item from localStorage:', error);
        }
      }
    },
    storageKey: 'turi-auth-token',
    debug: import.meta.env.DEV
  },
  global: {
    headers: {
      apikey: supabaseKey
    }
  },
  realtime: {
    params: {
      eventsPerSecond: 10
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

// User related functions with security
export const getUser = async (username: string, password: string) => {
  // This function is deprecated and should not be used for authentication
  // Use the auth service instead
  throw new SecurityError('Direct user lookup is not allowed. Use auth service.', 'DEPRECATED_FUNCTION');
};

export const createUser = async (user: Omit<User, 'id'>) => {
  // Validate and sanitize input
  const allowedFields = ['email', 'password', 'mother_language', 'target_language', 'total_minutes'];
  const sanitizedUser = validateAndSanitizeUserInput(user, allowedFields);
  
  const { data, error } = await supabase
    .from('users')
    .insert([sanitizedUser])
    .select()
    .single();
  
  if (error) {
    logger.error('Error creating user', { error });
    throw error;
  }
  
  logger.info('User created successfully', { userId: data.id });
  return data as User;
};

export const updateUser = async (id: string, updates: Partial<User>) => {
  // Use security layer to validate access
  return await secureQuery(
    'update_user',
    id,
    async () => {
      // Validate and sanitize input
      const allowedFields = ['email', 'mother_language', 'target_language', 'total_minutes'];
      const sanitizedUpdates = validateAndSanitizeUserInput(updates, allowedFields);
      
      const { data, error } = await supabase
        .from('users')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();
      
      return { data: data as User, error };
    }
  );
};

// Language levels with security
export const getUserLevel = async (userId: string, motherLanguage: string, targetLanguage: string) => {
  return await secureQuery(
    'get_user_level',
    userId,
    async () => {
      const { data, error } = await supabase
        .from('language_levels')
        .select('*')
        .eq('user_id', userId)
        .eq('target_language', targetLanguage)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          // Not found, create initial level
          return await createUserLevel(userId, targetLanguage);
        }
        return { data: null, error };
      }
      
      return { data: data as LanguageLevel, error: null };
    }
  );
};

export const createUserLevel = async (userId: string, targetLanguage: string) => {
  return await secureQuery(
    'create_user_level',
    userId,
    async () => {
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
      
      return { data: data as LanguageLevel, error };
    }
  );
};

export const updateUserLevel = async (userId: string, updates: Partial<LanguageLevel>) => {
  return await secureQuery(
    'update_user_level',
    userId,
    async () => {
      // Validate and sanitize input
      const allowedFields = ['level', 'word_progress', 'dialogue_number', 'target_language', 'mother_language'];
      const sanitizedUpdates = validateAndSanitizeUserInput(updates, allowedFields);
      
      const { data, error } = await supabase
        .from('language_levels')
        .update(sanitizedUpdates)
        .eq('user_id', userId)
        .select()
        .single();
      
      return { data: data as LanguageLevel, error };
    }
  );
};

// Phrases - these are read-only and don't need user-specific security
export const getPhrases = async (level: number, language: SupportedLanguage) => {
  // Validate input
  if (!Number.isInteger(level) || level < 1 || level > 100) {
    throw new SecurityError('Invalid level parameter', 'INVALID_PARAMETER');
  }
  
  if (!['en', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'CH', 'ja', 'av'].includes(language)) {
    throw new SecurityError('Invalid language parameter', 'INVALID_PARAMETER');
  }
  
  const cacheKey = `phrases_${level}_${language}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as Phrase[];
  
  const { data, error } = await supabase
    .from(`phrases_${level}`)
    .select('*');
  
  if (error) {
    logger.error('Error fetching phrases', { error, level, language });
    throw error;
  }
  
  setCachedData(cacheKey, data);
  return data as Phrase[];
};

// Word explanations - read-only, no user-specific security needed
export const getWordExplanations = async (language: SupportedLanguage) => {
  // Validate input
  if (!['en', 'ru', 'es', 'fr', 'de', 'it', 'pt', 'ar', 'CH', 'ja', 'av'].includes(language)) {
    throw new SecurityError('Invalid language parameter', 'INVALID_PARAMETER');
  }
  
  const cacheKey = `word_explanations_${language}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as WordExplanation[];
  
  const { data, error } = await supabase
    .from(`word_explanations_${language}`)
    .select('*');
  
  if (error) {
    logger.error('Error fetching word explanations', { error, language });
    throw error;
  }
  
  setCachedData(cacheKey, data);
  return data as WordExplanation[];
};

// Words in phrases - read-only, no user-specific security needed
export const getWordsInPhrases = async (phraseId: number) => {
  // Validate input
  if (!Number.isInteger(phraseId) || phraseId < 1) {
    throw new SecurityError('Invalid phrase ID parameter', 'INVALID_PARAMETER');
  }
  
  const cacheKey = `words_in_phrase_${phraseId}`;
  const cached = getCachedData(cacheKey);
  if (cached) return cached as WordInPhrase[];
  
  const { data, error } = await supabase
    .from('words_in_phrases')
    .select('*')
    .eq('phrase_id', phraseId);
  
  if (error) {
    logger.error('Error fetching words in phrases', { error, phraseId });
    throw error;
  }
  
  setCachedData(cacheKey, data);
  return data as WordInPhrase[];
};

// Instructions - read-only, no user-specific security needed
export const getInstructions = async () => {
  const cacheKey = 'instructions';
  const cached = getCachedData(cacheKey);
  if (cached) return cached as Instruction[];
  
  const { data, error } = await supabase
    .from('instructions')
    .select('*');
  
  if (error) {
    logger.error('Error fetching instructions', { error });
    throw error;
  }
  
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