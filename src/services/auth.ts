import { supabase } from './supabase';
import { logger } from './logger';
import type { User } from '../types';
import { useStore } from '../store';
import { syncWordProgress, trackCompletedDialogue as progressTrackCompletedDialogue } from './progress';

const LOCAL_STORAGE_ANONYMOUS_USER_KEY = 'turi_anonymous_user';
const LOCAL_STORAGE_USER_KEY = 'turi_user';

// Check if we can use local storage as a backup for non-registered users
const canUseLocalStorage = typeof window !== 'undefined' && window.localStorage;

// Basic authentication functions
export const signUp = async (email: string, password: string, motherLanguage: 'en' | 'ru', targetLanguage: 'en' | 'ru') => {
  try {
    // Log the input parameters for debugging
    logger.info('Starting signup process with languages', { email, motherLanguage, targetLanguage });
    
    // Check if user already exists in our users table
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
      
    if (checkError && checkError.code !== 'PGRST116') {
      logger.error('Error checking if user exists', { error: checkError });
      throw new Error('Error checking if user exists: ' + checkError.message);
    }
    
    if (existingUser) {
      // If user exists in our users table, return that user
      logger.info('User already exists, returning existing user', { email });
      return existingUser as User;
    }
    
    // Create or get the auth entry first
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        data: {
          mother_language: motherLanguage,
          target_language: targetLanguage
        }
      }
    });
    
    if (authError) {
      logger.error('Error creating auth user', { error: authError });
      throw new Error('Error creating user: ' + authError.message);
    }
    
    if (!authData.user) {
      throw new Error('Failed to create auth user: No user data returned');
    }
    
    // Check if we need to create a profile or just return the existing one
    // Try to find if the user already exists in our users table by auth ID
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (!profileCheckError && existingProfile) {
      // User profile already exists, return it
      logger.info('User profile already exists for this auth ID', { id: authData.user.id });
      return existingProfile as User;
    }
    
    // Ensure we have valid language values with fallbacks
    const finalMotherLanguage = motherLanguage || 'en';
    const finalTargetLanguage = targetLanguage || 'ru';
    
    logger.info('Creating new user with languages', { 
      userId: authData.user.id,
      motherLanguage: finalMotherLanguage, 
      targetLanguage: finalTargetLanguage 
    });
    
    // Now create the user profile with the auth ID using upsert to handle duplicates
    const { data, error } = await supabase
      .from('users')
      .upsert([{ 
        id: authData.user.id,
        email, 
        password, // Note: In production, you should hash passwords and use proper auth
        mother_language: finalMotherLanguage,
        target_language: finalTargetLanguage,
        total_minutes: 0
      }])
      .select();
      
    if (error) {
      logger.error('Error creating user profile', { error });
      throw new Error('Error creating user profile: ' + error.message);
    }
    
    if (!data || data.length === 0) {
      throw new Error('Failed to create user profile: No data returned');
    }
    
    const newUser = data[0] as User;
    
    // Initialize language level for new user with explicit mother and target languages
    await initializeLanguageLevel(newUser.id, finalTargetLanguage, finalMotherLanguage);
    
    // Save to local storage
    if (canUseLocalStorage) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newUser));
    }
    
    logger.info('User created successfully', { email, userId: newUser.id });
    return newUser;
  } catch (error) {
    logger.error('Error during signup', { error });
    throw error;
  }
};

