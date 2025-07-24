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
  
  // Word explanation modal
  meaningAndUsage?: string;
  examples?: string;
  otherForms?: string;
  loadingExplanation?: string;
  tryAgainOrSearch?: string;
  aiExplanationWarning?: string;
  
  // Google search
  explanationWithExamples?: string;
  
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
    
    // Word explanation modal
    meaningAndUsage: 'Meaning & Usage',
    examples: 'Examples',
    otherForms: 'Other Forms',
    loadingExplanation: 'Loading explanation...',
    tryAgainOrSearch: 'Please try again or use the Google search instead.',
    aiExplanationWarning: 'This explanation was generated by AI and may vary in accuracy. Cross-reference with dictionaries for critical usage.',
    
    // Google search
    explanationWithExamples: 'explanation with examples',
    
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
    
    // Word explanation modal
    meaningAndUsage: 'Значение и использование',
    examples: 'Примеры',
    otherForms: 'Другие формы',
    loadingExplanation: 'Загрузка объяснения...',
    tryAgainOrSearch: 'Попробуйте еще раз или используйте поиск Google.',
    aiExplanationWarning: 'Это объяснение создано ИИ и может содержать неточности. Проверьте в словарях для критического использования.',
    
    // Google search
    explanationWithExamples: 'объяснение с примерами',
    
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
    startJourney: "Comenzar mi viaje",
    
    // Word explanation modal
    meaningAndUsage: 'Significado y uso',
    examples: 'Ejemplos',
    otherForms: 'Otras formas',
    loadingExplanation: 'Cargando explicación...',
    tryAgainOrSearch: 'Inténtalo de nuevo o usa la búsqueda de Google.',
    aiExplanationWarning: 'Esta explicación fue generada por IA y puede contener inexactitudes. Consulta diccionarios para uso crítico.',
    
    // Google search
    explanationWithExamples: 'explicación con ejemplos'
  },
  fr: {
    firstQuestion: "D'abord, quelle langue parlez-vous déjà ?",
    secondQuestion: "Bien, maintenant choisissez la langue que vous souhaitez apprendre :",
    readyQuestion: "Parfait ! Prêt à commencer votre voyage linguistique ?",
    yourLanguage: "Votre langue",
    languageToLearn: "Langue à apprendre",
    goBack: "Retour",
    startJourney: "Commencer mon voyage",
    
    // Word explanation modal
    meaningAndUsage: 'Signification et usage',
    examples: 'Exemples',
    otherForms: 'Autres formes',
    loadingExplanation: 'Chargement de l\'explication...',
    tryAgainOrSearch: 'Veuillez réessayer ou utiliser la recherche Google.',
    aiExplanationWarning: 'Cette explication a été générée par IA et peut contenir des inexactitudes. Consultez les dictionnaires pour un usage critique.',
    
    // Google search
    explanationWithExamples: 'explication avec exemples'
  },
  de: {
    firstQuestion: "Zuerst, welche Sprache sprichst du bereits?",
    secondQuestion: "Gut, wähle jetzt die Sprache aus, die du lernen möchtest:",
    readyQuestion: "Perfekt! Bereit, deine Sprachreise zu beginnen?",
    yourLanguage: "Deine Sprache",
    languageToLearn: "Sprache zum Lernen",
    goBack: "Zurück",
    startJourney: "Meine Reise beginnen",
    
    // Word explanation modal
    meaningAndUsage: 'Bedeutung und Verwendung',
    examples: 'Beispiele',
    otherForms: 'Andere Formen',
    loadingExplanation: 'Erklärung wird geladen...',
    tryAgainOrSearch: 'Bitte versuchen Sie es erneut oder nutzen Sie die Google-Suche.',
    aiExplanationWarning: 'Diese Erklärung wurde von KI generiert und kann Ungenauigkeiten enthalten. Konsultieren Sie Wörterbücher für kritischen Gebrauch.',
    
    // Google search
    explanationWithExamples: 'Erklärung mit Beispielen'
  },
  it: {
    firstQuestion: "Prima di tutto, quale lingua parli già?",
    secondQuestion: "Bene, ora scegli la lingua che vuoi imparare:",
    readyQuestion: "Perfetto! Pronto per iniziare il tuo viaggio linguistico?",
    yourLanguage: "La tua lingua",
    languageToLearn: "Lingua da imparare",
    goBack: "Indietro",
    startJourney: "Inizia il mio viaggio",
    
    // Word explanation modal
    meaningAndUsage: 'Significato e uso',
    examples: 'Esempi',
    otherForms: 'Altre forme',
    loadingExplanation: 'Caricamento spiegazione...',
    tryAgainOrSearch: 'Riprova o usa la ricerca Google.',
    aiExplanationWarning: 'Questa spiegazione è stata generata dall\'IA e può contenere inesattezze. Consulta i dizionari per uso critico.',
    
    // Google search
    explanationWithExamples: 'spiegazione con esempi'
  },
  pt: {
    firstQuestion: "Primeiro, que língua você já fala?",
    secondQuestion: "Bom, agora escolha o idioma que deseja aprender:",
    readyQuestion: "Perfeito! Pronto para começar sua jornada linguística?",
    yourLanguage: "Seu idioma",
    languageToLearn: "Idioma para aprender",
    goBack: "Voltar",
    startJourney: "Iniciar minha jornada",
    
    // Word explanation modal
    meaningAndUsage: 'Significado e uso',
    examples: 'Exemplos',
    otherForms: 'Outras formas',
    loadingExplanation: 'Carregando explicação...',
    tryAgainOrSearch: 'Tente novamente ou use a pesquisa do Google.',
    aiExplanationWarning: 'Esta explicação foi gerada por IA e pode conter imprecisões. Consulte dicionários para uso crítico.',
    
    // Google search
    explanationWithExamples: 'explicação com exemplos'
  },
  ar: {
    firstQuestion: "أولاً، ما هي اللغة التي تتحدثها بالفعل؟",
    secondQuestion: "جيد، الآن اختر اللغة التي تريد تعلمها:",
    readyQuestion: "ممتاز! هل أنت مستعد لبدء رحلتك اللغوية؟",
    yourLanguage: "لغتك",
    languageToLearn: "اللغة المراد تعلمها",
    goBack: "رجوع",
    startJourney: "ابدأ رحلتي",
    
    // Word explanation modal
    meaningAndUsage: 'المعنى والاستخدام',
    examples: 'أمثلة',
    otherForms: 'أشكال أخرى',
    loadingExplanation: 'جاري تحميل الشرح...',
    tryAgainOrSearch: 'حاول مرة أخرى أو استخدم بحث جوجل.',
    aiExplanationWarning: 'هذا الشرح تم إنشاؤه بواسطة الذكاء الاصطناعي وقد يحتوي على أخطاء. راجع القواميس للاستخدام الحرج.',
    
    // Google search
    explanationWithExamples: 'شرح مع أمثلة'
  },
  CH: {
    firstQuestion: "首先，你已经会说什么语言？",
    secondQuestion: "好的，现在选择你想学习的语言：",
    readyQuestion: "太好了！准备开始你的语言之旅了吗？",
    yourLanguage: "你的语言",
    languageToLearn: "要学习的语言",
    goBack: "返回",
    startJourney: "开始我的旅程",
    
    // Word explanation modal
    meaningAndUsage: '含义和用法',
    examples: '例子',
    otherForms: '其他形式',
    loadingExplanation: '正在加载解释...',
    tryAgainOrSearch: '请重试或使用谷歌搜索。',
    aiExplanationWarning: '此解释由AI生成，可能包含不准确之处。请参考词典进行关键用法。',
    
    // Google search
    explanationWithExamples: '解释和例子'
  },
  ja: {
    firstQuestion: "まず、すでに話せる言語は何ですか？",
    secondQuestion: "良いでしょう、次に学びたい言語を選んでください：",
    readyQuestion: "素晴らしい！言語の旅を始める準備はできましたか？",
    yourLanguage: "あなたの言語",
    languageToLearn: "学ぶ言語",
    goBack: "戻る",
    startJourney: "旅を始める",
    
    // Word explanation modal
    meaningAndUsage: '意味と用法',
    examples: '例',
    otherForms: '他の形',
    loadingExplanation: '説明を読み込み中...',
    tryAgainOrSearch: 'もう一度試すかGoogle検索をご利用ください。',
    aiExplanationWarning: 'この説明はAIによって生成されており、不正確な場合があります。重要な用法については辞書をご確認ください。',
    
    // Google search
    explanationWithExamples: '例付きの説明'
  },
  av: {
    firstQuestion: "Лъикӏасда, нуж мез бацӀцӀад мацӀ ругел?",
    secondQuestion: "Лъикӏ, гьанже нужеб хъвангьа мацӀ кӏварал:",
    readyQuestion: "Лъикӏ! Нуж мацӀалъул сапар бокьингьа готӀана?",
    yourLanguage: "Дуда мацӀ",
    languageToLearn: "Кӏваранилъул мацӀ",
    goBack: "Нахъе",
    startJourney: "Дуда сапар бокьине",
    
    // Word explanation modal
    meaningAndUsage: 'МаъналъулгӀо гӀишло',
    examples: 'Мисаллълъи',
    otherForms: 'НаһиеялъЮл формалъи',
    loadingExplanation: 'Шарх кӀалайдо...',
    tryAgainOrSearch: 'Кӏочӏ кӏвараб я Google-ал лъазаб гӀишлъе.',
    aiExplanationWarning: 'Гьаб шарх ИИ-лъул гӀуцӀубго ругел, нижецӀа рагъулассеб букӀинчӀогубал рал букӀанеб. Мухтараб гӀишлолъе словарзабихъе ончӀараб.',
    
    // Google search
    explanationWithExamples: 'мисаллълъихъе шарх'
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