// src/components/DialogueBox.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../services/supabase"; // Import shared client
import { useStore } from "../store";
import { logger } from "../services/logger";
import "./DialogueBox.css";
import VocalQuizComponent from "./VocalQuizComponent"; // Import the VocalQuizComponent
import SignupPrompt from "./SignupPrompt";

// Speech recognition type definition
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: ((event: Event) => void) | null;
}

// Fix type declaration for global window properties
declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
    _inProgressFlag: boolean;
    _succesfulRecognition: boolean;
    _dialogueNextStep: () => void;
    openQuizManually: () => void;
    // Remove conflicting type declarations
    forceShowQuiz: (dialogueId?: number, characterId?: number) => void;
    _quizSpeechRecognitionActive?: boolean;
  }
}

/**
 * Props for the DialogueBox component
 * @interface DialogueBoxProps
 * @property {number} characterId - The ID of the character the user is talking to
 * @property {() => void} onClose - Callback function to close the dialogue
 * @property {number} distance - Current distance between player and character (used to automatically close dialogue)
 * @property {() => void} onNpcSpeakStart - Callback function to notify when an NPC starts speaking
 * @property {() => void} onNpcSpeakEnd - Callback function to notify when an NPC finishes speaking
 * @property {number} dialogueId - ID of the dialogue to display (defaults to 1)
 */
interface DialogueBoxProps {
  characterId: number;
  onClose: () => void;
  distance: number;
  onNpcSpeakStart?: () => void;
  onNpcSpeakEnd?: () => void;
  dialogueId?: number; // New prop for dialogue ID
}

/**
 * Structure of dialogue phrases as stored in Supabase tables (phrases_1, phrases_2, etc.)
 * @interface DialoguePhrase
 * @property {number} id - Unique ID of the phrase
 * @property {number} dialogue_id - ID of the dialogue this phrase belongs to
 * @property {number} dialogue_step - Sequence number of this phrase in the dialogue
 * @property {string} speaker - Who says this phrase ('User' or 'NPC')
 * @property {string} en_text - The phrase text in English
 * @property {string} en_text_ru - English pronunciation guide in Cyrillic alphabet
 * @property {string} ru_text - The phrase text in Russian
 * @property {string} ru_text_en - Russian pronunciation guide in Latin alphabet
 */
interface DialoguePhrase {
  id: number;
  dialogue_id: number;
  dialogue_step: number;
  speaker: string;
  en_text: string;
  en_text_ru: string;
  ru_text: string;
  ru_text_en: string;
}

/**
 * Represents an entry in the conversation history, formatted for display
 * @interface ConversationEntry
 * @property {number} id - Original phrase ID from the database
 * @property {number} step - Dialogue step number
 * @property {'NPC' | 'User'} speaker - Who says this phrase
 * @property {string} phrase - The phrase text in target language (what user is learning)
 * @property {string} transcription - Pronunciation guide in mother language alphabet
 * @property {string} translation - Translation in mother language
 * @property {boolean} isCompleted - Whether this phrase has been completed by the user
 */
interface ConversationEntry {
  id: number;
  step: number;
  speaker: 'NPC' | 'User';
  phrase: string;
  transcription: string;
  translation: string;
  isCompleted: boolean;
}

/**
 * DialogueBox Component - Handles conversation between user and NPCs in the language learning app
 * 
 * Key features:
 * - Fetches dialogue phrases from Supabase based on character ID
 * - NPCs automatically speak their phrases once when they appear
 * - User confirms they've spoken their phrases with a small button
 * - Displays translation and transcription for phrases
 * - Dialogue boxes appear sequentially with smooth animations
 * - Triggers quiz after dialogue completion
 * 
 * @component
 */