export const login = async (email: string, password: string) => {
  try {
    // Sign in with Supabase auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email,
      password: password
    });
    
    // Handle the email_not_confirmed error specifically
    if (authError && authError.code === 'email_not_confirmed') {
      logger.info('Email not confirmed, attempting to bypass confirmation requirement', { email });
      
      // Try to fetch the user from the users table by email instead
      const { data: userByEmail, error: userFetchError } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
        
      if (!userFetchError && userByEmail) {
        // User exists in our database, so we'll allow them in despite email not being confirmed
        logger.info('Found user by email, bypassing email confirmation', { email });
        
        // Save to local storage
        if (canUseLocalStorage) {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userByEmail));
        }
        
        return userByEmail as User;
      }
      
      // If we can't find the user by email, try to create a new login session with admin API
      // This is a fallback approach
      const { data: sessionData, error: sessionError } = await supabase.auth.signUp({
        email: email,
        password: password,
        options: {
          data: {
            // Add any necessary metadata
          }
        }
      });
      
      if (sessionError) {
        // If we can't create a new session, throw the original error
        logger.error('Failed to bypass email confirmation', { email, error: sessionError });
        throw new Error('Login requires email confirmation. Please check your email inbox.');
      }
      
      if (sessionData?.user) {
        // We managed to create a session, now try to get the user profile
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', sessionData.user.id)
          .single();
          
        if (!userError && userData) {
          // Save to local storage
          if (canUseLocalStorage) {
            localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(userData));
          }
          
          logger.info('Successfully bypassed email confirmation', { email });
          return userData as User;
        }
      }
      
      // If all else fails, throw an error but with clear instructions
      throw new Error('Your account exists but email is not confirmed. For now, you can continue without confirmation.');
    }
    
    if (authError) {
      logger.error('Auth login failed', { email, error: authError });
      throw new Error(authError.message || 'Invalid email or password');
    }
    
    if (!authData.user) {
      throw new Error('User not found');
    }
    
    // Now fetch the user profile
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();
      
    if (error) {
      // If the user exists in auth but not in the profiles table, create a profile
      if (error.code === 'PGRST116') {
        logger.info('User exists in auth but not in profiles, creating profile', { id: authData.user.id });
        
        // Get user metadata from auth to determine languages
        const metadata = authData.user.user_metadata;
        const motherLanguage = metadata?.mother_language || 'en';
        const targetLanguage = metadata?.target_language || 'ru';
        
        // Create profile
        const { data: newProfileData, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: email,
            mother_language: motherLanguage,
            target_language: targetLanguage,
            total_minutes: 0
          }])
          .select();
          
        if (insertError || !newProfileData || newProfileData.length === 0) {
          logger.error('Failed to create missing user profile', { error: insertError });
          throw new Error('Could not create user profile');
        }
        
        // Initialize language level with both languages
        await initializeLanguageLevel(authData.user.id, targetLanguage, motherLanguage);
        
        // Save to local storage
        if (canUseLocalStorage) {
          localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(newProfileData[0]));
        }
        
        return newProfileData[0] as User;
      }
      
      // For other errors
      logger.error('Profile fetch failed', { email, error });
      throw new Error('Could not retrieve user profile: ' + error.message);
    }
    
    if (!data) {
      throw new Error('User profile not found');
    }
    
    // Save to local storage
    if (canUseLocalStorage) {
      localStorage.setItem(LOCAL_STORAGE_USER_KEY, JSON.stringify(data));
    }
    
    logger.info('User logged in successfully', { email });
    return data as User;
  } catch (error) {
    logger.error('Error during login', { error });
    throw error;
  }
};

