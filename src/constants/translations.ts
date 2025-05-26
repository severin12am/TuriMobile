export type SupportedLanguage = 'en' | 'ru' | 'es' | 'fr' | 'de' | 'it' | 'pt' | 'ar' | 'zh' | 'ja';

interface TranslationStrings {
  firstQuestion?: string;
  secondQuestion?: string;
  readyQuestion?: string;
  yourLanguage?: string;
  languageToLearn?: string;
  goBack?: string;
  startJourney?: string;
}

export const translations: Record<SupportedLanguage, TranslationStrings> = {
  en: {
    firstQuestion: "Firstly, what language do you already speak?",
    secondQuestion: "Good, now choose language you want to learn:",
    readyQuestion: "Perfect! Ready to begin your language journey?",
    yourLanguage: "Your language",
    languageToLearn: "Language to learn",
    goBack: "Go Back",
    startJourney: "Start my journey"
  },
  ru: {
    firstQuestion: "Сначала, какой язык вы уже знаете?",
    secondQuestion: "Отлично, теперь выберите язык, который хотите изучать:",
    readyQuestion: "Прекрасно! Готовы начать изучение языка?",
    yourLanguage: "Ваш язык",
    languageToLearn: "Язык для изучения",
    goBack: "Назад",
    startJourney: "Начать обучение"
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
  zh: {
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