import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from '../store';
import { logger } from '../services/logger';
import HelperRobotModel from '../scenes/HelperRobotModel';
import { supabase } from '../services/supabase';
import { checkAndUpdateUserProgress } from '../services/auth';
import AppPanel from './AppPanel';
import { PanelBackdrop } from './AppPanel';
import { PanelTitle, PanelButton, PanelSelect } from './PanelElements';
import DirectionArrow from './DirectionArrow';

interface HelperRobotProps {
  instructions: Record<string, string>;
  onLanguageSelect: (mother: string, target: string) => void;
  onLogin: () => void;
  position?: { x: number; y: number };
  scale?: number;
  onClick?: () => void;
}

const ANIMATION_SPEED = 30;
const PANEL_WIDTH = 600;
const PANEL_HEIGHT = 576;
const SPACING = 32; // 2rem or 32px consistent spacing

const languages = [
  { code: 'en', name: 'English (English)', nameRu: 'Английский (English)' },
  { code: 'ru', name: 'Русский (Russian)', nameRu: 'Русский (Russian)' },
  { code: 'es', name: 'Español (Spanish)', nameRu: 'Испанский (Spanish)' },
  { code: 'fr', name: 'Français (French)', nameRu: 'Французский (French)' },
  { code: 'de', name: 'Deutsch (German)', nameRu: 'Немецкий (German)' },
  { code: 'it', name: 'Italiano (Italian)', nameRu: 'Итальянский (Italian)' },
  { code: 'pt', name: 'Português (Portuguese)', nameRu: 'Португальский (Portuguese)' },
  { code: 'ar', name: 'العربية (Arabic)', nameRu: 'Арабский (Arabic)' },
  { code: 'CH', name: '中文 (Chinese)', nameRu: 'Китайский (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)', nameRu: 'Японский (Japanese)' }
];

