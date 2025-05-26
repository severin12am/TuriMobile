import React, { useEffect, useState } from 'react';
import { useStore } from '../store';

interface DirectionArrowProps {
  targetLevel?: number;
}

// Character positions in the city (approximate)
const characterPositions: Record<number, { x: number, y: number }> = {
  1: { x: 2, y: -5 },   // Tom - Starting area
  2: { x: -4, y: 3 },   // Noah - Left side
  3: { x: 7, y: 2 },    // Emma - Right side
  4: { x: 0, y: 7 },    // Olivia - Far side
  5: { x: -8, y: -3 }   // Jack - Back left
};

const DirectionArrow: React.FC<DirectionArrowProps> = ({ targetLevel }) => {
  const { motherLanguage, languageLevel } = useStore();
  const [visible, setVisible] = useState(false);
  const [rotation, setRotation] = useState(0);
  
  // Calculate which level should be targeted
  const determineTargetLevel = () => {
    // If a specific target level is provided, use that
    if (targetLevel) return targetLevel;
    
    // Otherwise calculate based on user's current level
    if (!languageLevel) return 1; // Default to first level if no progress
    
    const currentLevel = languageLevel.level || 1;
    
    // If user has completed level 5, don't show arrow
    if (currentLevel > 5) return null;
    
    // Point to current level if not complete, or next level if current is complete
    const dialogueNum = languageLevel.dialogue_number || 0;
    const completedDialoguesForLevel = dialogueNum % 5 === 0 ? 5 : dialogueNum % 5;
    const isLevelComplete = completedDialoguesForLevel === 5;
    
    return isLevelComplete ? Math.min(currentLevel + 1, 5) : currentLevel;
  };
  
  // Calculate arrow rotation based on current position and target
  useEffect(() => {
    const level = determineTargetLevel();
    
    // Don't show arrow if there's no valid target level
    if (!level) {
      setVisible(false);
      return;
    }
    
    // Show arrow and calculate direction
    setVisible(true);
    
    // Calculate angle to target character
    // This would ideally use actual player position, but we'll use a fixed center position
    const playerPos = { x: 0, y: 0 };
    const targetPos = characterPositions[level];
    
    if (targetPos) {
      const dx = targetPos.x - playerPos.x;
      const dy = targetPos.y - playerPos.y;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      setRotation(angle);
    }
  }, [languageLevel, targetLevel]);
  
  if (!visible) return null;
  
  // Different arrow styles based on language
  const arrowStyles = {
    en: { color: '#4f46e5' }, // Indigo
    ru: { color: '#ef4444' }  // Red
  };
  
  const style = arrowStyles[motherLanguage] || arrowStyles.en;
  
  return (
    <div className="absolute top-[-50px] left-[50%] transform -translate-x-1/2 pointer-events-none z-20">
      <div 
        className="w-14 h-14 flex items-center justify-center animate-bounce"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path 
            d="M5 12H19M19 12L12 5M19 12L12 19" 
            stroke={style.color} 
            strokeWidth="3" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
};

export default DirectionArrow; 