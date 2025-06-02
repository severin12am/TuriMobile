import { supabase } from './supabase';
import { logger } from './logger';
import type { LanguageLevel } from '../types';
import type { SupportedLanguage } from '../constants/translations';
import { useStore } from '../store';
import { secureQuery, validateAndSanitizeUserInput, SecurityError } from './security';

/**
 * Ensure user is authenticated before making database requests
 * Falls back gracefully when RLS is disabled or when using localStorage auth
 */
const ensureAuthenticated = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Error getting session', { error });
      // Don't throw error, just log it - RLS might be disabled
      return null;
    }
    
    if (!session?.user) {
      logger.warn('No authenticated session found, but continuing (RLS might be disabled)');
      // Don't throw error, just log it - RLS might be disabled or using localStorage auth
      return null;
    }
    
    return session;
  } catch (error) {
    logger.error('Authentication check failed', { error });
    // Don't throw error, just log it - RLS might be disabled
    return null;
  }
};

/**
 * Make a database query with proper error handling for RLS issues
 */
const makeQuery = async (queryFn: () => Promise<any>, operation: string) => {
  try {
    const result = await queryFn();
    return result;
  } catch (error: any) {
    // Handle specific RLS/authentication errors
    if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
      logger.warn(`RLS policy blocked ${operation}, but continuing`, { error: error.message });
      // Return error instead of null data to let calling code handle it
      return { data: null, error: error };
    }
    
    // Handle 406 Not Acceptable errors
    if (error?.status === 406 || error?.code === '406') {
      logger.warn(`406 error on ${operation}, likely RLS issue, continuing`, { error: error.message });
      // Return error instead of null data to let calling code handle it
      return { data: null, error: error };
    }
    
    // Re-throw other errors
    throw error;
  }
};

/**
 * Advanced word progress tracking
 * Calculates word progress based on completed dialogues and actual words encountered
 */
export const calculateWordProgress = async (userId: string, targetLanguage: SupportedLanguage): Promise<number> => {
  try {
    // Use secure query to validate access
    const result = await secureQuery(
      'calculate_word_progress',
      userId,
      async () => {
        const { data: languageLevel, error: levelError } = await supabase
          .from('language_levels')
          .select('*')
          .eq('user_id', userId)
          .eq('target_language', targetLanguage)
          .single();
        
        return { data: languageLevel, error: levelError };
      }
    );
    
    const { data: languageLevel, error: levelError } = result;
      
    if (levelError) {
      logger.error('Error fetching language level', { error: levelError });
      return 0;
    }
    
    // Define words per dialogue (can be adjusted)
    const dialogueWordCounts: Record<number, number> = {
      1: 7, 2: 6, 3: 7, 4: 7, 5: 7,
      6: 8, 7: 8, 8: 8, 9: 8, 10: 8
    };
    
    // Calculate total words learned based on highest dialogue completed
    let highestDialogueId = 1; // Default to 1
    
    // If we have an explicit dialogue_number field, use that
    if (languageLevel?.dialogue_number) {
      highestDialogueId = languageLevel.dialogue_number;
    } 
    // Otherwise, estimate from the level (each level has 5 dialogues)
    else if (languageLevel?.level) {
      // For now, use a simple approach to estimate dialogue progress
      highestDialogueId = Math.max(1, (languageLevel.level - 1) * 5 + 1);
    }
    
    // Calculate total words based on dialogues completed
    let totalWords = 0;
    for (let i = 1; i <= highestDialogueId; i++) {
      totalWords += dialogueWordCounts[i] || 7; // Default to 7 words per dialogue
    }
    
    // Cap at 500 total words for the progress tracking
    return Math.min(totalWords, 500);
  } catch (error) {
    if (error instanceof SecurityError) {
      logger.warn('Security check failed in calculateWordProgress', { error: error.message });
      return 0;
    }
    logger.error('Error calculating word progress', { error });
    return 0;
  }
};

/**
 * Sync word progress with completed dialogues
 * Makes sure language_levels.word_progress is consistent with user_progress
 * NOTE: This function ONLY updates existing records, it never creates new ones
 */
