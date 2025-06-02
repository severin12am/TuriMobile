import { SupportedLanguage } from '../constants/translations';

export interface User {
  id: string;
  password: string;
  email?: string;
  mother_language: SupportedLanguage;
  target_language: SupportedLanguage;
  total_minutes: number;
}

export interface LanguageLevel {
  id: string;
  user_id: string;
  mother_language: SupportedLanguage;
  target_language: SupportedLanguage;
  level: number;
  dialogue_number?: number;
  word_progress: number;
  email: string;
}

export interface Character {
  id: number;
  name: string;
  role: string;
  position_x: number;
  position_y: number;
  position_z: number;
  scale_x: number;
  scale_y: number;
  scale_z: number;
  rotation_y?: number;
  is_active: boolean;
}

export interface Phrase {
  id: number;
  dialogue_id: number;
  character_id: number;
  text: string;
  audio_url?: string;
  order: number;
}

export interface WordExplanation {
  id: number;
  word: string;
  explanation: string;
  language: SupportedLanguage;
}

export interface WordInPhrase {
  id: number;
  phrase_id: number;
  word_id: number;
  start_position: number;
  end_position: number;
}

export interface Instruction {
  id: number;
  key: string;
  text_en: string;
  text_ru: string;
}

export interface VersionHistory {
  version: string;
  timestamp: string;
  changes: string;
}

// Language selection types
export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
}

export enum SelectionState {
  SELECT_KNOWN = 'select_known',
  SELECT_LEARN = 'select_learn',
  READY_TO_START = 'ready_to_start'
}