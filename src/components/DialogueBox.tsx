// src/components/DialogueBox.tsx
import React, { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../services/supabase"; // Import shared client
import { useStore } from "../store";
import { logger } from "../services/logger";
import "./DialogueBox.css";
import VocalQuizComponent from "./VocalQuizComponent"; // Import the VocalQuizComponent
import SignupPrompt from "./SignupPrompt";
import type { SupportedLanguage } from '../constants/translations';
import { AIDialogueStep } from '../services/gemini';

// Map supported languages to their speech recognition codes
const getRecognitionLanguage = (lang: SupportedLanguage): string => {
  const languageMap: Record<string, string> = {
    // Major languages - using your original abbreviations
    'en': 'en-US',
    'ru': 'ru-RU',
    'es': 'es-ES',
    'fr': 'fr-FR',
    'de': 'de-DE',
    'it': 'it-IT',
    'pt': 'pt-PT',
    'ar': 'ar-SA',  // Arabic
    'CH': 'zh-CN',  // Chinese  
    'ja': 'ja-JP',  // Japanese
    'ko': 'ko-KR',
    'hi': 'hi-IN',
    'th': 'th-TH',
    'vi': 'vi-VN',
    'tr': 'tr-TR',
    'pl': 'pl-PL',
    'nl': 'nl-NL',
    'sv': 'sv-SE',
    'da': 'da-DK',
    'no': 'no-NO',
    'fi': 'fi-FI',
    'cs': 'cs-CZ',
    'sk': 'sk-SK',
    'hu': 'hu-HU',
    'ro': 'ro-RO',
    'bg': 'bg-BG',
    'hr': 'hr-HR',
    'sr': 'sr-RS',
    'sl': 'sl-SI',
    'et': 'et-EE',
    'lv': 'lv-LV',
    'lt': 'lt-LT',
    'mt': 'mt-MT',
    'ga': 'ga-IE',
    'cy': 'cy-GB',
    'is': 'is-IS',
    'eu': 'eu-ES',
    'ca': 'ca-ES',
    'gl': 'gl-ES',
    'he': 'he-IL',
    'fa': 'fa-IR',
    'ur': 'ur-PK',
    'bn': 'bn-BD',
    'gu': 'gu-IN',
    'ta': 'ta-IN',
    'te': 'te-IN',
    'kn': 'kn-IN',
    'ml': 'ml-IN',
    'mr': 'mr-IN',
    'ne': 'ne-NP',
    'si': 'si-LK',
    'my': 'my-MM',
    'km': 'km-KH',
    'lo': 'lo-LA',
    'am': 'am-ET',
    'sw': 'sw-KE',
    'af': 'af-ZA',
    'zu': 'zu-ZA',
    'id': 'id-ID',
    'ms': 'ms-MY',
    'tl': 'tl-PH'
  };
  return languageMap[lang] || 'en-US'; // Default to English
};

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
    testJapaneseMatching: (spoken: string, expected: string) => number;
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
  aiDialogue?: AIDialogueStep[] | null; // AI-generated dialogue
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
  [key: string]: any; // Allow dynamic language columns
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
  aiDialogue = null, // AI-generated dialogue
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
    motherLanguage, // Language user already knows
    targetLanguage, // Language user is learning
    user            // Current user data
  } = useStore();

  // Helper function to get text in the specified language from a phrase
  const getTextInLanguage = (phrase: DialoguePhrase, language: SupportedLanguage): string => {
    // Convert language code to lowercase for database column matching
    const textKey = `${language.toLowerCase()}_text`;
    const text = phrase[textKey];
    
    // DEBUG: Log what columns are available and what we're looking for
    console.log(`🔍 DIALOGUE getTextInLanguage DEBUG: Looking for "${textKey}" in phrase ${phrase.id}`);
    console.log(`🔍 Available columns:`, Object.keys(phrase).filter(key => key.includes('text')));
    console.log(`🔍 Value found:`, text);
    console.log(`🔍 Target language:`, language);
    
    if (text && text.trim() !== '') {
      console.log(`✅ Found text for ${textKey}:`, text);
      return text;
    }
    
    // Fallback chain: try English, then any available language
    if (phrase.en_text && phrase.en_text.trim() !== '') {
      console.warn(`⚠️ Missing ${textKey} for phrase ${phrase.id}, falling back to English`);
      return phrase.en_text;
    }
    
    // If no English, try to find any available text column
    const availableTextColumns = Object.keys(phrase).filter(key => key.endsWith('_text'));
    if (availableTextColumns.length > 0) {
      const fallbackKey = availableTextColumns[0];
      const fallbackText = phrase[fallbackKey];
      if (fallbackText && fallbackText.trim() !== '') {
        console.warn(`⚠️ Missing ${textKey} and en_text for phrase ${phrase.id}, falling back to ${fallbackKey}`);
        return fallbackText;
      }
    }
    
    console.error(`❌ No text available for phrase ${phrase.id} in any language`);
    return `[Missing text for ${language}]`;
  };

  // Helper function to get transcription (pronunciation guide)
  const getTranscription = (phrase: DialoguePhrase, targetLang: SupportedLanguage, motherLang: SupportedLanguage): string => {
    // Convert language codes to lowercase for database column matching
    const transcriptionKey = `${targetLang.toLowerCase()}_text_${motherLang.toLowerCase()}`;
    const transcription = phrase[transcriptionKey];
    
    if (transcription) {
      return transcription;
    }
    
    // Fallback to English transcription
    const englishTranscriptionKey = `${targetLang.toLowerCase()}_text_en`;
    if (phrase[englishTranscriptionKey]) {
      console.warn(`Missing ${transcriptionKey} for phrase ${phrase.id}, falling back to English transcription`);
      return phrase[englishTranscriptionKey];
    }
    
    // For languages that don't need transcription (same script), return empty
    const sameScriptLanguages = ['en', 'es', 'fr', 'de', 'it', 'pt', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu', 'ro', 'hr', 'sl', 'et', 'lv', 'lt'];
    if (sameScriptLanguages.includes(targetLang) && sameScriptLanguages.includes(motherLang)) {
      return ''; // No transcription needed for same script languages
    }
    
    // For different scripts, try to find any available transcription
    const availableTranscriptions = Object.keys(phrase).filter(key => 
      key.startsWith(`${targetLang.toLowerCase()}_text_`) && key !== `${targetLang.toLowerCase()}_text`
    );
    
    if (availableTranscriptions.length > 0) {
      const fallbackKey = availableTranscriptions[0];
      console.warn(`Missing ${transcriptionKey} for phrase ${phrase.id}, falling back to ${fallbackKey}`);
      return phrase[fallbackKey];
    }
    
    console.warn(`No transcription available for phrase ${phrase.id} from ${targetLang} to ${motherLang}`);
    return ''; // Return empty if no transcription available
  };
  
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
      recognition.lang = getRecognitionLanguage(targetLanguage);
      
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
        
        // ALWAYS update transcript to current recognition result (no accumulation)
        setTranscript(transcript);
        setRecognitionConfidence(confidence);
        
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
        
        // 🔍 ENHANCED DEBUGGING FOR CHINESE PHRASES
        if (targetLanguage === 'CH') {
          console.log(`🔍 CHINESE DEBUG - Step ${currentStepValue}:`);
          console.log(`  - Raw expected phrase: "${currentUserPhrase.phrase}"`);
          console.log(`  - Lowercased expected: "${expectedPhrase}"`);
          console.log(`  - Raw transcript: "${result[0].transcript}"`);
          console.log(`  - Lowercased transcript: "${transcript}"`);
          console.log(`  - Expected contains Chinese chars: ${/[\u4e00-\u9fff]/.test(expectedPhrase)}`);
          console.log(`  - Transcript contains Chinese chars: ${/[\u4e00-\u9fff]/.test(transcript)}`);
          
          // Check which characters are in the expected phrase
          const expectedChars = Array.from(expectedPhrase).filter(char => /[\u4e00-\u9fff]/.test(char));
          console.log(`  - Chinese characters in expected: [${expectedChars.join(', ')}]`);
          
          // Check which characters are in the transcript
          const transcriptChars = Array.from(transcript).filter(char => /[\u4e00-\u9fff]/.test(char));
          console.log(`  - Chinese characters in transcript: [${transcriptChars.join(', ')}]`);
          
          // Check mapping coverage
          const charToPinyin: Record<string, string> = {
            '我': 'wo', '的': 'de', '名': 'ming', '字': 'zi', '是': 'shi', '戴': 'dai', '夫': 'fu',
            '谢': 'xie', '出': 'chu', '租': 'zu', '车': 'che', '司': 'si', '机': 'ji',
            '这': 'zhe', '些': 'xie', '都': 'dou', '对': 'dui', '了': 'le',
            '就': 'jiu', '去': 'qu', '试': 'shi'
          };
          
          const unmappedExpectedChars = expectedChars.filter(char => !charToPinyin[char]);
          const unmappedTranscriptChars = transcriptChars.filter(char => !charToPinyin[char]);
          
          if (unmappedExpectedChars.length > 0) {
            console.log(`  ⚠️ UNMAPPED CHARS IN EXPECTED: [${unmappedExpectedChars.join(', ')}]`);
          }
          if (unmappedTranscriptChars.length > 0) {
            console.log(`  ⚠️ UNMAPPED CHARS IN TRANSCRIPT: [${unmappedTranscriptChars.join(', ')}]`);
          }
        }
        
        // Update highlighted words for visual feedback
        const highlightedWords = findMatchingWords(transcript, expectedPhrase);
        setHighlightedWords(highlightedWords);
        
        // 🔍 ENHANCED DEBUGGING FOR HIGHLIGHTING
        console.log(`🎨 HIGHLIGHTING DEBUG - Step ${currentStepValue}:`);
        console.log(`  - Highlighted words: [${highlightedWords.join(', ')}]`);
        console.log(`  - Number of highlighted words: ${highlightedWords.length}`);
        
        // Process final results
        if (result.isFinal) {
          const matchPercentage = calculateMatchPercentage(transcript, expectedPhrase);
          console.log(`📊 MATCH: "${transcript}" vs "${expectedPhrase}" = ${matchPercentage}%`);
          
          // 🔍 ENHANCED DEBUGGING FOR MATCH CALCULATION
          console.log(`🧮 MATCH CALCULATION DEBUG - Step ${currentStepValue}:`);
          console.log(`  - Match percentage: ${matchPercentage}%`);
          console.log(`  - Threshold: 60%`);
          console.log(`  - Will progress: ${matchPercentage >= 60}`);
          
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
                newRecognition.lang = getRecognitionLanguage(targetLanguage);

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
                  
                  // Process final results - ADD THRESHOLD CHECK HERE TOO
                  if (result.isFinal) {
                    const matchPercentage = calculateMatchPercentage(transcript, expectedPhrase);
                    console.log(`📊 MATCH (nested): "${transcript}" vs "${expectedPhrase}" = ${matchPercentage}%`);
                    
                    // AUTOMATIC PROGRESSION when threshold is met
                    if (matchPercentage >= 60) {
                      console.log(`✅ SUCCESS (nested): Speech matched at ${matchPercentage}%, automatically progressing`);
                      
                      if (processingRecognitionRef.current) {
                        console.log("⚠️ Already processing recognition, ignoring duplicate event");
                        return;
                      }
                      
                      processingRecognitionRef.current = true;
                      handleSuccessfulSpeechRecognition(transcript, confidence);
                    } else {
                      console.log(`❌ MATCH FAILED (nested): ${matchPercentage}% (need 60%), transcript: "${transcript}"`);
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
                if (isListening && recognitionRef.current) {
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
                        newRecognition.lang = getRecognitionLanguage(targetLanguage);
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
   * Enhanced for multi-language support including Japanese, Arabic, Chinese
   */
  const calculateMatchPercentage = (spoken: string, expected: string): number => {
    if (!spoken || !expected) return 0;
    
    // Language-specific normalization
    const normalizeText = (text: string, lang: SupportedLanguage): string => {
      let normalized = text.toLowerCase().trim();
      
      // Remove common punctuation
      normalized = normalized.replace(/[.,?!;:]/g, '');
      
      // Language-specific normalization
      switch (lang) {
        case 'ja':
          // For Japanese, normalize different character types
          // Convert full-width to half-width
          normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
            String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
          );
          
          // Convert katakana to hiragana for better matching
          normalized = normalized.replace(/[\u30A1-\u30F6]/g, (s) => 
            String.fromCharCode(s.charCodeAt(0) - 0x60)
          );
          
          // Normalize spaces in Japanese
          normalized = normalized.replace(/\s+/g, '');
          break;
          
        case 'ar':
          // For Arabic, normalize diacritics and variations
          normalized = normalized
            .replace(/[ًٌٍَُِّْ]/g, '') // Remove diacritics
            .replace(/ة/g, 'ه') // Normalize taa marbouta
            .replace(/ى/g, 'ي') // Normalize alif maksura
            .replace(/أ|إ|آ/g, 'ا'); // Normalize alif variations
          break;
          
        case 'CH':
          // For Chinese, keep spaces for pinyin comparison
          normalized = normalized.replace(/\s+/g, ' ');
          break;
          
        default:
          // For other languages, normalize spaces
          normalized = normalized.replace(/\s+/g, ' ');
      }
      
      return normalized;
    };
    
    const cleanSpoken = normalizeText(spoken, targetLanguage);
    const cleanExpected = normalizeText(expected, targetLanguage);
    
    // Chinese: convert characters to pinyin for proper matching
    if (targetLanguage === 'CH') {
      console.log(`🔍 CHINESE: spoken="${cleanSpoken}", expected="${cleanExpected}"`);
      
      // Check if spoken contains Chinese characters
      const hasChineseChars = /[\u4e00-\u9fff]/.test(cleanSpoken);
      
      if (hasChineseChars) {
        // Simple character to pinyin conversion - essential characters for taxi dialogue
        const charToPinyin: Record<string, string> = {
          '我': 'wo', '的': 'de', '名': 'ming', '字': 'zi', '是': 'shi', '戴': 'dai', '夫': 'fu',
          '谢': 'xie', '出': 'chu', '租': 'zu', '车': 'che', '司': 'si', '机': 'ji',
          '这': 'zhe', '些': 'xie', '都': 'dou', '对': 'dui', '了': 'le',
          '就': 'jiu', '去': 'qu', '试': 'shi'
        };
        
        // Convert each character to pinyin
        const spokenPinyin = Array.from(cleanSpoken)
          .map(char => charToPinyin[char] || char)
          .join(' ')
          .toLowerCase();
        
        console.log(`🔍 CONVERTED: "${cleanSpoken}" → "${spokenPinyin}"`);
        
        // Remove tone marks from expected
        const normalizedExpected = cleanExpected.replace(/[ǎǐǒǔǚāīōūǖáíóúǘàìòùǜèéē]/g, (match) => {
          const toneMap: Record<string, string> = {
            'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
            'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
            'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
            'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
            'ǖ': 'u', 'ǘ': 'u', 'ǚ': 'u', 'ǜ': 'u',
            'è': 'e', 'é': 'e', 'ē': 'e'
          };
          return toneMap[match] || match;
        });
        
        console.log(`🔍 TONE MARK REMOVAL: "${cleanExpected}" → "${normalizedExpected}"`);
        
        // Compare pinyin words
        const spokenWords = spokenPinyin.split(/\s+/).filter(w => w.length > 0);
        const expectedWords = normalizedExpected.split(/\s+/).filter(w => w.length > 0);
        
        console.log(`🔍 WORD COMPARISON:`);
        console.log(`  - Spoken words: [${spokenWords.join(', ')}]`);
        console.log(`  - Expected words: [${expectedWords.join(', ')}]`);
        
        let matchedWords = 0;
        for (const expectedWord of expectedWords) {
          const isMatch = spokenWords.includes(expectedWord);
          console.log(`  - "${expectedWord}" in spoken? ${isMatch}`);
          if (isMatch) {
            matchedWords++;
          }
        }
        
        const percentage = (matchedWords / expectedWords.length) * 100;
        console.log(`🔍 RESULT: ${matchedWords}/${expectedWords.length} = ${percentage}%`);
        return Math.round(percentage);
      }
      
      // If no Chinese characters, treat as pinyin input (fallback)
      return 0;
    }

    // For languages without clear word boundaries (Japanese, Arabic)
    if (['ja', 'ar'].includes(targetLanguage)) {
      // Character-based matching for these languages
      const spokenChars = Array.from(cleanSpoken);
      const expectedChars = Array.from(cleanExpected);
      
      let matchedChars = 0;
      const spokenCharSet = new Set(spokenChars);
      
      // Count how many expected characters are found in spoken text
      for (const expectedChar of expectedChars) {
        if (spokenCharSet.has(expectedChar)) {
          matchedChars++;
        }
      }
      
      const charMatchPercentage = (matchedChars / expectedChars.length) * 100;
      
      // IMPORTANT: Also check length ratio to prevent single words from passing
      const lengthRatio = spokenChars.length / expectedChars.length;
      
      // If spoken text is much shorter than expected (less than 60% of expected length),
      // apply a penalty to prevent single words from getting high scores
      if (lengthRatio < 0.6) {
        const adjustedPercentage = charMatchPercentage * lengthRatio;
        return Math.round(adjustedPercentage);
      }
      
      return Math.round(charMatchPercentage);
    }
    
    // Word-based matching for space-separated languages
    const spokenWords = cleanSpoken.split(/\s+/).filter(w => w.length > 0);
    const expectedWords = cleanExpected.split(/\s+/).filter(w => w.length > 0);
    
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
   * Enhanced for multi-language support
   */
  const findMatchingWords = (spoken: string, expected: string): string[] => {
    if (!spoken || !expected) return [];
    
    // Use the same normalization as calculateMatchPercentage
    const normalizeText = (text: string, lang: SupportedLanguage): string => {
      let normalized = text.toLowerCase().trim();
      normalized = normalized.replace(/[.,?!;:]/g, '');
      
      switch (lang) {
        case 'ja':
          normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
            String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
          );
          
          // Convert katakana to hiragana for better matching
          normalized = normalized.replace(/[\u30A1-\u30F6]/g, (s) => 
            String.fromCharCode(s.charCodeAt(0) - 0x60)
          );
          
          normalized = normalized.replace(/\s+/g, '');
          break;
        case 'ar':
          normalized = normalized
            .replace(/[ًٌٍَُِّْ]/g, '')
            .replace(/ة/g, 'ه')
            .replace(/ى/g, 'ي')
            .replace(/أ|إ|آ/g, 'ا');
          break;
        case 'CH':
          normalized = normalized.replace(/\s+/g, ' ');
          break;
        default:
          normalized = normalized.replace(/\s+/g, ' ');
      }
      
      return normalized;
    };
    
    const cleanSpoken = normalizeText(spoken, targetLanguage);
    const cleanExpected = normalizeText(expected, targetLanguage);
    
    // Chinese: convert characters to pinyin for proper matching (same logic as calculateMatchPercentage)
    if (targetLanguage === 'CH') {
      console.log(`🔍 CHINESE HIGHLIGHTING: spoken="${cleanSpoken}", expected="${cleanExpected}"`);
      
      // Check if spoken contains Chinese characters
      const hasChineseChars = /[\u4e00-\u9fff]/.test(cleanSpoken);
      
      if (hasChineseChars) {
        // Simple character to pinyin conversion - essential characters for taxi dialogue
        const charToPinyin: Record<string, string> = {
          '我': 'wo', '的': 'de', '名': 'ming', '字': 'zi', '是': 'shi', '戴': 'dai', '夫': 'fu',
          '谢': 'xie', '出': 'chu', '租': 'zu', '车': 'che', '司': 'si', '机': 'ji',
          '这': 'zhe', '些': 'xie', '都': 'dou', '对': 'dui', '了': 'le',
          '就': 'jiu', '去': 'qu', '试': 'shi'
        };
        
        // Convert each character to pinyin
        const spokenPinyin = Array.from(cleanSpoken)
          .map(char => charToPinyin[char] || char)
          .join(' ')
          .toLowerCase();
        
        console.log(`🔍 CONVERTED FOR HIGHLIGHTING: "${cleanSpoken}" → "${spokenPinyin}"`);
        
        // Remove tone marks from expected
        const normalizedExpected = cleanExpected.replace(/[ǎǐǒǔǚāīōūǖáíóúǘàìòùǜèéē]/g, (match) => {
          const toneMap: Record<string, string> = {
            'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
            'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
            'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
            'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
            'ǖ': 'u', 'ǘ': 'u', 'ǚ': 'u', 'ǜ': 'u',
            'è': 'e', 'é': 'e', 'ē': 'e'
          };
          return toneMap[match] || match;
        });
        
        console.log(`🔍 TONE MARK REMOVAL: "${cleanExpected}" → "${normalizedExpected}"`);
        
        // Compare pinyin words
        const spokenWords = spokenPinyin.split(/\s+/).filter(w => w.length > 0);
        const expectedWords = normalizedExpected.split(/\s+/).filter(w => w.length > 0);
        
        console.log(`🔍 WORD COMPARISON:`);
        console.log(`  - Spoken words: [${spokenWords.join(', ')}]`);
        console.log(`  - Expected words: [${expectedWords.join(', ')}]`);
        
        const matchedWords = [];
        for (const expectedWord of expectedWords) {
          const isMatch = spokenWords.includes(expectedWord);
          console.log(`  - "${expectedWord}" in spoken? ${isMatch}`);
          if (isMatch) {
            matchedWords.push(expectedWord);
          }
        }
        
        console.log(`🔍 HIGHLIGHTING RESULT: ${matchedWords.length} matched words:`, matchedWords);
        return matchedWords;
      }
      
      // If no Chinese characters, treat as pinyin input (fallback)
      // Remove tone marks for comparison
      const removeToneMarks = (text: string): string => {
        return text.replace(/[ǎǐǒǔǚāīōūǖáíóúǘàìòùǜèéē]/g, (match) => {
          const toneMap: Record<string, string> = {
            'ā': 'a', 'á': 'a', 'ǎ': 'a', 'à': 'a',
            'ī': 'i', 'í': 'i', 'ǐ': 'i', 'ì': 'i',
            'ō': 'o', 'ó': 'o', 'ǒ': 'o', 'ò': 'o',
            'ū': 'u', 'ú': 'u', 'ǔ': 'u', 'ù': 'u',
            'ǖ': 'u', 'ǘ': 'u', 'ǚ': 'u', 'ǜ': 'u',
            'è': 'e', 'é': 'e', 'ē': 'e'
          };
          return toneMap[match] || match;
        });
      };
      
      const normalizedSpoken = removeToneMarks(cleanSpoken);
      const normalizedExpected = removeToneMarks(cleanExpected);
      
      const spokenWords = normalizedSpoken.split(/\s+/).filter((w: string) => w.length > 0);
      const expectedWords = normalizedExpected.split(/\s+/).filter((w: string) => w.length > 0);
      
      const matchedWords = [];
      for (const expectedWord of expectedWords) {
        if (spokenWords.includes(expectedWord)) {
          matchedWords.push(expectedWord);
        }
      }
      
      return matchedWords;
    }

    // For character-based languages (Japanese, Arabic), return character matches
    if (['ja', 'ar'].includes(targetLanguage)) {
      const spokenChars = Array.from(cleanSpoken);
      const expectedChars = Array.from(cleanExpected);
      const matchedChars = [];
      
      for (const expectedChar of expectedChars) {
        if (spokenChars.includes(expectedChar)) {
          matchedChars.push(expectedChar);
        }
      }
      
      // For highlighting purposes, return the matched characters as "words"
      return matchedChars;
    }
    
    // Word-based matching for other languages
    const spokenWords = cleanSpoken.split(/\s+/).filter(w => w.length > 0);
    const expectedWords = cleanExpected.split(/\s+/).filter(w => w.length > 0);
    
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
        
        // If AI dialogue is provided, use it instead of fetching from database
        if (aiDialogue && aiDialogue.length > 0) {
          logger.info('Using AI-generated dialogue', { count: aiDialogue.length, dialogueId });
          
          console.log("🤖 Processing AI dialogue:", aiDialogue);
          console.log("🤖 AI dialogue steps:", aiDialogue.map((step, index) => ({
            step: index + 1,
            speaker: step.speaker,
            text: step.text.substring(0, 50) + '...',
            translation: step.translation.substring(0, 50) + '...'
          })));
          
          // Convert AI dialogue to DialoguePhrase format
          const convertedPhrases: DialoguePhrase[] = aiDialogue.map((step, index) => {
            // Create base phrase object
            const phrase: DialoguePhrase = {
              id: -(index + 1), // Use negative IDs for AI dialogues to avoid conflicts
              dialogue_id: dialogueId,
              dialogue_step: index + 1,
              speaker: step.speaker
            };
            
                         // Set text in target language column
             const targetColumn = `${targetLanguage.toLowerCase()}_text`;
             const motherColumn = `${motherLanguage.toLowerCase()}_text`;
             const transcriptionColumn = `${targetLanguage.toLowerCase()}_text_${motherLanguage.toLowerCase()}`;
             
             phrase[targetColumn] = step.text;
             phrase[motherColumn] = step.translation;
             phrase[transcriptionColumn] = step.transliteration;
             
             // Also set common columns for compatibility
             phrase.en_text = targetLanguage === 'en' ? step.text : (motherLanguage === 'en' ? step.translation : step.text);
             phrase.ru_text = targetLanguage === 'ru' ? step.text : (motherLanguage === 'ru' ? step.translation : step.text);
             phrase.en_text_ru = targetLanguage === 'en' ? step.transliteration : (targetLanguage === 'ru' ? step.transliteration : '');
             phrase.ru_text_en = targetLanguage === 'ru' ? step.transliteration : (motherLanguage === 'ru' ? step.transliteration : '');
             
             console.log(`🔧 AI Dialogue Step ${index + 1} conversion:`, {
               speaker: step.speaker,
               targetColumn,
               motherColumn,
               transcriptionColumn,
               originalText: step.text,
               translation: step.translation,
               transliteration: step.transliteration,
               finalPhrase: phrase
             });
            
            return phrase;
          });
          
          // Update dialoguesRef immediately
          dialoguesRef.current = convertedPhrases;
          console.log("Updated dialoguesRef with AI dialogue", convertedPhrases.length, "phrases");
          
          // Update state
          setDialogues(convertedPhrases);
          
          // Initialize conversation if not already initialized
          if (!dialogInitialized.current && !conversationInitializedRef.current) {
            dialogInitialized.current = true;
            initializeConversation(convertedPhrases);
          }
          
          setIsLoading(false);
          return;
        }
        
        // Original database fetching logic
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
          console.log(`🔍 DATABASE DEBUG: All available dialogues from fetch for dialogue_id ${dialogueId}:`);
          console.log(`🔍 Target language: ${targetLanguage}, Mother language: ${motherLanguage}`);
          console.log(`🔍 Available columns in first row:`, Object.keys(data[0]));
          console.log(`🔍 ALL columns:`, Object.keys(data[0]));
          
          // Check specifically for Chinese columns
          const chineseColumns = Object.keys(data[0]).filter(key => key.toLowerCase().includes('ch'));
          console.log(`🔍 CHINESE COLUMNS FOUND:`, chineseColumns);
          
          // Log the actual content of Chinese-related columns
          console.log(`🔍 CHINESE COLUMN CONTENTS for first phrase:`);
          chineseColumns.forEach(col => {
            console.log(`  - ${col}: "${data[0][col]}"`);
          });
          
          data.forEach(d => {
            console.log(`🔍 PHRASE ${d.id} (Step ${d.dialogue_step}, ${d.speaker}):`);
            console.log(`  - ch_text: "${d.ch_text}"`);
            console.log(`  - en_text: "${d.en_text}"`);
            console.log(`  - ru_text: "${d.ru_text}"`);
            
            const targetText = getTextInLanguage(d, targetLanguage);
            const transcription = getTranscription(d, targetLanguage, motherLanguage);
            console.log(`  - Final target text: "${targetText}"`);
            console.log(`  - Final transcription: "${transcription}"`);
          });
          
          // 🔍 ENHANCED DEBUGGING: Focus on User phrases specifically
          const userPhrases = data.filter(d => d.speaker === 'User');
          console.log(`🔍 USER PHRASES ANALYSIS:`);
          userPhrases.forEach((phrase, index) => {
            console.log(`  User Phrase ${index + 1} (Step ${phrase.dialogue_step}):`);
            const chText = phrase.ch_text as string;
            console.log(`    - Raw ch_text: "${chText}"`);
            console.log(`    - Contains Chinese chars: ${/[\u4e00-\u9fff]/.test(chText || '')}`);
            
            if (chText && typeof chText === 'string') {
              const chineseChars = Array.from(chText).filter(char => /[\u4e00-\u9fff]/.test(char));
              console.log(`    - Chinese characters: [${chineseChars.join(', ')}]`);
              
              // Check mapping coverage for this phrase
              const charToPinyin: Record<string, string> = {
                '我': 'wo', '的': 'de', '名': 'ming', '字': 'zi', '是': 'shi', '戴': 'dai', '夫': 'fu',
                '谢': 'xie', '出': 'chu', '租': 'zu', '车': 'che', '司': 'si', '机': 'ji',
                '这': 'zhe', '些': 'xie', '都': 'dou', '对': 'dui', '了': 'le',
                '就': 'jiu', '去': 'qu', '试': 'shi'
              };
              
              const unmappedChars = chineseChars.filter(char => !(char in charToPinyin));
              if (unmappedChars.length > 0) {
                console.log(`    ⚠️ UNMAPPED CHARACTERS: [${unmappedChars.join(', ')}]`);
                console.log(`    ⚠️ These characters need to be added to charToPinyin mapping!`);
              } else {
                console.log(`    ✅ All characters are mapped`);
              }
            }
            
            console.log(`    - Transcription: "${getTranscription(phrase, targetLanguage, motherLanguage)}"`);
          });
          
          // Update dialoguesRef immediately
          dialoguesRef.current = data;
          console.log("Updated dialoguesRef with", data.length, "phrases");
        }
        
        // Update state
      setDialogues(data || []);
          
        // Only initialize conversation if not already initialized
        if (data && data.length > 0 && !dialogInitialized.current && !conversationInitializedRef.current) {
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
  }, [characterId, dialogueId, aiDialogue]); // Add dialogueId and aiDialogue to dependency array

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
    
    // Debug: Log all phrases to see their structure
    console.log("All phrases for debugging:", phrases.map(p => ({
      id: p.id,
      dialogue_step: p.dialogue_step,
      speaker: p.speaker,
      text: p.en_text || p.ru_text || 'no text'
    })));
    
    const firstPhrase = phrases.find(p => p.dialogue_step === 1 && p.speaker === 'NPC');
    console.log("Found first NPC phrase:", firstPhrase);
    
    if (!firstPhrase) {
      console.error("❌ No first NPC phrase found! Available phrases:", phrases.map(p => ({
        id: p.id,
        step: p.dialogue_step,
        speaker: p.speaker
      })));
      
      // Try to find any NPC phrase as fallback
      const anyNpcPhrase = phrases.find(p => p.speaker === 'NPC');
      if (anyNpcPhrase) {
        console.warn("⚠️ Using first available NPC phrase as fallback:", anyNpcPhrase);
        // Temporarily use this phrase but adjust its step to 1
        const fallbackPhrase = { ...anyNpcPhrase, dialogue_step: 1 };
        // Continue with fallback phrase
        initializeWithPhrase(fallbackPhrase, phrases);
        return;
      } else {
        console.error("❌ No NPC phrases found at all!");
        return;
      }
    }
    
    initializeWithPhrase(firstPhrase, phrases);
  };
  
  const initializeWithPhrase = (firstPhrase: DialoguePhrase, phrases: DialoguePhrase[]) => {
    // Mark as initialized immediately to prevent duplicate initializations
    conversationInitializedRef.current = true;
    
    // Clear any existing conversation history to prevent duplicates
    setConversationHistory([]);
    
    // Select correct language version of text based on user's target language
    const phrase = getTextInLanguage(firstPhrase, targetLanguage);
    
    // Select transcription based on user's mother language and target language
    const transcription = getTranscription(firstPhrase, targetLanguage, motherLanguage);
    
    // Select translation based on user's mother language
    const translation = getTextInLanguage(firstPhrase, motherLanguage);
    
    console.log("🚀 Initializing conversation with first NPC phrase:", {
      id: firstPhrase.id,
      phrase,
      transcription,
      translation
    });
      
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
            const userPhraseText = getTextInLanguage(userPhrase, targetLanguage);
            const userTranscription = getTranscription(userPhrase, targetLanguage, motherLanguage);
            const userTranslation = getTextInLanguage(userPhrase, motherLanguage);
            
            console.log("🚀 Adding first user phrase:", {
              id: userPhrase.id,
              phrase: userPhraseText,
              step: 2
            });
            
            // Add user phrase to conversation history
            setConversationHistory(prev => {
              // Check if this phrase already exists to prevent duplicates
              const exists = prev.find(entry => entry.id === userPhrase.id);
              if (exists) {
                console.warn("⚠️ User phrase already exists, skipping:", userPhrase.id);
                return prev;
              }
              
              return [
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
              ];
            });
            
            // Set current step to this user phrase
            setCurrentStep(2);
            console.log("Added user phrase:", userPhraseText);
            
            // Enable input for user to speak
            setIsInputEnabled(true);
            
            // Clear ALL speech recognition state
            setTranscript("");
            setHighlightedWords([]);
            setRecognitionAttempts(0);
            setRecognitionConfidence(0);
            
            // Start listening with a slight delay
            setTimeout(() => {
              console.log("INIT: Starting speech recognition for first user phrase");
              
              // Stop any existing recognition first
              if (recognitionRef.current) {
                try {
                  recognitionRef.current.stop();
                } catch (e) {
                  console.log("No existing recognition to stop");
                }
              }
              
              setIsListening(true);
              
              // Directly start recognition
              setTimeout(() => {
                if (recognitionRef.current && !isListening) {
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
    
    // CLEAR PREVIOUS SPEECH RECOGNITION STATE
    setTranscript("");
    setHighlightedWords([]);
    setRecognitionAttempts(0);
    setRecognitionConfidence(0);
    
    // Format the user phrase with proper language settings
    const phrase = getTextInLanguage(userPhrase, targetLanguage);
    
    // Select transcription based on the target language
    const transcription = getTranscription(userPhrase, targetLanguage, motherLanguage);
    
    const translation = getTextInLanguage(userPhrase, motherLanguage);
    
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
      
      const phrase = getTextInLanguage(nextStepPhrase, targetLanguage);
      const transcription = getTranscription(nextStepPhrase, targetLanguage, motherLanguage);
      const translation = getTextInLanguage(nextStepPhrase, motherLanguage);
        
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
        console.error('🔊 DIALOGUE playAudio: Empty text provided');
        return;
      }
      
      // Check if speech synthesis is available
      if (!window.speechSynthesis) {
        console.error('🔊 DIALOGUE Speech synthesis not available');
        return;
      }
      
      // Function to actually play the audio once voices are ready
      const performSpeech = () => {
        const voices = window.speechSynthesis.getVoices() || [];
        const targetLangCode = getRecognitionLanguage(targetLanguage);
        
        console.log('🔊 DIALOGUE playAudio DEBUG:', {
          text,
          targetLanguage,
          targetLangCode,
          voicesAvailable: voices.length,
          allVoices: voices.map(v => ({ name: v.name, lang: v.lang }))
        });
        
        // Cancel any existing speech
        window.speechSynthesis.cancel();
        
        // Create the utterance
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = targetLangCode;
        
        // Try to find an appropriate voice for the target language
        const matchingVoices = voices.filter(voice => 
          voice.lang.toLowerCase().startsWith(targetLanguage.toLowerCase()) ||
          voice.lang.toLowerCase().startsWith(targetLangCode.split('-')[0])
        );
        
        if (matchingVoices.length > 0) {
          utterance.voice = matchingVoices[0];
          console.log('🔊 DIALOGUE Selected voice:', matchingVoices[0].name, matchingVoices[0].lang);
        } else {
          console.warn('🔊 DIALOGUE No matching voice found for', targetLanguage, 'using default voice');
        }
        
        // Set speech rate and pitch for better clarity
        utterance.rate = 0.8; // Slightly slower for language learning
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Add error handling
        utterance.onerror = (event) => {
          console.error('🔊 DIALOGUE Speech synthesis error:', event);
          setIsNpcSpeaking(false);
          if (typeof onNpcSpeakEnd === 'function') onNpcSpeakEnd();
        };
        
        // Set up event handlers
        utterance.onstart = () => {
          console.log('🔊 DIALOGUE Speech synthesis started');
          setIsNpcSpeaking(true);
          if (typeof onNpcSpeakStart === 'function') onNpcSpeakStart();
        };
        
        utterance.onend = () => {
          console.log('🔊 DIALOGUE Speech synthesis ended successfully');
          setIsNpcSpeaking(false);
          if (typeof onNpcSpeakEnd === 'function') onNpcSpeakEnd();
        };
        
        // Start speaking
        console.log('🔊 DIALOGUE Starting speech synthesis...');
        window.speechSynthesis.speak(utterance);
        logger.info('Playing audio', { text, language: utterance.lang });
      };
      
      // Check if voices are already loaded
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Voices are ready, play immediately
        performSpeech();
      } else {
        // Voices not loaded yet, wait for them
        console.log('🔊 DIALOGUE Waiting for voices to load...');
        
        const handleVoicesChanged = () => {
          console.log('🔊 DIALOGUE Voices loaded, attempting speech');
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          performSpeech();
        };
        
        window.speechSynthesis.addEventListener('voiceschanged', handleVoicesChanged);
        
        // Fallback: try after a delay even if voiceschanged doesn't fire
        setTimeout(() => {
          window.speechSynthesis.removeEventListener('voiceschanged', handleVoicesChanged);
          performSpeech();
        }, 1000);
      }
      
    } catch (error) {
      console.error('🔊 DIALOGUE Failed to play audio:', error);
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
    
    // CLEAR ALL SPEECH RECOGNITION STATE
    setTranscript("");
    setHighlightedWords([]);
    setRecognitionAttempts(0);
    setRecognitionConfidence(0);
    
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
            const userPhrase = getTextInLanguage(nextDialogue, targetLanguage);
            const userTranscription = getTranscription(nextDialogue, targetLanguage, motherLanguage);
            const userTranslation = getTextInLanguage(nextDialogue, motherLanguage);
            
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
        <span 
          className="selectable-phrase" 
          onMouseMove={handleMouseMove}
          dir={targetLanguage === 'ar' ? 'rtl' : 'ltr'}
          lang={targetLanguage}
        >
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
      return (
        <span 
          className="selectable-phrase"
          dir={targetLanguage === 'ar' ? 'rtl' : 'ltr'}
          lang={targetLanguage}
        >
          {phrase || "..."}
        </span>
      );
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
    
    // CLEAR ALL SPEECH RECOGNITION STATE
    setTranscript("");
    setHighlightedWords([]);
    setRecognitionAttempts(0);
    setRecognitionConfidence(0);
    
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
    
    // STEP 3: Format and add NPC phrase with half-second delay
    const npcPhrase = getTextInLanguage(nextNpcPhrase, targetLanguage);
    const npcTranscription = getTranscription(nextNpcPhrase, targetLanguage, motherLanguage);
    const npcTranslation = getTextInLanguage(nextNpcPhrase, motherLanguage);
    
    // Add half-second delay before showing NPC response
    setTimeout(() => {
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
          const userPhrase = getTextInLanguage(nextUserPhrase, targetLanguage);
          const userTranscription = getTranscription(nextUserPhrase, targetLanguage, motherLanguage);
          const userTranslation = getTextInLanguage(nextUserPhrase, motherLanguage);
          
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
        // CLEAR STATE BEFORE STARTING NEW RECOGNITION
        setTranscript("");
        setHighlightedWords([]);
        setRecognitionAttempts(0);
        setRecognitionConfidence(0);
        
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
      console.log(`Step ${d.dialogue_step}: ${d.speaker} - ${getTextInLanguage(d, targetLanguage)}`);
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
    // Progress tracking is now handled by VocalQuizComponent after quiz completion
    // This prevents duplicate tracking of the same dialogue
    if (passed && !user?.id) {
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
                  <div 
                    className="dialogue-phrase" 
                    dir={targetLanguage === 'ar' ? 'rtl' : 'ltr'}
                    lang={targetLanguage}
                  >
                    {isCurrentUserPhrase ? 
                      renderHighlightedPhrase(entry.phrase, highlightedWords) : 
                      renderHighlightedPhrase(entry.phrase, []) // Use the same function for consistency, with empty highlights
                    }
                    {isCurrentUserPhrase && isListening && (
                      <span className="listening-indicator">🎤</span>
                    )}
                  </div>
                  <div 
                    className="dialogue-transcription"
                    dir={motherLanguage === 'ar' ? 'rtl' : 'ltr'}
                    lang={motherLanguage}
                  >
                    [{entry.transcription}]
                  </div>
                  <div 
                    className="dialogue-translation"
                    dir={motherLanguage === 'ar' ? 'rtl' : 'ltr'}
                    lang={motherLanguage}
                  >
                    {entry.translation}
                  </div>
                  
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
  // Test Japanese character normalization
  window.testJapaneseMatching = function(spoken: string, expected: string) {
    console.log('🧪 TESTING JAPANESE MATCHING:');
    
    const normalizeJapanese = (text: string): string => {
      let normalized = text.toLowerCase().trim();
      normalized = normalized.replace(/[.,?!;:]/g, '');
      
      // Convert full-width to half-width
      normalized = normalized.replace(/[Ａ-Ｚａ-ｚ０-９]/g, (s) => 
        String.fromCharCode(s.charCodeAt(0) - 0xFEE0)
      );
      
      // Convert katakana to hiragana for better matching
      normalized = normalized.replace(/[\u30A1-\u30F6]/g, (s) => 
        String.fromCharCode(s.charCodeAt(0) - 0x60)
      );
      
      // Normalize spaces in Japanese
      normalized = normalized.replace(/\s+/g, '');
      return normalized;
    };
    
    const cleanSpoken = normalizeJapanese(spoken);
    const cleanExpected = normalizeJapanese(expected);
    
    console.log('Original spoken:', spoken);
    console.log('Original expected:', expected);
    console.log('Normalized spoken:', cleanSpoken);
    console.log('Normalized expected:', cleanExpected);
    
    const spokenChars = Array.from(cleanSpoken);
    const expectedChars = Array.from(cleanExpected);
    
    console.log('Spoken chars:', spokenChars);
    console.log('Expected chars:', expectedChars);
    
    let matchedChars = 0;
    const spokenCharSet = new Set(spokenChars);
    
    for (const expectedChar of expectedChars) {
      if (spokenCharSet.has(expectedChar)) {
        matchedChars++;
        console.log(`✅ Matched: "${expectedChar}"`);
      } else {
        console.log(`❌ Missing: "${expectedChar}"`);
      }
    }
    
    const charMatchPercentage = (matchedChars / expectedChars.length) * 100;
    console.log(`📊 Final result: ${matchedChars}/${expectedChars.length} = ${charMatchPercentage}%`);
    
    return Math.round(charMatchPercentage);
  };
  
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