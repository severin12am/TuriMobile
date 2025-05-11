export interface User {
  id: string;
  username: string;
  password: string;
  mother_language: 'en' | 'ru';
  target_language: 'en' | 'ru';
  total_minutes: number;
}

export interface LanguageLevel {
  id: string;
  user_id: string;
  level: number;
  word_progress: number;
  mother_language: 'en' | 'ru';
  target_language: 'en' | 'ru';
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
  language: 'en' | 'ru';
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