// Functions for anonymous users
export const saveAnonymousProgress = (dialogueId: number, characterId: number, score: number) => {
  if (!canUseLocalStorage) return false;
  
  try {
    // Get existing anonymous progress or create a new one
    const savedProgress = localStorage.getItem(LOCAL_STORAGE_ANONYMOUS_USER_KEY);
    const progress = savedProgress ? JSON.parse(savedProgress) : {
      dialogues: [],
      wordProgress: 0
    };
    
    // Add or update dialogue progress
    const existingDialogueIndex = progress.dialogues.findIndex(
      (d: any) => d.dialogueId === dialogueId && d.characterId === characterId
    );
    
    if (existingDialogueIndex > -1) {
      // Update existing entry with higher score if applicable
      if (score > progress.dialogues[existingDialogueIndex].score) {
        progress.dialogues[existingDialogueIndex].score = score;
      }
    } else {
      // Add new entry
      progress.dialogues.push({
        dialogueId,
        characterId,
        score,
        completed: true,
        completedAt: new Date().toISOString()
      });
    }
    
    // Update word progress - use the highest dialogue ID as a simple proxy
    const highestDialogueId = Math.max(
      progress.wordProgress || 0,
      ...progress.dialogues.map((d: any) => d.dialogueId)
    );
    progress.wordProgress = highestDialogueId;
    
    // Save back to local storage
    localStorage.setItem(LOCAL_STORAGE_ANONYMOUS_USER_KEY, JSON.stringify(progress));
    logger.info('Anonymous progress saved', { dialogueId, characterId, score });
    
    return true;
  } catch (error) {
    logger.error('Error saving anonymous progress', { error });
    return false;
  }
};

// Get anonymous progress from localStorage
export const getAnonymousProgress = () => {
  try {
    if (!canUseLocalStorage) {
      logger.warn('localStorage not available for getting anonymous progress');
      return null;
    }
    
    // Get progress data from localStorage
    const anonymousProgress = localStorage.getItem('turi_anonymous_progress');
    if (!anonymousProgress) {
      return null;
    }
    
    // Parse stored data
    const progressData = JSON.parse(anonymousProgress);
    logger.info('Retrieved anonymous progress', { progressData });
    
    return progressData;
  } catch (error) {
    logger.error('Error getting anonymous progress', { error });
    return null;
  }
};

export const transferAnonymousProgressToUser = async (userId: string) => {
  if (!canUseLocalStorage) return;
  
  try {
    const anonymousProgress = getAnonymousProgress();
    if (!anonymousProgress || !anonymousProgress.dialogues) return;
    
    // Transfer dialogue completions
    for (const dialogue of anonymousProgress.dialogues) {
      await trackCompletedDialogue(
        userId,
        dialogue.characterId,
        dialogue.dialogueId,
        dialogue.score
      );
    }
    
    // Transfer word progress
    if (anonymousProgress.wordProgress > 0) {
      const { motherLanguage, targetLanguage } = useStore.getState();
      await updateWordProgress(userId, targetLanguage, anonymousProgress.wordProgress);
    }
    
    // Clear anonymous progress
    localStorage.removeItem(LOCAL_STORAGE_ANONYMOUS_USER_KEY);
    
    logger.info('Anonymous progress transferred to user', { userId });
  } catch (error) {
    logger.error('Error transferring anonymous progress', { error });
  }
};