const DialogueBox: React.FC<DialogueBoxProps> = ({
  characterId,
  onClose,
  distance,
  onNpcSpeakStart,
  onNpcSpeakEnd,
  dialogueId = 1, // Default to dialogue ID 1 if not provided
}) => {
  // State variables for dialogue management
  const [dialogues, setDialogues] = useState<DialoguePhrase[]>([]); // Raw dialogue data from database
  const [currentStep, setCurrentStep] = useState(1); // Current step in conversation
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]); // Displayed conversation
  const [isLoading, setIsLoading] = useState(true); // Loading state while fetching dialogues
  const [isInputEnabled, setIsInputEnabled] = useState(false); // Whether user can speak/confirm
  const [spokenEntries, setSpokenEntries] = useState<number[]>([]); // Track entries that have been spoken
  const dialogInitialized = useRef(false); // Flag to track if dialog has been initialized
  
  // Add refs to track current state values for async callbacks
  const currentStepRef = useRef<number>(1);
  const conversationHistoryRef = useRef<ConversationEntry[]>([]);
  const dialoguesRef = useRef<DialoguePhrase[]>([]); // Add a ref for dialogues
  
  // Update refs when state changes
  useEffect(() => {
    currentStepRef.current = currentStep;
    conversationHistoryRef.current = conversationHistory;
    dialoguesRef.current = dialogues; // Update dialogues ref when state changes
  }, [currentStep, conversationHistory, dialogues]);
  
  // Speech recognition states
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognitionConfidence, setRecognitionConfidence] = useState(0);
  const [highlightedWords, setHighlightedWords] = useState<string[]>([]);
  const [recognitionAttempts, setRecognitionAttempts] = useState(0);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const currentPhraseRef = useRef<string>("");
  
  // Add a ref to track if conversation is initialized
  const conversationInitializedRef = useRef(false);
  
  // Add a debounce flag ref to prevent multiple recognition events
  const processingRecognitionRef = useRef(false);
  
  // Add state for quiz management
  const [showQuiz, setShowQuiz] = useState(false);
  const [currentDialogueId, setCurrentDialogueId] = useState<number>(dialogueId);
  
  // Add state to track if NPC is speaking
  const [isNpcSpeaking, setIsNpcSpeaking] = useState(false);
  
  // State for signup prompt
  const [showSignupPrompt, setShowSignupPrompt] = useState(false);
  
  // Get store methods
  const setIsDialogueOpen = useStore(state => state.setIsDialogueOpen);
  const setIsMovementDisabled = useStore(state => state.setIsMovementDisabled);
  
  // Update store dialogue state when component mounts/unmounts
  useEffect(() => {
    // Set dialogue as open in the store when component mounts
    setIsDialogueOpen(true);
    
    // Clean up when unmounting
    return () => {
      setIsDialogueOpen(false);
    };
  }, [setIsDialogueOpen]);
  
  // Control movement when signup prompt is shown
  useEffect(() => {
    setIsMovementDisabled(showSignupPrompt);
    
    return () => {
      setIsMovementDisabled(false);
    };
  }, [showSignupPrompt, setIsMovementDisabled]);
  
  // Debug hook to track showQuiz more intensively
  useEffect(() => {
    console.log(`⚠️⚠️⚠️ showQuiz STATE CHANGE: ${showQuiz ? 'TRUE' : 'FALSE'}`);
    
    if (showQuiz) {
      console.log(`⭐ QUIZ SHOULD BE VISIBLE NOW with dialogueId=${currentDialogueId}`);
      
      // Log quiz state to browser console for visibility
      logger.info('Quiz state activated', { 
        showQuiz, 
        dialogueId: currentDialogueId,
        timestamp: new Date().toISOString() 
      });
      
      // Alert for debugging visibility
      console.log('%c QUIZ STATE IS TRUE! ', 'background: #222; color: #bada55; font-size: 20px');
    }
  }, [showQuiz, currentDialogueId]);
  
  // Debug log to verify component rendering with quiz state
  console.log(`DEBUG: RENDERING DIALOGUE BOX, showQuiz = ${showQuiz} currentDialogueId = ${currentDialogueId}`);

  // Get language settings from global store
  const { 
    motherLanguage, // Language user already knows (en/ru)
    targetLanguage, // Language user is learning (en/ru)
    user            // Current user data
  } = useStore();
  
  /**
   * Check if an NPC entry has already been spoken
   */
  const hasBeenSpoken = (id: number): boolean => {
    return spokenEntries.includes(id);
  };

  /**
   * Set up speech recognition
   */
  useEffect(() => {
    // Initialize speech recognition once voices are loaded
    const initializeSpeechRecognition = () => {
      if (!window.SpeechRecognition && !window.webkitSpeechRecognition) {
        console.error("Speech Recognition not supported");
        return;
      }

      // Clear any existing recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current.abort();
        } catch (e) {
          console.error("Error clearing existing recognition:", e);
        }
      }

      // Create a new speech recognition instance with browser prefixing
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      // Configure recognition parameters
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang = targetLanguage === 'ru' ? 'ru-RU' : 'en-US';
      
      // Timeout after this many ms
      const recognitionTimeout = 10000;
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Start timeout to prevent hanging
      const startTimer = () => {
        if (timeoutId) clearTimeout(timeoutId);
        
        timeoutId = setTimeout(() => {
          console.warn("Speech recognition timed out");
          if (recognitionRef.current) {
            try {
              recognitionRef.current.stop();
            } catch (e) {
              console.error("Error stopping timed out recognition:", e);
            }
          }
        }, recognitionTimeout);
      };
      
      // Set up result handler
      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const last = event.results.length - 1;
        const result = event.results[last];
        const transcript = result[0].transcript.toLowerCase();
        const confidence = result[0].confidence;
        
        console.log(`🎤 SPEECH: "${transcript}" (confidence: ${confidence.toFixed(2)})`);
        setTranscript(transcript);
        
        // Use ref values for current state to avoid stale closures
        const currentConversationHistory = conversationHistoryRef.current;
        const currentStepValue = currentStepRef.current;
        
        // Only process if we have a current phrase to match
        const currentUserPhrase = currentConversationHistory.find(
          entry => entry.speaker === 'User' && 
                   entry.step === currentStepValue && 
                   !entry.isCompleted
        );
        
        if (!currentUserPhrase) {
          console.log("❌ ERROR: No active user phrase found for current step", currentStepValue);
          console.log("CURRENT STATE:", {
            currentStep: currentStepValue,
            conversationHistory: currentConversationHistory.map(e => `${e.speaker}:${e.step}:${e.isCompleted ? 'done' : 'pending'}`)
          });
          return;
        }
        
        // Get expected phrase
        const expectedPhrase = currentUserPhrase.phrase.toLowerCase();
        console.log(`📝 EXPECTED: "${expectedPhrase}" at step ${currentStepValue}`);
        
        // Update highlighted words for visual feedback
        const highlightedWords = findMatchingWords(transcript, expectedPhrase);
        setHighlightedWords(highlightedWords);
        
        // Process final results
        if (result.isFinal) {
          const matchPercentage = calculateMatchPercentage(transcript, expectedPhrase);
          console.log(`📊 MATCH: "${transcript}" vs "${expectedPhrase}" = ${matchPercentage}%`);
          
          // AUTOMATIC PROGRESSION when threshold is met
          if (matchPercentage >= 60) {
            console.log(`✅ SUCCESS: Speech matched at ${matchPercentage}%, automatically progressing`);
            
            // Prevent duplicate handling with our new flag
            if (processingRecognitionRef.current) {
              console.log("⚠️ Already processing recognition, ignoring duplicate event");
              return;
            }
            
            // Set our processing flag
            processingRecognitionRef.current = true;
            
            // Use our new simplified function for dialogue progression
            handleSuccessfulSpeechRecognition(transcript, confidence);
          } else {
            // Below threshold
            console.log(`❌ MATCH FAILED: ${matchPercentage}% (need 60%), transcript: "${transcript}"`);
            setRecognitionAttempts(prev => prev + 1);
            setTranscript(transcript); // Ensure the UI shows what was heard
            
            // RADICAL APPROACH: Force recreate the speech recognition object entirely
            setTimeout(() => {
              try {
                console.log("🔄 CREATING COMPLETELY NEW RECOGNITION AFTER FAILED MATCH");
                
                // First, fully dispose of the current recognition
                if (recognitionRef.current) {
                  // Clear all handlers to prevent any callbacks
                  try {
                    recognitionRef.current.onresult = null;
                    recognitionRef.current.onerror = null;
                    recognitionRef.current.onend = null;
                    recognitionRef.current.abort();
                    console.log("🗑️ Disposed old recognition instance");
                  } catch (e) {
                    console.error("Error disposing old recognition:", e);
                  }
                }
                
                // Create a brand new recognition instance with the original handlers
                const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
                const newRecognition = new SpeechRecognition();
                newRecognition.continuous = false;
                newRecognition.interimResults = true;
                newRecognition.lang = targetLanguage === 'en' ? 'en-US' : 'ru-RU';

                // FIXED: Instead of copying the entire onresult handler which creates nested callbacks,
                // use a simpler handler that will restart recognition even after non-matching results
                newRecognition.onresult = function(event: SpeechRecognitionEvent) {
                  const last = event.results.length - 1;
                  const result = event.results[last];
                  const transcript = result[0].transcript.toLowerCase();
                  const confidence = result[0].confidence;
                  
                  console.log(`🎤 SPEECH (new recognition): "${transcript}" (confidence: ${confidence.toFixed(2)})`);
                  setTranscript(transcript);
                  
                  // Get current state values from refs
                  const currentConversationHistory = conversationHistoryRef.current;
                  const currentStepValue = currentStepRef.current;
                  
                  // Find the current user phrase
                  const currentUserPhrase = currentConversationHistory.find(
                    entry => entry.speaker === 'User' && 
                           entry.step === currentStepValue && 
                           !entry.isCompleted
                  );
                  
                  if (!currentUserPhrase) {
                    console.log("❌ ERROR: No active user phrase found for current step", currentStepValue);
                    return;
                  }
                  
                  // Get expected phrase
                  const expectedPhrase = currentUserPhrase.phrase.toLowerCase();
                  
                  // Update highlighted words for visual feedback
                  const highlightedWords = findMatchingWords(transcript, expectedPhrase);
                  setHighlightedWords(highlightedWords);
                  
                  // Process final results
                  if (result.isFinal) {
                    const matchPercentage = calculateMatchPercentage(transcript, expectedPhrase);
                    console.log(`📊 MATCH: "${transcript}" vs "${expectedPhrase}" = ${matchPercentage}%`);
                    
                    // AUTOMATIC PROGRESSION when threshold is met
                    if (matchPercentage >= 60) {
                      console.log(`✅ SUCCESS: Speech matched at ${matchPercentage}%, automatically progressing`);
                      
                      if (processingRecognitionRef.current) {
                        console.log("⚠️ Already processing recognition, ignoring duplicate event");
                        return;
                      }
                      
                      processingRecognitionRef.current = true;
                      handleSuccessfulSpeechRecognition(transcript, confidence);
                    }
                    // FIXED: For non-matching results, don't create a new instance recursively, just restart this one
                    else {
                      console.log(`❌ MATCH FAILED: ${matchPercentage}% (need 60%), transcript: "${transcript}"`);
                      setRecognitionAttempts(prev => prev + 1);
                      
                      // Auto-restart this same recognition instance after a brief delay
                      setTimeout(() => {
                        try {
                          if (recognitionRef.current && isListening) {
                            recognitionRef.current.start();
                            console.log("🔄 Restarted same recognition instance after failed match");
                          }
                        } catch (e) {
                          console.error("Error restarting recognition after failed match:", e);
                        }
                      }, 300);
                    }
                  }
                };
                
                // Set up error and end handlers
                newRecognition.onerror = function(event: Event) {
                  console.error("Speech recognition error:", event);
                  
                  // Auto restart on error
                  setTimeout(() => {
                    try {
                      if (recognitionRef.current && isListening) {
                        recognitionRef.current.start();
                        console.log("🔄 Auto-restarted recognition after error");
                      }
                    } catch (e) {
                      console.error("Error auto-restarting recognition after error:", e);
                    }
                  }, 500);
                };
                
                newRecognition.onend = function() {
                  console.log("🎤 Recognition ended (new instance)");
                  
                  // Auto-restart if we're still in active state and not processing a successful match
                  if (isListening && !processingRecognitionRef.current) {
                    setTimeout(() => {
                      try {
                        if (recognitionRef.current) {
                          recognitionRef.current.start();
                          console.log("🔄 Auto-restarted recognition after end event");
                        }
                      } catch (e) {
                        console.error("Error auto-restarting recognition after end:", e);
                      }
                    }, 300);
                  }
                };
                
                // Store the new recognition instance and start it
                recognitionRef.current = newRecognition;
                
                // FIXED: Start immediately if we're in listening state
                if (isListening) {
                  try {
                    recognitionRef.current.start();
                    console.log("🎬 Started new recognition instance after failed match");
                  } catch (e) {
                    console.error("Error starting new recognition instance:", e);
                    
                    // Try starting again after a delay if the first attempt fails
                    setTimeout(() => {
                      try {
                        if (recognitionRef.current && isListening) {
                          recognitionRef.current.start();
                          console.log("🎬 Started new recognition instance on second attempt");
                        }
                      } catch (e2) {
                        console.error("Error starting new recognition on second attempt:", e2);
                      }
                    }, 1000);
                  }
                }
              } catch (e) {
                console.error("Fatal error recreating recognition after failed match:", e);
              }
            }, 100); // Quick reset
          }
        }
      };
      
      recognitionRef.current = recognition;
      
      // Set up error handler
      recognition.onerror = (event: Event) => {
        // Cast to any to access error property
        const errorEvent = event as any;
        console.error("Speech recognition error:", errorEvent);
        
        // We don't need to increment network error count or show offline suggestions
        // Just log the error
        logger.error('Speech recognition error', { event });
        
        // Try to restart recognition on error
        setTimeout(() => {
          if (recognitionRef.current && isListening) {
            try {
              recognitionRef.current.start();
              console.log("Restarted recognition after error");
            } catch (e) {
              console.error("Error restarting recognition after error:", e);
            }
          }
        }, 1000);
      };
      
      // Set up end handler
      recognition.onend = () => {
        console.log("Speech recognition ended");
        
        // Only auto restart if still listening AND there's a current user phrase to recognize
        if (isListening) {
          const currentUserPhrase = conversationHistoryRef.current.find(
            entry => entry.speaker === 'User' && 
                    entry.step === currentStepRef.current && 
                    !entry.isCompleted
          );
          
          if (currentUserPhrase && !processingRecognitionRef.current) {
            console.log("Auto-restarting speech recognition for", currentUserPhrase.phrase);
            
            // Define a reliable restart function with multiple attempts
            const attemptRecognitionRestart = (attempt = 1, maxAttempts = 3) => {
              if (recognitionRef.current && isListening) {
                try {
                  console.log(`Attempting to restart recognition (attempt ${attempt}/${maxAttempts})`);
                  recognitionRef.current.start();
                  console.log(`✅ Successfully restarted recognition (attempt ${attempt})`);
                  return true;
                } catch (e) {
                  console.error(`❌ Error on restart attempt ${attempt}:`, e);
                  
                  // Try again if we have attempts left
                  if (attempt < maxAttempts) {
                    console.log(`Scheduling retry ${attempt + 1}/${maxAttempts}`);
                    
                    // On the last attempt, create a fresh instance
                    if (attempt === maxAttempts - 1) {
                      try {
                        console.log("Creating fresh recognition instance for final retry");
                        const newRecognition = new SpeechRecognition();
                        newRecognition.continuous = false;
                        newRecognition.interimResults = true;
                        newRecognition.lang = targetLanguage === 'en' ? 'en-US' : 'ru-RU';
                        newRecognition.onresult = recognition.onresult;
                        newRecognition.onerror = recognition.onerror;
                        newRecognition.onend = recognition.onend;
                        recognitionRef.current = newRecognition;
                      } catch (e2) {
                        console.error("Error creating new recognition instance:", e2);
                      }
                    }
                    
                    // Schedule the next attempt with increasing delay
                    setTimeout(() => {
                      attemptRecognitionRestart(attempt + 1, maxAttempts);
                    }, 500 * attempt); // Increasing delay based on attempt number
                  } else {
                    console.error("❌ All recognition restart attempts failed");
                    return false;
                  }
                }
              } else {
                console.log("Cannot restart - recognition object not available or not listening");
                return false;
              }
            };
            
            // Start the restart process with a small initial delay
            setTimeout(() => {
              attemptRecognitionRestart();
            }, 300);
          }
        }
      };
      
      // Clean up on unmount
      return () => {
        console.log("Cleaning up speech recognition");
        if (recognitionRef.current) {
          try {
            recognitionRef.current.onresult = null;
            recognitionRef.current.onerror = null;
            recognitionRef.current.onend = null;
            recognitionRef.current.abort();
            console.log("Successfully aborted speech recognition");
          } catch (e) {
            console.error("Error cleaning up recognition:", e);
          }
        }
        
        // Make sure all timeouts are cleared
        console.log("Clearing any remaining timeouts");
        const highestTimeoutId = setTimeout(() => {}, 0);
        for (let i = 0; i < Number(highestTimeoutId); i++) {
          clearTimeout(i);
        }
      };
    };

    // Initialize speech recognition
    initializeSpeechRecognition();
  }, [targetLanguage, motherLanguage]);

  /**
   * Calculate the percentage match between two phrases
   */
  const calculateMatchPercentage = (spoken: string, expected: string): number => {
    if (!spoken || !expected) return 0;
    
    // Clean up the strings to remove punctuation and normalize spacing
    const cleanSpoken = spoken.toLowerCase().replace(/[.,?!;:]/g, '').trim();
    const cleanExpected = expected.toLowerCase().replace(/[.,?!;:]/g, '').trim();
    
    // Split into words
    const spokenWords = cleanSpoken.split(/\s+/);
    const expectedWords = cleanExpected.split(/\s+/);
    
    // If all expected words are in the spoken phrase in any order, that's a 100% match
    if (expectedWords.every(word => spokenWords.includes(word))) {
      return 100;
    }
    
    let matchedWords = 0;
    
    // Count how many expected words appear in the spoken phrase
    for (const expectedWord of expectedWords) {
      // Look for exact matches
      if (spokenWords.includes(expectedWord)) {
        matchedWords++;
        continue;
      }
      
      // Look for partial matches (at least 70% of characters match)
      for (const spokenWord of spokenWords) {
        if (spokenWord.length > 2 && expectedWord.length > 2) {
          // Compare character by character for longer words
          const minLength = Math.min(spokenWord.length, expectedWord.length);
          const maxLength = Math.max(spokenWord.length, expectedWord.length);
          
          let matchingChars = 0;
          for (let i = 0; i < minLength; i++) {
            if (spokenWord[i] === expectedWord[i]) {
              matchingChars++;
            }
          }
          
          const charMatchPercentage = (matchingChars / maxLength) * 100;
          if (charMatchPercentage >= 70) {
            matchedWords += 0.8; // Count as a partial match
            break;
          }
        }
      }
    }
    
    // Calculate percentage, but give bonus points for having more words than expected
    // This rewards verbose answers that contain the expected phrases
    const percentage = (matchedWords / expectedWords.length) * 100;
    
    // Add a small bonus if the spoken text is longer (more comprehensive)
    const verbosityBonus = spokenWords.length > expectedWords.length ? 5 : 0;
    
    return Math.min(100, Math.round(percentage + verbosityBonus));
  };
  
  /**
   * Find words in the expected phrase that match words in the spoken phrase
   */
  const findMatchingWords = (spoken: string, expected: string): string[] => {
    if (!spoken || !expected) return [];
    
    // Clean up the strings
    const cleanSpoken = spoken.toLowerCase().replace(/[.,?!;:]/g, '').trim();
    const cleanExpected = expected.toLowerCase().replace(/[.,?!;:]/g, '').trim();
    
    const spokenWords = cleanSpoken.split(/\s+/);
    const expectedWords = cleanExpected.split(/\s+/);
    
    const matchedWords = [];
    
    for (const expectedWord of expectedWords) {
      // Check for exact matches
      if (spokenWords.includes(expectedWord)) {
        matchedWords.push(expectedWord);
        continue;
      }
      
      // Check for partial matches
      for (const spokenWord of spokenWords) {
        if (spokenWord.length > 2 && expectedWord.length > 2) {
          const minLength = Math.min(spokenWord.length, expectedWord.length);
          let matchingChars = 0;
          
          for (let i = 0; i < minLength; i++) {
            if (spokenWord[i] === expectedWord[i]) {
              matchingChars++;
            }
          }
          
          const charMatchPercentage = (matchingChars / expectedWord.length) * 100;
          if (charMatchPercentage >= 70) {
            matchedWords.push(expectedWord);
            break;
          }
        }
      }
    }
    
    return matchedWords;
  };

  /**
   * Effect hook to automatically close dialogue when player moves too far from character
   */
  useEffect(() => {
    if (distance > 5) {
      onClose();
    }
  }, [distance, onClose]);

  /**
   * Effect hook to fetch dialogue phrases from Supabase when component mounts
   */
  useEffect(() => {
    const fetchDialogues = async () => {
      try {
      setIsLoading(true);
      // Changed from `${characterId}_phrases` to `phrases_${characterId}`
      const sourceTable = `phrases_${characterId}`;
          
      const { data, error } = await supabase
        .from(sourceTable)
          .select('*')
          .eq('dialogue_id', dialogueId) // Use the dialogueId prop
          .order('dialogue_step', { ascending: true });

      if (error) {
          logger.error('Error fetching dialogues', { error, characterId, dialogueId });
        setIsLoading(false);
        return;
      }

        logger.info('Dialogues fetched successfully', { count: data?.length, dialogueId });
        
        // Debug log available dialogues
        if (data && data.length > 0) {
          console.log(`DEBUG: All available dialogues from fetch for dialogue_id ${dialogueId}:`);
          data.forEach(d => {
            console.log(`Step ${d.dialogue_step}: ${d.speaker} - ${d.en_text}`);
          });
          
          // Update dialoguesRef immediately
          dialoguesRef.current = data;
          console.log("Updated dialoguesRef with", data.length, "phrases");
        }
        
        // Update state
      setDialogues(data || []);
          
        // Only initialize conversation if not already initialized
        if (data && data.length > 0 && !dialogInitialized.current) {
          dialogInitialized.current = true;
          initializeConversation(data);
        }
        
      setIsLoading(false);
      } catch (error) {
        logger.error('Failed to fetch dialogues', { error, characterId, dialogueId });
        setIsLoading(false);
      }
    };

      fetchDialogues();
    
    // Reset dialogInitialized when component unmounts or characterId changes
    return () => { 
      dialogInitialized.current = false;
      conversationInitializedRef.current = false;
    };
  }, [characterId, dialogueId]); // Add dialogueId to dependency array

  /**
   * Initializes the conversation with first NPC dialogue
   */
  const initializeConversation = (phrases: DialoguePhrase[]) => {
    // Skip if already initialized to avoid duplicates
    if (conversationInitializedRef.current) {
      console.log("Conversation already initialized, skipping");
      return;
    }
    
    // Find the first phrase spoken by NPC at step 1
    console.log("Initializing conversation with phrases:", phrases);
    console.log("DIALOGUES REF:", dialoguesRef.current);
    
    // Add the fetched phrases to our dialoguesRef to ensure they're available
    if (dialoguesRef.current.length === 0 && phrases.length > 0) {
      console.log("Updating dialoguesRef with fetched phrases");
      dialoguesRef.current = phrases;
    }
    
    const firstPhrase = phrases.find(p => p.dialogue_step === 1 && p.speaker === 'NPC');
    
    if (firstPhrase) {
      // Mark as initialized immediately to prevent duplicate initializations
      conversationInitializedRef.current = true;
      
      // Select correct language version of text based on user's target language
      const phrase = targetLanguage === 'en' ? firstPhrase.en_text : firstPhrase.ru_text;
      
      // Select transcription based on user's mother language and target language
      const transcription = targetLanguage === 'ru' 
        ? firstPhrase.ru_text_en  // Russian phrase with Latin transcription
        : firstPhrase.en_text_ru; // English phrase with Cyrillic transcription
      
      // Select translation based on user's mother language
      const translation = motherLanguage === 'en' 
        ? firstPhrase.en_text 
        : firstPhrase.ru_text;
      
      // Prevent duplicate conversation entries
      if (conversationHistory.find(entry => entry.id === firstPhrase.id)) {
        return;
      }
      
      // Create the initial conversation history with just the NPC phrase first
      const npcEntry: ConversationEntry = {
        id: firstPhrase.id,
        step: 1,
        speaker: 'NPC',
        phrase,
        transcription,
        translation,
        isCompleted: true
      };

      // Set conversation with only the NPC phrase
      setConversationHistory([npcEntry]);
      console.log("Added initial NPC phrase:", phrase);
      
      // Play the NPC audio first
      setTimeout(() => {
        if (!hasBeenSpoken(firstPhrase.id)) {
          logger.info('Speaking NPC phrase for the first time', { phraseId: firstPhrase.id });
          setSpokenEntries(prev => [...prev, firstPhrase.id]);
          playAudio(phrase);
        }
        
        // Calculate delay based on phrase length
        const speakingDelay = calculateSpeakingDelay(phrase);
        console.log(`Adding user phrase after ${speakingDelay}ms delay`);
        
        // Now add the user phrase after the NPC has spoken
        setTimeout(() => {
          // Find the first user phrase at step 2
          const userPhrase = phrases.find(p => p.dialogue_step === 2 && p.speaker === 'User');
          
          if (userPhrase) {
            const userPhraseText = targetLanguage === 'en' ? userPhrase.en_text : userPhrase.ru_text;
            const userTranscription = targetLanguage === 'ru' 
              ? userPhrase.ru_text_en 
              : userPhrase.en_text_ru;
            const userTranslation = motherLanguage === 'en'
              ? userPhrase.en_text 
              : userPhrase.ru_text;
            
            // Add user phrase to conversation history
            setConversationHistory(prev => [
              ...prev,
              {
                id: userPhrase.id,
                step: 2,
                speaker: 'User',
                phrase: userPhraseText,
                transcription: userTranscription,
                translation: userTranslation,
                isCompleted: false
              }
            ]);
            
            // Set current step to this user phrase
            setCurrentStep(2);
            console.log("Added user phrase:", userPhraseText);
            
            // Enable input for user to speak
            setIsInputEnabled(true);
            
            // Clear transcript and visual indicators
            setTranscript("");
            setHighlightedWords([]);
            setRecognitionAttempts(0);
            
            // Start listening with a slight delay
            setTimeout(() => {
              console.log("INIT: Starting speech recognition for first user phrase");
              setIsListening(true);
              
              // Directly start recognition
              setTimeout(() => {
                if (recognitionRef.current) {
                  try {
                    console.log("INIT: Directly starting recognition for:", userPhraseText);
                    recognitionRef.current.start();
                    logger.info('Started listening for speech', { phraseToMatch: userPhraseText });
                  } catch (e) {
                    console.error("Error starting speech recognition:", e);
                  }
                }
              }, 100);
            }, 300);
          }
        }, speakingDelay);
      }, 300);
    }
  };
  
  /**
   * Add a user phrase to the conversation at the specified step
   */
  const addUserPhrase = (phrases: DialoguePhrase[], step: number) => {
    // Find the user phrase at this step
    const userPhrase = phrases.find(p => p.dialogue_step === step && p.speaker === 'User');
    
    if (!userPhrase) return;
    
    // Check if this user phrase already exists in conversation history to avoid duplication
    if (conversationHistory.find(entry => entry.id === userPhrase.id)) {
      return;
    }
    
    // Format the user phrase with proper language settings
    const phrase = targetLanguage === 'en' ? userPhrase.en_text : userPhrase.ru_text;
    
    // Select transcription based on the target language
    const transcription = targetLanguage === 'ru' 
      ? userPhrase.ru_text_en  // Russian phrase with Latin transcription
      : userPhrase.en_text_ru; // English phrase with Cyrillic transcription
    
    const translation = motherLanguage === 'en'
      ? userPhrase.en_text 
      : userPhrase.ru_text;
    
    // Add user phrase to conversation history (not completed yet)
    setConversationHistory(prev => [...prev, {
      id: userPhrase.id,
      step,
      speaker: 'User' as const,
      phrase,
      transcription,
      translation,
      isCompleted: false
    }]);
    
    // Set current step to user input and enable input field
    setCurrentStep(step);
    setIsInputEnabled(true);
    
    // Log the current conversation history for debugging
    console.log("Added user phrase, current history:", conversationHistory);
  };

  /**
   * Progress to the next step in the conversation
   */
  const forceProgressToNextStep = () => {
    // Prevent progress if we're already at the end or processing
    if (currentStepRef.current >= dialoguesRef.current.length) {
      logger.info('Already at last step, cannot progress further', { step: currentStepRef.current });
      return;
    }
    
    if (processingRecognitionRef.current) {
      console.log("Already processing recognition, ignore duplicate calls");
      return;
    }
    
    processingRecognitionRef.current = true;
    
    // Find the next step
    const nextStep = currentStepRef.current + 1;
    
    // Look for phrases at this step
    const thisStepPhrase = dialoguesRef.current.find(p => p.dialogue_step === currentStepRef.current);
    const nextStepPhrase = dialoguesRef.current.find(p => p.dialogue_step === nextStep);
    
    // Update the current phrase to completed status
    if (thisStepPhrase && thisStepPhrase.speaker === "User") {
      // Mark this phrase as completed
      setConversationHistory(prevHistory => 
        prevHistory.map(entry => 
          entry.step === currentStepRef.current ? { ...entry, isCompleted: true } : entry
        )
      );
    }
    
    // If there's no next phrase, we're done with the dialogue
    if (!nextStepPhrase) {
      logger.info('Dialogue complete, no more phrases', { nextStep });
      processingRecognitionRef.current = false;

      // If this was the last phrase, mark dialogue as complete and show quiz
      logger.info('Reached last dialogue step, showing quiz', { step: currentStepRef.current });
      
      // Set currentDialogueId to pass to the quiz
      const firstDialogue = dialoguesRef.current[0];
      if (firstDialogue) {
        console.log("Setting dialogue ID for quiz - original value:", firstDialogue.dialogue_id, "type:", typeof firstDialogue.dialogue_id);
        setCurrentDialogueId(firstDialogue.dialogue_id);
        console.log("After setting dialogue ID for quiz:", firstDialogue.dialogue_id);
      }
      
      // Stop any active speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          setIsListening(false);
        } catch (e) {
          console.error("Error stopping recognition:", e);
        }
      }
      
      // Explicitly show the quiz
      setTimeout(() => {
        setShowQuiz(true);
        logger.info('Quiz component should now be displayed');
      }, 500);
      
      return;
    }
    
    // If next step is NPC, add and play it automatically
    if (nextStepPhrase.speaker === "NPC") {
      // Update the current step
      setCurrentStep(nextStep);
      
      const phrase = targetLanguage === 'en' ? nextStepPhrase.en_text : nextStepPhrase.ru_text;
      const transcription = targetLanguage === 'ru' 
        ? nextStepPhrase.ru_text_en 
        : nextStepPhrase.en_text_ru;
      const translation = motherLanguage === 'en'
        ? nextStepPhrase.en_text 
        : nextStepPhrase.ru_text;
        
      // Add the NPC phrase to conversation history
      setConversationHistory(prev => [
        ...prev,
        {
          id: nextStepPhrase.id,
          step: nextStep,
          speaker: 'NPC',
          phrase,
          transcription,
          translation,
          isCompleted: true
        }
      ]);
      
      // Play audio after a short delay
      setTimeout(() => {
        // Mark as spoken
        setSpokenEntries(prev => [...prev, nextStepPhrase.id]);
        // Play audio
        playAudio(phrase);
        
        // Calculate delay based on length of phrase
        const speakingDelay = calculateSpeakingDelay(phrase);
        
        // Auto-progress to next user step after NPC speech
        setTimeout(() => {
          processingRecognitionRef.current = false;
          
          // Add the next user phrase if available
          const nextUserStep = nextStep + 1;
          addUserPhrase(dialoguesRef.current, nextUserStep);
        }, 1500);
      }, 500);
    }
    // If next step is User, add it for the user to speak
    else {
      processingRecognitionRef.current = false;
      addUserPhrase(dialoguesRef.current, nextStep);
    }
  };

  /**
   * Play audio for NPC phrases
   */
  const playAudio = (text: string) => {
    try {
      if (!text || text.trim() === '') {
        return;
      }
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = targetLanguage === 'en' ? 'en-US' : 'ru-RU';
      // Notify parent that NPC started speaking
      setIsNpcSpeaking(true);
      if (typeof onNpcSpeakStart === 'function') onNpcSpeakStart();
      utterance.onend = () => {
        setIsNpcSpeaking(false);
        if (typeof onNpcSpeakEnd === 'function') onNpcSpeakEnd();
      };
      window.speechSynthesis.speak(utterance);
      logger.info('Playing audio', { text, language: utterance.lang });
    } catch (error) {
      logger.error('Failed to play audio', { error });
    }
  };

  // Simplified return button handler that resets to the clicked step
  const handleGoBack = (entry: ConversationEntry) => {
    console.log("RETURN: Resetting to step", entry.step, "with phrase", entry.phrase);
    
    // Stop any active speech recognition
    try {
      recognitionRef.current?.stop();
      setIsListening(false);
    } catch (e) {
      console.error("Error stopping recognition during return:", e);
    }
    
    // Cancel any speech synthesis that might be in progress
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    
    // Reset any processing flags
    processingRecognitionRef.current = false;
    
    // First, get all dialogues from steps 1 to the selected step
    const filteredHistory = conversationHistory.filter(e => e.step <= entry.step);
    
    // If we're clicking on an NPC entry, we need special handling
    if (entry.speaker === 'NPC') {
      // For NPC entries, we need to find the next step that should appear after this NPC speaks
      // This is typically a user phrase at step entry.step + 1
      const nextStep = entry.step + 1;
      
      // Check if we have this step in our full dialogue set
      const nextDialogue = dialoguesRef.current.find(d => d.dialogue_step === nextStep);
      
      if (nextDialogue) {
        console.log(`RETURN: Found next dialogue at step ${nextStep}`, nextDialogue);
        
        // Update conversation history with only entries up to the NPC entry
        setConversationHistory(filteredHistory);
        
        // Play the NPC audio right away
        console.log("RETURN: Playing NPC phrase:", entry.phrase);
        playAudio(entry.phrase);
        
        // Calculate delay based on NPC phrase length
        const speakingDelay = calculateSpeakingDelay(entry.phrase);
        
        // After the NPC speaks, add the next user phrase
        setTimeout(() => {
          // Format the next user phrase if it's a user phrase
          if (nextDialogue.speaker === 'User') {
            const userPhrase = targetLanguage === 'en' ? nextDialogue.en_text : nextDialogue.ru_text;
            const userTranscription = targetLanguage === 'ru' 
              ? nextDialogue.ru_text_en 
              : nextDialogue.en_text_ru;
            const userTranslation = motherLanguage === 'en'
              ? nextDialogue.en_text 
              : nextDialogue.ru_text;
            
            // Create the user entry
            const userEntry: ConversationEntry = {
              id: nextDialogue.id,
              step: nextStep,
              speaker: 'User' as const,
              phrase: userPhrase,
              transcription: userTranscription,
              translation: userTranslation,
              isCompleted: false
            };
            
            // Add the user entry to the conversation history
            setConversationHistory(prev => [...prev, userEntry]);
            
            // Set the current step to the user step
      setCurrentStep(nextStep);
            
            // Clear any transcript from previous attempts
            setTranscript("");
            setHighlightedWords([]);
            setRecognitionAttempts(0);
            
            // Start listening with a longer delay to ensure state has fully updated
            setTimeout(() => {
              console.log("RETURN: Starting speech recognition for next user phrase");
              setIsListening(true);
              
              // Directly start recognition after a short delay
              setTimeout(() => {
                if (recognitionRef.current) {
                  try {
                    console.log("RETURN: Directly starting recognition for:", userPhrase);
                    recognitionRef.current.start();
                  } catch (e) {
                    console.error("Error starting speech recognition:", e);
                  }
                }
              }, 100);
            }, 500);
            
            console.log(`RETURN: Added next user phrase at step ${nextStep}:`, userPhrase);
          }
        }, speakingDelay);
    } else {
        // If no next dialogue, just reset to the current NPC phrase
        setConversationHistory(filteredHistory);
        
        // Play the NPC audio
        setTimeout(() => {
          playAudio(entry.phrase);
        }, 300);
      }
    } else {
      // For user entries, standard behavior (mark the user entry as incomplete)
      const updatedHistory = filteredHistory.map(e => {
        if (e.speaker === 'User' && e.step === entry.step) {
          return { ...e, isCompleted: false };
        }
        return e;
      });
      
      // Update state
      setConversationHistory(updatedHistory);
      setCurrentStep(entry.step);
      
      // Clear any transcript and visual indicators from previous attempts
      setTranscript("");
      setHighlightedWords([]);
      setRecognitionAttempts(0);
      
      // Two-step approach: First update isListening flag
      console.log("RETURN: Preparing to restart speech recognition for:", entry.phrase);
      setTimeout(() => {
        setIsListening(true);
        
        // Then directly start recognition
        setTimeout(() => {
          if (recognitionRef.current) {
            try {
              console.log("RETURN: Directly starting recognition for user phrase");
              recognitionRef.current.start();
            } catch (e) {
              console.error("Error starting speech recognition:", e);
            }
          }
        }, 100);
      }, 500);
    }
  };

  // Play audio for an entry
  const handlePlayAudio = (entry: ConversationEntry) => {
    console.log("BUTTON DEBUG: Sound button clicked", entry);
    logger.info('Sound button clicked', { step: entry.step });
    playAudio(entry.phrase);
  };

  /**
   * Open Google search for a word or phrase in a new tab
   * @param word The word or phrase to search (in target language)
   */
  const searchWordInGoogle = (word: string) => {
    if (!word || word.trim() === '') return;
    
    // Normalize the search text by removing punctuation and extra spaces
    const normalizedWord = word.trim().replace(/[.,?!;:]/g, '');
    
    // Create the search query with "[word] explanation with examples" format
    // The search query will be in format: word (in target language) + explanation text (in mother language)
    const explanationText = motherLanguage === 'en' ? 'explanation with examples' : 'объяснение с примерами';
    const searchQuery = `${normalizedWord} ${explanationText}`;
    
    // Open Google search in a new tab
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;
    window.open(searchUrl, '_blank');
    
    // Log the search for analytics
    logger.info('Word lookup requested', { 
      word: normalizedWord,
      targetLanguage,
      motherLanguage,
      searchQuery
    });
    
    console.log(`🔍 Looking up: "${normalizedWord}" in Google with query: "${searchQuery}"`);
  };
  
  /**
   * Handle click on a word to search it in Google
   * @param event Click event
   */
  const handleWordClick = (event: React.MouseEvent) => {
    // Get the clicked text
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();
    
    // If there's selected text (multiple words), use that
    if (selectedText && selectedText.length > 0) {
      searchWordInGoogle(selectedText);
      // Clear the selection after searching
      selection?.removeAllRanges();
      return;
    }
    
    // Otherwise get just the word that was clicked (not the entire phrase)
    const target = event.target as HTMLElement;
    
    // Only process individual word elements, not the container phrase
    if (target.classList.contains('selectable-word')) {
      const word = target.innerText.trim().replace(/[.,?!;:]/g, '');
      if (word) {
        searchWordInGoogle(word);
      }
    } else if (target.classList.contains('selectable-phrase')) {
      // For phrases, extract the word closest to the click point
      const phrase = target.innerText;
      if (!phrase) return;
      
      // Split the phrase into words
      const words = phrase.split(/\s+/);
      if (words.length === 1) {
        // If it's just one word, use it
        searchWordInGoogle(words[0].replace(/[.,?!;:]/g, ''));
      } else {
        // Calculate which word was clicked based on cursor position
        try {
          const range = document.caretRangeFromPoint(event.clientX, event.clientY);
          if (range) {
            const clickedNode = range.startContainer;
            // Get the text content of the node
            const text = clickedNode.textContent || '';
            // Get the offset within the text where the click occurred
            const offset = range.startOffset;
            
            // Extract the word at the click position
            let wordStart = offset;
            let wordEnd = offset;
            
            // Find the start of the word
            while (wordStart > 0 && !/\s/.test(text.charAt(wordStart - 1))) {
              wordStart--;
            }
            
            // Find the end of the word
            while (wordEnd < text.length && !/\s/.test(text.charAt(wordEnd))) {
              wordEnd++;
            }
            
            // Extract the word
            const clickedWord = text.substring(wordStart, wordEnd).trim().replace(/[.,?!;:]/g, '');
            if (clickedWord) {
              searchWordInGoogle(clickedWord);
            }
          } else {
            // Fallback: search the first word if we can't determine the clicked position
            searchWordInGoogle(words[0].replace(/[.,?!;:]/g, ''));
          }
        } catch (error) {
          console.error('Error determining clicked word:', error);
          // Fallback: search the first word
          searchWordInGoogle(words[0].replace(/[.,?!;:]/g, ''));
        }
      }
    }
  };

  /**
   * Track mouse position over phrases for tooltip positioning
   */
  const handleMouseMove = (event: React.MouseEvent<HTMLSpanElement>) => {
    const target = event.currentTarget;
    if (!target) return;
    
    // Calculate the relative position within the element
    const rect = target.getBoundingClientRect();
    const x = event.clientX - rect.left;
    
    // Update the CSS variable for tooltip positioning
    target.style.setProperty('--tooltip-x', `${x}px`);
  };
  
  /**
   * Render a phrase with highlighted words
   */
  const renderHighlightedPhrase = (phrase: string, highlightedWords: string[]): JSX.Element => {
    try {
      // If phrase is empty or invalid, return a safe default
      if (!phrase) {
        return <span className="selectable-phrase">...</span>;
      }
      
      // Split the phrase into words and spaces
      const words = phrase.split(/(\s+)/);
      
      return (
        <span className="selectable-phrase" onMouseMove={handleMouseMove}>
          {words.map((word, index) => {
            // Skip rendering empty strings
            if (!word) return null;
            
            // For spaces, just render them as-is
            if (/^\s+$/.test(word)) {
              return <span key={index}>{word}</span>;
            }
            
            const isHighlighted = highlightedWords.includes(word.toLowerCase().replace(/[.,?!;:]/g, ''));
            return (
              <span 
                key={index} 
                className={isHighlighted ? 'highlighted-word selectable-word' : 'selectable-word'}
                onClick={handleWordClick}
              >
                {word}
              </span>
            );
          })}
        </span>
      );
    } catch (error) {
      // If anything goes wrong, return a simple fallback
      console.error("Error rendering highlighted phrase:", error);
      return <span className="selectable-phrase">{phrase || "..."}</span>;
    }
  };

  /**
   * Manual continue function for when speech recognition fails
   */
  const handleManualContinue = () => {
    console.log("Manual continue triggered");
    logger.info('Manual continue triggered');
    
    // Stop listening
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        setIsListening(false);
      } catch (e) {
        console.error("Error stopping recognition during manual continue:", e);
      }
    }
    
    // Reset attempts counter
    setRecognitionAttempts(0);
    
    // Use our simplified function for dialogue progression
    // Pass the current user phrase as the transcript with perfect confidence
    const currentUserPhrase = conversationHistoryRef.current.find(
      entry => entry.speaker === 'User' && 
               entry.step === currentStepRef.current && 
               !entry.isCompleted
    );
    
    if (currentUserPhrase) {
      handleSuccessfulSpeechRecognition(currentUserPhrase.phrase.toLowerCase(), 1.0);
    } else {
      console.log("Manual continue: No active user phrase found");
    }
  };
  
  /**
   * Calculate appropriate delay based on phrase length
   * Longer phrases need more time for the NPC to speak
   */
  const calculateSpeakingDelay = (phrase: string): number => {
    // Calculate delay based on character count
    const characterCount = phrase.length;
    const baseDelay = 1500; // Minimum 1.5 seconds
    const characterDelay = 80; // 80ms per character
    
    // Calculate total delay - capped at 10 seconds maximum to avoid excessive waiting
    const calculatedDelay = baseDelay + (characterCount * characterDelay);
    const maxDelay = 10000; // 10 seconds maximum
    
    const finalDelay = Math.min(calculatedDelay, maxDelay);
    console.log(`DELAY: ${finalDelay}ms for phrase with ${characterCount} characters: "${phrase}"`);
    
    return finalDelay;
  };

  /**
   * Shows the quiz after the dialogue is complete
   * @param dialogueId The ID of the dialogue that was completed
   */
  const showQuizAfterDialogue = (dialogueId: number) => {
    console.log("🎲 CENTRAL FUNCTION: Showing quiz with dialogue ID:", dialogueId);
    
    // Always show quiz first, even for the first dialogue when user is not logged in
    
    // First, ensure thorough cleanup of all speech-related resources
    try {
      // Stop and cleanup speech recognition
      if (recognitionRef.current) {
        // Clear all handlers first to prevent any callbacks
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        
        // Then stop and abort
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.log("Recognition stop error:", e);
        }
        
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.log("Recognition abort error:", e);
        }
        
        // Clear the reference
        recognitionRef.current = null;
        setIsListening(false);
        console.log("Speech recognition fully cleaned up for quiz");
      }
      
      // Cancel any speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
        console.log("Speech synthesis canceled for quiz");
      }
      
      // Make absolutely sure any rogue speech recognition is terminated before quiz
      try {
        // Create a temporary instance and immediately abort it
        // This trick helps clean up any lingering recognition sessions
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (typeof SpeechRecognition !== 'undefined' && SpeechRecognition) {
          const tempRecognition = new SpeechRecognition();
          if (tempRecognition && typeof tempRecognition.abort === 'function') {
            tempRecognition.abort();
            console.log("Created and aborted temporary recognition to ensure clean state");
          }
        }
      } catch (e) {
        console.log("Error during temporary recognition cleanup:", e);
      }
    } catch (e) {
      console.error("Error during cleanup for quiz:", e);
    }
    
    // Wait a moment to ensure cleanup is complete
    setTimeout(() => {
      // Set dialogue ID for quiz
      console.log("Setting dialogue ID:", dialogueId);
      setCurrentDialogueId(dialogueId);
      
      // Reset dialog states
      processingRecognitionRef.current = false;
      
      // CRITICAL - Set the showQuiz flag
      console.log("🚨 DIRECTLY SETTING showQuiz to TRUE");
      setShowQuiz(true);
      
      // Verify the state change with a direct log
      console.log("🚨 showQuiz SET TO:", true);
      
      logger.info('Quiz display activated', { 
        dialogueId,
        timestamp: new Date().toISOString() 
      });
    }, 500);
  };

  /**
   * Process successful speech recognition and progress dialogue
   */
  const handleSuccessfulSpeechRecognition = (transcript: string, confidence: number) => {
    // Get the latest state values from refs
    const currentStepValue = currentStepRef.current;
    const currentConversationHistory = conversationHistoryRef.current;
    const currentDialogues = dialoguesRef.current;
    
    console.log("HANDLING SUCCESSFUL SPEECH:", {
      transcript, 
      confidence,
      currentStep: currentStepValue,
      historyLength: currentConversationHistory.length,
      totalDialogueSteps: currentDialogues.length
    });

    // Find current user phrase
    const currentUserPhrase = currentConversationHistory.find(
      entry => entry.speaker === 'User' && 
               entry.step === currentStepValue && 
               !entry.isCompleted
    );
    
    if (!currentUserPhrase) {
      console.log("❌ No active user phrase found at step", currentStepValue);
      processingRecognitionRef.current = false; // Reset flag if no user phrase
      return;
    }
    
    // Calculate match percentage
    const expectedPhrase = currentUserPhrase.phrase.toLowerCase();
    const matchPercentage = calculateMatchPercentage(transcript, expectedPhrase);
    console.log(`MATCH: ${matchPercentage}% - "${transcript}" vs "${expectedPhrase}"`);
    
    // Only proceed if match is good enough
    if (matchPercentage < 60) {
      console.log("🔄 Match percentage too low, ignoring");
      processingRecognitionRef.current = false; // Reset flag if match too low
      return;
    }
    
    console.log("✅ Speech recognition successful, progressing dialogue");
    
    // Stop speech recognition
    try {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } catch (e) {
      console.error("Error stopping recognition:", e);
    }
    
    // Set listening to false
    setIsListening(false);
    
    // STEP 1: Mark current user phrase as completed
    const updatedHistory = [...currentConversationHistory];
    const currentIndex = updatedHistory.findIndex(e => e.id === currentUserPhrase.id);
    
    if (currentIndex !== -1) {
      updatedHistory[currentIndex] = {
        ...updatedHistory[currentIndex],
        isCompleted: true
      };
    }

    // SIMPLIFIED CHECKS FOR DIALOGUE COMPLETION

    // Look for the highest step number in the dialogue
    const maxStep = Math.max(...currentDialogues.map(d => d.dialogue_step));
    
    // Check if this is the last step OR step 4 (specific fix for taxi dialogue)
    const isLastStep = currentStepValue === maxStep || currentStepValue === 4;
    
    console.log(`Checking if dialogue is complete: step ${currentStepValue}, max step ${maxStep}`, 
      { isLastStep, allSteps: currentDialogues.map(d => d.dialogue_step) });
    
    if (isLastStep) {
      console.log("🏁🏁🏁 FINAL STEP REACHED, DIALOGUE COMPLETE - SHOULD SHOW QUIZ NOW");
      
      // Update conversation history with the completed phrase
      setConversationHistory(updatedHistory);
      
      // Get dialogue ID
      const dialogueId = currentDialogues[0]?.dialogue_id || 1;
      console.log("📚 FINAL DIALOGUE ID:", dialogueId);
      
      // Show quiz - CRITICAL SECTION
      console.log("🎮 INITIATING QUIZ DISPLAY FROM FINAL STEP");
      setTimeout(() => {
        showQuizAfterDialogue(dialogueId);
      }, 300);

      // Reset processing flag after a delay to ensure we don't block further actions
      setTimeout(() => {
        processingRecognitionRef.current = false;
        console.log("🔄 Reset processing recognition flag after final step");
      }, 1000);

      return;
    }
    
    // Reset processing flag here if not the final step
    processingRecognitionRef.current = false;
    
    // STEP 2: Find next NPC phrase
    const nextStep = currentStepValue + 1;
    console.log("Looking for NPC phrase at step", nextStep);
    
    const nextNpcPhrase = currentDialogues.find(
      p => p.dialogue_step === nextStep && p.speaker === 'NPC'
    );
    
    if (!nextNpcPhrase) {
      console.log("🎮🎮🎮 NO MORE NPC PHRASES, DIALOGUE COMPLETED - SHOULD SHOW QUIZ");
      setConversationHistory(updatedHistory);
      
      // Get dialogue ID
      const dialogueId = currentDialogues[0]?.dialogue_id || 1;
      console.log("📚 FINAL DIALOGUE ID FOR QUIZ:", dialogueId);
      
      // Show quiz
      setTimeout(() => {
        showQuizAfterDialogue(dialogueId);
      }, 300);
      return;
    }
    
    // STEP 3: Format and add NPC phrase
    const npcPhrase = targetLanguage === 'en' ? nextNpcPhrase.en_text : nextNpcPhrase.ru_text;
    const npcTranscription = targetLanguage === 'ru' 
      ? nextNpcPhrase.ru_text_en 
      : nextNpcPhrase.en_text_ru;
    const npcTranslation = motherLanguage === 'en'
      ? nextNpcPhrase.en_text 
      : nextNpcPhrase.ru_text;
      
    // Add NPC phrase to history
    updatedHistory.push({
      id: nextNpcPhrase.id,
      step: nextStep,
      speaker: 'NPC' as const,
      phrase: npcPhrase,
      transcription: npcTranscription,
      translation: npcTranslation,
      isCompleted: true
    });
    
    // STEP 4: Update conversation history state
    setConversationHistory(updatedHistory);
    
    // STEP 5: Update current step
    setCurrentStep(nextStep);
    
    // STEP 6: Play audio for NPC phrase
    setTimeout(() => {
      playAudio(npcPhrase);
      
      // STEP 7: Look for next user phrase
      const nextUserStep = nextStep + 1;
      const nextUserPhrase = currentDialogues.find(
        p => p.dialogue_step === nextUserStep && p.speaker === 'User'
      );
      
      if (nextUserPhrase) {
        // Format user phrase
        const userPhrase = targetLanguage === 'en' ? nextUserPhrase.en_text : nextUserPhrase.ru_text;
        const userTranscription = targetLanguage === 'ru' 
          ? nextUserPhrase.ru_text_en 
          : nextUserPhrase.en_text_ru;
        const userTranslation = motherLanguage === 'en'
          ? nextUserPhrase.en_text 
          : nextUserPhrase.ru_text;
        
        // Calculate delay based on NPC phrase length
        const speakingDelay = calculateSpeakingDelay(npcPhrase);
        
        // Add user phrase to conversation with appropriate delay
        setTimeout(() => {
          setConversationHistory(prev => [
            ...prev,
            {
              id: nextUserPhrase.id,
              step: nextUserStep,
              speaker: 'User' as const,
              phrase: userPhrase,
              transcription: userTranscription,
              translation: userTranslation,
              isCompleted: false
            }
          ]);
          
          // Update current step
          setCurrentStep(nextUserStep);
        }, speakingDelay);
      } else {
        // No more user phrases, this is the end of the dialogue
        console.log("🎮🎮 LAST NPC PHRASE, NO MORE USER PHRASES - SHOWING QUIZ");
        
        // Get dialogue ID
        const dialogueId = currentDialogues[0]?.dialogue_id || 1;
        console.log("📚 FINAL DIALOGUE ID FOR QUIZ AFTER NPC:", dialogueId);
        
        // Show quiz
        setTimeout(() => {
          showQuizAfterDialogue(dialogueId);
        }, 300);
      }
    }, 500);
  };

  /**
   * Effect to initialize conversation and set up state on first render
   */
  useEffect(() => {
    if (dialoguesRef.current.length > 0 && !conversationInitializedRef.current && conversationHistory.length === 0) {
      console.log("Initial render with dialogues available, initializing conversation");
      setTimeout(() => {
        initializeConversation(dialoguesRef.current);
      }, 500); // Add a delay before initializing to ensure state is stable
    }
    
    // Return cleanup function
    return () => {
      // Any cleanup needed
    };
  }, [dialogues.length, conversationHistory.length]);

  /**
   * Ensure proper cleanup on component unmount
   */
  useEffect(() => {
    return () => {
      console.log("DialogueBox component unmounting - performing final cleanup");
      // Cancel any speech synthesis
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      
      // Abort any active speech recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          console.error("Error aborting recognition on unmount:", e);
        }
      }
    };
  }, []);

  /**
   * Check browser compatibility for speech recognition
   */
  useEffect(() => {
    console.log("Checking browser compatibility for speech recognition");
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.error("Speech recognition not supported in this browser");
      logger.error('Speech recognition not supported', { 
        userAgent: navigator.userAgent,
        browser: navigator.vendor
      });
      
      // Show a message to the user
      alert("Speech recognition is not supported in your browser. Please try Chrome, Edge, or Safari for the best experience.");
      return;
    }
    
    // Log browser information
    console.log("Browser information:", {
      userAgent: navigator.userAgent,
      vendor: navigator.vendor,
      speechRecognitionSupport: !!SpeechRecognition
    });
    
    // Test if we can instantiate recognition
    try {
      const testRecognition = new SpeechRecognition();
      console.log("Successfully created test recognition instance");
    } catch (e) {
      console.error("Error creating speech recognition instance:", e);
    }
  }, []);
  
  /**
   * Global error handler for unhandled errors
   */
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error("Unhandled error:", event.error || event.message);
      logger.error('Unhandled error in DialogueBox', { 
        message: event.message,
        stack: event.error?.stack || 'No stack available'
      });
    };
    
    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  /**
   * Effect to monitor conversation history changes
   */
  useEffect(() => {
    console.log("Conversation history changed to", conversationHistory.length, "entries, current step:", currentStep);
    
    // If conversation is newly initialized, check if we need to start listening
    if (conversationHistory.length > 0 && conversationInitializedRef.current) {
      const currentUserPhrase = conversationHistory.find(
        entry => entry.speaker === 'User' && 
                entry.step === currentStep && 
                !entry.isCompleted
      );
      
      if (currentUserPhrase && !isListening && recognitionRef.current) {
        console.log("Conversation initialized with user phrase, starting recognition for:", currentUserPhrase.phrase);
        
        // Only set isListening to true here, but DON'T start recognition - the other useEffect will handle that
        setIsListening(true);
        
        // Mark as initialized
        conversationInitializedRef.current = true;
        logger.info('Marked conversation as initialized with user phrase', { 
          phraseToMatch: currentUserPhrase.phrase 
        });
      }
    }
  }, [conversationHistory.length]);

  /**
   * Start/stop listening based on whether there's an active user phrase
   */
  useEffect(() => {
    // Only start listening if conversation is properly initialized
    if (conversationHistoryRef.current.length === 0 || !conversationInitializedRef.current) {
      console.log("Not starting speech recognition - conversation not initialized or empty");
      return;
    }
    
    const currentUserPhrase = conversationHistoryRef.current.find(
      entry => entry.speaker === 'User' && 
               entry.step === currentStepRef.current && 
               !entry.isCompleted
    );
    
    console.log("Checking if should listen:", { 
      currentUserPhrase: !!currentUserPhrase, 
      isListening, 
      hasRecognition: !!recognitionRef.current,
      currentStep: currentStepRef.current,
      conversationLength: conversationHistoryRef.current.length,
      conversationInitialized: conversationInitializedRef.current
    });
    
    if (currentUserPhrase && !isListening && recognitionRef.current) {
      // Start listening with a small delay to ensure all state updates are complete
      console.log("Should start speech recognition for phrase:", currentUserPhrase.phrase);
      
      setTimeout(() => {
        setIsListening(true);
        
        try {
          console.log("Actually starting speech recognition now");
          recognitionRef.current?.start();
          logger.info('Started listening for speech', { phraseToMatch: currentUserPhrase.phrase });
        } catch (e) {
          console.error("Error starting speech recognition:", e);
          setIsListening(false);
        }
      }, 200);
    } else if ((!currentUserPhrase || !recognitionRef.current) && isListening) {
      // Stop listening
      console.log("Stopping speech recognition - no current user phrase or recognition object");
      setIsListening(false);
      
      try {
        recognitionRef.current?.stop();
        logger.info('Stopped listening for speech');
      } catch (e) {
        console.error("Error stopping speech recognition:", e);
      }
    }
  }, [conversationHistory, currentStep, conversationInitializedRef.current]);

  /**
   * Debug function to log all dialogues
   */
  const logAllDialogues = () => {
    console.log("DEBUG: All available dialogues:");
    dialoguesRef.current.forEach(d => {
      console.log(`Step ${d.dialogue_step}: ${d.speaker} - ${targetLanguage === 'en' ? d.en_text : d.ru_text}`);
    });
  };

  /**
   * Handle dialogue completion
   */
  const handleDialogueCompletion = () => {
    logger.info('Dialogue completed, showing quiz', { dialogueId: currentDialogueId });
    setShowQuiz(true);
  };

  /**
   * Handle quiz completion
   */
  const handleQuizComplete = (passed: boolean) => {
    console.log('DialogueBox - Quiz completed with passed:', passed, 'for dialogueId:', currentDialogueId);
    logger.info('Quiz completed', { passed, dialogueId: currentDialogueId });
    
    // Check current auth and login state
    const { user, isLoggedIn } = useStore.getState();
    
    // If this is the first dialogue/quiz and user isn't logged in, show signup prompt
    if (currentDialogueId === 1 && (!user || !isLoggedIn)) {
      console.log('DialogueBox - First quiz completed, user not logged in, showing signup prompt');
      setShowQuiz(false);
      setTimeout(() => {
        setShowSignupPrompt(true);
      }, 500);
      return;
    }
    
    // If the quiz was passed, track the dialogue completion
    if (passed && user?.id && isLoggedIn) {
      const updateProgress = async () => {
        try {
          // Import auth services
          const { trackCompletedDialogue } = await import('../services/auth');
          
          // Track dialogue completion
          await trackCompletedDialogue(user.id, characterId, currentDialogueId, 100);
          
          logger.info('Progress successfully tracked for logged-in user', { 
            userId: user.id, 
            dialogueId: currentDialogueId, 
            characterId 
          });
        } catch (error) {
          logger.error('Failed to update user progress', { error });
        }
      };
      
      // Execute the progress update
      updateProgress();
    } else if (passed) {
      // Handle anonymous user progress
      const saveAnonymousProgressAsync = async () => {
        try {
          const { saveAnonymousProgress } = await import('../services/auth');
          const saved = saveAnonymousProgress(currentDialogueId, characterId, 100);
          
          if (saved) {
            logger.info('Anonymous progress saved successfully', { 
              dialogueId: currentDialogueId, 
              characterId 
            });
          }
        } catch (error) {
          logger.error('Failed to save anonymous progress', { error });
        }
      };
      
      saveAnonymousProgressAsync();
    }
    
    setShowQuiz(false);
    onClose();
  };

  /**
   * Handle quiz close without completion
   */
  const handleQuizClose = () => {
    logger.info('Quiz closed without completion');
    setShowQuiz(false);
    onClose();
  };
  
  /**
   * Handle login from signup prompt
   */
  const handleLoginFromPrompt = async (email: string, password: string) => {
    try {
      const { login } = await import('../services/auth');
      const user = await login(email, password);
      
      // Save user to local storage
      localStorage.setItem('turi_user', JSON.stringify(user));
      
      // Update store state
      const { setUser, setIsLoggedIn, setIsAuthenticated, setLanguages } = useStore.getState();
      setUser(user);
      setIsLoggedIn(true);
      setIsAuthenticated(true);
      
      // Set languages based on user preferences
      setLanguages(user.mother_language, user.target_language);
      
      // Close signup prompt
      setShowSignupPrompt(false);
      onClose();
      
      logger.info('User logged in from prompt', { email });
    } catch (error) {
      logger.error('Login from prompt failed', { error });
      throw error;
    }
  };
  
  /**
   * Handle create account from signup prompt
   */
  const handleCreateAccountFromPrompt = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      
      // Use the signup function from auth service
      const { signUp } = await import('../services/auth');
      const { motherLanguage, targetLanguage } = useStore.getState();
      
      const user = await signUp(
        email, 
        password,
        motherLanguage, 
        targetLanguage
      );
      
      // Save user to local storage
      localStorage.setItem('turi_user', JSON.stringify(user));
      
      // Update store state
      const { setUser, setIsLoggedIn, setIsAuthenticated } = useStore.getState();
      setUser(user);
      setIsLoggedIn(true);
      setIsAuthenticated(true);
      
      // Close signup prompt
      setShowSignupPrompt(false);
      onClose();
      
      logger.info('User account created from prompt', { email });
    } catch (error) {
      logger.error('Account creation from prompt failed', { error });
      throw error;
    }
  };
  
  /**
   * Handle skip signup
   */
  const handleSkipSignup = () => {
    setShowSignupPrompt(false);
    onClose();
  };

  /**
   * Loading state
   */
  if (isLoading) {
    return (
      <div className="dialogue-box-container">
        <div className="dialogue-loading">Loading...</div>
      </div>
    );
  }

  /**
   * Error state
   */
  if (dialogues.length === 0) {
    return (
      <div className="dialogue-box-container">
        <div className="dialogue-error">
          No dialogues found.
          <button onClick={onClose} className="close-button">×</button>
        </div>
      </div>
    );
  }

  /**
   * Return the appropriate UI based on state
   * If we're showing the quiz, render the VocalQuizComponent
   */
  if (showQuiz) {
    console.log(`📲 ACTUAL RENDER: Showing quiz component with dialogueId:`, currentDialogueId);
    return (
      <VocalQuizComponent
        dialogueId={currentDialogueId}
        characterId={characterId}  // Pass characterId to VocalQuizComponent
        onComplete={handleQuizComplete}
        onClose={handleQuizClose}
      />
    );
  }
  
  /**
   * If showing signup prompt, render the SignupPrompt component
   */
  if (showSignupPrompt) {
    console.log(`📲 ACTUAL RENDER: Showing signup prompt`);
    return (
      <SignupPrompt
        onLogin={handleLoginFromPrompt}
        onCreateAccount={handleCreateAccountFromPrompt}
        onClose={onClose}
        onSkip={handleSkipSignup}
      />
    );
  }

  /**
   * Main render - dialogue box UI
   */
  console.log(`📲 ACTUAL RENDER: Showing dialogue box`);
  
  try {
    return (
      <div className="dialogue-box-container" style={{ pointerEvents: 'auto' }}>
        {conversationHistory.map((entry, index) => {
          const previousUserPhrases = conversationHistory
            .filter(e => e.speaker === 'User' && e.isCompleted && e.step < entry.step)
            .sort((a, b) => b.step - a.step);
          const canGoBack = previousUserPhrases.length > 0;
          const isCurrentUserPhrase = entry.speaker === 'User' && entry.step === currentStep && !entry.isCompleted;

          return (
            <div 
              key={`${entry.speaker}-${entry.step}-${index}`}
              className="dialogue-box-entry"
            >
              <div className={`dialogue-entry ${entry.speaker.toLowerCase()}`} data-step={entry.step}> 
                <div className="dialogue-content">
                  <div className="dialogue-phrase">
                    {isCurrentUserPhrase ? 
                      renderHighlightedPhrase(entry.phrase, highlightedWords) : 
                      renderHighlightedPhrase(entry.phrase, []) // Use the same function for consistency, with empty highlights
                    }
                    {isCurrentUserPhrase && isListening && (
                      <span className="listening-indicator">🎤</span>
                    )}
                  </div>
                  <div className="dialogue-transcription">[{entry.transcription}]</div>
                  <div className="dialogue-translation">{entry.translation}</div>
                  
                  {isCurrentUserPhrase && (
                    <div className="recognition-status">
                      <div className="transcript">
                        {transcript ? `Heard: ${transcript}` : "Waiting for speech..."}
                      </div>
                      <div className="match-progress">
                        <div 
                          className="match-bar" 
                          style={{ 
                            width: transcript ? `${calculateMatchPercentage(transcript, entry.phrase.toLowerCase())}%` : '0%'
                          }}
                        ></div>
                        <span className="match-percentage">
                          {transcript ? `${calculateMatchPercentage(transcript, entry.phrase.toLowerCase())}%` : '0%'}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Only show manual continue button after 3 failed attempts */}
                  {isCurrentUserPhrase && recognitionAttempts >= 3 && (
                    <div className="manual-continue" style={{ marginTop: '10px' }}>
                      <p>Having trouble? Click to continue anyway:</p>
                      <button 
                        className="manual-continue-button"
                        onClick={handleManualContinue}
                        style={{
                          padding: '8px 15px',
                          backgroundColor: '#4CAF50',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'block',
                          marginTop: '5px'
                        }}
                      >
                        Continue →
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="dialogue-buttons">
                  <button
                    className="return-button"
                    onClick={() => handleGoBack(entry)}
                    title="Go back to previous step"
                  >
                    ↩
                  </button>
                  <button 
                    className="sound-button"
                    onClick={() => handlePlayAudio(entry)}
                    title="Play audio"
                  >
                    🔊
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Debug controls in development */}
        {process.env.NODE_ENV === 'development' && (
          <div className="debug-controls" style={{ 
            marginTop: '15px', 
            padding: '10px', 
            borderTop: '1px solid #333',
            display: 'flex',
            gap: '10px'
          }}>
            <button 
              style={{
                padding: '8px 15px',
                backgroundColor: '#8e44ad',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
              onClick={() => {
                console.log("DEBUG: Force show quiz button pressed");
                const dialogueId = dialoguesRef.current[0]?.dialogue_id || 1;
                // Call the function directly within this scope where it's defined
                try {
                  // Set dialogue ID for quiz
                  console.log("Setting dialogue ID:", dialogueId);
                  setCurrentDialogueId(dialogueId);
                  
                  // Set the showQuiz flag directly
                  console.log("Setting showQuiz to TRUE");
                  setShowQuiz(true);
                } catch (e) {
                  console.error("Error showing quiz:", e);
                }
              }}
            >
              Force Show Quiz
            </button>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error("Critical error rendering DialogueBox:", error);
    // Return a simplified error state UI
    return (
      <div className="dialogue-box-container">
        <div className="dialogue-error">
          <p>There was an error displaying the dialogue.</p>
          <button onClick={onClose} className="close-button">Close</button>
        </div>
      </div>
    );
  }
};

// Set default props
DialogueBox.defaultProps = {
  dialogueId: 1
};

export default DialogueBox;

// Debug function to expose to window
if (typeof window !== 'undefined') {
  // Define a self-contained version that doesn't reference the component's function
  window.forceShowQuiz = function(dialogueId = 1, characterId = 1) {
    console.log("🧪 TEST: Force showing quiz with dialogue ID:", dialogueId, "character ID:", characterId);
    alert("Manual quiz activation triggered with dialogue ID: " + dialogueId);
    
    // Create and add a quiz component directly to the document
    const quizContainer = document.createElement('div');
    quizContainer.id = 'forced-quiz-container';
    quizContainer.style.position = 'fixed';
    quizContainer.style.inset = '0';
    quizContainer.style.zIndex = '9999';
    document.body.appendChild(quizContainer);
    
    // Render the quiz component
    try {
      window.ReactDOM.render(
        window.React.createElement(window.VocalQuizComponent, {
          dialogueId: dialogueId,
          characterId: characterId,
          onComplete: (passed: boolean) => {
            console.log("Forced quiz completed, passed:", passed);
            const container = document.getElementById('forced-quiz-container');
            if (container) container.remove();
          },
          onClose: () => {
            console.log("Forced quiz closed");
            const container = document.getElementById('forced-quiz-container');
            if (container) container.remove();
          }
        }),
        quizContainer
      );
      console.log("Forced quiz component rendered");
    } catch (e) {
      const error = e as Error;
      console.error("Error rendering forced quiz:", error);
      alert("Error showing quiz: " + error.message);
    }
  };
  
  console.log("🧰 Debug function 'window.forceShowQuiz()' ready");
}