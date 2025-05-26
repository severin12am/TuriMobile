import React, { useState, useRef } from 'react';
import LanguageSelector from './LanguageSelector';
import { LanguageOption } from '../types';
import { SelectionState } from '../types';
import { POPULAR_LANGUAGES } from '../constants/languages';
import { translations, SupportedLanguage } from '../constants/translations';
import { ArrowLeft } from 'lucide-react';
import AppPanel from './AppPanel';
import { PanelBackdrop } from './AppPanel';
import { PanelTitle, PanelButton } from './PanelElements';

interface LanguagePanelProps {
  onLanguagesSelected: (known: LanguageOption, learn: LanguageOption) => void;
}

const LanguagePanel: React.FC<LanguagePanelProps> = ({ onLanguagesSelected }) => {
  const [knownLanguage, setKnownLanguage] = useState<LanguageOption | null>(null);
  const [learnLanguage, setLearnLanguage] = useState<LanguageOption | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>(SelectionState.SELECT_KNOWN);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  
  const getTranslation = (language: LanguageOption | null) => {
    if (!language) return null;
    return translations[language.code as SupportedLanguage] || null;
  };
  
  const handleKnownLanguageChange = (language: LanguageOption) => {
    // Set the language
    setKnownLanguage(language);
    // Always go to the learn language step when a known language is selected
    setSelectionState(SelectionState.SELECT_LEARN);
  };
  
  const handleLearnLanguageChange = (language: LanguageOption) => {
    // Set the language and immediately show the final screen
    setLearnLanguage(language);
    setSelectionState(SelectionState.READY_TO_START);
  };
  
  const handleStart = () => {
    if (knownLanguage && learnLanguage) {
      onLanguagesSelected(knownLanguage, learnLanguage);
    }
  };

  const handleBack = () => {
    if (selectionState === SelectionState.READY_TO_START) {
      setSelectionState(SelectionState.SELECT_LEARN);
      setLearnLanguage(null);
    } else if (selectionState === SelectionState.SELECT_LEARN) {
      setSelectionState(SelectionState.SELECT_KNOWN);
      setKnownLanguage(null);
    }
  };
  
  // Simplify title text logic even further
  const getTitleText = () => {
    const translation = getTranslation(knownLanguage);
    
    // If we have both languages selected, show the final text
    if (knownLanguage && learnLanguage) {
      return translation?.readyQuestion || "Perfect! Ready to begin your language journey?";
    }
    
    // If we have only the first language selected, show the second prompt
    if (knownLanguage) {
      return translation?.secondQuestion || "Good, now choose language you want to learn:";
    }
    
    // Default to first question
    return translation?.firstQuestion || "Firstly, what language do you already speak?";
  };
  
  const getLearnLanguages = () => {
    if (!knownLanguage) return POPULAR_LANGUAGES;
    return POPULAR_LANGUAGES.filter((lang: LanguageOption) => lang.code !== knownLanguage.code);
  };
  
  const translation = getTranslation(knownLanguage);
  
  return (
    <PanelBackdrop>
      <AppPanel width="600px" padding={40}>
        <div className="h-20 flex items-center justify-center">
          <PanelTitle className="text-center" withAnimation>
            <span style={{ direction: knownLanguage?.code === 'ar' ? 'rtl' : 'ltr' }}>
              {getTitleText()}
            </span>
          </PanelTitle>
        </div>
        
        <div className="space-y-6">
          <LanguageSelector
            languages={POPULAR_LANGUAGES}
            label={translation?.yourLanguage || "Your language"}
            onChange={handleKnownLanguageChange}
            selectedLanguage={knownLanguage}
            animate={false}
          />
          
          {knownLanguage && (
            <LanguageSelector
              languages={getLearnLanguages()}
              label={translation?.languageToLearn || "Language to learn"}
              onChange={handleLearnLanguageChange}
              selectedLanguage={learnLanguage}
              animate={false}
            />
          )}
          
          {selectionState === SelectionState.READY_TO_START && (
            <div className="space-y-4">
              <PanelButton
                onClick={handleBack}
                className="w-full flex items-center justify-center gap-2"
                style={{ direction: knownLanguage?.code === 'ar' ? 'rtl' : 'ltr' }}
              >
                <ArrowLeft className="w-5 h-5" />
                {translation?.goBack || "Go Back"}
              </PanelButton>
              <PanelButton
                ref={buttonRef}
                onClick={handleStart}
                variant="primary"
                className="w-full"
                style={{ 
                  direction: knownLanguage?.code === 'ar' ? 'rtl' : 'ltr'
                }}
              >
                {translation?.startJourney || "Start my journey"}
              </PanelButton>
            </div>
          )}
        </div>
      </AppPanel>
    </PanelBackdrop>
  );
};

export default LanguagePanel;