const translations = {
  en: {
    whatLanguage: "Hi! I'm Turi, I will guide you on your language learning journey! Firstly, what language do you already speak?",
    whatToLearn: 'Good, now choose language you want to learn',
    ready: 'Ready to begin your journey!',
    selectDifferent: 'Please select a different language',
    chooseLanguage: 'Choose language...',
    chooseLanguageYouSpeak: 'Choose your native language',
    startJourney: 'Start my journey',
    haveAccount: 'Already have an account?',
    back: 'Back'
  },
  ru: {
    whatLanguage: 'Привет! Я Тури, я буду вашим проводником в изучении языка! Для начала, какой язык вы уже знаете?',
    whatToLearn: 'Отлично, теперь выберите язык, который хотите изучать',
    ready: 'Готовы начать путешествие!',
    selectDifferent: 'Пожалуйста, выберите другой язык',
    chooseLanguage: 'Выберите язык...',
    chooseLanguageYouSpeak: 'Выберите родной язык',
    startJourney: 'Начать мое путешествие',
    haveAccount: 'Уже есть аккаунт?',
    back: 'Назад'
  },
  de: {
    whatLanguage: 'Hallo! Ich bin Turi und werde Sie auf Ihrer Sprachlernreise begleiten! Zunächst, welche Sprache sprechen Sie bereits?',
    whatToLearn: 'Gut, wählen Sie nun die Sprache aus, die Sie lernen möchten',
    ready: 'Bereit, Ihre Reise zu beginnen!',
    selectDifferent: 'Bitte wählen Sie eine andere Sprache',
    chooseLanguage: 'Sprache auswählen...',
    chooseLanguageYouSpeak: 'Wählen Sie Ihre Muttersprache',
    startJourney: 'Meine Reise beginnen',
    haveAccount: 'Bereits ein Konto?',
    back: 'Zurück'
  },
  es: {
    whatLanguage: '¡Hola! Soy Turi, ¡seré tu guía en tu viaje de aprendizaje de idiomas! Primero, ¿qué idioma ya hablas?',
    whatToLearn: 'Bien, ahora elige el idioma que quieres aprender',
    ready: '¡Listo para comenzar tu viaje!',
    selectDifferent: 'Por favor, selecciona un idioma diferente',
    chooseLanguage: 'Elegir idioma...',
    chooseLanguageYouSpeak: 'Elige tu lengua materna',
    startJourney: 'Comenzar mi viaje',
    haveAccount: '¿Ya tienes una cuenta?',
    back: 'Atrás'
  },
  fr: {
    whatLanguage: 'Bonjour ! Je suis Turi, je serai votre guide dans votre voyage d\'apprentissage des langues ! Tout d\'abord, quelle langue parlez-vous déjà ?',
    whatToLearn: 'Bien, maintenant choisissez la langue que vous voulez apprendre',
    ready: 'Prêt à commencer votre voyage !',
    selectDifferent: 'Veuillez sélectionner une langue différente',
    chooseLanguage: 'Choisir la langue...',
    chooseLanguageYouSpeak: 'Choisissez votre langue maternelle',
    startJourney: 'Commencer mon voyage',
    haveAccount: 'Déjà un compte ?',
    back: 'Retour'
  },
  it: {
    whatLanguage: 'Ciao! Sono Turi, ti guiderò nel tuo viaggio di apprendimento delle lingue! Prima di tutto, quale lingua parli già?',
    whatToLearn: 'Bene, ora scegli la lingua che vuoi imparare',
    ready: 'Pronto per iniziare il tuo viaggio!',
    selectDifferent: 'Per favore, seleziona una lingua diversa',
    chooseLanguage: 'Scegli la lingua...',
    chooseLanguageYouSpeak: 'Scegli la tua lingua madre',
    startJourney: 'Iniziare il mio viaggio',
    haveAccount: 'Hai già un account?',
    back: 'Indietro'
  },
  pt: {
    whatLanguage: 'Olá! Eu sou Turi, serei seu guia na sua jornada de aprendizado de idiomas! Primeiro, qual idioma você já fala?',
    whatToLearn: 'Ótimo, agora escolha o idioma que você quer aprender',
    ready: 'Pronto para começar sua jornada!',
    selectDifferent: 'Por favor, selecione um idioma diferente',
    chooseLanguage: 'Escolher idioma...',
    chooseLanguageYouSpeak: 'Escolha seu idioma nativo',
    startJourney: 'Começar minha jornada',
    haveAccount: 'Já tem uma conta?',
    back: 'Voltar'
  },
  ar: {
    whatLanguage: 'مرحباً! أنا توري، سأكون مرشدك في رحلة تعلم اللغة! أولاً، ما هي اللغة التي تتحدثها بالفعل؟',
    whatToLearn: 'جيد، الآن اختر اللغة التي تريد تعلمها',
    ready: 'مستعد لبدء رحلتك!',
    selectDifferent: 'الرجاء اختيار لغة مختلفة',
    chooseLanguage: 'اختر اللغة...',
    chooseLanguageYouSpeak: 'اختر لغتك الأم',
    startJourney: 'ابدأ رحلتي',
    haveAccount: 'هل لديك حساب بالفعل؟',
    back: 'رجوع'
  },
  CH: {
    whatLanguage: '你好！我是图里，我将指导您的语言学习之旅！首先，您已经会说什么语言？',
    whatToLearn: '很好，现在选择您想学习的语言',
    ready: '准备开始您的旅程！',
    selectDifferent: '请选择其他语言',
    chooseLanguage: '选择语言...',
    chooseLanguageYouSpeak: '选择您的母语',
    startJourney: '开始我的旅程',
    haveAccount: '已有账户？',
    back: '返回'
  },
  ja: {
    whatLanguage: 'こんにちは！私はトゥリです。言語学習の旅のガイドを務めさせていただきます！まず、すでに話せる言語は何ですか？',
    whatToLearn: 'では、学びたい言語を選んでください',
    ready: '旅を始める準備ができました！',
    selectDifferent: '別の言語を選択してください',
    chooseLanguage: '言語を選択...',
    chooseLanguageYouSpeak: '母国語を選択してください',
    startJourney: '私の旅を始める',
    haveAccount: 'すでにアカウントをお持ちですか？',
    back: '戻る'
  }
};

