import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { logger } from '../services/logger';
import { Lock, Check, PlayCircle, X, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { getCompletedDialogues } from '../services/auth';
import AppPanel from './AppPanel';
import { PanelBackdrop } from './AppPanel';
import { PanelTitle, PanelButton } from './PanelElements';
import AIDialogueModal from './AIDialogueModal';
import { AIDialogueStep } from '../services/gemini';



// Import centralized translations
import { getTranslation } from '../constants/translations';

interface DialogueSelectionPanelProps {
  characterId: number;
  onDialogueSelect: (dialogueId: number) => void;
  onAIDialogueSelect: (dialogueId: number, aiDialogue: AIDialogueStep[]) => void;
  onClose: () => void;
}

interface DialogueProgress {
  dialogue_id: number;
  completed: boolean;
  score?: number;
}

const DialogueSelectionPanel: React.FC<DialogueSelectionPanelProps> = ({
  characterId,
  onDialogueSelect,
  onAIDialogueSelect,
  onClose
}) => {
  const [availableDialogues, setAvailableDialogues] = useState<number[]>([]);
  const [completedDialogues, setCompletedDialogues] = useState<DialogueProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAIModal, setShowAIModal] = useState(false);
  const [selectedDialogueForAI, setSelectedDialogueForAI] = useState<number | null>(null);
  const [dialogueWords, setDialogueWords] = useState<Record<number, string[]>>({});
  
  const { user, motherLanguage, targetLanguage } = useStore();
  
  // Use centralized translation system
  
  // Function to fetch words for dialogues (for AI generation)
  const fetchDialogueWords = async (dialogueIds: number[]) => {
    try {
      const wordsMap: Record<number, string[]> = {};
      
      for (const dialogueId of dialogueIds) {
        const { data: words, error } = await supabase
          .from('words_quiz')
          .select('*')
          .eq('dialogue_id', dialogueId);
          
        if (!error && words) {
          // Get the appropriate language column
          const getLanguageColumn = (lang: string): string => {
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
              'ja': 'entry_in_ja',
              'av': 'entry_in_av'
            };
            return columnMap[lang] || 'entry_in_en';
          };
          
          const targetColumn = getLanguageColumn(targetLanguage);
          const targetWords = words
            .map(word => word[targetColumn])
            .filter(word => word && word.trim())
            .map(word => word.trim());
            
          wordsMap[dialogueId] = targetWords;
        }
      }
      
      setDialogueWords(wordsMap);
    } catch (error) {
      logger.error('Error fetching dialogue words', { error });
    }
  };
  
  // Move fetchDialogues outside useEffect so we can reuse it
  const fetchDialogues = async () => {
    setIsLoading(true);
    
    try {
      // Changed from 'dialogue_phrases' to `phrases_${characterId}`
      const sourceTable = `phrases_${characterId}`;
      
      // Fetch all unique dialogue IDs for this character
      const { data: dialogueData, error } = await supabase
        .from(sourceTable)
        .select('dialogue_id');
        
      if (error) {
        logger.error('Error fetching dialogues', { error });
        setError('Failed to fetch dialogues');
        return;
      }
      
      // Extract and sort unique dialogue IDs
      const uniqueDialogueIds = [...new Set(dialogueData?.map(item => item.dialogue_id) || [])]
        .sort((a, b) => a - b);
        
      setAvailableDialogues(uniqueDialogueIds);
      
      // Fetch words for each dialogue for AI generation
      await fetchDialogueWords(uniqueDialogueIds);
      
      // Fetch user progress if logged in
      if (user?.id) {
        try {
          // Get progress from language_levels instead of user_progress
          const { data: languageLevel, error: progressError } = await supabase
            .from('language_levels')
            .select('*')
            .eq('user_id', user.id)
            .single();
          
          if (progressError) {
            logger.error('Error fetching language level', { error: progressError });
            setCompletedDialogues([]);
            return;
          }
          
          // Use dialogue_number if available, otherwise fall back to word_progress
          let highestCompletedDialogue = 0;
          
          if (languageLevel) {
            if (languageLevel.dialogue_number && languageLevel.dialogue_number > 0) {
              highestCompletedDialogue = languageLevel.dialogue_number;
            } else if (languageLevel.word_progress > 0) {
              // For backward compatibility, estimate dialogue number from word progress
              highestCompletedDialogue = Math.max(1, Math.floor(languageLevel.word_progress / 7));
            }
          }
          
          if (highestCompletedDialogue > 0) {
            // Convert to our DialogueProgress format
            const progressData: DialogueProgress[] = [];
            
            // Mark all dialogues up to highestCompletedDialogue as completed
            for (let i = 1; i <= highestCompletedDialogue; i++) {
              progressData.push({
                dialogue_id: i,
                completed: true,
                score: 100 // Default score since we don't track per dialogue scores
              });
            }
            
            setCompletedDialogues(progressData);
          } else {
            // No progress
            setCompletedDialogues([]);
          }
        } catch (progressError) {
          logger.error('Error processing user progress', { error: progressError });
          // Still continue with empty progress
          setCompletedDialogues([]);
        }
      } else {
        // If no user is logged in, check local storage for anonymous progress
        try {
          const { getAnonymousProgress } = await import('../services/auth');
          const anonymousProgress = getAnonymousProgress();
          
          if (anonymousProgress && anonymousProgress.dialogues) {
            // Convert to our DialogueProgress format
            const progressData = anonymousProgress.dialogues.map((item: any) => ({
              dialogue_id: item.dialogueId,
              completed: item.completed,
              score: item.score
            }));
            
            setCompletedDialogues(progressData);
          } else {
            setCompletedDialogues([]);
          }
        } catch (error) {
          logger.error('Error fetching anonymous progress', { error });
          setCompletedDialogues([]);
        }
      }
    } catch (error) {
      logger.error('Failed to fetch dialogues', { error });
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Use fetchDialogues in useEffect
  useEffect(() => {
    fetchDialogues();
  }, [characterId, user?.id]);
  
  // Check if a dialogue is unlocked
  const isDialogueUnlocked = (dialogueId: number): boolean => {
    // Always unlock the first dialogue
    if (dialogueId === 1) return true;
    
    // For other dialogues, check if the previous one is completed
    const isUnlocked = completedDialogues.some(dialogue => 
      dialogue.dialogue_id === dialogueId - 1 && dialogue.completed
    );
    
    return isUnlocked;
  };
  
  // Check if a dialogue is completed
  const isDialogueCompleted = (dialogueId: number): boolean => {
    const isCompleted = completedDialogues.some(dialogue => 
      dialogue.dialogue_id === dialogueId && dialogue.completed
    );
    
    return isCompleted;
  };
  
  // Direct click handlers
  const handleCloseClick = () => {
    console.log("Close button clicked");
    onClose();
  };

  const handleDialogueClick = (dialogueId: number) => {
    console.log("Dialogue clicked:", dialogueId);
    if (isDialogueUnlocked(dialogueId)) {
      onDialogueSelect(dialogueId);
    }
  };

  const handleAIDialogueClick = (dialogueId: number) => {
    console.log("AI Dialogue clicked:", dialogueId);
    if (isDialogueUnlocked(dialogueId)) {
      setSelectedDialogueForAI(dialogueId);
      setShowAIModal(true);
    }
  };

  const handleAIDialogueGenerated = (dialogue: AIDialogueStep[]) => {
    if (selectedDialogueForAI) {
      onAIDialogueSelect(selectedDialogueForAI, dialogue);
    }
  };

  const handleCloseAIModal = () => {
    setShowAIModal(false);
    setSelectedDialogueForAI(null);
  };
  
  // DEBUG: Function to manually mark dialogue 1 as completed
  const manuallyMarkDialogueComplete = async (dialogueId: number) => {
    try {
      if (!user?.id) {
        console.error("No user logged in, cannot mark dialogue as completed");
        return;
      }
      
      console.log(`Manually marking dialogue ${dialogueId} as completed for user ${user.id}`);
      
      // Define words per dialogue
      const dialogueWordCounts: Record<number, number> = {
        1: 7, 2: 6, 3: 7, 4: 7, 5: 7,
        6: 8, 7: 8, 8: 8, 9: 8, 10: 8
      };
      
      // Calculate word progress for this dialogue
      let totalWords = 0;
      for (let i = 1; i <= dialogueId; i++) {
        totalWords += dialogueWordCounts[i] || 7; // Default to 7 words
      }
      
      // Update language_levels table directly
      const { data, error } = await supabase
        .from('language_levels')
        .upsert({
          user_id: user.id,
          target_language: useStore.getState().targetLanguage || 'en',
          word_progress: totalWords,
          dialogue_number: dialogueId,
          level: dialogueId <= 5 ? 1 : Math.floor((dialogueId - 1) / 5) + 1,
        });
        
      if (error) {
        console.error("Failed to manually update language level:", error);
      } else {
        console.log("Successfully manually marked dialogue as completed:", data);
        
        // Refresh the dialogue list to show updated progress
        const { data: languageLevel, error: refreshError } = await supabase
          .from('language_levels')
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (refreshError) {
          console.error("Error refreshing language level data:", refreshError);
        } else {
          console.log("Refreshed language level data:", languageLevel);
          
          // Generate progress data based on word_progress
          if (languageLevel && languageLevel.word_progress > 0) {
            const progressData: DialogueProgress[] = [];
            
            // Mark all dialogues up to word_progress as completed
            for (let i = 1; i <= languageLevel.word_progress; i++) {
              progressData.push({
                dialogue_id: i,
                completed: true,
                score: 100 // Default score 
              });
            }
            
            setCompletedDialogues(progressData);
            console.log("DialogueSelectionPanel - Refreshed progress data:", progressData);
          }
        }
      }
    } catch (error) {
      console.error("Error in manual dialogue completion:", error);
    }
  };
  
  // DEBUG: Add a button to set test user
  const setTestUserAndRefresh = async () => {
    if (process.env.NODE_ENV === 'development') {
      try {
        const { setTestUser } = useStore.getState();
        setTestUser();
        console.log("Set test user and refreshing dialogue list");
        
        // Wait a moment to let the state update
        setTimeout(async () => {
          const { user } = useStore.getState();
          console.log("Current user after test user set:", user);
          
          if (user?.id) {
            const { data: refreshData, error: refreshError } = await supabase
              .from('user_progress')
              .select('dialogue_id, completed, score')
              .eq('user_id', user.id);
              
            if (refreshError) {
              console.error("Error refreshing progress data:", refreshError);
            } else {
              console.log("Refreshed progress data:", refreshData);
              setCompletedDialogues(refreshData || []);
            }
          }
        }, 500);
      } catch (error) {
        console.error("Error setting test user:", error);
      }
    }
  };
  
  return (
    <PanelBackdrop style={{ zIndex: 9999 }}>
      <div style={{ pointerEvents: 'auto' }}>
        <AppPanel width="700px" height="auto" padding={0}>
          <div className="p-4 flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-4">
              <PanelTitle className="m-0">
                {getTranslation(motherLanguage, 'selectDialogue')}
              </PanelTitle>
              <button
                onClick={fetchDialogues}
                className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                disabled={isLoading}
              >
                <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'animate-none'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                {getTranslation(motherLanguage, 'refresh')}
              </button>
            </div>
            <button
              onClick={handleCloseClick}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="p-6" style={{ pointerEvents: 'auto' }}>
            {error && (
              <div className="mb-4 p-3 bg-red-900/30 border border-red-800 text-red-200 rounded-lg">
                {error}
              </div>
            )}
            
            {isLoading ? (
              <div className="py-4 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full mx-auto mb-2"></div>
                <p className="text-white/70">{getTranslation(motherLanguage, 'loading')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {availableDialogues.map((dialogueId) => {
                  const isCompleted = isDialogueCompleted(dialogueId);
                  const isUnlocked = isDialogueUnlocked(dialogueId);
                  const hasWords = dialogueWords[dialogueId] && dialogueWords[dialogueId].length > 0;
                  
                  return (
                    <div key={dialogueId} className="space-y-2">
                      <button
                        onClick={() => handleDialogueClick(dialogueId)}
                        className={`w-full text-left relative rounded-xl p-4 transition-all duration-300 ${
                          isUnlocked 
                            ? 'bg-white/10 hover:bg-white/20 cursor-pointer' 
                            : 'bg-white/5 opacity-70 cursor-not-allowed'
                        } border border-white/10`}
                        disabled={!isUnlocked}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-medium">{getTranslation(motherLanguage, 'dialogue')} {dialogueId}</span>
                          {isCompleted ? (
                            <div className="flex items-center text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded-lg text-xs">
                              <Check size={12} className="mr-1" />
                              <span>{getTranslation(motherLanguage, 'completed')}</span>
                            </div>
                          ) : isUnlocked ? (
                            <div className="flex items-center text-blue-400 bg-blue-900/30 px-2 py-1 rounded-lg text-xs">
                              <PlayCircle size={12} className="mr-1" />
                              <span>{getTranslation(motherLanguage, 'available')}</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-400 bg-gray-900/30 px-2 py-1 rounded-lg text-xs">
                              <Lock size={12} className="mr-1" />
                              <span>{getTranslation(motherLanguage, 'locked')}</span>
                            </div>
                          )}
                        </div>
                        
                        <p className="text-white/60 text-sm">
                          {isCompleted 
                            ? getTranslation(motherLanguage, 'completedText')
                            : isUnlocked 
                              ? getTranslation(motherLanguage, 'clickToStartText')
                              : getTranslation(motherLanguage, 'completePreviousText')}
                        </p>
                      </button>
                      
                      {/* AI Generation Button */}
                      {isUnlocked && hasWords && (
                        <button
                          onClick={() => handleAIDialogueClick(dialogueId)}
                          className="w-full px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 hover:border-purple-500/50 text-purple-200 rounded-lg text-sm font-medium transition-all duration-300 flex items-center justify-center gap-2"
                        >
                          <Sparkles size={14} />
                          {getTranslation(motherLanguage, 'generateAIDialogue')}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            
            {/* Debug buttons - leave these for now */}
            {user?.id === 'dev_user_id' && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <PanelButton 
                  onClick={() => manuallyMarkDialogueComplete(1)}
                  className="w-full mb-2"
                >
                  DEBUG: Mark dialogue 1 as complete
                </PanelButton>
                <PanelButton 
                  onClick={() => manuallyMarkDialogueComplete(2)}
                  className="w-full mb-2"
                >
                  DEBUG: Mark dialogue 2 as complete
                </PanelButton>
                <PanelButton 
                  onClick={setTestUserAndRefresh}
                  className="w-full"
                >
                  DEBUG: Set dev user
                </PanelButton>
              </div>
            )}
          </div>
        </AppPanel>
      </div>
      
      {/* AI Dialogue Generation Modal */}
      {showAIModal && selectedDialogueForAI && (
        <AIDialogueModal
          dialogueId={selectedDialogueForAI}
          requiredWords={dialogueWords[selectedDialogueForAI] || []}
          onGenerated={handleAIDialogueGenerated}
          onClose={handleCloseAIModal}
        />
      )}
    </PanelBackdrop>
  );
};

export default DialogueSelectionPanel; 