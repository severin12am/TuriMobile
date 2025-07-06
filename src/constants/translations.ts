// Support for 100+ most popular languages - expandable list
export type SupportedLanguage = 
  | 'en' | 'ru' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ar' | 'CH' | 'ja' | 'av'
  | 'ko' | 'hi' | 'th' | 'vi' | 'tr' | 'pl' | 'nl' | 'sv' | 'da' | 'no'
  | 'fi' | 'cs' | 'sk' | 'hu' | 'ro' | 'bg' | 'hr' | 'sr' | 'sl' | 'et'
  | 'lv' | 'lt' | 'mt' | 'ga' | 'cy' | 'is' | 'fo' | 'eu' | 'ca' | 'gl'
  | 'ast' | 'oc' | 'co' | 'sc' | 'rm' | 'fur' | 'lad' | 'an' | 'ext' | 'mwl'
  | 'he' | 'fa' | 'ur' | 'ps' | 'ku' | 'az' | 'kk' | 'ky' | 'uz' | 'tk'
  | 'mn' | 'bo' | 'my' | 'km' | 'lo' | 'si' | 'ta' | 'te' | 'kn' | 'ml'
  | 'bn' | 'gu' | 'pa' | 'or' | 'as' | 'ne' | 'mr' | 'sa' | 'sd' | 'dv'
  | 'am' | 'ti' | 'om' | 'so' | 'sw' | 'zu' | 'xh' | 'af' | 'st' | 'tn'
  | 've' | 'ts' | 'ss' | 'nr' | 'nso' | 'lg' | 'rw' | 'rn' | 'ny' | 'sn'
  | 'id' | 'ms' | 'tl' | 'ceb' | 'hil' | 'war' | 'bcl' | 'pag' | 'mrw' | 'tsg';

interface TranslationStrings {
  // Language selection
  firstQuestion?: string;
  secondQuestion?: string;
  readyQuestion?: string;
  yourLanguage?: string;
  languageToLearn?: string;
  goBack?: string;
  startJourney?: string;
  
  // Helper robot instructions
  goToCharacter?: string;
  findNextCharacter?: string;
  levelRestriction?: string;
  dialogueControls?: string;
  quizControls?: string;
  close?: string;
  hint?: string;
  tipTitle?: string;
  
  // Login/Signup
  email?: string;
  password?: string;
  login?: string;
  signup?: string;
  createAccount?: string;
  alreadyHaveAccount?: string;
  dontHaveAccount?: string;
  skip?: string;
  saveProgress?: string;
  welcomeBack?: string;
  createAccountInfo?: string;
  loginInfo?: string;
  accountRequired?: string;
  enterEmail?: string;
  enterPassword?: string;
  logIn?: string;
  needAccount?: string;
  haveAccount?: string;
  skipForNow?: string;
  emailRequired?: string;
  
  // Character names
  characterNames?: Record<number, string>;
  
  // Dialogue selection
  selectDialogue?: string;
  dialogue?: string;
  completed?: string;
  available?: string;
  locked?: string;
  completedText?: string;
  clickToStartText?: string;
  completePreviousText?: string;
  loading?: string;
  error?: string;
  refresh?: string;
  generateAIDialogue?: string;
  
  // AI Dialogue Modal
  generateAIDialogueTitle?: string;
  aboutAIDialogues?: string;
  aiDialogueDescription?: string;
  requiredWords?: string;
  dialogueLength?: string;
  dialogueComplexity?: string;
  dialogueThemePreferences?: string;
  dialogueThemePlaceholder?: string;
  generationFailed?: string;
  aiServiceUpdating?: string;
  cancel?: string;
  generating?: string;
  aiDialogueWarning?: string;
  unknownError?: string;
  
  // Dialogue length descriptions
  lengthShort?: string;
  lengthStandard?: string;
  lengthExtended?: string;
  
  // Complexity descriptions
  complexityBeginner?: string;
  complexityIntermediate?: string;
  complexityAdvanced?: string;
  
  // Level labels
  levelSimple?: string;
  levelNormal?: string;
  levelComplex?: string;
}