export const syncWordProgress = async (userId: string, targetLanguage: SupportedLanguage): Promise<LanguageLevel | null> => {
  try {
    // Get current language level with security validation
    const levelResult = await secureQuery(
      'sync_word_progress',
      userId,
      async () => {
        const { data: currentLevel, error: levelError } = await supabase
          .from('language_levels')
          .select('*')
          .eq('user_id', userId)
          .eq('target_language', targetLanguage)
          .maybeSingle();
        
        return { data: currentLevel, error: levelError };
      }
    );
    
    const { data: currentLevel, error: levelError } = levelResult;
      
    if (levelError) {
      logger.error('Error fetching language level', { error: levelError });
      return null;
    }
    
    // If no existing record, return null - DO NOT CREATE
    if (!currentLevel) {
      logger.info('No language level found, but syncWordProgress does not create records');
      return null;
    }
    
    // Calculate word progress based on dialogues completed
    const calculatedWordProgress = await calculateWordProgress(userId, targetLanguage);
    
    // Default level is 1
    let newLevel = 1;
    
    // If we have a dialogue_number, calculate the level
    // Each level has 5 dialogues
    let dialogueNumber = currentLevel?.dialogue_number || 1;
    
    // Calculate level based on dialogue number
    if (dialogueNumber > 5) {
      newLevel = Math.floor((dialogueNumber - 1) / 5) + 1;
    }
    
    // Update existing record only if values have changed
    if (currentLevel.word_progress !== calculatedWordProgress || currentLevel.level !== newLevel) {
      const updateResult = await secureQuery(
        'update_language_level_sync',
        userId,
        async () => {
          const { data, error } = await supabase
            .from('language_levels')
            .update({
              word_progress: calculatedWordProgress,
              level: newLevel,
              dialogue_number: dialogueNumber
            })
            .eq('user_id', userId)
            .eq('target_language', targetLanguage)
            .select()
            .single();
          
          return { data, error };
        }
      );
      
      const { data, error } = updateResult;
        
      if (error) {
        logger.error('Error updating language level', { error });
        // Return the current level with updated values
        return {
          ...currentLevel,
          word_progress: calculatedWordProgress,
          level: newLevel,
          dialogue_number: dialogueNumber
        };
      }
      
      if (data) {
        logger.info('Language level updated', { 
          userId, 
          wordProgress: calculatedWordProgress,
          level: newLevel,
          dialogueNumber
        });
        return data;
      }
    }
    
    // Return current level if no update needed
    return currentLevel;
  } catch (error) {
    if (error instanceof SecurityError) {
      logger.warn('Security check failed in syncWordProgress', { error: error.message });
      return null;
    }
    logger.error('Error syncing word progress', { error });
    return null;
  }
};

/**
 * Calculate learning statistics for the user
 */
export const getUserLearningStats = async (userId: string, targetLanguage: SupportedLanguage) => {
  try {
    console.log(`Getting learning stats for user ${userId} with target language ${targetLanguage}`);
    
    // Get language level info with security validation
    const levelResult = await secureQuery(
      'get_user_learning_stats',
      userId,
      async () => {
        const { data: levelData, error: levelError } = await supabase
          .from('language_levels')
          .select('*')
          .eq('user_id', userId)
          .eq('target_language', targetLanguage)
          .single();
        
        return { data: levelData, error: levelError };
      }
    );
    
    const { data: levelData, error: levelError } = levelResult;
      
    if (levelError) {
      console.error('Error fetching language level:', levelError);
      logger.error('Error fetching language level', { error: levelError, userId, targetLanguage });
      
      if (levelError.code === 'PGRST116') {
        // No data found, but not an error per se
        console.log('No language level data found for user');
        return {
          completedDialoguesCount: 0,
          uniqueCharactersCount: 0,
          wordCount: 0,
          currentLevel: 1,
          languageLevel: null
        };
      }
      return null;
    }
    
    console.log('Language level data from database:', levelData);
    
    // We don't need user_progress table - all data comes from language_levels
    // Calculate statistics directly from language_levels data
    const completedDialoguesCount = levelData?.dialogue_number || 0;
    const uniqueCharactersCount = 1; // This isn't used anymore but kept for API compatibility
    const wordCount = levelData?.word_progress || 0;
    const currentLevel = levelData?.level || 1;
    
    const result = {
      completedDialoguesCount,
      uniqueCharactersCount,
      wordCount,
      currentLevel,
      languageLevel: levelData
    };
    
    console.log('Calculated user learning stats:', result);
    
    return result;
  } catch (error) {
    if (error instanceof SecurityError) {
      logger.warn('Security check failed in getUserLearningStats', { error: error.message });
      return null;
    }
    console.error('Error getting user learning stats:', error);
    logger.error('Error getting user learning stats', { error, userId, targetLanguage });
    return null;
  }
};

/**
 * Track a completed dialogue and update user progress
 */
