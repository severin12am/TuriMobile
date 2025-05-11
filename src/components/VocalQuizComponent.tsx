import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CheckCircle, XCircle, HelpCircle, Volume, Mic, MicOff, 
  ArrowRight, Loader2 
} from 'lucide-react';
import { supabase } from '../services/supabase';
import { useStore } from '../store';
import { logger } from '../services/logger';

// Add WebSpeechAPI type definitions
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

// Updated to match quiz table schema
interface VocalQuizWord {
  id: number;
  entry_in_en: string;
  entry_in_ru: string;
  dialogue_id: number;
  is_from_500: boolean;
}

interface VocalQuizProps {
  dialogueId: number;
  onComplete: (passed: boolean) => void;
  onClose: () => void;
}

type Lang = 'en' | 'ru';
const translations: Record<string, Record<Lang, string>> = {
  'Vocabulary Quiz': { en: 'Vocabulary Quiz', ru: 'Словарный тест' },
  'Question': { en: 'Question', ru: 'Вопрос' },
  'correct': { en: 'correct', ru: 'правильно' },
  'How do you say': { en: 'How do you say', ru: 'Как сказать' },
  'in English': { en: 'in English', ru: 'по-английски' },
  'in Russian': { en: 'in Russian', ru: 'по-русски' },
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
};

function t(key: string, lang: Lang) {
  return translations[key]?.[lang] || key;
}

