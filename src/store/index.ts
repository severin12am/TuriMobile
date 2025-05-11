import { create } from 'zustand';
import type { User, LanguageLevel } from '../types';
import { logger } from '../services/logger';

interface UserState {
  user: User | null;
  languageLevel: LanguageLevel | null;
  modelPaths: {
    city: string;
    helperRobot: string;
  };
  isLoggedIn: boolean;
  motherLanguage: 'en' | 'ru';
  targetLanguage: 'en' | 'ru';
  isLanguageSelected: boolean;
  modelsInitialized: boolean;
  
  // UI state
  isHelperRobotOpen: boolean;
  isDialogueOpen: boolean;
  isQuizActive: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setLanguageLevel: (level: LanguageLevel | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setLanguages: (mother: 'en' | 'ru', target: 'en' | 'ru') => void;
  setIsLanguageSelected: (isSelected: boolean) => void;
  toggleHelperRobot: () => void;
  setIsDialogueOpen: (isOpen: boolean) => void;
  setIsQuizActive: (isActive: boolean) => void;
  initializeModels: () => void;
  resetState: () => void;
}

const initialState = {
  user: null,
  languageLevel: null,
  modelPaths: {
    city: '/models/city.glb',
    helperRobot: '/models/helper-robot.glb'
  },
  isLoggedIn: false,
  motherLanguage: 'en' as const,
  targetLanguage: 'ru' as const,
  isLanguageSelected: false,
  isHelperRobotOpen: true,
  isDialogueOpen: false,
  isQuizActive: false,
  modelsInitialized: false
};

export const useStore = create<UserState>((set) => ({
  ...initialState,
  
  setUser: (user) => {
    set({ user });
    if (user) {
      logger.info('User set', { username: user.username });
    } else {
      logger.info('User cleared');
    }
  },
  
  setLanguageLevel: (languageLevel) => {
    set({ languageLevel });
    if (languageLevel) {
      logger.info('Language level set', { level: languageLevel.level, progress: languageLevel.word_progress });
    }
  },
  
  setIsLoggedIn: (isLoggedIn) => {
    set({ isLoggedIn });
    logger.info('Login status changed', { isLoggedIn });
  },
  
  setLanguages: (mother, target) => {
    set({ motherLanguage: mother, targetLanguage: target });
    logger.info('Languages set', { motherLanguage: mother, targetLanguage: target });
  },
  
  setIsLanguageSelected: (isSelected) => {
    set({ isLanguageSelected: isSelected });
    logger.info('Language selection status changed', { isSelected });
  },
  
  toggleHelperRobot: () => {
    set((state) => ({ isHelperRobotOpen: !state.isHelperRobotOpen }));
  },
  
  setIsDialogueOpen: (isOpen) => {
    set({ isDialogueOpen: isOpen });
    if (isOpen) {
      logger.info('Dialogue opened');
    } else {
      logger.info('Dialogue closed');
    }
  },
  
  setIsQuizActive: (isActive) => {
    set({ isQuizActive: isActive });
    if (isActive) {
      logger.info('Quiz activated');
    } else {
      logger.info('Quiz deactivated');
    }
  },

  initializeModels: () => {
    set((state) => ({ 
      modelsInitialized: true,
      modelPaths: {
        city: '/models/city.glb',
        helperRobot: '/models/helper-robot.glb'
      }
    }));
    logger.info('Models initialized');
  },
  
  resetState: () => {
    set(initialState);
    logger.info('State reset to initial values');
  }
}));