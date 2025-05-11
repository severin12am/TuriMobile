import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { supabase } from '../services/supabase';
import { Loader2, Lock, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { logger } from '../services/logger';

interface Dialogue {
  id: number;
  title: string;
  character_id: number;
  level: number;
  description: string;
  order: number;
}

interface UserProgress {
  dialogue_id: number;
  completed: boolean;
  passed: boolean;
  score: number;
}

interface DialogueSelectionPanelProps {
  onDialogueSelect: (dialogueId: number) => void;
  onClose: () => void;
}

const DialogueSelectionPanel: React.FC<DialogueSelectionPanelProps> = ({
  onDialogueSelect,
  onClose
}) => {
  const { user, targetLanguage, motherLanguage } = useStore();
  
  const [dialogues, setDialogues] = useState<Dialogue[]>([]);
  const [userProgress, setUserProgress] = useState<UserProgress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [characters, setCharacters] = useState<Record<number, string>>({});
  const [selectedCharacter, setSelectedCharacter] = useState<number | null>(null);
  
  // Fetch dialogues and user progress
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch all dialogues
        const { data: dialoguesData, error: dialoguesError } = await supabase
          .from('dialogues')
          .select('*')
          .order('character_id')
          .order('order');
        
        if (dialoguesError) throw dialoguesError;
        
        // Fetch user progress
        const { data: progressData, error: progressError } = await supabase
          .from('user_progress')
          .select('*')
          .eq('user_id', user?.id);
        
        if (progressError) throw progressError;
        
        // Fetch characters
        const { data: charactersData, error: charactersError } = await supabase
          .from('characters')
          .select('id, name');
        
        if (charactersError) throw charactersError;
        
        // Set data
        setDialogues(dialoguesData as Dialogue[]);
        setUserProgress(progressData as UserProgress[]);
        
        // Create character map
        const characterMap: Record<number, string> = {};
        charactersData.forEach((char: any) => {
          characterMap[char.id] = char.name;
        });
        setCharacters(characterMap);
        
        // Set first character as selected
        if (dialoguesData.length > 0) {
          setSelectedCharacter(dialoguesData[0].character_id);
        }
      } catch (err) {
        console.error('Error fetching dialogues', err);
        setError('Failed to load dialogues. Please try again later.');
        logger.error('Failed to load dialogues', { error: err });
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchData();
    }
  }, [user]);
  
  // Group dialogues by character
  const dialoguesByCharacter = dialogues.reduce<Record<number, Dialogue[]>>((acc, dialogue) => {
    if (!acc[dialogue.character_id]) {
      acc[dialogue.character_id] = [];
    }
    acc[dialogue.character_id].push(dialogue);
    return acc;
  }, {});
  
  // Check if a dialogue is unlocked
  const isDialogueUnlocked = (dialogue: Dialogue) => {
    // First dialogue is always unlocked
    if (dialogue.character_id === 1 && dialogue.order === 1) return true;
    
    // Check if previous dialogue is completed
    const characterDialogues = dialoguesByCharacter[dialogue.character_id] || [];
    const prevDialogueIndex = characterDialogues.findIndex(d => d.id === dialogue.id) - 1;
    
    // If it's the first dialogue of a character, check if all dialogues from previous character are completed
    if (prevDialogueIndex < 0) {
      // If it's the first character, it's unlocked
      if (dialogue.character_id === 1) return true;
      
      // Check if all dialogues from previous character are completed
      const prevCharacterId = dialogue.character_id - 1;
      const prevCharacterDialogues = dialoguesByCharacter[prevCharacterId] || [];
      
      return prevCharacterDialogues.every(d => {
        const progress = userProgress.find(p => p.dialogue_id === d.id);
        return progress && progress.passed;
      });
    }
    
    // Check if previous dialogue in this character is completed
    const prevDialogue = characterDialogues[prevDialogueIndex];
    const prevProgress = userProgress.find(p => p.dialogue_id === prevDialogue.id);
    
    return prevProgress && prevProgress.passed;
  };
  
  // Get progress status for a dialogue
  const getDialogueProgress = (dialogueId: number) => {
    const progress = userProgress.find(p => p.dialogue_id === dialogueId);
    if (!progress) return null;
    return progress;
  };
  
  // Handle dialogue selection
  const handleDialogueSelect = (dialogue: Dialogue) => {
    if (isDialogueUnlocked(dialogue)) {
      onDialogueSelect(dialogue.id);
    } else {
      // Could show a message that dialogue is locked
      console.log('Dialogue is locked');
    }
  };
  
  // Switch to a different character
  const switchCharacter = (characterId: number) => {
    setSelectedCharacter(characterId);
  };
  
  // Loading state
  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md z-50">
        <div className="w-full max-w-2xl p-8 mx-4 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            <p className="text-xl font-medium text-slate-200">Loading dialogues...</p>
          </div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md z-50">
        <div className="w-full max-w-2xl p-8 mx-4 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl">
          <div className="flex flex-col items-center justify-center space-y-4">
            <XCircle className="w-12 h-12 text-red-500" />
            <p className="text-xl font-medium text-slate-200">{error}</p>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-md z-50">
      <div className="w-full max-w-2xl p-8 mx-4 rounded-xl bg-slate-800 border border-slate-700 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-slate-100">Select a Dialogue</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-700/60 transition-colors"
          >
            <XCircle className="w-6 h-6 text-slate-400" />
          </button>
        </div>
        
        {/* Character tabs */}
        <div className="mb-6 overflow-x-auto pb-2">
          <div className="flex space-x-2 min-w-max">
            {Object.keys(dialoguesByCharacter).map((charId) => {
              const characterId = parseInt(charId);
              const isSelected = selectedCharacter === characterId;
              const characterName = characters[characterId] || `Character ${characterId}`;
              
              return (
                <button
                  key={characterId}
                  onClick={() => switchCharacter(characterId)}
                  className={`
                    px-4 py-2 rounded-lg transition-colors whitespace-nowrap
                    ${isSelected 
                      ? 'bg-indigo-600 text-white font-medium' 
                      : 'bg-slate-700/60 text-slate-300 hover:bg-slate-700'}
                  `}
                >
                  Level {characterId}: {characterName}
                </button>
              );
            })}
          </div>
        </div>
        
        {/* Dialogues list */}
        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
          {selectedCharacter && dialoguesByCharacter[selectedCharacter]?.map((dialogue) => {
            const isUnlocked = isDialogueUnlocked(dialogue);
            const progress = getDialogueProgress(dialogue.id);
            
            return (
              <div
                key={dialogue.id}
                onClick={() => handleDialogueSelect(dialogue)}
                className={`
                  p-4 rounded-lg border transition-all cursor-pointer
                  ${isUnlocked 
                    ? 'bg-slate-700/40 border-slate-600 hover:border-indigo-500' 
                    : 'bg-slate-800/40 border-slate-700 opacity-70 cursor-not-allowed'}
                `}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium text-slate-200 mb-1">
                      {dialogue.title}
                    </h3>
                    <p className="text-sm text-slate-400">
                      {dialogue.description}
                    </p>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    {!isUnlocked && (
                      <Lock className="w-5 h-5 text-slate-500" />
                    )}
                    
                    {isUnlocked && !progress && (
                      <ChevronRight className="w-5 h-5 text-indigo-400" />
                    )}
                    
                    {progress && progress.passed && (
                      <div className="flex flex-col items-center">
                        <CheckCircle className="w-5 h-5 text-green-500" />
                        <span className="text-xs text-green-400 mt-1">
                          {Math.round(progress.score)}%
                        </span>
                      </div>
                    )}
                    
                    {progress && !progress.passed && (
                      <div className="flex flex-col items-center">
                        <XCircle className="w-5 h-5 text-yellow-500" />
                        <span className="text-xs text-yellow-400 mt-1">
                          Try again
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default DialogueSelectionPanel; 