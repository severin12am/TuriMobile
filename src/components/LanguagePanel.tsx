import React, { useState, useEffect, useRef } from 'react';
import LanguageSelector from './LanguageSelector';
import { LanguageOption } from '../types';
import { SelectionState } from '../types';
import { POPULAR_LANGUAGES } from '../constants/languages';
import { translations, SupportedLanguage } from '../constants/translations';
import { animateText } from '../utils/animations';
import { ArrowLeft } from 'lucide-react';

interface LanguagePanelProps {
  onLanguagesSelected: (known: LanguageOption, learn: LanguageOption) => void;
}

const LanguagePanel: React.FC<LanguagePanelProps> = ({ onLanguagesSelected }) => {
  const [knownLanguage, setKnownLanguage] = useState<LanguageOption | null>(null);
  const [learnLanguage, setLearnLanguage] = useState<LanguageOption | null>(null);
  const [selectionState, setSelectionState] = useState<SelectionState>(SelectionState.SELECT_KNOWN);
  
  const buttonRef = useRef<HTMLButtonElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  
  const getTranslation = (language: LanguageOption | null) => {
    if (!language) return null;
    return translations[language.code as SupportedLanguage] || null;
  };
  
  const handleKnownLanguageChange = (language: LanguageOption) => {
    setKnownLanguage(language);
    
    if (selectionState === SelectionState.SELECT_KNOWN) {
      if (titleRef.current) {
        const translation = getTranslation(language);
        const text = translation ? translation.secondQuestion : "Good, now choose language you want to learn:";
        animateText(titleRef.current, text, 1050);
      }
      setTimeout(() => {
        setSelectionState(SelectionState.SELECT_LEARN);
      }, 500);
    }
  };
  
  const handleLearnLanguageChange = (language: LanguageOption) => {
    setLearnLanguage(language);
    
    if (selectionState === SelectionState.SELECT_LEARN) {
      setTimeout(() => {
        setSelectionState(SelectionState.READY_TO_START);
      }, 500);
    }
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
  
  useEffect(() => {
    if (titleRef.current) {
      const translation = getTranslation(knownLanguage);
      let titleText = translation ? translation.firstQuestion : "Firstly, what language do you already speak?";
      
      if (selectionState === SelectionState.SELECT_LEARN) {
        titleText = translation ? translation.secondQuestion : "Good, now choose language you want to learn:";
      } else if (selectionState === SelectionState.READY_TO_START) {
        titleText = translation ? translation.readyQuestion : "Perfect! Ready to begin your language journey?";
      }
      animateText(titleRef.current, titleText, 1050);
    }
  }, [selectionState, knownLanguage]);
  
  const getLearnLanguages = () => {
    if (!knownLanguage) return POPULAR_LANGUAGES;
    return POPULAR_LANGUAGES.filter(lang => lang.code !== knownLanguage.code);
  };
  
  const translation = getTranslation(knownLanguage);
  
  return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-full max-w-xl p-8 mx-4 shadow-2xl rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700">
        <h1 
          ref={titleRef}
          className="mb-8 text-2xl font-bold text-center text-slate-100"
          style={{ direction: knownLanguage?.code === 'ar' ? 'rtl' : 'ltr' }}
        >
          {translation?.firstQuestion || "Firstly, what language do you already speak?"}
        </h1>
        
        <div className="space-y-6">
          <LanguageSelector
            languages={POPULAR_LANGUAGES}
            label={translation?.yourLanguage || "Your language"}
            onChange={handleKnownLanguageChange}
            selectedLanguage={knownLanguage}
            animate={true}
          />
          
          {selectionState !== SelectionState.SELECT_KNOWN && (
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
              <button
                onClick={handleBack}
                className="w-full p-3 text-lg font-medium transition-all duration-300 border rounded-lg border-slate-600 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500 flex items-center justify-center gap-2"
                style={{ direction: knownLanguage?.code === 'ar' ? 'rtl' : 'ltr' }}
              >
                <ArrowLeft className="w-5 h-5" />
                {translation?.goBack || "Go Back"}
              </button>
              <button
                ref={buttonRef}
                onClick={handleStart}
                className="w-full p-4 text-lg font-bold transition-all duration-500 ease-in-out border-2 rounded-lg opacity-0 border-indigo-500 bg-indigo-600/20 text-slate-100 hover:bg-indigo-500 hover:text-white animate-fade-in"
                style={{ 
                  animation: 'fadeIn 1s forwards',
                  direction: knownLanguage?.code === 'ar' ? 'rtl' : 'ltr'
                }}
              >
                {translation?.startJourney || "Start my journey"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LanguagePanel;