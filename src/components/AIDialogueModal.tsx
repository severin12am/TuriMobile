import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { generateAIDialogue, AIDialogueStep, GenerateDialogueParams } from '../services/gemini';
import { useStore } from '../store';
import { getTranslation } from '../constants/translations';
import AppPanel from './AppPanel';
import { PanelBackdrop } from './AppPanel';
import { PanelTitle, PanelButton } from './PanelElements';

interface AIDialogueModalProps {
  dialogueId: number;
  requiredWords: string[];
  onGenerated: (dialogue: AIDialogueStep[]) => void;
  onClose: () => void;
}

const AIDialogueModal: React.FC<AIDialogueModalProps> = ({
  dialogueId,
  requiredWords,
  onGenerated,
  onClose
}) => {
  const { motherLanguage, targetLanguage, setIsMovementDisabled } = useStore();
  const [userPreferences, setUserPreferences] = useState('');
  const [length, setLength] = useState<'simple' | 'normal' | 'complex'>('normal');
  const [complexity, setComplexity] = useState<'simple' | 'normal' | 'complex'>('normal');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Disable movement when modal is open
  useEffect(() => {
    setIsMovementDisabled(true);
    
    return () => {
      setIsMovementDisabled(false);
    };
  }, [setIsMovementDisabled]);

  const handleGenerate = async () => {
    if (isGenerating) return;

    setIsGenerating(true);
    setError(null);

    try {
      const params: GenerateDialogueParams = {
        targetLanguage,
        motherLanguage,
        requiredWords,
        userPreferences: userPreferences.trim() || undefined,
        complexity: length, // Use length for the number of exchanges
        linguisticComplexity: complexity // Add linguistic complexity
      };

      const dialogue = await generateAIDialogue(params);
      onGenerated(dialogue);
      onClose();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
    } finally {
      setIsGenerating(false);
    }
  };

  const getLengthDescription = (level: 'simple' | 'normal' | 'complex') => {
    switch (level) {
      case 'simple':
        return 'Short (2 exchanges)';
      case 'normal':
        return 'Standard (4 exchanges)';
      case 'complex':
        return 'Extended (6 exchanges)';
    }
  };

  const getComplexityDescription = (level: 'simple' | 'normal' | 'complex') => {
    switch (level) {
      case 'simple':
        return 'Beginner level';
      case 'normal':
        return 'Intermediate level';
      case 'complex':
        return 'Advanced level';
    }
  };

  return (
    <PanelBackdrop style={{ zIndex: 10000 }}>
      <div style={{ pointerEvents: 'auto' }}>
        <AppPanel width="600px" height="auto" padding={0}>
          <div className="p-4 flex justify-between items-center border-b border-white/10">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-purple-400" />
              <PanelTitle className="m-0">
                Generate AI Dialogue
              </PanelTitle>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              aria-label="Close modal"
            >
              <X size={18} />
            </button>
          </div>
          
          <div className="p-6 space-y-6" style={{ pointerEvents: 'auto' }}>
            {/* Info Section */}
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-4">
              <h3 className="text-blue-300 font-medium mb-2">About AI Dialogues</h3>
              <p className="text-blue-200/80 text-sm mb-2">
                AI-generated dialogues are experimental and may vary in quality. They will include all required vocabulary words for Dialogue {dialogueId}.
              </p>
              <p className="text-blue-200/60 text-xs">
                Required words: {requiredWords.join(', ')}
              </p>
            </div>

            {/* Dialogue Length Selection */}
            <div>
              <label className="block text-white font-medium mb-3">
                Dialogue Length
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['simple', 'normal', 'complex'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setLength(level)}
                    className={`p-3 rounded-lg border transition-all ${
                      length === level
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium capitalize">{level}</div>
                    <div className="text-xs mt-1 opacity-80">
                      {getLengthDescription(level)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Dialogue Complexity Selection */}
            <div>
              <label className="block text-white font-medium mb-3">
                Dialogue Complexity
              </label>
              <div className="grid grid-cols-3 gap-3">
                {(['simple', 'normal', 'complex'] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => setComplexity(level)}
                    className={`p-3 rounded-lg border transition-all ${
                      complexity === level
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200'
                        : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10'
                    }`}
                  >
                    <div className="font-medium capitalize">{level}</div>
                    <div className="text-xs mt-1 opacity-80">
                      {getComplexityDescription(level)}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* User Preferences */}
            <div>
              <label htmlFor="preferences" className="block text-white font-medium mb-2">
                Dialogue Theme or Preferences (Optional)
              </label>
              <textarea
                id="preferences"
                value={userPreferences}
                onChange={(e) => setUserPreferences(e.target.value)}
                placeholder="e.g., 'Make it about ordering food at a restaurant' or 'Focus on greetings and introductions'"
                className="w-full h-24 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 resize-none focus:outline-none focus:border-purple-500 focus:bg-white/15 transition-colors"
                maxLength={200}
                disabled={isGenerating}
              />
              <div className="text-right text-xs text-white/50 mt-1">
                {userPreferences.length}/200
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-900/30 border border-red-800 text-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium mb-1">Generation Failed</div>
                  <div className="text-sm text-red-200/80 mb-2">{error}</div>
                  {error.includes('model') && (
                    <div className="text-xs text-red-200/60">
                      The AI service is being updated. Please try the original dialogue instead.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4 border-t border-white/10">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors"
                disabled={isGenerating}
              >
                Cancel
              </button>
              <PanelButton
                onClick={handleGenerate}
                disabled={isGenerating || requiredWords.length === 0}
                className="flex-1 flex items-center justify-center gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    {getTranslation(motherLanguage, 'generateAIDialogue') || 'Generate Dialogue'}
                  </>
                )}
              </PanelButton>
            </div>

            {/* Warning */}
            <div className="text-center text-xs text-white/50">
              AI dialogues are not stored permanently and are for practice only.
            </div>
          </div>
        </AppPanel>
      </div>
    </PanelBackdrop>
  );
};

export default AIDialogueModal; 