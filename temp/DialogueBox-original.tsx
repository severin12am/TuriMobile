// src/components/DialogueBox.tsx
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../services/supabase"; // Import shared client
import { useStore } from "../store";
import { logger } from "../services/logger";
import "./DialogueBox.css";

/**
 * Props for the DialogueBox component
 * @interface DialogueBoxProps
 * @property {number} characterId - The ID of the character the user is talking to
 * @property {() => void} onClose - Callback function to close the dialogue
 * @property {number} distance - Current distance between player and character (used to automatically close dialogue)
 */
interface DialogueBoxProps {
  characterId: number;
  onClose: () => void;
  distance: number;
}

/**
 * Structure of dialogue phrases as stored in Supabase tables (1_phrases, 2_phrases, etc.)
 * @interface DialoguePhrase
 * @property {number} id - Unique ID of the phrase
 * @property {number} dialogue_id - ID of the dialogue this phrase belongs to
 * @property {number} dialogue_step - Sequence number of this phrase in the dialogue
 * @property {string} speaker - Who says this phrase ('User' or 'NPC')
 * @property {string} english_text - The phrase text in English
 * @property {string} phonetic_text_en - English pronunciation guide in Latin alphabet
 * @property {string} russian_text - The phrase text in Russian
 * @property {string} phonetic_text_ru - Russian pronunciation guide in Cyrillic alphabet
 */
interface DialoguePhrase {
  id: number;
  dialogue_id: number;
  dialogue_step: number;
  speaker: string;
  english_text: string;
  phonetic_text_en: string;
  russian_text: string;
  phonetic_text_ru: string;
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
 * 
 * @component
 */
const DialogueBox: React.FC<DialogueBoxProps> = ({
  characterId,
  onClose,
  distance,
}) => {
  // State variables for dialogue management
  const [dialogues, setDialogues] = useState<DialoguePhrase[]>([]); // Raw dialogue data from database
  const [currentStep, setCurrentStep] = useState(1); // Current step in conversation
  const [conversationHistory, setConversationHistory] = useState<ConversationEntry[]>([]); // Displayed conversation
  const [isLoading, setIsLoading] = useState(true); // Loading state while fetching dialogues
  const [isInputEnabled, setIsInputEnabled] = useState(false); // Whether user can speak/confirm
  const [spokenEntries, setSpokenEntries] = useState<number[]>([]); // Track entries that have been spoken
  
  // Get language settings from global store
  const { 
    motherLanguage, // Language user already knows (en/ru)
    targetLanguage, // Language user is learning (en/ru)
    user            // Current user data
  } = useStore();

  /**
   * Effect hook to automatically close dialogue when player moves too far from character
   */
  useEffect(() => {
    if (distance > 1) {
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
        const sourceTable = `${characterId}_phrases`;
        
        const { data, error } = await supabase
          .from(sourceTable)
          .select('*')
          .eq('dialogue_id', 1)
          .order('dialogue_step', { ascending: true });

        if (error) {
          logger.error('Error fetching dialogues', { error, characterId });
          setIsLoading(false);
          return;
        }

        logger.info('Dialogues fetched successfully', { count: data?.length });
        setDialogues(data || []);
        
        if (data && data.length > 0) {
          initializeConversation(data);
        }
        
        setIsLoading(false);
      } catch (error) {
        logger.error('Failed to fetch dialogues', { error, characterId });
        setIsLoading(false);
      }
    };

    fetchDialogues();
  }, [characterId]);

