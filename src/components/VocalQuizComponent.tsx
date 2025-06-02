import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle, XCircle, HelpCircle, Volume, Mic, MicOff, 
  ArrowRight, Loader2 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store';
import { logger } from '../services/logger';
import { updateWordProgress, trackCompletedDialogue, saveAnonymousProgress } from '../services/auth';

// Add WebSpeechAPI type definitions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    _quizSpeechRecognitionActive?: boolean;
  }
}

// Updated to match quiz table schema with all language columns
interface VocalQuizWord {
  id: number;
  entry_in_en: string;
  entry_in_ru: string;
  entry_in_es?: string;
  entry_in_fr?: string;
  entry_in_de?: string;
  entry_in_it?: string;
  entry_in_pt?: string;
  entry_in_ar?: string;
  entry_in_ch?: string;
  entry_in_ja?: string;
  dialogue_id: number;
  is_from_500: boolean;
  [key: string]: any; // Allow dynamic column access
}

interface VocalQuizProps {
  dialogueId: number;
  onComplete: (passed: boolean) => void;
  onClose: () => void;
  characterId?: number;
}

import type { SupportedLanguage } from '../constants/translations';

// Remove hardcoded language restriction - use all supported languages
const translations: Record<string, Partial<Record<SupportedLanguage, string>>> = {
  'Vocabulary Quiz': { en: 'Vocabulary Quiz', ru: 'Словарный тест' },
  'Question': { en: 'Question', ru: 'Вопрос' },
  'correct': { en: 'correct', ru: 'правильно' },
  'How do you say': { en: 'How do you say', ru: 'Как сказать' },
  'in English': { en: 'in English', ru: 'по-английски' },
  'in Russian': { en: 'in Russian', ru: 'по-русски' },
  'in Chinese': { en: 'in Chinese', ru: 'по-китайски' },
  'in Spanish': { en: 'in Spanish', ru: 'по-испански' },
  'in French': { en: 'in French', ru: 'по-французски' },
  'in German': { en: 'in German', ru: 'по-немецки' },
  'in Italian': { en: 'in Italian', ru: 'по-итальянски' },
  'in Portuguese': { en: 'in Portuguese', ru: 'по-португальски' },
  'in Arabic': { en: 'in Arabic', ru: 'по-арабски' },
  'in Japanese': { en: 'in Japanese', ru: 'по-японски' },
  'Word to pronounce:': { en: 'Word to pronounce:', ru: 'Слово для произношения:' },
  'Translation:': { en: 'Translation:', ru: 'Перевод:' },
  'Say the word...': { en: 'Say the word...', ru: 'Скажите слово...' },
  'Show hint': { en: 'Show hint', ru: 'Показать подсказку' },
  'Hide hint': { en: 'Hide hint', ru: 'Скрыть подсказку' },
  'Skip': { en: 'Skip', ru: 'Пропустить' },
  'Great job! Turi is proud of you!': { en: 'Great job! Turi is proud of you!', ru: 'Отлично! Тури гордится вами!' },
  'Debug Accept': { en: 'Debug Accept', ru: 'Принять (отладка)' },
  'Continue my journey': { en: 'Continue my journey', ru: 'Продолжить обучение' },
  'Debug Info': { en: 'Debug Info', ru: 'Отладочная информация' },
  'Expected:': { en: 'Expected:', ru: 'Ожидалось:' },
  'Heard:': { en: 'Heard:', ru: 'Распознано:' },
  'Target Language:': { en: 'Target Language:', ru: 'Язык изучения:' },
  'Word Index:': { en: 'Word Index:', ru: 'Номер слова:' },
  'Something went wrong': { en: 'Something went wrong', ru: 'Что-то пошло не так' },
  'We encountered an error while showing the quiz.': { en: 'We encountered an error while showing the quiz.', ru: 'Произошла ошибка при отображении теста.' },
  'Go back': { en: 'Go back', ru: 'Назад' },
  'Try Again': { en: 'Try Again', ru: 'Попробовать снова' },
  'Not quite right. Try again!': { en: 'Not quite right. Try again!', ru: 'Не совсем правильно. Попробуйте еще раз!' },
  'Length difference:': { en: 'Length difference:', ru: 'Разница в длине:' },
  'Correct answers:': { en: 'Correct answers:', ru: 'Правильные ответы:' },
  'Play pronunciation': { en: 'Play pronunciation', ru: 'Воспроизвести произношение' },
  // Add new translations for quiz completion panel
  'Great work!': { en: 'Great work!', ru: 'Отличная работа!' },
  'Let\'s try again!': { en: 'Let\'s try again!', ru: 'Давайте попробуем ещё раз!' },
  'Your score:': { en: 'Your score:', ru: 'Ваш результат:' },
  'Turi is impressed with your progress! You\'re doing great with your language journey.': { 
    en: 'Turi is impressed with your progress! You\'re doing great with your language journey.',
    ru: 'Тури впечатлен вашим прогрессом! Вы отлично справляетесь с изучением языка.'
  },
  'Turi believes in you! A little more practice and you\'ll master these words.': {
    en: 'Turi believes in you! A little more practice and you\'ll master these words.',
    ru: 'Тури верит в вас! Ещё немного практики, и вы освоите эти слова.'
  }
};

function t(key: string, lang: SupportedLanguage) {
  // Use the translation if available, fallback to English, then to the key itself
  return translations[key]?.[lang] || translations[key]?.['en'] || key;
}

// Map supported languages to their speech recognition codes
const getRecognitionLanguage = (lang: SupportedLanguage): string => {
  const languageMap: Partial<Record<SupportedLanguage, string>> = {
    'en': 'en-US',
    'ru': 'ru-RU',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'ar': 'ar-SA',
    'CH': 'zh-CN',
    'ja': 'ja-JP'
  };
  return languageMap[lang] || 'en-US'; // Default to English
};

// Helper function to get language name for display
const getLanguageName = (lang: SupportedLanguage, displayLang: SupportedLanguage): string => {
  const languageNames: Partial<Record<SupportedLanguage, Partial<Record<SupportedLanguage, string>>>> = {
    'en': { en: 'English', ru: 'английском' },
    'ru': { en: 'Russian', ru: 'русском' },
    'es': { en: 'Spanish', ru: 'испанском' },
    'fr': { en: 'French', ru: 'французском' },
    'de': { en: 'German', ru: 'немецком' },
    'it': { en: 'Italian', ru: 'итальянском' },
    'pt': { en: 'Portuguese', ru: 'португальском' },
    'ar': { en: 'Arabic', ru: 'арабском' },
    'CH': { en: 'Chinese', ru: 'китайском' },
    'ja': { en: 'Japanese', ru: 'японском' }
  };
  return languageNames[lang]?.[displayLang] || lang;
};

