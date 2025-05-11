import React, { useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { useStore } from '../store';
import { logger } from '../services/logger';
import HelperRobotModel from '../scenes/HelperRobotModel';

interface HelperRobotProps {
  instructions: Record<string, string>;
  onLanguageSelect: (mother: string, target: string) => void;
  onLogin: () => void;
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
  { code: 'zh', name: '中文 (Chinese)', nameRu: 'Китайский (Chinese)' },
  { code: 'ja', name: '日本語 (Japanese)', nameRu: 'Японский (Japanese)' }
];

const translations = {
  en: {
    whatLanguage: "Hi! I'm Turi, I will guide you on your language learning journey! Firstly, what language do you already speak?",
    whatToLearn: 'Good, now choose language you want to learn',
    ready: 'Ready to begin your journey!',
    selectDifferent: 'Please select a different language',
    chooseLanguage: 'Choose language...',
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
    startJourney: 'ابدأ رحلتي',
    haveAccount: 'هل لديك حساب بالفعل؟',
    back: 'رجوع'
  },
  zh: {
    whatLanguage: '你好！我是图里，我将指导您的语言学习之旅！首先，您已经会说什么语言？',
    whatToLearn: '很好，现在选择您想学习的语言',
    ready: '准备开始您的旅程！',
    selectDifferent: '请选择其他语言',
    chooseLanguage: '选择语言...',
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
    startJourney: '私の旅を始める',
    haveAccount: 'すでにアカウントをお持ちですか？',
    back: '戻る'
  }
};

const HelperRobot: React.FC<HelperRobotProps> = ({ 
  instructions, 
  onLanguageSelect, 
  onLogin 
}) => {
  const { 
    isHelperRobotOpen, 
    isLanguageSelected,
    modelPaths,
    setIsLanguageSelected
  } = useStore();
  
  const [selectedMotherLang, setSelectedMotherLang] = useState<string>('');
  const [selectedTargetLang, setSelectedTargetLang] = useState<string>('');
  const [step, setStep] = useState<'mother' | 'target' | 'ready'>('mother');
  const [isAnimating, setIsAnimating] = useState(true);
  const [texts, setTexts] = useState({
    question: '',
    account: ''
  });
  
  const t = translations[selectedMotherLang] || translations.en;

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
    const newT = translations[lang] || translations.en;
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
    setTexts({
      question: t.ready,
      account: t.haveAccount
    });
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

  return (
    <div className="fixed top-[5%] left-[5%] z-50">
      <div className="relative">
        <div className="w-96 h-96 mb-2">
          <Canvas camera={{ position: [0, 0, 5], fov: 50 }}>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} />
            <HelperRobotModel path={modelPaths.helperRobot} />
          </Canvas>
        </div>
        
        {isHelperRobotOpen && !isLanguageSelected && (
          <div className="fixed inset-0 flex items-center justify-center bg-black/30">
            <div 
              className="bg-black/50 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
              style={{ 
                width: PANEL_WIDTH,
                height: PANEL_HEIGHT,
                padding: SPACING 
              }}
            >
              {/* Background effects */}
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
              <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
              
              {/* Question section - fixed height */}
              <div style={{ height: 80, marginBottom: 48 }} className="relative">
                <div className="absolute -left-4 -top-4 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                <div className="absolute -right-4 -bottom-4 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-500" />
                <h2 className={`text-2xl font-medium text-white/90 ${isAnimating ? 'animate-glitch' : ''} text-shadow-neon`}>
                  {texts.question || t.whatLanguage}
                </h2>
              </div>
              
              {/* Dropdowns section - fixed position */}
              <div className="space-y-8">
                <select
                  value={selectedMotherLang}
                  onChange={handleMotherLanguageSelect}
                  className="w-full h-16 rounded-2xl bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all appearance-none hover:bg-white/20 px-4"
                  disabled={step !== 'mother'}
                >
                  <option value="" className="bg-gray-900">{t.chooseLanguage}</option>
                  {languages.map(lang => (
                    <option key={lang.code} value={lang.code} className="bg-gray-900">
                      {lang.name}
                    </option>
                  ))}
                </select>
                
                <div className={`transition-all duration-300 ${step === 'mother' ? 'opacity-0 pointer-events-none absolute' : 'opacity-100'}`}>
                  <select
                    value={selectedTargetLang}
                    onChange={handleTargetLanguageSelect}
                    className="w-full h-16 rounded-2xl bg-white/10 border border-white/20 text-white backdrop-blur-sm focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-all appearance-none hover:bg-white/20 px-4"
                    disabled={step === 'mother' || step === 'ready'}
                  >
                    <option value="" className="bg-gray-900">{t.chooseLanguage}</option>
                    {languages.map(lang => (
                      <option 
                        key={lang.code} 
                        value={lang.code}
                        disabled={lang.code === selectedMotherLang}
                        className="bg-gray-900"
                      >
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              {/* Bottom section - fixed position */}
              <div className="absolute bottom-8 left-8 right-8">
                <div className="flex justify-between items-center gap-4">
                  {step !== 'mother' && (
                    <button
                      onClick={handleBack}
                      className="w-32 h-16 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all duration-200 font-medium text-lg backdrop-blur-sm border border-white/10 hover:border-white/30 hover:shadow-neon"
                    >
                      {t.back}
                    </button>
                  )}
                  
                  {step === 'ready' && (
                    <button
                      onClick={handleStartJourney}
                      className="flex-1 h-16 bg-blue-500/90 hover:bg-blue-600/90 text-white rounded-2xl transition-all duration-200 font-medium text-lg backdrop-blur-sm border border-blue-400/30 hover:border-blue-400/50 hover:shadow-neon-blue"
                    >
                      {t.startJourney}
                    </button>
                  )}
                </div>
                
                <div className="mt-4 flex justify-end">
                  <button
                    onClick={onLogin}
                    className={`text-white/80 hover:text-white transition-colors text-sm ${isAnimating ? 'animate-glitch' : ''} hover:text-shadow-neon`}
                  >
                    {texts.account || t.haveAccount}
                  </button>
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