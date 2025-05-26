import { create } from 'zustand';
import type { User, LanguageLevel } from '../types';
import { logger } from '../services/logger';

// Define instruction types
export type InstructionType = 'navigation' | 'dialogue' | 'quiz' | 'level_complete' | 'level_restriction' | null;

interface UserState {
  user: User | null;
  languageLevel: LanguageLevel | null;
  modelPaths: {
    city: string;
    helperRobot: string;
  };
  isLoggedIn: boolean;
  isAuthenticated: boolean;
  motherLanguage: 'en' | 'ru';
  targetLanguage: 'en' | 'ru';
  isLanguageSelected: boolean;
  modelsInitialized: boolean;
  
  // UI state
  isHelperRobotOpen: boolean;
  isDialogueOpen: boolean;
  isQuizActive: boolean;
  isMovementDisabled: boolean;
  
  // Helper Robot Instructions state
  instructionType: InstructionType;
  showInstructions: boolean;
  instructionLevel: number;
  instructionCharacterId: number;
  
  // Actions
  setUser: (user: User | null) => void;
  setLanguageLevel: (level: LanguageLevel | null) => void;
  setIsLoggedIn: (isLoggedIn: boolean) => void;
  setIsAuthenticated: (isAuthenticated: boolean) => void;
  setLanguages: (mother: 'en' | 'ru', target: 'en' | 'ru') => void;
  setIsLanguageSelected: (isSelected: boolean) => void;
  toggleHelperRobot: () => void;
  setIsDialogueOpen: (isOpen: boolean) => void;
  setIsQuizActive: (isActive: boolean) => void;
  setIsMovementDisabled: (isDisabled: boolean) => void;
  initializeModels: () => void;
  resetState: () => void;
  logout: () => void;
  
  // Instructions actions
  setInstructions: (
    type: InstructionType,
    level?: number,
    characterId?: number
  ) => void;
  hideInstructions: () => void;
  
  // Debug utilities
  setTestUser: () => void;
}

const initialState = {
  user: null,
  languageLevel: null,
  modelPaths: {
    city: '/models/city.glb',
    helperRobot: '/models/helper-robot.glb'
  },
  isLoggedIn: false,
  isAuthenticated: false,
  motherLanguage: 'en' as const,
  targetLanguage: 'ru' as const,
  isLanguageSelected: false,
  isHelperRobotOpen: false,
  isDialogueOpen: false,
  isQuizActive: false,
  isMovementDisabled: false,
  modelsInitialized: false,
  
  // Helper Robot Instructions initial state
  instructionType: null,
  showInstructions: false,
  instructionLevel: 1,
  instructionCharacterId: 1
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
  
  setIsAuthenticated: (isAuthenticated) => {
    set({ isAuthenticated });
    logger.info('Authentication status changed', { isAuthenticated });
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
  
  // Helper Robot Instructions actions
  setInstructions: (type, level = 1, characterId = 1) => {
    set({
      instructionType: type,
      showInstructions: true,
      instructionLevel: level,
      instructionCharacterId: characterId
    });
    logger.info('Set helper robot instructions', { type, level, characterId });
  },
  
  hideInstructions: () => {
    set({ showInstructions: false });
    logger.info('Hide helper robot instructions');
  },
  
  resetState: () => {
    set(state => ({
      ...initialState,
      // Preserve the helper robot's visibility state
      isHelperRobotOpen: state.isHelperRobotOpen
    }));
    logger.info('State reset to initial values (keeping helper robot visibility)');
  },
  
  logout: () => {
    set(state => ({
      ...initialState,
      isLoggedIn: false,
      isAuthenticated: false,
      isLanguageSelected: false,
      motherLanguage: 'en',
      targetLanguage: 'ru',
      // Preserve the helper robot's visibility state
      isHelperRobotOpen: state.isHelperRobotOpen
    }));
    logger.info('User logged out');
  },
  
  // Debug utility to set a test user with a consistent ID
  setTestUser: () => {
    const testUser: User = {
      id: '00000000-0000-0000-0000-000000000001', // Test user ID
      username: 'test@example.com',
      password: 'password',
      mother_language: 'en',
      target_language: 'ru',
      total_minutes: 0
    };
    
    set({ 
      user: testUser, 
      isLoggedIn: true,
      isAuthenticated: true,
      isLanguageSelected: true,
      motherLanguage: 'en', 
      targetLanguage: 'ru' 
    });
    
    logger.info('Set test user for debugging', { 
      userId: testUser.id, 
      username: testUser.username 
    });
    
    console.log('DEBUG: Test user set', testUser);
  },
  
  setIsMovementDisabled: (isDisabled) => {
    set({ isMovementDisabled: isDisabled });
    logger.info('Movement disabled status changed', { isDisabled });
  }
}));