const VocalQuizComponent: React.FC<VocalQuizProps> = ({
  dialogueId,
  onComplete,
  onClose,
  characterId = 1
}) => {
  // Get languages from store
  const { motherLanguage, targetLanguage, user, setIsQuizActive, setIsMovementDisabled } = useStore();
  
  // Added ref to track if user manually stopped listening
  const userStoppedListening = useRef(false);
  
  // Quiz state
  const [quizWords, setQuizWords] = useState<VocalQuizWord[]>([]);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  
  // Add this line with other state declarations
  const [recognitionActive, setRecognitionActive] = useState(false);
  const recognitionActiveRef = useRef(false);
  
  // Ensure dialogue ID is a valid number
  const safeDialogueId = useMemo(() => {
    // Convert to number and check if valid
    const numId = Number(dialogueId);
    console.log('Creating safe dialogue ID:', dialogueId, '→', numId, 'isNaN?', isNaN(numId));
    
    // Default to 1 if not a valid number
    return isNaN(numId) ? 1 : numId;
  }, [dialogueId]);
  
  // Fetch quiz words from the database
  useEffect(() => {
    const fetchQuizWords = async () => {
      try {
        setIsLoading(true);
        logger.info('Fetching quiz words', { dialogueId: safeDialogueId, targetLanguage });
        console.log('Fetching quiz words with dialogueId:', safeDialogueId, 'type:', typeof safeDialogueId);
        
        // Get words for the current dialogue
        const { data, error } = await supabase
          .from('words_quiz')
          .select('*')
          .eq('dialogue_id', safeDialogueId); // Use the safe dialogue ID
        
        if (error) {
          logger.error('Error fetching quiz data', { error });
          console.error('Error fetching quiz data:', error);
          setError('Failed to load quiz words: ' + error.message);
          setIsLoading(false);
          return;
        }
        
        if (!data || data.length === 0) {
          logger.warn('No quiz words found', { dialogueId: safeDialogueId });
          console.warn('No quiz words found for dialogue ID:', safeDialogueId);
          
          // Try querying without the dialogue_id filter to see if there are any words at all
          const { data: allData, error: allError } = await supabase
            .from('words_quiz')
            .select('*');
        
          if (!allError && allData && allData.length > 0) {
            console.log('Found words in quiz table, but none for this dialogue_id. Total words:', allData.length);
            console.log('Available dialogue_ids:', [...new Set(allData.map(item => item.dialogue_id))]);
            
            // Fall back to dialogue_id 1 if the requested dialogue has no words
            if (safeDialogueId !== 1) {
              console.log('Falling back to dialogue_id 1');
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('words_quiz')
                .select('*')
                .eq('dialogue_id', 1);
        
              if (!fallbackError && fallbackData && fallbackData.length > 0) {
                console.log('Found fallback words for dialogue_id 1:', fallbackData.length);
                setQuizWords(fallbackData as VocalQuizWord[]);
                setIsLoading(false);
                return;
              }
            }
          }
          
          setError('No quiz words found for this dialogue');
          setIsLoading(false);
          return;
        }
        
        logger.info('Quiz words fetched successfully', { count: data.length });
        console.log('Fetched quiz words:', data);
        
        setQuizWords(data as VocalQuizWord[]);
        setIsLoading(false);
      } catch (err) {
        logger.error('Exception fetching quiz words', { error: err });
        console.error('Exception fetching quiz words:', err);
        setError('Failed to load quiz words: ' + (err as Error).message);
        setIsLoading(false);
      }
    };
    
    fetchQuizWords();
  }, [safeDialogueId, targetLanguage]);
  
  // Get current word
  const currentWord = quizWords.length > 0 ? quizWords[currentWordIndex] : null;
  
  // Get the word to display and the expected answer based on language direction
  const getCurrentWord = () => {
    try {
      if (!currentWord) return { displayWord: '', answerWord: '' };

      // Dynamic language column mapping
      const getLanguageColumn = (lang: SupportedLanguage): string => {
        // Map language codes to database column names
        const columnMap: Record<string, string> = {
          'en': 'entry_in_en',
          'ru': 'entry_in_ru', 
          'es': 'entry_in_es',
          'fr': 'entry_in_fr',
          'de': 'entry_in_de',
          'it': 'entry_in_it',
          'pt': 'entry_in_pt',
          'ar': 'entry_in_ar',
          'CH': 'entry_in_ch',
          'ja': 'entry_in_ja'
        };
        return columnMap[lang] || 'entry_in_en'; // fallback to English
      };

      // Get the column names for target and mother languages
      const targetColumn = getLanguageColumn(targetLanguage);
      const motherColumn = getLanguageColumn(motherLanguage);

      // Get the words from the appropriate columns
      const targetWord = currentWord[targetColumn] || '';
      const motherWord = currentWord[motherColumn] || '';

      // User is learning the target language, so:
      // - Show word in mother language (what they know)
      // - Expect answer in target language (what they're learning)
      return {
        displayWord: motherWord,  // Show in mother language
        answerWord: targetWord    // Expect in target language
      };
    } catch (error) {
      console.error('Error in getCurrentWord:', error);
      // Return safe default values if there's an error
      return { displayWord: '', answerWord: '' };
    }
  };
  
  const { displayWord, answerWord } = getCurrentWord();
  
  // Set up speech recognition - improved for Russian language support
  useEffect(() => {
    // Skip if no word is available yet
    if (!currentWord) {
      return;
    }
  
    // Early cleanup of any existing recognition instance
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
        recognitionRef.current.onend = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onresult = null;
        recognitionRef.current.onstart = null;
        recognitionRef.current = null;
        setRecognitionActive(false);
        recognitionActiveRef.current = false;
      } catch (error) {
        console.error('Error cleaning up previous recognition instance:', error);
      }
    }
    
    // Check browser support
    if (!('SpeechRecognition' in window) && !('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser');
      return;
    }
    
    // Current expected answer - stored for closure access
    const expectedAnswer = answerWord;
    console.log(`🎯 Setting up recognition for expected answer: "${expectedAnswer}"`);
    
    // Longer wait for first question to ensure dialogue recognition is fully released
    const initDelay = currentWordIndex === 0 ? 1200 : 500;
    console.log(`Setting up recognition with ${initDelay}ms delay (first question: ${currentWordIndex === 0})`);
    
    // Wait before initializing to avoid race conditions
    const initTimeout = setTimeout(() => {
      try {
        // Prevent multiple initialization
        if (recognitionActiveRef.current) {
          console.log('🎤 Recognition is already active, skipping initialization');
          return;
        }
        
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Set language based on what the user is learning
        const recognitionLanguage = getRecognitionLanguage(targetLanguage);
        recognition.lang = recognitionLanguage;
        
        console.log(`🎤 Creating speech recognition for: ${recognitionLanguage}`);
        
        // Simple configuration that's known to work more reliably
        recognition.continuous = false;
        recognition.interimResults = false;  // Only get final results
        recognition.maxAlternatives = 5;  // Increased from 3 to 5 for better matching
        
        // Basic handlers with minimal logic
        recognition.onstart = () => {
          console.log(`🎤 Recognition started (language: ${recognitionLanguage})`);
          setIsListening(true);
          setRecognitionActive(true);
          recognitionActiveRef.current = true;
        };
      
        recognition.onresult = (event: SpeechRecognitionEvent) => {
          try {
            // Keep it simple - get the transcript and alternatives
            const result = event.results[0];
            
            // Try to get multiple alternatives for better matching
            let transcripts = [];
            for (let i = 0; i < result.length; i++) {
              transcripts.push(result[i].transcript.trim());
              console.log(`🎤 Recognized (alt ${i}): "${result[i].transcript}" (${result[i].confidence.toFixed(2)})`);
            }
            
            // Use the first/best transcript for display
            const primaryTranscript = transcripts[0];
            setTranscript(primaryTranscript);
            
            // Log answer info for debugging
            console.log(`🔍 DEBUG - Expected answer: "${expectedAnswer}"`);
            console.log(`🔍 DEBUG - Transcribed: "${primaryTranscript}"`);
            
            // Check all alternatives against the expected answer
            let foundMatch = false;
            let matchingTranscript = '';
            
            for (const transcript of transcripts) {
              // If exact visual match (ignoring only whitespace)
              if (transcript.trim() === expectedAnswer.trim()) {
                console.log(`✅ EXACT MATCH! "${transcript}" matches "${expectedAnswer}"`);
                foundMatch = true;
                matchingTranscript = transcript;
                break;
              }
              
              // If match after cleaning
              if (checkTranscriptMatch(transcript, expectedAnswer)) {
                console.log(`✅ MATCHED! "${transcript}" accepted for "${expectedAnswer}"`);
                foundMatch = true;
                matchingTranscript = transcript;
                break;
              }
            }
            
            // Process the answer based on matching
            if (foundMatch) {
              console.log(`✅ ACCEPTING ANSWER: "${matchingTranscript}" for "${expectedAnswer}"`);
              processCorrectAnswer();
            } else {
              console.log(`❌ REJECTING ANSWER: No match found for "${expectedAnswer}"`);
              processIncorrectAnswer();
            }
          } catch (err) {
            console.error('Error processing recognition result:', err);
            // If error, ensure we reset the recognition state
            setRecognitionActive(false);
            recognitionActiveRef.current = false;
            setIsListening(false);
          }
        };
        
        recognition.onend = () => {
          console.log('🎤 Recognition ended');
          setIsListening(false);
          
          // Reset the active flag
          setRecognitionActive(false);
          recognitionActiveRef.current = false;
          
          // Restart recognition if we're still waiting for an answer
          if (isCorrect === null && !userStoppedListening.current) {
            console.log('🎤 Auto-restarting recognition after end event');
            
            // Create a reliable restart function
            const restartRecognition = (attempt = 1, maxAttempts = 3) => {
              try {
                if (recognitionRef.current && isCorrect === null && !recognitionActiveRef.current) {
                  recognition.start();
                  console.log(`🎤 Recognition restarted successfully (attempt ${attempt})`);
                  return true;
                }
              } catch (err) {
                console.error(`Error restarting recognition (attempt ${attempt}):`, err);
                
                // Try again if we haven't reached max attempts
                if (attempt < maxAttempts) {
                  console.log(`Scheduling retry ${attempt + 1} of ${maxAttempts}`);
                  setTimeout(() => {
                    restartRecognition(attempt + 1, maxAttempts);
                  }, 700); // Longer delay between retries
                } else {
                  console.error('Failed all recognition restart attempts');
                }
              }
              return false;
            };
            
            // Give a little delay before first attempt
            setTimeout(() => {
              restartRecognition();
            }, 800);
          }
        };
        
        recognition.onerror = (event: any) => {
          const errorEvent = event as any;
          console.error(`🎤 Recognition error: ${errorEvent.error}`);
          
          // Reset the recognition state
          setRecognitionActive(false);
          recognitionActiveRef.current = false;
          setIsListening(false);
          
          // Only try to restart if it's a network error or aborted
          if (errorEvent.error === 'network' || errorEvent.error === 'aborted') {
            setTimeout(() => {
              try {
                if (recognitionRef.current && isCorrect === null && !recognitionActiveRef.current) {
                  recognitionRef.current.start();
                  console.log('🎤 Restarted after error');
                }
              } catch (e) {
                console.error('Failed to restart after error', e);
              }
            }, 2000); // Longer timeout for errors
          }
        };
        
        // Store and start only if not already active
        recognitionRef.current = recognition;
        
        // Only start if not already active
        if (!recognitionActiveRef.current) {
          try {
            recognition.start();
            console.log('🎤 Initial recognition started');
          } catch (err) {
            console.error('Failed to start initial recognition:', err);
          }
        }
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
        setRecognitionActive(false);
        recognitionActiveRef.current = false;
      }
    }, initDelay); // Small delay before initializing
    
    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current = null;
          setRecognitionActive(false);
          recognitionActiveRef.current = false;
        } catch (error) {
          console.error('Error cleaning up recognition:', error);
        }
      }
    };
  }, [currentWordIndex, isCorrect, targetLanguage, answerWord, currentWord]); // Re-initialize when word, language, or answer changes
  
  // Check if a transcript matches the expected answer
  const checkTranscriptMatch = (transcript: string, expected: string): boolean => {
    if (!transcript || !expected) return false;
    
    console.log(`🔍 Comparing answer: "${transcript.trim()}" vs expected "${expected.trim()}"`);
    
    // Special case for first question - be more lenient
    const isFirstQuestion = currentWordIndex === 0;
    if (isFirstQuestion) {
      console.log('🔍 This is the first question - using more lenient matching');
      
      // Check if it's "ваш" which is particularly problematic
      if (expected.trim().toLowerCase() === 'ваш') {
        console.log('🔍 Special case for "ваш" - extra lenient matching');
        const userLower = transcript.toLowerCase().trim();
        
        // Add common English sounds heard for "ваш"
        const lenientMatches = ['va', 'wa', 'vash', 'wash', 'wha', 'vas', 'vos', 'was', 'wass'];
        for (const match of lenientMatches) {
          if (userLower.includes(match)) {
            console.log(`✓ FIRST QUESTION LENIENT MATCH: found "${match}" in "${userLower}"`);
            return true;
          }
        }
      }
    }
  
    // NEW: Special case for when user says "машина" which seems to cause issues
    if (transcript.trim().toLowerCase().includes('машина') || transcript.trim().toLowerCase().includes('mashina')) {
      console.log('🚨 Detected "машина" in speech - using special handler to continue recognition');
      // Don't accept as correct, but ensure we restart recognition immediately
      setTimeout(() => {
        try {
          if (recognitionRef.current && isCorrect === null) {
            console.log('🔄 Forcefully restarting recognition after "машина" detected');
            
            // Force abort and recreate to ensure clean state
            recognitionRef.current.abort();
            
            // Create fresh recognition instance after a short delay
            setTimeout(() => {
              const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
              const freshRecognition = new SpeechRecognition();
              freshRecognition.continuous = false;
              freshRecognition.interimResults = false;
              freshRecognition.maxAlternatives = 10;
              freshRecognition.lang = getRecognitionLanguage(targetLanguage);
              
              // Copy existing handlers
              if (recognitionRef.current) {
                freshRecognition.onresult = recognitionRef.current.onresult;
                freshRecognition.onend = recognitionRef.current.onend;
                freshRecognition.onerror = recognitionRef.current.onerror;
              }
              
              // Replace the reference and start
              recognitionRef.current = freshRecognition;
              if (recognitionRef.current) {
                recognitionRef.current.start();
                console.log('🔄 Started fresh recognition after "машина"');
              }
            }, 300);
          }
        } catch (e) {
          console.error('Error handling "машина" special case:', e);
        }
      }, 100);
      return false;
    }
  
    // Directly compare the transcripts for exact visual match - extra important for Russian
    if (transcript.trim() === expected.trim()) {
      console.log('✓ EXACT VISUAL MATCH');
      return true;
    }
    
    // Clean up both strings for comparison
    const userClean = transcript.toLowerCase().trim()
      .replace(/[.,?!;:]/g, '')
      .replace(/\s+/g, ' ');
    
    const expectedClean = expected.toLowerCase().trim()
      .replace(/[.,?!;:]/g, '')
      .replace(/\s+/g, ' ');
    
    console.log(`🔍 Checking: "${userClean}" vs "${expectedClean}"`);
    
    // Compare directly ignoring case
    if (userClean === expectedClean) {
      console.log('✓ EXACT MATCH (ignoring case)');
      return true;
    }
    
    // NEW: Check if the expected word appears anywhere in the transcript
    // This makes it more lenient for repeated words like "ты ты"
    if (userClean.includes(expectedClean)) {
      console.log('✓ CONTAINS MATCH - expected word found in transcript');
      return true;
    }
    
    // Russian-specific exact match ignoring case and all spaces
    if (targetLanguage === 'ru') {
      const userNoSpace = userClean.replace(/\s+/g, '');
      const expectedNoSpace = expectedClean.replace(/\s+/g, '');
    
      if (userNoSpace === expectedNoSpace) {
        console.log('✓ EXACT MATCH (ignoring spaces)');
        return true;
      }
      
      // NEW: Check if expectedNoSpace appears anywhere in userNoSpace
      // Handles cases like "тыты" which should match "ты"
      if (userNoSpace.includes(expectedNoSpace)) {
        console.log('✓ CONTAINS MATCH (ignoring spaces)');
        return true;
      }
    }
    
    // Make character matching stricter
    if (expectedClean.length > 0 && userClean.length > 0) {
      // Check if they have similar length - prevents "машина" matching with "ваш"
      const lengthDifference = Math.abs(expectedClean.length - userClean.length);
      if (lengthDifference > 2 && !userClean.includes(expectedClean)) {
        console.log('✗ LENGTH MISMATCH: too different');
        return false;
      }
      
      // Count matching characters at start of word
      let matchingChars = 0;
      const minLength = Math.min(expectedClean.length, userClean.length);
      
      for (let i = 0; i < minLength; i++) {
        if (expectedClean[i] === userClean[i]) {
          matchingChars++;
        } else {
          break;
        }
      }
      
      // Stricter percentage requirement - at least 50% of the word must match
      const matchPercentage = (matchingChars / expectedClean.length) * 100;
      console.log(`🔤 Character match: ${matchingChars} chars, ${matchPercentage.toFixed(1)}%`);
      
      if (matchingChars >= 2 && matchPercentage >= 50) {
        console.log('✓ CHARACTER MATCH at beginning of word');
        return true;
      }
      
      // Special phonetic matching for Russian
      if (targetLanguage === 'ru') {
        // Examples of common misconversions:
        // "ваш" might be heard as "wash" or "vash"
        // "мой" might be heard as "moy"
        
        // Check for specific exact match cases
        const russianExactMatches: {[key: string]: string[]} = {
          'ваш': ['wash', 'vash', 'vosh', 'воше', 'ваше', 'vas', 'wass', 'was', 'what\'s', 'wax', 'voice', 'watch', 'wats', 'watts', 'vos', 'vars', 'vass', 'wass', 'vac', 'wise', 'fast', 'vast'],
          'мой': ['moy', 'moi', 'моя', 'my', 'me', 'mine', 'may', 'boy', 'toy', 'roy', 'joy'],
          'твой': ['tvoy', 'tvoi', 'твоя'],
          'наш': ['nash', 'наше'],
          'ваша': ['vasha', 'washa'],
          'моя': ['moya', 'моя', 'моё'], 
          'их': ['ikh', 'eeh', 'eah'],
          'твоя': ['tvoya', 'твой'],
          'его': ['yevo', 'yego', 'его'],
          'ты': ['ty', 'ti', 'tea', 'tee']  // Added more phonetic matches for "ты"
        };
        
        // Check for direct matches in our dictionary
        for (const [russianWord, englishEquivalents] of Object.entries(russianExactMatches)) {
          if (expectedClean === russianWord) {
            if (englishEquivalents.includes(userClean)) {
              console.log(`✓ RUSSIAN EXACT PHONETIC MATCH: ${russianWord} = ${userClean}`);
              return true;
            }
          }
        }
        
        // Simple phonetic map for Russian->English conversion
        const russianToEnglishMap: {[key: string]: string[]} = {
          'в': ['v', 'w'], 
          'а': ['a'],
          'ш': ['sh', 's'],
          'м': ['m'],
          'о': ['o'],
          'й': ['y', 'j', 'i'],
          'т': ['t'],
          'я': ['ya', 'ia'],
          'и': ['e', 'i', 'ee']
        };
        
        // This approach is too permissive and can lead to false positives
        // Let's make it stricter by requiring more accurate matches
        
        // Only attempt phonetic matching on short words (3 chars or less)
        // where confusion is more likely
        if (expectedClean.length <= 3) {
          // Convert expected Russian to possible English phonetics
          const russianChars = expectedClean.split('');
          let englishPhoneticParts: string[] = [];
          
          // Build possible English phonetic parts
          russianChars.forEach(char => {
            if (russianToEnglishMap[char]) {
              englishPhoneticParts = [...englishPhoneticParts, ...russianToEnglishMap[char]];
            }
          });
          
          // Check if the English transcript contains phonetic parts
          // but be much stricter - require most parts to match
          let matchCount = 0;
          if (englishPhoneticParts.length > 0) {
            englishPhoneticParts.forEach(part => {
              if (userClean.includes(part)) {
                matchCount++;
              }
            });
            
            // Require at least 75% of phonetic parts to match
            const requiredMatches = Math.ceil(englishPhoneticParts.length * 0.75);
            if (matchCount >= requiredMatches) {
              console.log(`✓ PHONETIC MATCH for Russian word: ${matchCount}/${englishPhoneticParts.length} parts`);
              return true;
            }
          }
        }
      }
    }
    
    return false;
  };
  
  // Process a correct answer
  const processCorrectAnswer = () => {
    console.log('✅ Answer accepted as correct');
    setIsCorrect(true);
      setCorrectCount(prev => prev + 1);
      
      // Play success sound
      const audio = new Audio('/sounds/correct.mp3');
    audio.play().catch(e => console.error('Failed to play sound:', e));
    
    // Always stop listening after processing an answer
    if (recognitionRef.current) {
      try {
        userStoppedListening.current = true;
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition after correct answer:', err);
      }
    }
    
    // Move to next word after a brief delay
    setTimeout(() => {
      if (currentWordIndex < quizWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setTranscript('');
        setIsCorrect(null);
        setShowHint(false);
      } else {
        finishQuiz();
      }
    }, 1500);
  };
  
  // Process an incorrect answer
  const processIncorrectAnswer = () => {
    console.log('❌ Answer incorrect');
    setIsCorrect(false);
    
    // Play error sound
    const audio = new Audio('/sounds/incorrect.mp3');
    audio.play().catch(e => console.error('Failed to play sound:', e));
    
    // CRUCIAL: Stop the current recognition but ensure we restart properly
    if (recognitionRef.current) {
      try {
        // Temporarily stop to reset the recognition state
        recognitionRef.current.stop();
        console.log('🎤 Temporarily stopped recognition after incorrect answer');
      } catch (err) {
        console.error('Error stopping recognition after incorrect answer:', err);
      }
    }
    
    // Show the error state momentarily but ensure we restart listening properly
    // Use a guaranteed restart approach with multiple attempts
    setTimeout(() => {
      // Only reset if still on the same question and still marked as incorrect
      if (isCorrect === false) {
        console.log('🎤 Resetting after incorrect answer');
        setIsCorrect(null);
        setTranscript('');
        
        // Make sure user didn't manually stop listening
        userStoppedListening.current = false;
        
        // First restart attempt
        const attemptRestart = () => {
          if (recognitionRef.current && isCorrect === null) {
            try {
              recognitionRef.current.start();
              console.log('🎤 Successfully restarted recognition after incorrect answer');
              return true;
            } catch (err) {
              console.warn('Error on first restart attempt:', err);
              return false;
            }
          }
          return false;
        };
        
        // Schedule multiple restart attempts
        setTimeout(() => {
          if (!attemptRestart()) {
            console.log('🎤 First restart attempt failed, scheduling second attempt');
            setTimeout(() => {
              if (!attemptRestart()) {
                console.log('🎤 Second restart attempt failed, scheduling final attempt');
                setTimeout(() => {
                  if (!attemptRestart()) {
                    console.error('🎤 All restart attempts failed after incorrect answer');
                  }
                }, 500);
              }
            }, 300);
          }
        }, 300);
      } else {
        console.log('🎤 Not resetting - state has changed');
      }
    }, 1500); // Slightly shorter error display time to improve flow
  };

  // Debug function to manually process a recognized word (bypassing speech recognition)
  const debugRecognizeWord = () => {
    try {
      if (!currentWord || !answerWord) {
        console.error('Cannot debug recognize - currentWord or answerWord is empty');
        return;
      }
      
      const fakeRecognition = answerWord.toLowerCase();
      console.log(`🐛 DEBUG: Processing word manually: "${fakeRecognition}"`);
      setTranscript(fakeRecognition);
      
      // Use the match checker for consistency
      if (checkTranscriptMatch(fakeRecognition, answerWord)) {
        processCorrectAnswer();
      } else {
        processIncorrectAnswer();
      }
    } catch (error) {
      console.error('Error in debugRecognizeWord:', error);
    }
  };
  
  // Load speech synthesis voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log('📢 Loaded', voices.length, 'voices');
        setAvailableVoices(voices);
        setVoicesLoaded(true);
        
        // Log available voices for debug
        voices.forEach((voice, i) => {
          console.log(`Voice ${i}: ${voice.name}, Lang: ${voice.lang}, Default: ${voice.default}`);
        });
      } else {
        console.log('No voices available yet, waiting...');
      }
    };
    
    // Initial load
    loadVoices();
    
    // Chrome needs this event to get voices
    if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    
    return () => {
      if ('onvoiceschanged' in window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);
  
  // Special handler ONLY for the first quiz question
  useEffect(() => {
    // ONLY run this for the first question (index 0)
    if (currentWordIndex !== 0 || !currentWord) {
      return;
    }

    console.log('🚨 SPECIAL FIRST QUESTION HANDLER ACTIVATED');
    console.log(`Expected answer for first question: "${answerWord}"`);

    // Ensure any existing recognition is fully cleared
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.abort();
        recognitionRef.current = null;
        console.log('🧹 Cleared existing recognition for first question');
      } catch (e) {
        console.error('Error clearing recognition:', e);
      }
    }

    // Give the browser a moment to release resources
    setTimeout(() => {
      try {
        // Create a completely fresh recognition ONLY for first question
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          console.error('Speech recognition not supported');
          return;
        }

        const firstQuestionRecognition = new SpeechRecognition();
        
        // Configure with increased alternatives for better matching
        firstQuestionRecognition.continuous = false;
        firstQuestionRecognition.interimResults = false;
        firstQuestionRecognition.maxAlternatives = 10; // Much higher for first question
        firstQuestionRecognition.lang = getRecognitionLanguage(targetLanguage);
        
        console.log(`🎤 Created dedicated recognition for first question (${firstQuestionRecognition.lang})`);

        // Handle start event
        firstQuestionRecognition.onstart = () => {
          console.log('🎤 First question recognition started');
          setIsListening(true);
          setRecognitionActive(true);
          recognitionActiveRef.current = true;
        };

        // Handle result with extremely lenient matching for first question only
        firstQuestionRecognition.onresult = (event: any) => {
          try {
            const results = event.results[0];
            
            // Log ALL alternatives for debugging
            console.log(`🔍 First question recognition results (${results.length} alternatives):`);
            const transcripts = [];
            
            for (let i = 0; i < results.length; i++) {
              const alt = results[i];
              transcripts.push(alt.transcript.trim());
              console.log(`  Alternative ${i+1}: "${alt.transcript}" (${alt.confidence.toFixed(2)})`);
            }
            
            // Set the primary transcript for UI
            const primaryTranscript = transcripts[0];
            setTranscript(primaryTranscript);
            
            // Check if ANY of the alternatives are acceptable
            let foundMatch = false;
            let matchingTranscript = '';
            
            // First, try normal matching
            for (const transcript of transcripts) {
              if (checkTranscriptMatch(transcript, answerWord)) {
                console.log(`✅ First question matched: "${transcript}" accepted for "${answerWord}"`);
                foundMatch = true;
                matchingTranscript = transcript;
                break;
              }
            }
            
            // If still no match, try EXTREMELY lenient matching just for first question
            if (!foundMatch) {
              // Extra lenient matching - check if any transcript has any part of the expected answer
              const cleanExpected = answerWord.toLowerCase().trim().replace(/[.,?!;:]/g, '');
              
              // Break expected into character pairs and check for them
              if (cleanExpected.length >= 2) {
                for (let i = 0; i < cleanExpected.length - 1; i++) {
                  const charPair = cleanExpected.substr(i, 2);
                  
                  for (const transcript of transcripts) {
                    const cleanTranscript = transcript.toLowerCase().trim().replace(/[.,?!;:]/g, '');
                    
                    if (cleanTranscript.includes(charPair)) {
                      console.log(`✅ SPECIAL FIRST QUESTION MATCH: Found character pair "${charPair}" from "${cleanExpected}" in "${cleanTranscript}"`);
                      foundMatch = true;
                      matchingTranscript = transcript;
                      break;
                    }
                  }
                  
                  if (foundMatch) break;
                }
              }
            }
            
            // Process the result
            if (foundMatch) {
              console.log(`✅ FIRST QUESTION ACCEPTED: "${matchingTranscript}" for "${answerWord}"`);
              processCorrectAnswer();
            } else {
              console.log(`❌ FIRST QUESTION REJECTED: No match found for "${answerWord}"`);
              processIncorrectAnswer();
              
              // For first question, immediately restart with higher leniency
              setTimeout(() => {
                if (isCorrect === null && !userStoppedListening.current) {
                  try {
                    if (recognitionRef.current) {
                      recognitionRef.current.start();
                      console.log('🔄 Restarted after first question rejection');
                    }
                  } catch (e) {
                    console.error('Error restarting first question recognition:', e);
                  }
                }
              }, 2000);
            }
          } catch (err) {
            console.error('Error processing first question result:', err);
          }
        };

        // Auto-restart when recognition ends
        firstQuestionRecognition.onend = () => {
          console.log('🎤 First question recognition ended');
          setIsListening(false);
          
          // Only reset activeRef if we're still on first question
          if (currentWordIndex === 0) {
            setRecognitionActive(false);
            recognitionActiveRef.current = false;
            
            // Auto-restart if needed
            if (isCorrect === null && !userStoppedListening.current) {
              console.log('🔄 Auto-restarting first question recognition');
              setTimeout(() => {
                try {
                  if (recognitionRef.current) {
                    recognitionRef.current.start();
                    console.log('✅ Successfully restarted first question recognition');
                  }
                } catch (e) {
                  console.error('Error restarting first question recognition:', e);
                }
              }, 500);
            }
          }
        };

        // Handle errors
        firstQuestionRecognition.onerror = (event: any) => {
          const errorEvent = event as any;
          console.error(`❌ First question recognition error: ${errorEvent.error}`);
          
          // Auto-restart even on error for first question
          setTimeout(() => {
            if (currentWordIndex === 0 && isCorrect === null && !userStoppedListening.current) {
              try {
                firstQuestionRecognition.start();
                console.log('🔄 Restarted after error in first question');
              } catch (e) {
                console.error('Failed to restart after error:', e);
              }
            }
          }, 1000);
        };

        // Store reference and start
        recognitionRef.current = firstQuestionRecognition;
        
        // Start with a delay to ensure setup is complete
        setTimeout(() => {
          if (recognitionRef.current && isCorrect === null) {
            try {
              recognitionRef.current.start();
              console.log('🎬 Started first question recognition');
            } catch (e) {
              console.error('Error starting first question recognition:', e);
            }
          }
        }, 500);
      } catch (e) {
        console.error('Fatal error setting up first question recognition:', e);
      }
    }, 1000);

    // Cleanup
    return () => {
      console.log('Cleaning up first question recognition');
      if (recognitionRef.current && currentWordIndex === 0) {
        try {
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.abort();
        } catch (e) {
          console.error('Error cleaning up first question recognition:', e);
        }
      }
    };
  }, [currentWordIndex, answerWord, targetLanguage, currentWord, isCorrect]);
  
  // Auto start listening when moving to next word
  useEffect(() => {
    // Skip for the first question - it's handled by our special handler
    if (currentWordIndex === 0) {
      console.log('🛑 Skipping standard recognition setup for first question - using dedicated handler');
      return;
    }
    
    // Normal behavior for questions after the first one
    if (recognitionRef.current && !isListening && isCorrect === null && !recognitionActiveRef.current) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Starting speech recognition for word beyond first question');
      } catch (error) {
        console.error('Failed to start speech recognition for non-first word', error);
      }
    }
  }, [currentWordIndex, isListening, isCorrect]);
  
  // Start listening for speech - now used for manual restart if needed
  const startListening = () => {
    setTranscript('');
    
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Failed to manually start speech recognition', error);
      }
    }
  };
  
  // Stop listening for speech
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      try {
        userStoppedListening.current = true; // Flag that user stopped it
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (error) {
        console.error('Failed to stop speech recognition', error);
      }
    }
  };
  
  // Play pronunciation of the current word
  const playAudio = () => {
    if (!currentWord || !displayWord) {
      console.error('Cannot play audio - currentWord or displayWord is missing');
      return;
    }
    
    // We want to play the word in the language the user is learning
    // If target language is Russian, we should play the Russian word (entry_in_ru)
    // If target language is English, we should play the English word (entry_in_en)
    const wordToPlay = targetLanguage === 'ru' ? currentWord.entry_in_ru : currentWord.entry_in_en;
    
    // Stop speech recognition temporarily while playing audio
    stopListening();
    
    try {
      console.log(`🔊 Playing ${targetLanguage} audio for word:`, wordToPlay);
      
      // Use a direct approach that works more reliably across browsers
      const utterance = new SpeechSynthesisUtterance(wordToPlay);
      
      // Set language to match what we're playing
      utterance.lang = getRecognitionLanguage(targetLanguage);
      utterance.volume = 1.0;  // Maximum volume
      utterance.rate = 0.8;    // Slightly slower
      
      // Log that we're about to speak
      console.log('🔊 Speaking:', wordToPlay, 'with language:', utterance.lang);
      
      // Cancel any existing speech and speak the new one
      window.speechSynthesis.cancel();
      
      // Add event handlers for debugging
      utterance.onstart = () => console.log('🔊 Speech started');
      utterance.onend = () => {
        console.log('🔊 Speech completed');
        // After speech completes, we can resume recognition if needed
        if (isCorrect === null) {
          userStoppedListening.current = false;
          startListening();
        }
      };
      utterance.onerror = (e) => console.error('🔊 Speech error:', e);
      
      // Speak
      window.speechSynthesis.speak(utterance);
      
    } catch (error) {
      console.error('Failed to play audio:', error);
      alert('Could not play audio. Please check your browser settings.');
    }
  };
  
  // Retry voice recognition
  const retryVoiceRecognition = () => {
    // Reset state
    setTranscript('');
    setIsCorrect(null);
    
    // Restart speech recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setTimeout(() => {
          if (recognitionRef.current) {
            recognitionRef.current.start();
            setIsListening(true);
            console.log('🎤 Manually restarted speech recognition');
          }
        }, 300);
      } catch (error) {
        console.error('Failed to restart speech recognition:', error);
      }
    }
  };
  
  // Toggle hint visibility - enhanced to always show answer in both languages
  const toggleHint = () => {
    console.log('Toggling hint visibility. Current state:', showHint);
    setShowHint(prevState => !prevState); // Use function form to ensure state toggle works
    
    // Temporarily stop recognizing speech while looking at hint
    if (!showHint) {
      stopListening();
    }
  };
  
  // Skip current word
  const skipWord = () => {
    // Mark current word as incorrect
    setIsCorrect(false);
    
    // Stop listening
    if (recognitionRef.current) {
      try {
        userStoppedListening.current = true;
        recognitionRef.current.stop();
      } catch (err) {
        console.error('Error stopping recognition for skip:', err);
      }
    }
    
    // Move to next word after a delay
    setTimeout(() => {
      if (currentWordIndex < quizWords.length - 1) {
        setCurrentWordIndex(prev => prev + 1);
        setTranscript('');
        setIsCorrect(null);
        setShowHint(false);
      } else {
        finishQuiz();
      }
    }, 1000);
  };
  
  // Debug check of user and character info at component mount
  useEffect(() => {
    console.log("VocalQuizComponent - Component mounted with:", {
      dialogueId,
      characterId,
      user: user?.id ? `User ID: ${user.id}` : "No user logged in"
    });
    
    // Return cleanup function
    return () => {
      console.log("VocalQuizComponent - Component unmounting");
    };
  }, [dialogueId, characterId, user?.id]);
  
  // Update user's progress when quiz is completed
  const finishQuiz = async () => {
    try {
      const passPercentage = (correctCount / quizWords.length) * 100;
      const passed = passPercentage >= 60; // 60% to pass
      
      console.log("VocalQuizComponent - Quiz finished with score:", passPercentage, "passed:", passed);
      
      if (user?.id) {
        try {
          // First, check if the user actually exists in the users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', user.id)
            .single();
          
          if (userError || !userData) {
            console.log("VocalQuizComponent - User exists in auth but not in users table, prompting signup");
            // The user has an auth ID but no entry in the users table
            // Call onComplete with a special flag to trigger the signup prompt
            onComplete(passed);
            
            logger.info('Vocal quiz completed - user needs signup', { 
              correctCount, 
              totalQuestions: quizWords.length,
              score: passPercentage,
              passed,
              characterId,
              dialogueId,
              authUserId: user.id
            });
            return;
          }
          
          // User exists in both auth and users table, update progress in the database
          console.log("VocalQuizComponent - Updating progress for user:", user.id, "dialogue:", dialogueId, "character:", characterId);
          
          // Use the actual count of words in this quiz
          const wordCount = quizWords.length;
          
          console.log("VocalQuizComponent - Quiz contains", wordCount, "words for dialogue", dialogueId);
          
          // Track dialogue completion
          await trackCompletedDialogue(user.id, characterId, dialogueId, passPercentage);
          
          // Update word progress if the quiz was passed
          if (passed) {
            // Use the exact dialogue ID that was completed
            console.log("VocalQuizComponent - Updating word progress for dialogue:", dialogueId);
            
            // Pass the dialogue ID to updateWordProgress
            await updateWordProgress(user.id, targetLanguage, dialogueId);
            
            console.log("VocalQuizComponent - Word progress updated for dialogue:", dialogueId, "with word count:", wordCount);
          }
          
          // Track which words/expressions the user has learned
          const learnedWords = quizWords
            .filter((word, index) => {
              // Consider a word "learned" if answered correctly or if it's from the special 500 words list
              return (index < correctCount) || word.is_from_500;
            })
            .map(word => word.id);
            
          console.log("VocalQuizComponent - Number of learned words:", learnedWords.length);
          
          // Still track individual words if needed
          if (learnedWords.length > 0) {
            const wordData = learnedWords.map(wordId => ({
              user_id: user.id,
              word_id: wordId,
              language_id: targetLanguage,
              learned_at: new Date().toISOString()
            }));
            
            console.log("VocalQuizComponent - Updating learned words:", learnedWords.length, "words");
            
            const { data: wordUpsertData, error: wordUpsertError } = await supabase
              .from('user_learned_words')
              .upsert(wordData);
              
            if (wordUpsertError) {
              console.error("VocalQuizComponent - Error upserting learned words:", wordUpsertError);
            } else {
              console.log("VocalQuizComponent - Word update successful for", learnedWords.length, "words");
            }
          }
        } catch (progressError) {
          console.error("VocalQuizComponent - Error updating progress:", progressError);
          logger.error("Error updating progress for logged-in user", { progressError });
          // We continue despite the error to ensure the quiz completion is acknowledged
        }
      } else {
        // User is not logged in, save progress locally
        console.log("VocalQuizComponent - No user logged in, saving progress locally");
        
        if (passed) {
          // Save anonymous progress to localStorage
          const saved = saveAnonymousProgress(dialogueId, characterId, passPercentage);
          
          if (saved) {
            console.log("VocalQuizComponent - Anonymous progress saved locally");
          } else {
            console.warn("VocalQuizComponent - Failed to save anonymous progress locally");
          }
        }
      }
      
      // Call completion callback
      console.log("VocalQuizComponent - Calling onComplete with passed:", passed);
      onComplete(passed);
      logger.info('Vocal quiz completed', { 
        correctCount, 
        totalQuestions: quizWords.length,
        score: passPercentage,
        passed,
        characterId,
        dialogueId
      });
    } catch (error) {
      console.error('VocalQuizComponent - Failed to update progress', error);
      logger.error('Failed to update quiz progress', { error, characterId, dialogueId });
      
      // Even if we have an error, still call the completion callback
      // This ensures the user can continue and get prompted for signup
      onComplete(true);
    }
  };
  
  // Update store quiz state when component mounts/unmounts
  useEffect(() => {
    // Set quiz as active in the store when component mounts
    setIsQuizActive(true);
    // Disable movement during quiz
    setIsMovementDisabled(true);
    
    // Clean up when unmounting
    return () => {
      setIsQuizActive(false);
      setIsMovementDisabled(false);
    };
  }, [setIsQuizActive, setIsMovementDisabled]);
  
  // Improved cleanup on unmount and special initial cleanup
  useEffect(() => {
    console.log('Quiz Component Mounted with dialogueId:', dialogueId);
    
    // CRITICAL: Completely flush all existing speech recognition at startup
    // This is crucial for preventing conflicts between dialogue and quiz components
    try {
      // Cancel any speech synthesis first
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log('🔇 Cancelled any ongoing speech synthesis');
      }
      
      // Hard kill ALL Speech Recognition
      // This aggressive approach is needed to ensure a clean state
      if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        // Create and abort multiple temporary instances to flush the system
        for (let i = 0; i < 3; i++) {
          try {
            const temp = new SpeechRecognition();
            temp.continuous = false;
            temp.interimResults = false;
            
            // Nullify all handlers
            temp.onresult = null;
            temp.onerror = null;
            temp.onend = null;
            temp.onstart = null;
            
            // Abort immediately
            temp.abort();
            console.log(`🗑️ Aborted temporary recognition instance ${i+1}`);
          } catch (e) {
            console.log(`Error with cleanup instance ${i+1}:`, e);
          }
        }
      }
      
      // Clear any global flags/timers that might affect recognition
      if (typeof window !== 'undefined') {
        window._quizSpeechRecognitionActive = true;
        
        // Clear any lingering timeouts that might be interfering
        const highestId = window.setTimeout(() => {}, 0);
        for (let i = 0; i < highestId; i++) {
          window.clearTimeout(i);
        }
        console.log(`🧹 Cleared lingering timeouts`);
      }
    } catch (e) {
      console.error('Error during initial cleanup:', e);
    }
    
    // Return a cleanup function
    return () => {
      console.log('Quiz Component Unmounting - cleaning up speech recognition');
      // Cleanup speech recognition
      if (recognitionRef.current) {
        try {
          // Nullify all handlers first
          recognitionRef.current.onresult = null;
          recognitionRef.current.onerror = null;
          recognitionRef.current.onend = null;
          recognitionRef.current.onstart = null;
          
          // Then abort
          recognitionRef.current.abort();
          recognitionRef.current = null;
          
          setRecognitionActive(false);
          recognitionActiveRef.current = false;
        } catch (error) {
          console.error('Error cleaning up recognition on unmount:', error);
        }
      }
      
      // Reset the global flag
      try {
        if (typeof window !== 'undefined') {
          window._quizSpeechRecognitionActive = false;
          
          // Cancel any speech
          if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
          }
        }
      } catch (e) {
        console.error('Error resetting global speech recognition flag:', e);
      }
    };
  }, []); // Empty dependency array means this runs once on mount
  
  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="w-full max-w-md p-8 shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white">
          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="p-4 rounded-full bg-indigo-900/30 border border-indigo-800/40">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            </div>
            <p className="text-xl font-medium text-white">Turi is preparing your quiz...</p>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mt-4">
              <div className="h-full bg-gradient-to-r from-indigo-600 to-indigo-400 animate-pulse rounded-full" style={{ width: '70%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error || quizWords.length === 0) {
    console.log('Showing error state:', { error, quizWordsLength: quizWords.length });
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="w-full max-w-md p-8 mx-4 shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white">
          <div className="flex flex-col items-center justify-center space-y-5">
            <div className="p-4 rounded-full bg-red-900/20 border border-red-800/30">
            <XCircle className="w-12 h-12 text-red-500" />
            </div>
            <p className="text-xl font-medium text-white text-center">
              {error || "Turi couldn't find any quiz words for this dialogue"}
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 mt-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg transition-colors font-medium shadow-md"
            >
              {t('Go back', motherLanguage)}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Quiz completed state
  if (currentWordIndex >= quizWords.length) {
    const passPercentage = (correctCount / quizWords.length) * 100;
    const passed = passPercentage >= 60; // 60% to pass
    
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50">
        <div className="w-full max-w-md p-8 mx-4 shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white pointer-events-auto">
          <div className="flex flex-col items-center justify-center space-y-6">
            {passed ? (
              <div className="p-5 rounded-full bg-green-900/20 border border-green-700/30">
              <CheckCircle className="w-16 h-16 text-green-500" />
              </div>
            ) : (
              <div className="p-5 rounded-full bg-amber-900/20 border border-amber-700/30">
                <XCircle className="w-16 h-16 text-amber-500" />
              </div>
            )}
            
            <h2 className="text-3xl font-bold text-white">
              {t(passed ? 'Great work!' : 'Let\'s try again!', motherLanguage)}
            </h2>
            
            <div className="text-center bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 w-full">
              <p className="text-xl text-slate-300 mb-2">
                {t('Your score:', motherLanguage)}
              </p>
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    <circle 
                      className="text-slate-700" 
                      strokeWidth="8" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="40" 
                      cx="50" 
                      cy="50" 
                    />
                    <circle 
                      className="text-indigo-500" 
                      strokeWidth="8" 
                      stroke="currentColor" 
                      fill="transparent" 
                      r="40" 
                      cx="50" 
                      cy="50" 
                      strokeDasharray={`${(passPercentage * 2.51)}, 251`} 
                      strokeDashoffset="0" 
                      strokeLinecap="round" 
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">{passPercentage.toFixed(0)}%</span>
                    <span className="text-sm font-medium text-slate-400">{correctCount}/{quizWords.length}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-lg text-slate-200 text-center bg-indigo-900/20 p-4 rounded-lg border border-indigo-800/40">
              {t(passed 
                ? 'Turi is impressed with your progress! You\'re doing great with your language journey.' 
                : 'Turi believes in you! A little more practice and you\'ll master these words.', motherLanguage)}
            </p>
            
            <button
              onClick={() => onComplete(passed)}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg transition-colors font-medium shadow-md cursor-pointer pointer-events-auto"
              type="button"
            >
              {t('Continue my journey', motherLanguage)}
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Main quiz view (now in a modal window rather than full screen)
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
      {/* Add error boundary wrapper */}
      {(() => {
        try {
          console.log('Rendering quiz UI with:', {
            currentWordIndex,
            totalWords: quizWords.length,
            currentWord: currentWord ? `${currentWord.entry_in_en} / ${currentWord.entry_in_ru}` : 'NULL',
            displayWord,
            answerWord
          });
          
          return (
            <div 
              className="w-full max-w-md shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white overflow-hidden relative" 
              style={{ pointerEvents: 'auto' }}
            >
              {/* Quiz header with close button */}
              <div className="bg-slate-800/80 p-4 flex justify-between items-center border-b border-slate-700">
                <h2 className="text-lg font-bold text-white">{t('Vocabulary Quiz', motherLanguage)}</h2>
                <button 
                  onClick={onClose}
                  className="rounded-full bg-slate-700 hover:bg-slate-600 h-8 w-8 flex items-center justify-center transition-colors"
                  type="button"
                >
                  ×
                </button>
              </div>
              
              <div className="p-6">
        {/* Progress indicator */}
        <div className="flex justify-between items-center mb-6">
          <span className="text-sm font-medium text-slate-400">
                    {t('Question', motherLanguage)} {currentWordIndex + 1} of {quizWords.length}
          </span>
          <div className="flex items-center space-x-1">
            <span className="text-sm font-medium text-slate-400">
                      {t('correct', motherLanguage)}: {correctCount}
            </span>
          </div>
        </div>
        
        {/* Question */}
                <div className="mb-8 text-center">
                  <h2 className="text-2xl font-bold text-white mb-6">
                    {t('How do you say', motherLanguage)} "{displayWord}" in {getLanguageName(targetLanguage, motherLanguage)}?
                    {currentWord?.is_from_500 && (
                      <span className="ml-2 text-yellow-400">⭐</span>
                    )}
          </h2>
                  
                  {/* Sound buttons container */}
                  <div className="text-xl font-medium text-indigo-300 flex justify-center items-center gap-2 mt-4 sound-container relative" style={{ zIndex: 5 }}>
                    {/* Sound button */}
            <button 
                      onClick={(e) => { e.stopPropagation(); playAudio(); }}
                      className="p-4 rounded-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white transition-colors cursor-pointer flex items-center justify-center shadow-lg"
                      style={{ minWidth: '60px', minHeight: '60px' }}
                      aria-label={t('Play pronunciation', motherLanguage)}
                      type="button"
            >
                      <Volume className="w-8 h-8" />
            </button>
          </div>
                  
                  {/* Enhanced hint section */}
                  {showHint && (
                    <div className="mt-4 p-3 bg-indigo-900/30 rounded-lg border border-indigo-800">
                      <div className="flex flex-col gap-2">
                        <div>
                          <span className="text-slate-400 text-sm">{t('Word to pronounce:', motherLanguage)}</span>
                          <div className="text-indigo-300 font-medium text-xl">{answerWord}</div>
                        </div>
                        
                        <div className="border-t border-indigo-800 pt-2">
                          <span className="text-slate-400 text-sm">{t('Translation:', motherLanguage)}</span>
                          <div className="text-white font-medium">{displayWord}</div>
                        </div>
                      </div>
                    </div>
                  )}
        </div>
        
        {/* Voice input section */}
                <div className="mb-8">
          <div 
            className={`
              p-4 rounded-lg border text-center mb-4
              ${isCorrect === true ? 'bg-green-900/20 border-green-700 text-green-400' : 
                isCorrect === false ? 'bg-red-900/20 border-red-700 text-red-400' : 
                        'bg-slate-800/60 border-slate-700 text-white hover:border-indigo-500 transition-colors'}
            `}
          >
            <p className="text-lg font-medium">
                      {transcript ? transcript : t('Say the word...', motherLanguage)}
            </p>
          </div>
        </div>
        
                {/* Feedback section - made larger and more prominent */}
        {isCorrect === true && (
          <div className="mb-6 text-center animate-fade-in">
                    <CheckCircle className="w-14 h-14 text-green-500 mx-auto mb-3" />
                    <p className="text-lg font-bold text-green-400">{t('Great job! Turi is proud of you!', motherLanguage)}</p>
          </div>
        )}

                {/* Add a "Try Again" button when answer is incorrect */}
                {isCorrect === false && (
                  <div className="mb-6 text-center animate-fade-in">
                    <XCircle className="w-14 h-14 text-red-500 mx-auto mb-3" />
                    <p className="text-lg font-bold text-red-400">{t('Not quite right. Try again!', motherLanguage)}</p>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsCorrect(null);
                        setTranscript('');
                        userStoppedListening.current = false;
                        retryVoiceRecognition();
                      }}
                      className="mt-4 px-5 py-2.5 flex items-center gap-1 mx-auto rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-colors text-white font-medium shadow-md"
                      type="button"
                    >
                      {t('Try Again', motherLanguage)}
                    </button>
                  </div>
                )}
        
        {/* Action buttons */}
                <div className="flex items-center justify-center gap-3 relative z-10">
          <button
                    onClick={(e) => { e.stopPropagation(); toggleHint(); }}
                    className="px-5 py-2.5 flex items-center gap-1 rounded-lg bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-colors text-white font-medium shadow-md"
                    style={{ minHeight: '44px' }}
                    type="button"
          >
            <HelpCircle className="w-5 h-5" />
                    {showHint ? t('Hide hint', motherLanguage) : t('Show hint', motherLanguage)}
          </button>
          
                  {/* Debug Accept button */}
          <button
                    onClick={(e) => { e.stopPropagation(); debugRecognizeWord(); }}
                    className="px-5 py-2.5 flex items-center gap-1 rounded-lg bg-gradient-to-r from-green-700 to-green-600 hover:from-green-600 hover:to-green-500 transition-colors text-white font-medium shadow-md"
                    style={{ minHeight: '44px' }}
                    type="button"
                  >
                    {t('Debug Accept', motherLanguage)}
          </button>
        </div>
                
                {/* Debug Panel - simplified */}
                <div className="mt-6 pt-3 border-t border-slate-700">
                  <details className="text-sm text-slate-400">
                    <summary className="cursor-pointer hover:text-slate-300 transition-colors">
                      {t('Debug Info', motherLanguage)}
                    </summary>
                    <div className="mt-2 bg-slate-800/40 p-3 rounded-lg">
                      <p>{t('Expected:', motherLanguage)} <span className="text-white font-medium">{answerWord}</span> <span className="text-slate-500">({answerWord.length} chars)</span></p>
                      <p>{t('Heard:', motherLanguage)} <span className="text-white font-medium">{transcript}</span> <span className="text-slate-500">({transcript.length} chars)</span></p>
                      <p>{t('Length difference:', motherLanguage)} <span className={`font-medium ${Math.abs(answerWord.length - transcript.length) > 2 ? 'text-red-400' : 'text-green-400'}`}>{Math.abs(answerWord.length - transcript.length)}</span></p>
                      
                      {targetLanguage === 'ru' && (
                        <div className="mt-2 pt-2 border-t border-slate-700">
                          <p className="text-slate-400 mb-1">Phonetic alternatives for "{answerWord}":</p>
                          <div className="text-xs bg-slate-800 p-2 rounded font-mono">
                            {answerWord === 'ваш' && 'wash, vash, vosh'}
                            {answerWord === 'мой' && 'moy, moi, moye'}
                            {answerWord === 'твой' && 'tvoy, tvoi, tvoya'}
                            {answerWord === 'наш' && 'nash, nush'}
                            {answerWord === 'ваша' && 'vasha, washa'}
                            {answerWord === 'моя' && 'moya, moia'}
                            {answerWord === 'их' && 'ikh, eeh'}
                            {answerWord === 'твоя' && 'tvoya, tvoia'}
                            {answerWord === 'его' && 'yevo, yego'}
                            {/* Add other common words here */}
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-2">
                        <p>{t('Target Language:', motherLanguage)} <span className="text-white">{targetLanguage}</span></p>
                        <p>{t('Word Index:', motherLanguage)} <span className="text-white">{currentWordIndex + 1}/{quizWords.length}</span></p>
                        <p>{t('Correct answers:', motherLanguage)} <span className="text-white">{correctCount}</span></p>
                      </div>
                    </div>
                  </details>
                </div>
              </div>
            </div>
          );
        } catch (error) {
          console.error('Error rendering quiz UI:', error);
          return (
            <div className="w-full max-w-md p-8 mx-4 shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white">
              <h2 className="text-xl font-bold mb-4">{t('Something went wrong', motherLanguage)}</h2>
              <p className="mb-4">{t('We encountered an error while showing the quiz.', motherLanguage)}</p>
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg transition-colors shadow-md"
              >
                {t('Go back', motherLanguage)}
              </button>
      </div>
          );
        }
      })()}
    </div>
  );
};

// Set default props
VocalQuizComponent.defaultProps = {
  characterId: 1
};

export default VocalQuizComponent; 

// Expose VocalQuizComponent to the global window object for direct access
if (typeof window !== 'undefined') {
  (window as any).VocalQuizComponent = VocalQuizComponent;
  console.log('VocalQuizComponent exposed to window object');
} 