const HelperRobot: React.FC<HelperRobotProps> = ({ 
  instructions, 
  onLanguageSelect, 
  onLogin,
  position = { x: 0, y: 0 },
  scale = 1,
  onClick
}) => {
  const { 
    isHelperRobotOpen, 
    isLanguageSelected,
    modelPaths,
    setIsLanguageSelected,
    user,
    isLoggedIn,
    targetLanguage,
    motherLanguage
  } = useStore();
  
  const [selectedMotherLang, setSelectedMotherLang] = useState<string>('');
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>('');
  const [step, setStep] = useState<'mother' | 'target' | 'ready'>('mother');
  const [isAnimating, setIsAnimating] = useState(true);
  const [texts, setTexts] = useState({
    question: '',
    account: ''
  });
  
  // State for rotating language placeholder
  const [placeholderLang, setPlaceholderLang] = useState<string>('en');
  
  const t = translations[selectedMotherLang as keyof typeof translations] || translations.en;
  const placeholderText = translations[placeholderLang as keyof typeof translations]?.chooseLanguageYouSpeak || translations.en.chooseLanguageYouSpeak;

  // Setup rotation of placeholder languages
  useEffect(() => {
    // Only rotate when on the mother language selection step
    if (step !== 'mother') return;
    
    const languageCodes = Object.keys(translations);
    let currentIndex = 0;
    
    const interval = setInterval(() => {
      currentIndex = (currentIndex + 1) % languageCodes.length;
      setPlaceholderLang(languageCodes[currentIndex]);
    }, 2000); // Rotate every 2 seconds
    
    return () => clearInterval(interval);
  }, [step]);

  const animateAllTexts = (questionText: string, accountText: string) => {
    setIsAnimating(true);
    let iteration = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const maxLength = Math.max(questionText.length, accountText.length);
    
    const interval = setInterval(() => {
      setTexts(prev => ({
        question: questionText
          .split('')
          .map((letter, index) => {
            if (index < iteration) return letter;
            return letters[Math.floor(Math.random() * 26)];
          })
          .join(''),
        account: accountText
          .split('')
          .map((letter, index) => {
            if (index < iteration) return letter;
            return letters[Math.floor(Math.random() * 26)];
          })
          .join('')
      }));
      
      iteration += 1;
      
      if (iteration > maxLength) {
        clearInterval(interval);
        setIsAnimating(false);
      }
    }, ANIMATION_SPEED);
  };

  useEffect(() => {
    animateAllTexts(translations.en.whatLanguage, translations.en.haveAccount);
    
    // Debug mount/unmount
    console.log("🤖 HelperRobot component MOUNTED");
    return () => {
      console.log("🤖 HelperRobot component UNMOUNTED");
    };
  }, []);

  useEffect(() => {
    if (step === 'mother') {
      animateAllTexts(t.whatLanguage, t.haveAccount);
    }
  }, [step === 'mother', t.whatLanguage, t.haveAccount]);

  const handleMotherLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    if (!lang) return;
    
    setSelectedMotherLang(lang);
    setStep('target');
    const newT = translations[lang as keyof typeof translations] || translations.en;
    animateAllTexts(newT.whatToLearn, newT.haveAccount);
  };

  const handleTargetLanguageSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const lang = e.target.value;
    if (!lang || lang === selectedMotherLang) {
      setTexts(prev => ({
        ...prev,
        question: t.selectDifferent
      }));
      return;
    }
    
    setSelectedTargetLang(lang);
    setStep('ready');
    animateAllTexts(t.ready, t.haveAccount);
  };

  const handleStartJourney = () => {
    onLanguageSelect(selectedMotherLang, selectedTargetLang);
    setIsLanguageSelected(true);
  };

  const handleBack = () => {
    if (step === 'target') {
      setStep('mother');
      setSelectedMotherLang('');
      animateAllTexts(t.whatLanguage, t.haveAccount);
    } else if (step === 'ready') {
      setStep('target');
      setSelectedTargetLang('');
      setTexts({
        question: t.whatToLearn,
        account: t.haveAccount
      });
    }
  };

  // Handle robot click - delegate to parent onClick handler
  const handleRobotClick = (e: React.MouseEvent) => {
    // Prevent default behavior and stop propagation
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    console.log("🤖 Helper robot clicked! User:", user?.id, "isLoggedIn:", isLoggedIn);
    logger.info('Helper robot clicked', { userId: user?.id, isLoggedIn });
    
    // Call the onClick prop if it exists
    if (onClick) {
      console.log("🤖 Calling parent onClick handler");
      onClick();
    }
  };
  
  return (
    <div className="pointer-events-auto fixed" style={{ zIndex: 100 }}>
      <div className="relative">
        <div 
          className="w-96 h-96 mb-2 helper-robot-container cursor-pointer relative"
          onClick={handleRobotClick}
          style={{ pointerEvents: 'auto' }}
        >
          {/* Only show direction arrow when user is logged in and has selected a language */}
          {isLoggedIn && isLanguageSelected && (
            <DirectionArrow />
          )}
          
          <Canvas 
            camera={{ position: [0, 0, 5], fov: 50 }}
            style={{ pointerEvents: 'auto' }}
            onClick={(e) => {
              e.stopPropagation();
              console.log("🤖 Canvas clicked");
              handleRobotClick(e as any);
            }}
          >
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <HelperRobotModel 
              path={modelPaths.helperRobot} 
              onClick={() => handleRobotClick(undefined as any)}
            />
          </Canvas>
        </div>
        
        {/* LANGUAGE SELECTION PANEL - only show when this is being used for language selection */}
        {instructions.mode === "language_selection" && !isLanguageSelected && !isLoggedIn && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30" style={{ zIndex: 101 }}>
            <div 
              className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700 shadow-2xl relative overflow-hidden"
              style={{ 
                width: PANEL_WIDTH,
                height: PANEL_HEIGHT,
                padding: SPACING 
              }}
            >
              {/* Question section - fixed height */}
              <div className="h-32 flex items-center justify-center">
                <h2 className={`text-2xl font-bold text-center text-slate-100 ${isAnimating ? 'animate-glitch' : ''}`}>
                  {texts.question || t.whatLanguage}
                </h2>
              </div>
              
              {/* Dropdowns section - fixed position */}
              <div className="space-y-4">
                {/* Label for mother language selection */}
                <div className="mb-1 text-slate-300 text-lg font-medium">
                  {step === 'mother' && 
                    <span className="flex items-center">
                      <span className="inline-block w-2 h-2 bg-blue-400 rounded-full mr-2 animate-pulse"></span>
                    </span>
                  }
                </div>
                <select
                  value={selectedMotherLang}
                  onChange={handleMotherLanguageSelect}
                  className={`w-full h-16 rounded-lg bg-slate-800/60 border text-white transition-all appearance-none px-4 ${
                    step === 'mother' 
                      ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 animate-pulse-subtle' 
                      : 'border-slate-700'
                  }`}
                  disabled={step !== 'mother'}
                >
                  <option value="" className="bg-gray-900">
                    {step === 'mother' ? placeholderText : t.chooseLanguageYouSpeak}
                  </option>
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-gray-900">
                      {lang.name}
                    </option>
                  ))}
                </select>
                
                <div className={`transition-all duration-300 ${step === 'mother' ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
                  <div className="mb-1 text-slate-300 text-lg font-medium mt-6">
                    {step === 'target' && 
                      <span className="flex items-center">
                        <span className="inline-block w-2 h-2 bg-indigo-400 rounded-full mr-2 animate-pulse"></span>
                      </span>
                    }
                  </div>
                  <select
                    value={selectedTargetLang}
                    onChange={handleTargetLanguageSelect}
                    className={`w-full h-16 rounded-lg bg-slate-800/60 border text-white transition-all appearance-none px-4 ${
                      step === 'target' 
                        ? 'border-indigo-500 shadow-lg shadow-indigo-500/20 animate-pulse-subtle' 
                        : 'border-slate-700'
                    }`}
                    disabled={step === 'mother' || step === 'ready'}
                  >
                    <option value="" className="bg-gray-900">
                      {t.chooseLanguage}
                    </option>
                    {languages.map(lang => (
                      <option 
                        key={lang.code} 
                        value={lang.code}
                        className="bg-gray-900"
                        disabled={lang.code === selectedMotherLang}
                      >
                        {lang.code === selectedMotherLang ? `${lang.name} (${t.selectDifferent})` : lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Action buttons - fixed position at bottom */}
              <div className={`absolute bottom-8 left-8 right-8 flex ${step === 'target' || step === 'ready' ? 'justify-between' : 'justify-end'}`}>
                {(step === 'target' || step === 'ready') && (
                  <button
                    onClick={handleBack}
                    className="px-6 py-3 rounded-lg border border-slate-600 bg-slate-800/40 text-slate-300 hover:bg-slate-700/60 hover:border-slate-500 transition-all"
                  >
                    {t.back}
                  </button>
                )}
                
                {step === 'target' && selectedTargetLang && selectedTargetLang !== selectedMotherLang && (
                  <button
                    onClick={handleStartJourney}
                    className="px-6 py-3 rounded-lg border-2 border-indigo-500 bg-indigo-600/20 text-slate-100 hover:bg-indigo-500 hover:text-white transition-all flex items-center"
                  >
                    {t.startJourney}
                  </button>
                )}
                
                {step === 'ready' && (
                  <button
                    onClick={handleStartJourney}
                    className="px-6 py-3 rounded-lg border-2 border-indigo-500 bg-indigo-600/20 text-slate-100 hover:bg-indigo-500 hover:text-white transition-all flex items-center"
                  >
                    {t.startJourney}
                  </button>
                )}
                
                <div className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer flex items-center">
                  <button onClick={() => {
                    // Toggle helper robot to hide the language panel
                    useStore.getState().toggleHelperRobot();
                    // Call the onLogin callback to show the login panel
                    onLogin();
                  }}>{t.haveAccount}</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HelperRobot;