  /**
   * Initializes the conversation with first NPC dialogue
   */
  const initializeConversation = (phrases: DialoguePhrase[]) => {
    // Find the first phrase spoken by NPC at step 1
    const firstPhrase = phrases.find(p => p.dialogue_step === 1 && p.speaker === 'NPC');
    
    if (firstPhrase) {
      // Select correct language version of text based on user's target language
      const phrase = targetLanguage === 'en' ? firstPhrase.english_text : firstPhrase.russian_text;
      
      // Select transcription based on user's mother language
      const transcription = motherLanguage === 'en' 
        ? firstPhrase.phonetic_text_en 
        : firstPhrase.phonetic_text_ru;
      
      // Select translation based on user's mother language
      const translation = motherLanguage === 'en' 
        ? firstPhrase.english_text 
        : firstPhrase.russian_text;
      
      // Set first NPC phrase in conversation history
      setConversationHistory([{
        id: firstPhrase.id,
        step: 1,
        speaker: 'NPC',
        phrase,
        transcription,
        translation,
        isCompleted: true
      }]);

      // Mark as spoken and play NPC audio after a short delay
      setTimeout(() => {
        setSpokenEntries([firstPhrase.id]);
        playAudio(phrase);
      }, 300);
      
      // Find the user's first response phrase (step 2)
      const nextUserPhrase = phrases.find(p => p.dialogue_step === 2 && p.speaker === 'User');
      if (nextUserPhrase) {
        // Prepare user phrase with proper language formatting
        const userPhrase = targetLanguage === 'en' ? nextUserPhrase.english_text : nextUserPhrase.russian_text;
        const userTranscription = motherLanguage === 'en' 
          ? nextUserPhrase.phonetic_text_en 
          : nextUserPhrase.phonetic_text_ru;
        const userTranslation = motherLanguage === 'en'
          ? nextUserPhrase.english_text 
          : nextUserPhrase.russian_text;
          
        // Add user phrase to conversation history (not completed yet)
        setTimeout(() => {
          setConversationHistory(prev => [...prev, {
            id: nextUserPhrase.id,
            step: 2,
            speaker: 'User',
            phrase: userPhrase,
            transcription: userTranscription,
            translation: userTranslation,
            isCompleted: false
          }]);
          
          // Set current step to user input and enable input field
          setCurrentStep(2);
          setIsInputEnabled(true);
        }, 1000); // Slight delay for sequential appearance
      }
    }
  };

  /**
   * Handles the completion of the current phrase and advances to the next
   */
  const handlePhraseCompletion = () => {
    // Mark current phrase as completed in conversation history
    setConversationHistory(prev => 
      prev.map(entry => 
        entry.step === currentStep ? { ...entry, isCompleted: true } : entry
      )
    );
    
    // Disable input while NPC responds
    setIsInputEnabled(false);
    
    // Find next NPC phrase
    const nextStep = currentStep + 1;
    const nextNpcPhrase = dialogues.find(p => p.dialogue_step === nextStep && p.speaker === 'NPC');
    
    if (nextNpcPhrase) {
      // Get phrase in target language for NPC
      const phrase = targetLanguage === 'en' ? nextNpcPhrase.english_text : nextNpcPhrase.russian_text;
      
      // Add delay before NPC response
      const delay = Math.max(phrase.length * 30, 400);
      
      setTimeout(() => {
        // Format NPC response with proper language settings
        const transcription = motherLanguage === 'en' 
          ? nextNpcPhrase.phonetic_text_en 
          : nextNpcPhrase.phonetic_text_ru;
        const translation = motherLanguage === 'en' 
          ? nextNpcPhrase.english_text 
          : nextNpcPhrase.russian_text;
        
        // Add NPC response to conversation history
        setConversationHistory(prev => [...prev, {
          id: nextNpcPhrase.id,
          step: nextStep,
          speaker: 'NPC',
          phrase,
          transcription,
          translation,
          isCompleted: true
        }]);

        // Play NPC audio only once and mark as spoken
        setSpokenEntries(prev => [...prev, nextNpcPhrase.id]);
        playAudio(phrase);
        
        // Check if there's a next user phrase to input
        const nextUserStep = nextStep + 1;
        const nextUserPhrase = dialogues.find(p => p.dialogue_step === nextUserStep && p.speaker === 'User');
        
        if (nextUserPhrase) {
          // Format next user phrase with proper language settings
          const userPhrase = targetLanguage === 'en' ? nextUserPhrase.english_text : nextUserPhrase.russian_text;
          const userTranscription = motherLanguage === 'en' 
            ? nextUserPhrase.phonetic_text_en 
            : nextUserPhrase.phonetic_text_ru;
          const userTranslation = motherLanguage === 'en' 
            ? nextUserPhrase.english_text 
            : nextUserPhrase.russian_text;
          
          // Add next user phrase to conversation history (not completed yet)
          setTimeout(() => {
            setConversationHistory(prev => [...prev, {
              id: nextUserPhrase.id,
              step: nextUserStep,
              speaker: 'User',
              phrase: userPhrase,
              transcription: userTranscription,
              translation: userTranslation,
              isCompleted: false
            }]);
            
            // Update step and enable input for next user phrase
            setCurrentStep(nextUserStep);
            setIsInputEnabled(true);
          }, 1000); // Slight delay for sequential appearance
        } else {
          // No more user phrases - end of conversation
          logger.info('Conversation complete', { characterId });
          setTimeout(() => onClose(), 3000); // Close after 3 seconds
        }
      }, delay);
    } else {
      // No more NPC phrases - end of conversation
      logger.info('Conversation complete - no more phrases', { characterId });
      setTimeout(() => onClose(), 3000); // Close after 3 seconds
    }
  };

