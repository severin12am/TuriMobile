import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../services/supabase';
import { useStore } from '../store';
import { logger } from '../services/logger';
import ProgressVisualization from './ProgressVisualization';
import { syncWordProgress } from '../services/progress';
import { LogOut } from 'lucide-react';
import AppPanel from './AppPanel';
import { PanelBackdrop } from './AppPanel';
import { PanelTitle, PanelButton, PanelInput } from './PanelElements';

interface HelperRobotPanelProps {
  onClose: () => void;
}

interface Word {
  id: number;
  dialogue_id: number;
  word: string;
  translation: string;
  example: string;
  is_learned?: boolean;
  entry_in_en?: string;
  entry_in_ru?: string;
  entry_in_es?: string;
  entry_in_fr?: string;
  entry_in_de?: string;
  entry_in_it?: string;
  entry_in_pt?: string;
  entry_in_ar?: string;
  entry_in_ch?: string;
  entry_in_ja?: string;
  entry_in_av?: string;
  [key: string]: any; // Allow dynamic column access
}

interface LanguagePair {
  id: number;
  mother_language: string;
  target_language: string;
  level: number;
  word_progress: number;
  dialogue_number?: number;
  user_id?: string;
}

const HelperRobotPanel: React.FC<HelperRobotPanelProps> = ({ onClose }) => {
  const { user, isLoggedIn, motherLanguage, targetLanguage, setLanguages, resetState, logout } = useStore();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showVocabulary, setShowVocabulary] = useState<boolean>(false);
  const [allWords, setAllWords] = useState<Word[]>([]);
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [languagePairs, setLanguagePairs] = useState<LanguagePair[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showHelpTooltip, setShowHelpTooltip] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  useEffect(() => {
    if (isLoggedIn && user?.id) {
      console.log('HelperRobotPanel: User is logged in with ID:', user.id);
      loadData();
    } else {
      console.log('HelperRobotPanel: User not logged in or missing ID');
    }
  }, [isLoggedIn, user?.id, targetLanguage, motherLanguage]);
  
  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // Sync user progress to ensure we have the latest data
      if (user?.id) {
        console.log('HelperRobotPanel: Syncing word progress for user:', user.id);
        await syncWordProgress(user.id, targetLanguage);
      }
      
      // Load words data
      await loadWords();
      
      // Load language pairs data
      await loadLanguagePairs();
    } catch (error) {
      console.error('Error loading data:', error);
      logger.error('Error loading data in HelperRobotPanel', { error });
      setLoadError('Failed to load your progress data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const loadWords = async () => {
    if (!user?.id) return;
    
    try {
      // First get all words
      const { data: wordsData, error: wordsError } = await supabase
        .from('words_quiz')
        .select('*')
        .order('dialogue_id', { ascending: true })
        .order('id', { ascending: true });
        
      if (wordsError) {
        logger.error('Error fetching words', { error: wordsError });
        return;
      }
      
      if (wordsData) {
        // Dynamic language column mapping
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
          return columnMap[lang] || 'entry_in_en'; // fallback to English
        };

        // Process words based on target language
        const processedWords = wordsData.map(word => {
          // Get the column names for target and mother languages
          const targetColumn = getLanguageColumn(targetLanguage);
          const motherColumn = getLanguageColumn(motherLanguage);
          
          // Get the words from the appropriate columns
          const targetWord = word[targetColumn] || word.word;
          const translationWord = word[motherColumn] || word.translation;
          
          return {
            ...word,
            word: targetWord,
            translation: translationWord
          };
        });
        
        setAllWords(processedWords);
        
        // Get user's language level to determine which words they've learned
        const { data: levelData, error: levelError } = await supabase
          .from('language_levels')
          .select('dialogue_number, word_progress, level')
          .eq('user_id', user.id)
          .eq('target_language', targetLanguage)
          .single();
          
        if (levelError && levelError.code !== 'PGRST116') {
          logger.error('Error fetching language level', { error: levelError });
          return;
        }
        
        console.log("Language level data:", levelData);
        
        // If we have actual data from the database, use it
        const highestDialogue = levelData?.dialogue_number || 0;
        console.log("Highest dialogue completed:", highestDialogue);
        
        // Mark words as learned if they're from completed dialogues
        const learned = processedWords.filter(word => word.dialogue_id <= highestDialogue);
        console.log(`Marking ${learned.length} words as learned from ${processedWords.length} total words`);
        setLearnedWords(learned);
      }
    } catch (error) {
      logger.error('Error in loadWords', { error });
      console.error('Error loading words:', error);
    }
  };
  
  const loadLanguagePairs = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('language_levels')
        .select('*')
        .eq('user_id', user.id)
        .not('word_progress', 'eq', 0); // Only get pairs with some progress
        
      if (error) {
        logger.error('Error fetching language pairs', { error });
        return;
      }
      
      if (data) {
        console.log("Language pairs with progress:", data);
        setLanguagePairs(data);
      }
    } catch (error) {
      logger.error('Error in loadLanguagePairs', { error });
    }
  };
  
  const switchLanguagePair = async (motherLang: 'en' | 'ru', targetLang: 'en' | 'ru') => {
    setLanguages(motherLang, targetLang);
    // After switching, reload data
    await loadData();
  };
  
  const startNewLanguagePair = () => {
    // Show "Coming Soon!" message instead of any functionality
    alert("Coming Soon!");
  };
  
  // Helper function to get language display name
  const getLanguageName = (code: string): string => {
    const languages: Record<string, string> = {
      'en': 'English',
      'ru': 'Russian',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ar': 'Arabic',
      'CH': 'Chinese',
      'ja': 'Japanese',
      'av': 'Avar'
    };
    
    return languages[code] || code;
  };
  
  const toggleVocabulary = () => {
    setShowVocabulary(!showVocabulary);
  };
  
  // Filter words based on search term
  const filteredWords = useMemo(() => {
    if (!searchTerm.trim()) return allWords;
    
    const term = searchTerm.toLowerCase().trim();
    return allWords.filter(word => 
      word.word.toLowerCase().includes(term) || 
      word.translation.toLowerCase().includes(term) ||
      (word.example && word.translation.toLowerCase().includes(term))
    );
  }, [allWords, searchTerm]);
  
  // Handle user logout
  const handleLogout = async () => {
    try {
      // Use the centralized logout function
      const { logout: authLogout } = await import('../services/auth');
      await authLogout();
      
      // Use the store's logout function to update UI state
      logout();
      
      // Close the panel
      onClose();
      
      logger.info('User logged out successfully');
      console.log('User logged out successfully');
    } catch (error) {
      logger.error('Error during logout', { error });
      console.error('Error during logout:', error);
    }
  };
  
  if (!isLoggedIn || !user) {
    return (
      <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 backdrop-blur-sm">
        <div className="bg-slate-800 rounded-xl p-6 shadow-xl border border-slate-700 w-full max-w-md">
          <h2 className="text-xl font-bold text-white mb-4">Sign In Required</h2>
          <p className="text-slate-300 mb-6">Please sign in to view your language learning journey.</p>
          <div className="flex justify-end space-x-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Filter to get only previous language pairs with progress (exclude current pair)
  const previousPairs = languagePairs.filter(
    pair => pair.mother_language !== motherLanguage || pair.target_language !== targetLanguage
  );
  
  // Progress section tooltip content
  const progressHelpContent = (
    <div className="bg-slate-700 p-3 rounded-lg shadow-lg text-sm text-white max-w-xs">
      <p className="mb-2"><span className="font-bold">How progress is calculated:</span></p>
      <ul className="list-disc ml-4 space-y-1">
        <li>Words Learned: Based on words from completed dialogues</li>
        <li>Dialogues Completed: The number of dialogues you've finished</li>
        <li>Current Level: Each level contains 5 dialogues</li>
      </ul>
      <p className="mt-2 text-slate-300 text-xs">Complete more dialogues to increase all metrics!</p>
    </div>
  );
  
  return (
    <PanelBackdrop zIndex={100}>
      <AppPanel 
        width={700} 
        height="auto" 
        className="helper-robot-panel max-h-[90vh] overflow-y-auto"
        style={{ minWidth: '700px', width: '700px' }}
      >
        <div className="flex justify-between items-center mb-6">
          <PanelTitle>
            Let's look at your progress
          </PanelTitle>
          
          <button 
            onClick={onClose}
            className="text-white/70 hover:text-white transition-colors rounded-full p-2"
            aria-label="Close panel"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        {isLoading && (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-400"></div>
          </div>
        )}
        
        {loadError && !isLoading && (
          <div className="bg-red-500/20 border border-red-500/30 text-white p-4 rounded-2xl mb-6">
            <p>{loadError}</p>
            <PanelButton onClick={loadData} className="mt-4">Try Again</PanelButton>
          </div>
        )}
        
        {!isLoading && !loadError && (
          <>
            {/* Current language pair info */}
            <div className="bg-white/5 rounded-2xl p-5 mb-6">
              <h3 className="text-xl font-medium text-white/90 mb-3">Current language pair</h3>
              <div className="flex justify-between items-center">
                <p className="text-white/80">
                  <span className="text-blue-400 font-medium">{getLanguageName(motherLanguage)}</span> - <span className="text-blue-400 font-medium">{getLanguageName(targetLanguage)}</span>
                </p>
                <PanelButton 
                  onClick={startNewLanguagePair}
                  className="text-sm px-4 py-2"
                >
                  Start a New Language Pair
                </PanelButton>
              </div>
            </div>
            
            {/* Progress Metrics - Three panels */}
            {/* 1. Dialogues Progress */}
            <div className="bg-white/5 rounded-2xl p-5 mb-6">
              <h3 className="text-xl font-medium text-white/90 mb-3">Dialogues Progress</h3>
              <div className="mt-4">
                {/* Estimate dialogue progress based on language level */}
                {languagePairs.map(pair => {
                  if (pair.mother_language === motherLanguage && pair.target_language === targetLanguage) {
                    // Calculate dialogue completion based on dialogue_number
                    const totalDialogues = 150; // Total of 150 dialogues
                    const completedDialogues = pair.dialogue_number || 0;
                    
                    return (
                      <div key={pair.id}>
                        <div className="flex justify-between text-sm text-white/60 mb-1">
                          <span>Dialogues completed</span>
                          <span>{completedDialogues} / {totalDialogues}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-green-500 to-teal-500 h-2 rounded-full" 
                            style={{ width: `${(completedDialogues / totalDialogues) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            
            {/* 2. Level Progress */}
            <div className="bg-white/5 rounded-2xl p-5 mb-6">
              <h3 className="text-xl font-medium text-white/90 mb-3">Level Progress</h3>
              <div className="mt-4">
                {/* Display level progress */}
                {languagePairs.map(pair => {
                  if (pair.mother_language === motherLanguage && pair.target_language === targetLanguage) {
                    const currentLevel = pair.level || 1;
                    const maxLevel = 30;  // Total of 30 levels
                    const dialoguesInLevel = pair.dialogue_number ? pair.dialogue_number % 5 : 0;
                    const dialoguesPerLevel = 5;
                    const levelProgress = (dialoguesInLevel / dialoguesPerLevel) * 100;
                    
                    return (
                      <div key={pair.id}>
                        <div className="flex justify-between text-sm text-white/60 mb-1">
                          <span>Current Level</span>
                          <span>{currentLevel} / {maxLevel}</span>
                        </div>
                        <div className="w-full bg-white/10 rounded-full h-2">
                          <div 
                            className="bg-gradient-to-r from-orange-500 to-amber-500 h-2 rounded-full" 
                            style={{ width: `${(currentLevel / maxLevel) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
            
            {/* 3. Vocabulary Progress */}
            <div className="bg-white/5 rounded-2xl p-5 mb-6 cursor-pointer hover:bg-white/10 transition-colors" onClick={toggleVocabulary}>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xl font-medium text-white/90">Vocabulary Progress</h3>
                <span className="text-blue-400 text-sm">{showVocabulary ? 'Hide Details' : 'Show Details'}</span>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-white/60 mb-1">
                  <span>Words learned</span>
                  <span>{learnedWords.length} / {allWords.length}</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                    style={{ width: `${allWords.length > 0 ? (learnedWords.length / allWords.length) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            {/* Vocabulary list (shown when toggled) */}
            {showVocabulary && (
              <div className="mb-6">
                <PanelInput
                  type="text"
                  placeholder="Search words..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="mb-4"
                />
                
                <div className="max-h-[60vh] overflow-y-auto bg-white/5 rounded-2xl p-4">
                  {filteredWords.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                      {filteredWords.map(word => (
                        <div 
                          key={word.id}
                          className={`relative p-3 rounded-xl transition-all ${
                            learnedWords.some(w => w.id === word.id) 
                              ? 'bg-green-900/20 border border-green-500/30' 
                              : 'bg-white/5 border border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {/* Word Info */}
                          <div className="space-y-2">
                            {/* Word Numbers */}
                            <div className="flex justify-between text-xs text-slate-400">
                              <span>{word.id}</span>
                              <span>{word.dialogue_id}</span>
                            </div>
                            
                            {/* Word and Translation */}
                            <div className="space-y-1">
                              <div 
                                className="text-lg font-medium text-white truncate cursor-help" 
                                title={word.word}
                              >
                                {word.word}
                              </div>
                              <div 
                                className="text-sm text-slate-300 truncate cursor-help" 
                                title={word.translation}
                              >
                                {word.translation}
                              </div>
                            </div>
                            
                            {/* Example if available */}
                            {word.example && (
                              <div 
                                className="text-xs text-slate-400 italic mt-2 line-clamp-2 cursor-help" 
                                title={word.example}
                              >
                                {word.example}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-white/60">
                      No words found
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Account section */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <h3 className="text-xl font-medium text-white/90 mb-4">Account</h3>
              
              {user ? (
                <div>
                  <p className="text-white/80 mb-4">
                    Logged in as: <span className="text-blue-400">{user.email}</span>
                  </p>
                  
                  <PanelButton 
                    onClick={handleLogout}
                    className="text-red-300 border-red-300/30 hover:bg-red-500/20"
                  >
                    Log Out
                  </PanelButton>
                </div>
              ) : (
                <p className="text-white/60">Not logged in</p>
              )}
            </div>
          </>
        )}
      </AppPanel>
    </PanelBackdrop>
  );
};

export default HelperRobotPanel; 