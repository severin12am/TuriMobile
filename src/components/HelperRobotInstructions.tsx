import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';
import AppPanel from './AppPanel';
import { PanelTitle } from './PanelElements';

// Import centralized translations
import { getTranslation, getCharacterName } from '../constants/translations';

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
  
  // If no instruction type is provided, don't render anything
  if (!instructionType) {
    return null;
  }
  
  // Determine the instruction message based on the type
  let instructionMessage = '';
  
  switch (instructionType) {
    case 'navigation':
      instructionMessage = getTranslation(motherLanguage, 'goToCharacter')
        .replace('{character}', getCharacterName(motherLanguage, characterId));
      break;
    case 'dialogue':
      instructionMessage = getTranslation(motherLanguage, 'dialogueControls');
      break;
    case 'quiz':
      instructionMessage = getTranslation(motherLanguage, 'quizControls');
      break;
    case 'level_complete':
      instructionMessage = getTranslation(motherLanguage, 'findNextCharacter')
        .replace('{level}', level.toString())
        .replace('{character}', getCharacterName(motherLanguage, level + 1));
      break;
    case 'level_restriction':
      instructionMessage = getTranslation(motherLanguage, 'levelRestriction')
        .replace('{level}', level.toString());
      break;
    default:
      return null;
  }
  
  return (
    <div className="fixed top-[50%] transform -translate-y-1/2 left-8 z-50 max-w-xs">
      <AppPanel width="300px" padding={16} className="shadow-lg">
        <div className="flex justify-between items-center mb-2">
          <PanelTitle className="text-sm m-0">
            {getTranslation(motherLanguage, 'tipTitle')}
          </PanelTitle>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            aria-label={getTranslation(motherLanguage, 'close')}
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