// Partial record allows for gradual expansion of translations
export const translations: Partial<Record<SupportedLanguage, TranslationStrings>> & Record<'en' | 'ru', TranslationStrings> = {
  en: {
    firstQuestion: "Firstly, what language do you already speak?",
    secondQuestion: "Good, now choose language you want to learn:",
    readyQuestion: "Perfect! Ready to begin your language journey?",
    yourLanguage: "Your language",
    languageToLearn: "Language to learn",
    goBack: "Go Back",
    startJourney: "Start my journey",
    
    // Helper robot instructions
    goToCharacter: 'Go towards next character. You can review previous levels by approaching their characters but you can`t skip levels',
    findNextCharacter: 'You finished level {level}! Good job. Now let\'s find {character}',
    levelRestriction: 'This character is for level {level}. Complete previous levels first.',
    dialogueControls: 'Click on the return button to try again or click on the sound button to hear pronunciation. You can click on any word and find info on this word (or select a group of words)',
    quizControls: 'Click "Try Again" to retry this word.',
    close: 'Close',
    hint: 'Hint',
    tipTitle: 'Tip',
    
    // Login/Signup
    email: 'Email',
    password: 'Password',
    login: 'Login',
    signup: 'Sign Up',
    createAccount: 'Create Account',
    alreadyHaveAccount: 'Already have an account?',
    dontHaveAccount: 'Don\'t have an account?',
    skip: 'Skip',
    saveProgress: 'Save Your Progress',
    welcomeBack: 'Welcome Back!',
    createAccountInfo: 'Great job on your first quiz! Create an account to save your progress and continue your language journey.',
    loginInfo: 'Log in to track your learning progress across all devices.',
    accountRequired: 'Note: Creating an account is required to save your progress. Your learning journey will be lost if you continue without an account.',
    enterEmail: 'Enter your email address',
    enterPassword: 'Enter your password',
    logIn: 'Log In',
    needAccount: 'Need an account? Sign up',
    haveAccount: 'Already have an account? Log in',
    skipForNow: 'Skip for now',
    emailRequired: 'Please enter a valid email address',
    
    // Character names
    characterNames: {
      1: 'Tom',
      2: 'Noah',
      3: 'Emma',
      4: 'Olivia',
      5: 'Jack'
    },
    
    // Dialogue selection
    selectDialogue: 'Select a Dialogue',
    dialogue: 'Dialogue',
    completed: 'Completed',
    available: 'Available',
    locked: 'Locked',
    completedText: 'You have completed this dialogue.',
    clickToStartText: 'Click to start this dialogue.',
    completePreviousText: 'Complete the previous dialogue to unlock.',
    loading: 'Loading dialogues...',
    error: 'An error occurred',
    refresh: 'Refresh',
    generateAIDialogue: 'Generate AI Dialogue',
    
    // AI Dialogue Modal
    generateAIDialogueTitle: 'Generate AI Dialogue',
    aboutAIDialogues: 'About AI Dialogues',
    aiDialogueDescription: 'AI-generated dialogues are experimental and may vary in quality. They will include all required vocabulary words for Dialogue',
    requiredWords: 'Required words',
    dialogueLength: 'Dialogue Length',
    dialogueComplexity: 'Dialogue Complexity',
    dialogueThemePreferences: 'Dialogue Theme or Preferences (Optional)',
    dialogueThemePlaceholder: 'e.g., \'Make it about ordering food at a restaurant\' or \'Focus on greetings and introductions\'',
    generationFailed: 'Generation Failed',
    aiServiceUpdating: 'The AI service is being updated. Please try the original dialogue instead.',
    cancel: 'Cancel',
    generating: 'Generating...',
    aiDialogueWarning: 'AI dialogues are not stored permanently and are for practice only.',
    unknownError: 'Unknown error occurred',
    
    // Dialogue length descriptions
    lengthShort: 'Short (2 exchanges)',
    lengthStandard: 'Standard (4 exchanges)',
    lengthExtended: 'Extended (6 exchanges)',
    
    // Complexity descriptions
    complexityBeginner: 'Beginner level',
    complexityIntermediate: 'Intermediate level',
    complexityAdvanced: 'Advanced level',
    
    // Level labels
    levelSimple: 'Simple',
    levelNormal: 'Normal',
    levelComplex: 'Complex'
  },
  ru: {
    firstQuestion: "Сначала, какой язык вы уже знаете?",
    secondQuestion: "Отлично, теперь выберите язык, который хотите изучать:",
    readyQuestion: "Прекрасно! Готовы начать изучение языка?",
    yourLanguage: "Ваш язык",
    languageToLearn: "Язык для изучения",
    goBack: "Назад",
    startJourney: "Начать обучение",
    
    // Helper robot instructions
    goToCharacter: 'Идите к следующему персонажу. Вы можете повторить предыдущие уровни, подойдя к их персонажам, но не можете пропускать уровни',
    findNextCharacter: 'Вы закончили уровень {level}! Отличная работа. Теперь найдем {character}',
    levelRestriction: 'Этот персонаж для уровня {level}. Сначала завершите предыдущие уровни.',
    dialogueControls: 'Нажмите на кнопку возврата, чтобы повторить, или на кнопку звука, чтобы услышать произношение. Вы можете нажать на любое слово, чтобы найти информацию о нем (или выделить группу слов)',
    quizControls: 'Нажмите "Попробовать снова", чтобы повторить это слово.',
    close: 'Закрыть',
    hint: 'Подсказка',
    tipTitle: 'Совет',
    
    // Login/Signup
    email: 'Электронная почта',
    password: 'Пароль',
    login: 'Войти',
    signup: 'Регистрация',
    createAccount: 'Создать аккаунт',
    alreadyHaveAccount: 'Уже есть аккаунт?',
    dontHaveAccount: 'Нет аккаунта?',
    skip: 'Пропустить',
    saveProgress: 'Сохраните ваш прогресс',
    welcomeBack: 'С возвращением!',
    createAccountInfo: 'Отличная работа на вашем первом тесте! Создайте аккаунт, чтобы сохранить прогресс и продолжить изучение языка.',
    loginInfo: 'Войдите, чтобы отслеживать прогресс обучения на всех устройствах.',
    accountRequired: 'Примечание: Создание аккаунта необходимо для сохранения прогресса. Ваш прогресс будет потерян, если вы продолжите без аккаунта.',
    enterEmail: 'Введите ваш email адрес',
    enterPassword: 'Введите ваш пароль',
    logIn: 'Войти',
    needAccount: 'Нужен аккаунт? Зарегистрироваться',
    haveAccount: 'Уже есть аккаунт? Войти',
    skipForNow: 'Пропустить',
    emailRequired: 'Пожалуйста, введите корректный email адрес',
    
    // Character names
    characterNames: {
      1: 'Том',
      2: 'Ной',
      3: 'Эмма',
      4: 'Оливия',
      5: 'Джек'
    },
    
    // Dialogue selection
    selectDialogue: 'Выберите диалог',
    dialogue: 'Диалог',
    completed: 'Завершен',
    available: 'Доступен',
    locked: 'Заблокирован',
    completedText: 'Вы завершили этот диалог.',
    clickToStartText: 'Нажмите, чтобы начать этот диалог.',
    completePreviousText: 'Завершите предыдущий диалог, чтобы разблокировать.',
    loading: 'Загрузка диалогов...',
    error: 'Произошла ошибка',
    refresh: 'Обновить',
    generateAIDialogue: 'Генерировать ИИ диалог',
    
    // AI Dialogue Modal
    generateAIDialogueTitle: 'Генерировать ИИ диалог',
    aboutAIDialogues: 'О диалогах ИИ',
    aiDialogueDescription: 'Диалоги, созданные ИИ, являются экспериментальными и могут отличаться по качеству. Они будут включать все необходимые словарные слова для диалога',
    requiredWords: 'Необходимые слова',
    dialogueLength: 'Длина диалога',
    dialogueComplexity: 'Сложность диалога',
    dialogueThemePreferences: 'Тема диалога или предпочтения (необязательно)',
    dialogueThemePlaceholder: 'например, \'Сделайте о заказе еды в ресторане\' или \'Сосредоточьтесь на приветствиях и знакомствах\'',
    generationFailed: 'Создание не удалось',
    aiServiceUpdating: 'Сервис ИИ обновляется. Пожалуйста, попробуйте оригинальный диалог.',
    cancel: 'Отмена',
    generating: 'Создание...',
    aiDialogueWarning: 'ИИ диалоги не сохраняются постоянно и предназначены только для практики.',
    unknownError: 'Произошла неизвестная ошибка',
    
    // Dialogue length descriptions
    lengthShort: 'Короткий (2 обмена)',
    lengthStandard: 'Стандартный (4 обмена)',
    lengthExtended: 'Расширенный (6 обменов)',
    
    // Complexity descriptions
    complexityBeginner: 'Начинающий уровень',
    complexityIntermediate: 'Средний уровень',
    complexityAdvanced: 'Продвинутый уровень',
    
    // Level labels
    levelSimple: 'Простой',
    levelNormal: 'Обычный',
    levelComplex: 'Сложный'
  },
  es: {
    firstQuestion: "Primero, ¿qué idioma hablas ya?",
    secondQuestion: "Bien, ahora elige el idioma que quieres aprender:",
    readyQuestion: "¡Perfecto! ¿Listo para comenzar tu viaje lingüístico?",
    yourLanguage: "Tu idioma",
    languageToLearn: "Idioma para aprender",
    goBack: "Volver",
    startJourney: "Comenzar mi viaje"
  },
  fr: {
    firstQuestion: "D'abord, quelle langue parlez-vous déjà ?",
    secondQuestion: "Bien, maintenant choisissez la langue que vous souhaitez apprendre :",
    readyQuestion: "Parfait ! Prêt à commencer votre voyage linguistique ?",
    yourLanguage: "Votre langue",
    languageToLearn: "Langue à apprendre",
    goBack: "Retour",
    startJourney: "Commencer mon voyage"
  },
  de: {
    firstQuestion: "Zuerst, welche Sprache sprichst du bereits?",
    secondQuestion: "Gut, wähle jetzt die Sprache aus, die du lernen möchtest:",
    readyQuestion: "Perfekt! Bereit, deine Sprachreise zu beginnen?",
    yourLanguage: "Deine Sprache",
    languageToLearn: "Sprache zum Lernen",
    goBack: "Zurück",
    startJourney: "Meine Reise beginnen"
  },
  it: {
    firstQuestion: "Prima di tutto, quale lingua parli già?",
    secondQuestion: "Bene, ora scegli la lingua che vuoi imparare:",
    readyQuestion: "Perfetto! Pronto per iniziare il tuo viaggio linguistico?",
    yourLanguage: "La tua lingua",
    languageToLearn: "Lingua da imparare",
    goBack: "Indietro",
    startJourney: "Inizia il mio viaggio"
  },
  pt: {
    firstQuestion: "Primeiro, que língua você já fala?",
    secondQuestion: "Bom, agora escolha o idioma que deseja aprender:",
    readyQuestion: "Perfeito! Pronto para começar sua jornada linguística?",
    yourLanguage: "Seu idioma",
    languageToLearn: "Idioma para aprender",
    goBack: "Voltar",
    startJourney: "Iniciar minha jornada"
  },
  ar: {
    firstQuestion: "أولاً، ما هي اللغة التي تتحدثها بالفعل؟",
    secondQuestion: "جيد، الآن اختر اللغة التي تريد تعلمها:",
    readyQuestion: "ممتاز! هل أنت مستعد لبدء رحلتك اللغوية؟",
    yourLanguage: "لغتك",
    languageToLearn: "اللغة المراد تعلمها",
    goBack: "رجوع",
    startJourney: "ابدأ رحلتي"
  },
  CH: {
    firstQuestion: "首先，你已经会说什么语言？",
    secondQuestion: "好的，现在选择你想学习的语言：",
    readyQuestion: "太好了！准备开始你的语言之旅了吗？",
    yourLanguage: "你的语言",
    languageToLearn: "要学习的语言",
    goBack: "返回",
    startJourney: "开始我的旅程"
  },
  ja: {
    firstQuestion: "まず、すでに話せる言語は何ですか？",
    secondQuestion: "良いでしょう、次に学びたい言語を選んでください：",
    readyQuestion: "素晴らしい！言語の旅を始める準備はできましたか？",
    yourLanguage: "あなたの言語",
    languageToLearn: "学ぶ言語",
    goBack: "戻る",
    startJourney: "旅を始める"
  }
};

// Helper function to get translation with fallback
export const getTranslation = (language: SupportedLanguage, key: keyof TranslationStrings): string => {
  const langTranslations = translations[language];
  if (langTranslations && langTranslations[key]) {
    return langTranslations[key] as string;
  }
  
  // Fallback to English
  const englishTranslations = translations.en;
  if (englishTranslations && englishTranslations[key]) {
    return englishTranslations[key] as string;
  }
  
  // Final fallback
  return key;
};

// Helper function to get character name with fallback
export const getCharacterName = (language: SupportedLanguage, characterId: number): string => {
  const langTranslations = translations[language];
  if (langTranslations?.characterNames?.[characterId]) {
    return langTranslations.characterNames[characterId];
  }
  
  // Fallback to English
  const englishTranslations = translations.en;
  if (englishTranslations?.characterNames?.[characterId]) {
    return englishTranslations.characterNames[characterId];
  }
  
  // Final fallback
  return `Character ${characterId}`;
};