// Initialize language level for a new user
export const initializeLanguageLevel = async (userId: string, language: string, motherLanguage: string) => {
  try {
    console.log('💬 INITIALIZE LANGUAGE LEVEL FUNCTION CALLED', { userId, language, motherLanguage });
    logger.info('Initializing language level', { userId, language, motherLanguage });
    
    // First, check if user exists in users table
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (userCheckError && userCheckError.code === 'PGRST116') {
      console.log('💬 User not found in users table, creating placeholder entry');
      // User doesn't exist, we need to create one first
      logger.info('User not found in users table, creating a placeholder entry', { userId });
      
      // Get user metadata from auth to create basic profile
      const { data: userData, error: authError } = await supabase.auth.getUser(userId);
      
      if (authError) {
        console.error('💬 ERROR fetching user data from auth:', authError);
        logger.error('Failed to fetch user data from auth', { error: authError });
        throw authError;
      }
      
      // Create a basic user profile from available data
      const { data: userInsertData, error: userInsertError } = await supabase
        .from('users')
        .insert([{
          id: userId,
          email: userData?.user?.email || 'anonymous@example.com',
          mother_language: motherLanguage,
          target_language: language,
          total_minutes: 0
        }])
        .select();
        
        if (userInsertError) {
          console.error('💬 ERROR creating user profile:', userInsertError);
          logger.error('Failed to create user profile', { error: userInsertError });
          throw userInsertError;
        }
        
        console.log('💬 Successfully created user profile');
        logger.info('Created placeholder user profile', { userId });
      } else if (userCheckError) {
        // Some other error checking user
        console.error('💬 ERROR checking if user exists:', userCheckError);
        logger.error('Error checking if user exists', { error: userCheckError });
        throw userCheckError;
      }
      
      // Get word count for dialogue 1 (always start with dialogue 1)
      const { data: words, error: wordsError } = await supabase
        .from('words_quiz')
        .select('*')
        .eq('dialogue_id', 1);
        
      const wordCount = words?.length || 0;
      console.log('💬 Found words for dialogue 1:', wordCount);
      logger.info('Getting words for dialogue 1', { count: wordCount });
      
      // Now insert language level
      console.log('💬 Creating language level record with:', { wordCount, level: 1, dialogue_number: 1 });
      const { data, error } = await supabase
        .from('language_levels')
        .insert([{
          user_id: userId,
          target_language: language,
          mother_language: motherLanguage,
          level: 1,
          word_progress: wordCount,
          dialogue_number: 1
        }])
        .select();
        
        if (error) {
          console.error('💬 ERROR initializing language level:', error);
          logger.error('Error initializing language level', { error });
          throw error;
        }
        
        console.log('💬 Successfully initialized language level:', data?.[0]);
        logger.info('Language level initialized', { userId, language, wordProgress: wordCount, dialogueNumber: 1 });
        return data;
    } catch (error) {
      console.error('💬 ERROR in initializeLanguageLevel:', error);
      logger.error('Error initializing language level', { error });
      throw error;
    }
};

// Get user's language level
export const getLanguageLevel = async (userId: string, language: string) => {
  try {
    const { data, error } = await supabase
      .from('language_levels')
      .select('*')
      .eq('user_id', userId)
      .eq('target_language', language)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') { // No rows returned
        // Initialize level if not found
        return await initializeLanguageLevel(userId, language, 'en');
      }
      logger.error('Error getting language level', { error });
      throw error;
    }
    
    return data;
  } catch (error) {
    logger.error('Error getting language level', { error });
    throw error;
  }
};