const VocalQuizComponent: React.FC<VocalQuizProps> = ({
  dialogueId,
  onComplete,
  onClose
}) => {
  // Get languages from store
  const { motherLanguage, targetLanguage, user } = useStore();
  
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
          .from('quiz')
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
            .from('quiz')
            .select('*');
            
          if (!allError && allData && allData.length > 0) {
            console.log('Found words in quiz table, but none for this dialogue_id. Total words:', allData.length);
            console.log('Available dialogue_ids:', [...new Set(allData.map(item => item.dialogue_id))]);
            
            // Fall back to dialogue_id 1 if the requested dialogue has no words
            if (safeDialogueId !== 1) {
              console.log('Falling back to dialogue_id 1');
              const { data: fallbackData, error: fallbackError } = await supabase
                .from('quiz')
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

      // If target language is English, user is learning English
      if (targetLanguage === 'en') {
        return {
          displayWord: currentWord.entry_in_ru, // Show Russian word
          answerWord: currentWord.entry_in_en   // Expect English answer
        };
      } else {
        // If target language is Russian, user is learning Russian
        return {
          displayWord: currentWord.entry_in_en, // Show English word
          answerWord: currentWord.entry_in_ru   // Expect Russian answer
        };
      }
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
        recognitionRef.current = null;
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
    
    // Wait a bit before initializing to avoid race conditions
    const initTimeout = setTimeout(() => {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Set language based on what the user is learning
        // When learning Russian, we need to recognize Russian words
        const recognitionLanguage = targetLanguage === 'ru' ? 'ru-RU' : 'en-US';
        recognition.lang = recognitionLanguage;
        
        console.log(`🎤 Creating speech recognition for: ${recognitionLanguage}`);
        
        // Simple configuration that's known to work more reliably
        recognition.continuous = false;
        recognition.interimResults = false;  // Only get final results
        recognition.maxAlternatives = 3;  // Get a few alternatives for better matching
        
        // Basic handlers with minimal logic
        recognition.onstart = () => {
          console.log(`🎤 Recognition started (language: ${recognitionLanguage})`);
          setIsListening(true);
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
            // If error, ensure we resume listening
            setTimeout(() => {
              try {
                if (recognitionRef.current && isCorrect === null) {
                  recognitionRef.current.start();
                  console.log('🎤 Restarting after error');
                }
              } catch (e) {
                console.error('Failed to restart after error', e);
              }
            }, 500);
          }
        };
        
        recognition.onend = () => {
          console.log('🎤 Recognition ended');
          setIsListening(false);
          
          // Restart recognition if we're still waiting for an answer
          if (isCorrect === null && !userStoppedListening.current) {
            console.log('🎤 Auto-restarting recognition');
            setTimeout(() => {
              try {
                if (recognitionRef.current && isCorrect === null) {
                  recognition.start();
                  console.log('🎤 Recognition restarted successfully');
                }
              } catch (err) {
                console.error('Error restarting recognition:', err);
              }
            }, 300);
          }
        };
        
        recognition.onerror = (event: Event) => {
          const errorEvent = event as any;
          console.error(`🎤 Recognition error: ${errorEvent.error}`);
          
          // Always try to restart on errors
          setTimeout(() => {
            try {
              if (recognitionRef.current && isCorrect === null) {
                recognition.start();
                console.log('🎤 Restarted after error');
              }
            } catch (e) {
              console.error('Failed to restart after error', e);
            }
          }, 500);
        };
        
        // Store and start
        recognitionRef.current = recognition;
        recognition.start();
        
        console.log('🎤 Initial recognition started');
      } catch (error) {
        console.error('Failed to initialize speech recognition:', error);
      }
    }, 500); // Small delay before initializing
    
    // Cleanup
    return () => {
      clearTimeout(initTimeout);
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
          recognitionRef.current = null;
        } catch (error) {
          console.error('Error cleaning up recognition:', error);
        }
      }
    };
  }, [currentWordIndex, isCorrect, targetLanguage, answerWord, currentWord]); // Re-initialize when word, language, or answer changes
  
  // Check if a transcript matches the expected answer
  const checkTranscriptMatch = (transcript: string, expected: string): boolean => {
    if (!transcript || !expected) return false;
    
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
    
    // One contains the other
    if (userClean.includes(expectedClean) || expectedClean.includes(userClean)) {
      console.log('✓ PARTIAL MATCH - one contains the other');
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
    }
    
    // Very lenient character matching
    if (expectedClean.length > 0 && userClean.length > 0) {
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
      
      // Need at least 2 characters or 30% of the word to match
      const matchPercentage = (matchingChars / expectedClean.length) * 100;
      console.log(`🔤 Character match: ${matchingChars} chars, ${matchPercentage.toFixed(1)}%`);
      
      if (matchingChars >= 2 || matchPercentage >= 30) {
        console.log('✓ CHARACTER MATCH at beginning of word');
        return true;
      }
      
      // Special phonetic matching for Russian
      if (targetLanguage === 'ru') {
        // Examples of common misconversions:
        // "ваш" might be heard as "wash" or "vash"
        // "мой" might be heard as "moy"
        
        // Check specific exact match cases
        const russianExactMatches: {[key: string]: string[]} = {
          'ваш': ['wash', 'vash', 'vosh', 'воше', 'ваше'],
          'мой': ['moy', 'moi', 'моя'],
          'твой': ['tvoy', 'tvoi', 'твоя'],
          'наш': ['nash', 'наше'],
          'ваша': ['vasha', 'washa'],
          'моя': ['moya', 'моя', 'моё'], 
          'их': ['ikh', 'eeh', 'eah'],
          'твоя': ['tvoya', 'твой'],
          'его': ['yevo', 'yego', 'его']
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
        let matchCount = 0;
        if (englishPhoneticParts.length > 0) {
          englishPhoneticParts.forEach(part => {
            if (userClean.includes(part)) {
              matchCount++;
            }
          });
          
          if (matchCount >= 2 || (matchCount === 1 && englishPhoneticParts.length <= 2)) {
            console.log('✓ PHONETIC MATCH for Russian word');
            return true;
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
    
    // CRUCIAL: Immediately stop the current recognition to prevent race conditions
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('🎤 Stopped recognition after incorrect answer');
      } catch (err) {
        console.error('Error stopping recognition after incorrect answer:', err);
      }
    }
    
    // Show the error state momentarily but don't stop listening
    // After a short delay, reset to listening state to let user try again
    setTimeout(() => {
      // Only reset if still on the same question and still marked as incorrect
      if (isCorrect === false) {
        console.log('🎤 Resetting after incorrect answer');
        setIsCorrect(null);
        setTranscript('');
        
        // Restart listening after showing error
        setTimeout(() => {
          if (recognitionRef.current && isCorrect === null) {
            try {
              // Reset the user stopped flag
              userStoppedListening.current = false;
              
              // Start a new recognition session
              recognitionRef.current.start();
              console.log('🎤 Successfully restarted recognition after incorrect answer');
            } catch (err) {
              console.error('Error restarting recognition after incorrect answer:', err);
              
              // If error, try again once more after a delay
              setTimeout(() => {
                if (recognitionRef.current && isCorrect === null) {
                  try {
                    recognitionRef.current.start();
                    console.log('🎤 Recognition restarted on second attempt');
                  } catch (e) {
                    console.error('Failed to restart recognition on second attempt', e);
                  }
                }
              }, 500);
            }
          } else {
            console.log('🎤 Cannot restart - recognition object not available or answer already judged');
          }
        }, 300);
      } else {
        console.log('🎤 Not resetting - state has changed');
      }
    }, 2000); // Show error for 2 seconds
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
  
  // Auto start listening when moving to next word
  useEffect(() => {
    if (recognitionRef.current && !isListening && isCorrect === null) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        console.log('Starting speech recognition for new word');
      } catch (error) {
        console.error('Failed to start speech recognition for new word', error);
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
      utterance.lang = targetLanguage === 'ru' ? 'ru-RU' : 'en-US';
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
  
  // Update user's progress when quiz is completed
  const finishQuiz = async () => {
    try {
      const passPercentage = (correctCount / quizWords.length) * 100;
      const passed = passPercentage >= 60; // 60% to pass
      
      if (user?.id) {
        // Track which words/expressions the user has learned
        const learnedWords = quizWords
          .filter((word, index) => {
            // Consider a word "learned" if answered correctly or if it's from the special 500 words list
            return (index < correctCount) || word.is_from_500;
          })
          .map(word => word.id);
          
        // Update user progress in database
        await supabase
          .from('user_progress')
          .upsert({
            user_id: user.id,
            dialogue_id: dialogueId,
            completed: true,
            score: passPercentage,
            passed: passed,
            language_id: targetLanguage,
            completed_at: new Date().toISOString()
          });
          
        // Optionally, you can also track which specific words the user has learned
        if (learnedWords.length > 0) {
          await supabase
            .from('user_learned_words')
            .upsert(
              learnedWords.map(wordId => ({
                user_id: user.id,
                word_id: wordId,
                language_id: targetLanguage,
                learned_at: new Date().toISOString()
              }))
            );
        }
      }
      
      // Call completion callback
      onComplete(passed);
      logger.info('Vocal quiz completed', { 
        correctCount, 
        totalQuestions: quizWords.length,
        score: passPercentage,
        passed
      });
    } catch (error) {
      console.error('Failed to update progress', error);
      logger.error('Failed to update quiz progress', { error });
    }
  };
  
  // Add a check for white screen debugging
  useEffect(() => {
    console.log('Quiz Component Mounted with dialogueId:', dialogueId);
    console.log('Current word index:', currentWordIndex);
    console.log('Quiz words loaded:', quizWords.length);
    console.log('Current word:', currentWord);
    
    // Return a cleanup function
    return () => {
      console.log('Quiz Component Unmounting');
      // Cleanup speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (error) {
          console.error('Error cleaning up recognition on unmount:', error);
        }
      }
    };
  }, []);
  
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
        <div className="w-full max-w-md p-8 mx-4 shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white">
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
              {passed ? "Great work!" : "Let's try again!"}
            </h2>
            
            <div className="text-center bg-slate-800/40 p-5 rounded-xl border border-slate-700/50 w-full">
              <p className="text-xl text-slate-300 mb-2">
                Your score:
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
              {passed 
                ? "Turi is impressed with your progress! You're doing great with your language journey." 
                : "Turi believes in you! A little more practice and you'll master these words."}
            </p>
            
            <button
              onClick={() => onComplete(passed)}
              className="w-full py-3.5 mt-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-lg transition-colors font-medium shadow-md"
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
                    {t('How do you say', motherLanguage)} "{displayWord}" in {targetLanguage === 'en' ? t('in English', motherLanguage) : t('in Russian', motherLanguage)}?
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
                
                {/* Removing the error message to allow continuous listening without discouraging feedback */}
                
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
                  
                  {/* Skip button only for non-top 500 words */}
                  {!currentWord?.is_from_500 && isCorrect === null && (
                    <button
                      onClick={(e) => { e.stopPropagation(); skipWord(); }}
                      className="px-5 py-2.5 flex items-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors text-white font-medium shadow-md border border-slate-600"
                      style={{ minHeight: '44px' }}
                      type="button"
                    >
                      {t('Skip', motherLanguage)} <ArrowRight className="w-5 h-5" />
                    </button>
                  )}
                  
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
                      <p>{t('Expected:', motherLanguage)} <span className="text-white">{answerWord}</span></p>
                      <p>{t('Heard:', motherLanguage)} <span className="text-white">{transcript}</span></p>
                      <p>{t('Target Language:', motherLanguage)} <span className="text-white">{targetLanguage}</span></p>
                      <p>{t('Word Index:', motherLanguage)} <span className="text-white">{currentWordIndex}/{quizWords.length}</span></p>
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

export default VocalQuizComponent;

// Expose VocalQuizComponent to the global window object for direct access
if (typeof window !== 'undefined') {
  (window as any).VocalQuizComponent = VocalQuizComponent;
  console.log('VocalQuizComponent exposed to window object');
} 