export const trackCompletedDialogue = async (
  userId: string, 
  characterId: number, 
  dialogueId: number, 
  score: number
) => {
  try {
    logger.info('Tracking dialogue completion', { userId, characterId, dialogueId, score });
    
    // Validate input parameters
    if (!Number.isInteger(characterId) || characterId < 1) {
      throw new SecurityError('Invalid character ID', 'INVALID_PARAMETER');
    }
    
    if (!Number.isInteger(dialogueId) || dialogueId < 1) {
      throw new SecurityError('Invalid dialogue ID', 'INVALID_PARAMETER');
    }
    
    if (typeof score !== 'number' || score < 0 || score > 100) {
      throw new SecurityError('Invalid score', 'INVALID_PARAMETER');
    }
    
    // Get the target language from current user with security validation
    const userResult = await secureQuery(
      'get_user_for_dialogue_tracking',
      userId,
      async () => {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('target_language')
          .eq('id', userId)
          .single();
        
        return { data: userData, error: userError };
      }
    );
    
    const { data: userData, error: userError } = userResult;
      
    // Handle case when user record doesn't exist
    let targetLanguage: SupportedLanguage = 'en'; // Default to English
    
    if (userError) {
      // If no user found, try to get target language from store
      const { targetLanguage: storeTargetLanguage } = useStore.getState();
      if (storeTargetLanguage) {
        targetLanguage = storeTargetLanguage;
        logger.warn('User record not found in database, using target language from store', { 
          userId,
          targetLanguage 
        });
      } else {
        logger.error('Error fetching user language and no target language in store', { error: userError });
        logger.info('Creating user record with default target language');
        
        // Create a basic user record with security validation
        await secureQuery(
          'create_user_for_dialogue_tracking',
          userId,
          async () => {
            const { error: createError } = await supabase
              .from('users')
              .insert([{
                id: userId,
                email: `user_${userId.substring(0, 8)}@example.com`, // Generate placeholder email
                target_language: targetLanguage,
                mother_language: targetLanguage === 'en' ? 'ru' : 'en',
                total_minutes: 0
              }]);
            
            return { data: null, error: createError };
          }
        );
      }
    } else {
      targetLanguage = userData?.target_language as SupportedLanguage || 'en';
    }
    
    // Get current language level with security validation
    const levelResult = await secureQuery(
      'get_language_level_for_dialogue_tracking',
      userId,
      async () => {
        const { data: languageLevel, error: levelError } = await supabase
          .from('language_levels')
          .select('*')
          .eq('user_id', userId)
          .eq('target_language', targetLanguage)
          .single();
        
        return { data: languageLevel, error: levelError };
      }
    );
    
    const { data: languageLevel, error: levelError } = levelResult;
    
    if (levelError && levelError.code !== 'PGRST116') {
      logger.error('Error fetching language level for tracking completion', { error: levelError });
      throw levelError;
    }
    
    // Define words per dialogue (copy from calculateWordProgress)
    const dialogueWordCounts: Record<number, number> = {
      1: 7, 2: 6, 3: 7, 4: 7, 5: 7,
      6: 8, 7: 8, 8: 8, 9: 8, 10: 8
    };
    
    // Calculate word progress based on the dialogue completed
    let totalWords = 0;
    for (let i = 1; i <= dialogueId; i++) {
      totalWords += dialogueWordCounts[i] || 7; // Default to 7 words per dialogue
    }
    
    // Calculate level based on dialogue ID
    const level = dialogueId <= 5 ? 1 : Math.floor((dialogueId - 1) / 5) + 1;
    
    // Get actual word count from database for more accuracy
    const { data: wordCounts, error: wordCountError } = await supabase
      .from('words_quiz')
      .select('*')
      .lte('dialogue_id', dialogueId);
      
    if (!wordCountError && wordCounts) {
      totalWords = wordCounts.length;
      logger.info('Calculated actual word progress from database', { 
        wordCount: totalWords, 
        dialogueId
      });
    }
    
    if (languageLevel) {
      // Update existing language level with security validation
      await secureQuery(
        'update_language_level_dialogue_completion',
        userId,
        async () => {
          const { data, error } = await supabase
            .from('language_levels')
            .update({
              dialogue_number: Math.max(dialogueId, languageLevel.dialogue_number || 0),
              word_progress: totalWords,
              level: level
            })
            .eq('user_id', userId)
            .eq('target_language', targetLanguage)
            .select();
          
          return { data, error };
        }
      );
      
      logger.info('Language level updated from dialogue completion', { 
        userId, 
        dialogueId,
        wordProgress: totalWords,
        level
      });
    } else {
      // Create new language level record with security validation
      await secureQuery(
        'create_language_level_dialogue_completion',
        userId,
        async () => {
          const { data, error } = await supabase
            .from('language_levels')
            .insert([{
              user_id: userId,
              target_language: targetLanguage,
              mother_language: targetLanguage === 'en' ? 'ru' : 'en',
              dialogue_number: dialogueId,
              word_progress: totalWords,
              level: level,
              email: `user_${userId.substring(0, 8)}@example.com` // Add email field
            }])
            .select();
          
          return { data, error };
        }
      );
      
      logger.info('Created language level from dialogue completion', { 
        userId, 
        dialogueId,
        wordProgress: totalWords
      });
    }
    
    logger.info('Dialogue completion tracked successfully', { dialogueId, characterId });
    return true;
  } catch (error) {
    if (error instanceof SecurityError) {
      logger.warn('Security check failed in trackCompletedDialogue', { error: error.message });
      throw error;
    }
    logger.error('Error in trackCompletedDialogue', { error });
    throw error;
  }
}; 