// Update the user's word progress based on dialogue completed
export const updateWordProgress = async (
  userId: string, 
  language: 'en' | 'ru', 
  dialogueId: number
) => {
  try {
    console.log('💬 UPDATE WORD PROGRESS FUNCTION CALLED', { userId, language, dialogueId });
    logger.info('Starting updateWordProgress', { userId, language, dialogueId });
    
    // Get current language level
    const { data: languageLevel, error: levelError } = await supabase
      .from('language_levels')
      .select('*')
      .eq('user_id', userId)
      .eq('target_language', language)
      .single();
      
    // If no language level exists, create one
    if (levelError && levelError.code === 'PGRST116') {
      console.log('💬 No language level found, creating new one');
      
      // Get words count ONLY for this specific dialogue
      const { data: words, error: wordsError } = await supabase
        .from('words_quiz')
        .select('*')
        .eq('dialogue_id', 1); // Always start with dialogue 1 for new users
        
      const wordCount = words?.length || 0;
      
      console.log('💬 Found words for dialogue 1:', wordCount);
      
      logger.info('Creating new language level', { 
        userId, 
        dialogueId, 
        wordCount, 
        message: `Found ${wordCount} words for dialogue 1`
      });
      
      // Get user data to ensure correct mother language
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('mother_language')
        .eq('id', userId)
        .single();
      
      // Default mother language
      let motherLanguage: 'en' | 'ru' = language === 'en' ? 'ru' : 'en';
      
      // Use stored mother language if available
      if (!userError && userData && userData.mother_language) {
        motherLanguage = userData.mother_language as 'en' | 'ru';
      } else {
        // Fallback to global store if available
        const { motherLanguage: storeMother } = useStore.getState();
        if (storeMother) {
          motherLanguage = storeMother;
        }
      }
      
      // For a new user, level is always 1
      const level = 1;
      
      console.log('💬 Creating language level record with:', { wordCount, level, dialogue_number: 1 });
      
      // Create new language level
      const { data, error } = await supabase
        .from('language_levels')
        .insert([{
          user_id: userId,
          target_language: language,
          mother_language: motherLanguage,
          level: level,
          word_progress: wordCount,
          dialogue_number: 1
        }])
        .select();
        
      if (error) {
        console.error('💬 ERROR creating language level:', error);
        logger.error('Error creating language level', { error });
        throw error;
      }
      
      console.log('💬 Successfully created language level:', data?.[0]);
      logger.info('Created new language level', { userId, wordCount, level: 1 });
      return data ? data[0] : null;
    } else if (levelError) {
      console.error('💬 ERROR fetching language level:', levelError);
      logger.error('Error fetching language level', { error: levelError });
      throw levelError;
    }
    
    console.log('💬 Found existing language level:', languageLevel);
    
    // If we have a language level, update it if the new dialogue is higher
    const currentDialogueNumber = languageLevel.dialogue_number || 0;
    
    if (dialogueId > currentDialogueNumber) {
      console.log('💬 Updating progress - new dialogue is higher than current');
      
      // Count words only for the current dialogue
      const { data: currentDialogueWords, error: wordsError } = await supabase
        .from('words_quiz')
        .select('*')
        .eq('dialogue_id', dialogueId);
        
      const newDialogueWordCount = currentDialogueWords?.length || 0;
      
      // Get current word progress from language level
      const currentWordProgress = languageLevel.word_progress || 0;
      
      // Add only the words from the newly completed dialogue
      const updatedWordProgress = currentWordProgress + newDialogueWordCount;
      
      // Calculate level based on dialogue (each level has 5 dialogues)
      const level = Math.floor((dialogueId - 1) / 5) + 1;
      
      console.log('💬 Calculated new values:', { 
        currentWordProgress, 
        newDialogueWordCount,
        updatedWordProgress,
        level,
        dialogueId,
        calculation: `level = Math.floor((${dialogueId} - 1) / 5) + 1 = ${level}`
      });
      
      logger.info('Updating language level', { 
        userId, 
        dialogueId,
        currentWordProgress,
        newDialogueWordCount,
        updatedWordProgress, 
        level
      });
      
      // Update language level
      const { data, error } = await supabase
        .from('language_levels')
        .update({
          level: level,
          word_progress: updatedWordProgress,
          dialogue_number: dialogueId
        })
        .eq('user_id', languageLevel.user_id)
        .select();
        
      if (error) {
        console.error('💬 ERROR updating language level:', error);
        logger.error('Error updating language level', { error });
        throw error;
      }
      
      console.log('💬 Successfully updated language level:', data?.[0]);
      
      logger.info('Updated language level successfully', { 
        userId, 
        dialogueId, 
        wordProgress: updatedWordProgress, 
        level 
      });
      return data ? data[0] : null;
    } else {
      console.log('💬 No update needed - dialogue already completed');
    }
    
    return languageLevel;
  } catch (error) {
    console.error('💬 ERROR in updateWordProgress:', error);
    logger.error('Error updating word progress', { error });
    throw error;
  }
};

// Track completed dialogue
export const trackCompletedDialogue = async (
  userId: string, 
  characterId: number, 
  dialogueId: number, 
  score: number
) => {
  console.log('💬 TRACK COMPLETED DIALOGUE FUNCTION CALLED', { userId, characterId, dialogueId, score });
  return progressTrackCompletedDialogue(userId, characterId, dialogueId, score);
};

