import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import AppPanel from './AppPanel';
import { PanelTitle } from './PanelElements';

// Translations for the component
const translations = {
  en: {
    // Navigation instructions
    goToCharacter: 'Go towards next character. You can review previous levels by approaching their characters but you can`t skip levels',
    findNextCharacter: 'You finished level {level}! Good job. Now let\'s find {character}',
    levelRestriction: 'This character is for level {level}. Complete previous levels first.',
    
    // Dialogue instructions
    dialogueControls: 'Click on the return button to try again or click on the sound button to hear pronunciation. You can click on any word and find info on this word (or select a group of words)',
    
    // Quiz instructions
    quizControls: 'Click "Try Again" to retry this word.',
    
    // Miscellaneous
    close: 'Close',
    hint: 'Hint',
    tipTitle: 'Tip'
  },
  ru: {
    // Navigation instructions
    goToCharacter: 'Идите к {character}',
    findNextCharacter: 'Вы закончили уровень {level}! Отличная работа. Теперь найдем {character}',
    levelRestriction: 'Этот персонаж для уровня {level}. Сначала завершите предыдущие уровни.',
    
    // Dialogue instructions
    dialogueControls: 'Нажмите на кнопку возврата, чтобы повторить, или на кнопку звука, чтобы услышать произношение. Вы можете нажать на любое слово, чтобы найти информацию о нем (или выделить группу слов)',
    
    // Quiz instructions
    quizControls: 'Нажмите "Попробовать снова", чтобы повторить это слово.',
    
    // Miscellaneous
    close: 'Закрыть',
    hint: 'Подсказка',
    tipTitle: 'Совет'
  }
};

// List of supported languages
const supportedLanguages = ['en', 'ru'];

// Character names in different languages
const characterNames: Record<string, Record<number, string>> = {
  en: {
    1: 'Tom',
    2: 'Noah',
    3: 'Emma',
    4: 'Olivia',
    5: 'Jack'
  },
  ru: {
    1: 'Том',
    2: 'Ной',
    3: 'Эмма',
    4: 'Оливия',
    5: 'Джек'
  }
};

interface HelperRobotInstructionsProps {
  instructionType: 'navigation' | 'dialogue' | 'quiz' | 'level_complete' | 'level_restriction' | null;
  level?: number;
  characterId?: number;
  onClose: () => void;
}

const HelperRobotInstructions: React.FC<HelperRobotInstructionsProps> = ({
  instructionType,
  level = 1,
  characterId = 1,
  onClose
}) => {
  const { motherLanguage } = useStore();
  
  // Get translations based on mother language with explicit fallback to English
  const t = supportedLanguages.includes(motherLanguage)
    ? translations[motherLanguage]
    : translations.en;
    
  // Get character names based on mother language
  const names = supportedLanguages.includes(motherLanguage)
    ? characterNames[motherLanguage]
    : characterNames.en;
  
  // If no instruction type is provided, don't render anything
  if (!instructionType) {
    return null;
  }
  
  // Determine the instruction message based on the type
  let instructionMessage = '';
  
  switch (instructionType) {
    case 'navigation':
      instructionMessage = t.goToCharacter.replace('{character}', names[characterId]);
      break;
    case 'dialogue':
      instructionMessage = t.dialogueControls;
      break;
    case 'quiz':
      instructionMessage = t.quizControls;
      break;
    case 'level_complete':
      instructionMessage = t.findNextCharacter
        .replace('{level}', level.toString())
        .replace('{character}', names[level + 1] || '');
      break;
    case 'level_restriction':
      instructionMessage = t.levelRestriction.replace('{level}', level.toString());
      break;
    default:
      return null;
  }
  
  return (
    <div className="fixed top-[50%] transform -translate-y-1/2 left-8 z-50 max-w-xs">
      <AppPanel width="300px" padding={16} className="shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <PanelTitle className="text-sm m-0">
            {t.tipTitle}
          </PanelTitle>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label={t.close}
          >
            <X size={14} />
          </button>
        </div>
        <p className="text-white/90 text-sm">
          {instructionMessage}
        </p>
      </AppPanel>
    </div>
  );
};

export default HelperRobotInstructions; 