  /**
   * Plays audio for a given text using browser's Speech Synthesis API
   */
  const playAudio = (text: string) => {
    try {
      // Create utterance with the text to speak
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Set language based on target language setting
      utterance.lang = targetLanguage === 'en' ? 'en-US' : 'ru-RU';
      
      // Play the audio
      window.speechSynthesis.speak(utterance);
      logger.info('Playing audio', { text, language: utterance.lang });
    } catch (error) {
      logger.error('Failed to play audio', { error });
    }
  };

  /**
   * Allows user to go back to the previous dialogue step
   */
  const handleGoBack = () => {
    // Find all completed user phrases, sorted by step (descending)
    const completedUserPhrases = conversationHistory
      .filter(entry => entry.speaker === 'User' && entry.isCompleted)
      .sort((a, b) => b.step - a.step);
    
    // If there's at least one completed user phrase, go back to it
    if (completedUserPhrases.length > 0) {
      const lastCompletedUserPhrase = completedUserPhrases[0];
      const newStep = lastCompletedUserPhrase.step;
      
      // Remove all entries after this step and mark this step as not completed
      setConversationHistory(prev => 
        prev.filter(entry => entry.step <= newStep)
          .map(entry => 
            entry.step === newStep ? { ...entry, isCompleted: false } : entry
          )
      );
      
      // Reset to this step and enable input again
      setCurrentStep(newStep);
      setIsInputEnabled(true);
    }
  };

  /**
   * Loading state - Shows while dialogues are being fetched from Supabase
   */
  if (isLoading) {
    return (
      <div className="dialogue-box-container">
        <div className="dialogue-loading">Loading...</div>
      </div>
    );
  }

  /**
   * Error state - Shows when no dialogues were found for this character
   */
  if (dialogues.length === 0) {
    return (
      <div className="dialogue-box-container">
        <div className="dialogue-error">
          No dialogues found.
          <button onClick={onClose} className="close-button">✕</button>
        </div>
      </div>
    );
  }

  /**
   * Main dialogue box render - Shows sequence of dialogue boxes
   */
  return (
    <div className="dialogue-box-container">
      {/* Render each conversation entry as a separate dialogue box */}
      {conversationHistory.map((entry, index) => {
        const isLatest = index === conversationHistory.length - 1;
        
        return (
          <div 
            key={`${entry.speaker}-${entry.step}-${index}`}
            className={`dialogue-box-entry ${!isLatest ? 'slide-up' : ''}`}
          >
            <div className={`dialogue-entry ${entry.speaker.toLowerCase()}`}>
              {/* Entry content */}
              <div className="dialogue-content">
                <div className="dialogue-phrase">{entry.phrase}</div>
                <div className="dialogue-transcription">[{entry.transcription}]</div>
                <div className="dialogue-translation">{entry.translation}</div>
              </div>
              
              {/* Entry buttons */}
              <div className="dialogue-buttons">
                {/* For current user phrase that isn't completed, show check button */}
                {!entry.isCompleted && entry.speaker === 'User' && isInputEnabled && entry.step === currentStep && (
                  <button 
                    className="small-button"
                    onClick={handlePhraseCompletion}
                    title="I've spoken this phrase"
                  >
                    ✓
                  </button>
                )}
                
                {/* For NPC phrases, show sound button */}
                {entry.speaker === 'NPC' && (
                  <button 
                    className="sound-button"
                    onClick={() => playAudio(entry.phrase)}
                    title="Play audio"
                  >
                    🔊
                  </button>
                )}
              </div>
            </div>
            
            {/* Only show controls in the latest dialogue box */}
            {isLatest && (
              <div className="dialogue-controls">
                <button 
                  className="return-button"
                  onClick={handleGoBack}
                  disabled={conversationHistory.filter(e => e.speaker === 'User' && e.isCompleted).length === 0}
                  title="Go back to previous step"
                >
                  ↩
                </button>
                <button className="close-button" onClick={onClose} title="Close dialogue">
                  ✕
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DialogueBox;