// Get user's completed dialogues
export const getCompletedDialogues = async (userId: string) => {
  try {
    console.log('💬 GET COMPLETED DIALOGUES FUNCTION CALLED', { userId });
    
    // Define the type of dialogue progress
    interface DialogueProgress {
      user_id: string;
      dialogue_id: number;
      character_id: number;
      completed: boolean;
      score: number;
      completed_at: string;
      [key: string]: any; // For any other properties
    }
    
    // First, check the user_progress table for completed dialogues
    const { data: userProgressData, error: progressError } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('completed', true);
    
    if (progressError) {
      console.error('💬 ERROR fetching from user_progress:', progressError);
      logger.error('Error fetching from user_progress', { error: progressError });
      // Continue to try the language_levels table as fallback
    }
    
    // Initialize completedDialogues with data from user_progress if available
    let completedDialogues: DialogueProgress[] = [];
    if (userProgressData && userProgressData.length > 0) {
      console.log('💬 Found completed dialogues in user_progress:', userProgressData.length);
      completedDialogues = [...userProgressData] as DialogueProgress[];
    }
    
    // Get the user's language level as a fallback or supplement
    const { data: languageLevel, error } = await supabase
      .from('language_levels')
      .select('*')
      .eq('user_id', userId)
      .single();
      
    if (error) {
      console.error('💬 ERROR getting language level for dialogue progress:', error);
      logger.error('Error getting language level for dialogue progress', { error });
      
      // If we have user_progress data, return that even if language_levels fails
      if (completedDialogues.length > 0) {
        console.log('💬 Returning completed dialogues from user_progress only:', 
          completedDialogues.map(d => d.dialogue_id));
        return completedDialogues;
      }
      return [];
    }
    
    console.log('💬 Found language level:', languageLevel);
    
    // Use dialogue_number to determine completed dialogues if not already in the list
    if (languageLevel && languageLevel.dialogue_number > 0) {
      // Create a list of completed dialogues based on the dialogue_number value
      console.log('💬 Using dialogue_number to supplement completed dialogues:', languageLevel.dialogue_number);
      
      // Get a list of dialogue IDs we already have from user_progress
      const existingDialogueIds = new Set(completedDialogues.map(d => d.dialogue_id));
      
      for (let i = 1; i <= languageLevel.dialogue_number; i++) {
        // Only add if not already in the list from user_progress
        if (!existingDialogueIds.has(i)) {
          completedDialogues.push({
            user_id: userId,
            dialogue_id: i,
            character_id: 1, // Assuming character_id 1 for all dialogues
            completed: true,
            score: 100, // Default score
            completed_at: new Date().toISOString()
          });
        }
      }
    } else {
      console.log('💬 No dialogue_number found in language level');
    }
    
    // Also check local storage for any completions
    if (canUseLocalStorage) {
      console.log('💬 Checking localStorage for dialogue completions');
      
      // Get existing dialogue IDs
      const existingDialogueIds = new Set(completedDialogues.map(d => d.dialogue_id));
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(`dialogue_completion_${userId}`)) {
          const [_, userId, characterId, dialogueId] = key.split('_');
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          
          console.log('💬 Found localStorage completion:', { userId, characterId, dialogueId, data });
          
          // Add if not already in the list
          if (!existingDialogueIds.has(parseInt(dialogueId))) {
            completedDialogues.push({
              user_id: userId,
              dialogue_id: parseInt(dialogueId),
              character_id: parseInt(characterId),
              completed: true,
              score: data.score || 100,
              completed_at: data.completed_at || new Date().toISOString()
            });
          }
        }
      }
    }
    
    console.log('💬 Total completed dialogues:', completedDialogues.length);
    console.log('💬 Completed dialogue IDs:', completedDialogues.map(d => d.dialogue_id));
    
    return completedDialogues;
  } catch (error) {
    console.error('💬 ERROR getting completed dialogues:', error);
    logger.error('Error getting completed dialogues', { error });
    return [];
  }
};

