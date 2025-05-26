import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabase';
import { useStore } from '../store';
import { logger } from '../services/logger';
import { getUserLearningStats, syncWordProgress } from '../services/progress';
import type { LanguageLevel } from '../types';

interface CompletedDialogue {
  character_id: number;
  dialogue_id: number;
  completed: boolean;
  score: number;
  passed: boolean;
  completed_at: string;
}

interface ProgressVisualizationProps {
  userId: string;
  onWordsClick?: () => void;
}

const ProgressVisualization: React.FC<ProgressVisualizationProps> = ({ userId, onWordsClick }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [completedDialogues, setCompletedDialogues] = useState<CompletedDialogue[]>([]);
  const [languageLevel, setLanguageLevel] = useState<LanguageLevel | null>(null);
  const [stats, setStats] = useState<{
    completedDialoguesCount: number;
    uniqueCharactersCount: number;
    wordCount: number;
    currentLevel: number;
  } | null>(null);
  const { targetLanguage } = useStore();
  
  // Group dialogues by character for visualization
  const dialoguesByCharacter: Record<number, CompletedDialogue[]> = {};
  completedDialogues.forEach(dialogue => {
    if (!dialoguesByCharacter[dialogue.character_id]) {
      dialoguesByCharacter[dialogue.character_id] = [];
    }
    dialoguesByCharacter[dialogue.character_id].push(dialogue);
  });
  
  // Fetch user progress data on component mount
  useEffect(() => {
    const fetchUserProgress = async () => {
      if (!userId) return;
      
      console.log('ProgressVisualization: Fetching progress for user:', userId);
      setIsLoading(true);
      try {
        // First, make sure progress is synced and up-to-date
        await syncWordProgress(userId, targetLanguage);
        
        // Directly fetch language level data as a fallback
        const { data: levelData, error: levelError } = await supabase
          .from('language_levels')
          .select('*')
          .eq('user_id', userId)
          .eq('target_language', targetLanguage)
          .single();
        
        if (levelError && levelError.code !== 'PGRST116') {
          console.error('Failed to get language_levels data:', levelError);
        } else if (levelData) {
          console.log('Direct language_levels data:', levelData);
          setLanguageLevel(levelData);
        }
        
        // Then fetch the learning stats which includes all the data we need
        const learningStats = await getUserLearningStats(userId, targetLanguage);
        console.log('ProgressVisualization: Received learning stats:', learningStats);
        
        if (learningStats) {
          setStats({
            completedDialoguesCount: learningStats.completedDialoguesCount,
            uniqueCharactersCount: learningStats.uniqueCharactersCount,
            wordCount: learningStats.wordCount,
            currentLevel: learningStats.currentLevel
          });
          
          setLanguageLevel(learningStats.languageLevel);
        }
      } catch (error) {
        logger.error('Error in fetchUserProgress', { error });
        console.error('Error fetching progress:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchUserProgress();
  }, [userId, targetLanguage]);
  
  if (isLoading) {
    return (
      <div className="bg-slate-800/50 p-6 rounded-lg flex flex-col items-center justify-center">
        <div className="animate-spin w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full mb-3"></div>
        <div className="text-slate-300 animate-pulse">Loading your progress data...</div>
      </div>
    );
  }
  
  const totalWords = 500;
  const totalDialogues = 150;
  const maxLevel = 30;
  
  // Use values directly from languageLevel if stats is null
  const wordProgress = stats?.wordCount || languageLevel?.word_progress || 0;
  const currentLevel = stats?.currentLevel || languageLevel?.level || 1;
  const completedDialoguesCount = stats?.completedDialoguesCount || languageLevel?.dialogue_number || 0;
  
  const wordPercentage = Math.min(100, Math.round((wordProgress / totalWords) * 100));
  const dialoguesPercentage = Math.min(100, Math.round((completedDialoguesCount / totalDialogues) * 100));
  const levelPercentage = Math.min(100, Math.round((currentLevel / maxLevel) * 100));
  
  // Get corresponding emoji based on progress percentage
  const getProgressEmoji = (percentage: number): string => {
    if (percentage >= 75) return '🌟';
    if (percentage >= 50) return '🚀';
    if (percentage >= 25) return '📈';
    return '🔍';
  };
  
  // Log the values we're about to display for debugging
  console.log('Progress values being displayed:', {
    wordProgress,
    currentLevel,
    completedDialoguesCount,
    source: stats ? 'stats object' : languageLevel ? 'language level' : 'default values'
  });
  
  return (
    <div className="space-y-8">
      {/* Summary section */}
      <div className="p-4 bg-slate-800/50 rounded-lg">
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-slate-700/50 p-3 rounded-md relative overflow-hidden group">
            <div className="flex items-center mb-1">
              <div className="mr-2 text-lg">{getProgressEmoji(levelPercentage)}</div>
              <div className="text-sm text-slate-400">Current Level</div>
            </div>
            <div className="text-2xl font-bold text-indigo-400">{currentLevel}/{maxLevel}</div>
            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${levelPercentage}%` }}
              ></div>
            </div>
            {/* Add a subtle highlight effect on hover */}
            <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"></div>
          </div>
          <div 
            className="bg-slate-700/50 p-3 rounded-md cursor-pointer hover:bg-slate-700/80 transition-colors relative overflow-hidden group"
            onClick={onWordsClick}
          >
            <div className="flex items-center mb-1">
              <div className="mr-2 text-lg">{getProgressEmoji(wordPercentage)}</div>
              <div className="text-sm text-slate-400">Words Learned</div>
            </div>
            <div className="text-2xl font-bold text-amber-400">{wordProgress} / {totalWords}</div>
            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-amber-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${wordPercentage}%` }}
              ></div>
            </div>
            {/* Click hint */}
            <div className="absolute top-1 right-2 text-xs text-amber-300/70">Click to view →</div>
            {/* Add a subtle highlight effect on hover */}
            <div className="absolute inset-0 bg-amber-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"></div>
          </div>
          <div className="bg-slate-700/50 p-3 rounded-md relative overflow-hidden group">
            <div className="flex items-center mb-1">
              <div className="mr-2 text-lg">{getProgressEmoji(dialoguesPercentage)}</div>
              <div className="text-sm text-slate-400">Dialogues Completed</div>
            </div>
            <div className="text-2xl font-bold text-green-400">{completedDialoguesCount} / {totalDialogues}</div>
            <div className="mt-2 h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${dialoguesPercentage}%` }}
              ></div>
            </div>
            {/* Add a subtle highlight effect on hover */}
            <div className="absolute inset-0 bg-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-md"></div>
          </div>
        </div>
        
        {/* Show completion progress milestone */}
        {wordProgress > 0 && wordProgress > 100 && (
          <div className="mt-6 p-3 bg-slate-700/30 rounded-md">
            <div className="text-center">
              <span className="text-sm text-slate-300">
                {wordProgress < 250 ? (
                  <>You're making great progress! Keep going!</>
                ) : wordProgress < 400 ? (
                  <>You're well on your way to mastery!</>
                ) : (
                  <>You're almost there! Complete your language mastery!</>
                )}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressVisualization; 