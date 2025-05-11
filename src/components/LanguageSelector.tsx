import React, { useState, useRef, useEffect } from 'react';
import { LanguageOption } from '../types';
import { animateText } from '../utils/animations';
import { ChevronDown, Check } from 'lucide-react';

interface LanguageSelectorProps {
  languages: LanguageOption[];
  label: string;
  onChange: (language: LanguageOption) => void;
  selectedLanguage: LanguageOption | null;
  animate?: boolean;
  direction?: 'ltr' | 'rtl';
}

const LanguageSelector: React.FC<LanguageSelectorProps> = ({ 
  languages, 
  label, 
  onChange, 
  selectedLanguage,
  animate = false,
  direction = 'ltr'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  
  useEffect(() => {
    if (animate && labelRef.current) {
      animateText(labelRef.current, label, 1050);
    }
  }, [label, animate]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full mb-6" ref={dropdownRef}>
      <span 
        ref={labelRef} 
        className="block mb-2 text-lg font-medium text-slate-300"
        style={{ direction }}
      >
        {label}
      </span>
      
      <div 
        className="flex items-center justify-between w-full p-3 transition-all duration-300 border rounded-lg cursor-pointer bg-slate-800/60 border-slate-700 hover:border-indigo-500 group"
        onClick={() => setIsOpen(!isOpen)}
        style={{ direction }}
      >
        <span className="text-lg font-medium text-slate-300">
          {selectedLanguage ? selectedLanguage.nativeName : 'Select a language'}
        </span>
        <ChevronDown 
          className={`w-5 h-5 transition-transform duration-300 text-slate-300 group-hover:text-indigo-400 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </div>
      
      {isOpen && (
        <div 
          className="absolute z-10 w-full mt-1 overflow-y-auto bg-slate-900/95 border border-slate-700 rounded-lg shadow-lg backdrop-blur-sm max-h-60"
          style={{ direction }}
        >
          {languages.map((language) => (
            <div
              key={language.code}
              className={`flex items-center justify-between p-3 cursor-pointer transition-colors duration-150 hover:bg-indigo-700/30 ${
                selectedLanguage?.code === language.code ? 'bg-indigo-900/50' : ''
              }`}
              onClick={() => {
                onChange(language);
                setIsOpen(false);
              }}
            >
              <span className="text-slate-300">{language.nativeName}</span>
              {selectedLanguage?.code === language.code && (
                <Check className="w-5 h-5 text-indigo-400" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;