// Check and update user's progress based on completed dialogues
export const checkAndUpdateUserProgress = async (userId: string) => {
  try {
    console.log('💬 CHECK AND UPDATE USER PROGRESS FUNCTION CALLED', { userId });
    
    if (!userId) {
      logger.warn('Cannot update progress for empty user ID');
      return null;
    }
    
    const { targetLanguage } = useStore.getState();
    if (!targetLanguage) {
      logger.warn('Cannot update progress without target language');
      return null;
    }
    
    // Get completed dialogues to determine highest dialogue ID completed
    const completedDialogues = await getCompletedDialogues(userId);
    if (!completedDialogues || completedDialogues.length === 0) {
      console.log('💬 No completed dialogues found for user');
      logger.info('No completed dialogues found for user', { userId });
      return null;
    }
    
    // Find the highest dialogue ID completed
    const highestDialogueId = Math.max(...completedDialogues.map(d => d.dialogue_id));
    console.log('💬 Highest dialogue ID completed:', highestDialogueId);
    
    // Get current language level
    const { data: languageLevel, error } = await supabase
      .from('language_levels')
      .select('*')
      .eq('user_id', userId)
      .eq('target_language', targetLanguage)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('💬 No language level entry exists, creating one');
        // No language level entry exists, create one with the highest dialogue
        return await updateWordProgress(userId, targetLanguage, highestDialogueId);
      }
      
      console.error('💬 ERROR fetching language level:', error);
      logger.error('Error fetching language level', { error });
      return null;
    }
    
    console.log('💬 Current language level data:', languageLevel);
    
    // Calculate what level the user should be at
    // Level 1: Dialogues 1-5
    // Level 2: Dialogues 6-10
    // And so on...
    const correctLevel = Math.floor((highestDialogueId - 1) / 5) + 1;
    console.log('💬 Calculated level:', correctLevel, `based on formula: Math.floor((${highestDialogueId} - 1) / 5) + 1`);
    
    // Count words for completed dialogues
    const { data: wordCounts, error: wordCountError } = await supabase
      .from('words_quiz')
      .select('dialogue_id')
      .lte('dialogue_id', highestDialogueId);
    
    let correctWordProgress = 0;
    
    if (!wordCountError && wordCounts) {
      correctWordProgress = wordCounts.length;
      console.log('💬 Calculated correct word progress:', correctWordProgress, `based on ${wordCounts.length} words in dialogues 1-${highestDialogueId}`);
    } else {
      console.error('💬 ERROR counting words:', wordCountError);
    }
    
    // Check if update is needed
    const needsUpdate = 
      languageLevel.level !== correctLevel || 
      languageLevel.word_progress !== correctWordProgress ||
      languageLevel.dialogue_number !== highestDialogueId;
    
    console.log('💬 Needs update?', needsUpdate, {
      currentLevel: languageLevel.level,
      correctLevel,
      currentWordProgress: languageLevel.word_progress,
      correctWordProgress,
      currentDialogueNumber: languageLevel.dialogue_number,
      highestDialogueId
    });
    
    if (needsUpdate) {
      // Update to correct values
      const { data, error: updateError } = await supabase
        .from('language_levels')
        .update({ 
          level: correctLevel,
          word_progress: correctWordProgress,
          dialogue_number: highestDialogueId
        })
        .eq('user_id', userId)
        .eq('target_language', targetLanguage)
        .select();
        
      if (updateError) {
        console.error('💬 ERROR updating user progress:', updateError);
        logger.error('Error updating user progress', { updateError });
        return languageLevel;
      }
      
      console.log('💬 Successfully updated user progress:', data?.[0]);
      
      logger.info('User progress auto-updated', { 
        userId, 
        previousLevel: languageLevel.level,
        newLevel: correctLevel, 
        previousWordProgress: languageLevel.word_progress,
        newWordProgress: correctWordProgress 
      });
      
      return data[0];
    }
    
    return languageLevel;
  } catch (error) {
    console.error('💬 ERROR in checkAndUpdateUserProgress:', error);
    logger.error('Error in checkAndUpdateUserProgress', { error });
    return null;
  }
}; 