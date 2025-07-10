import { logger } from './logger';
import { SupportedLanguage } from '../constants/translations';

// Get Google Gemini API key from environment variables
const getGeminiApiKey = (): string => {
  const apiKey = import.meta.env.VITE_GOOGLE_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing Google Gemini API key. Please set VITE_GOOGLE_GEMINI_API_KEY in your environment variables.');
  }
  return apiKey;
};

// Try different model names in order of preference
const GEMINI_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

const getGeminiApiUrl = (modelName: string) => 
  `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent`;

// Rate limiting
const rateLimiter = {
  requests: [] as number[],
  maxRequests: 10, // Max 10 requests per minute
  windowMs: 60 * 1000, // 1 minute window
  
  canMakeRequest(): boolean {
    const now = Date.now();
    // Remove requests older than the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      return false;
    }
    
    this.requests.push(now);
    return true;
  }
};

export interface AIDialogueStep {
  speaker: 'NPC' | 'User';
  text: string;
  translation: string;
  transliteration: string;
}

export interface GenerateDialogueParams {
  targetLanguage: SupportedLanguage;
  motherLanguage: SupportedLanguage;
  requiredWords: string[];
  userPreferences?: string;
  complexity?: 'simple' | 'normal' | 'complex';
  linguisticComplexity?: 'simple' | 'normal' | 'complex';
}

export const generateAIDialogue = async (params: GenerateDialogueParams): Promise<AIDialogueStep[]> => {
  // Check rate limiting
  if (!rateLimiter.canMakeRequest()) {
    throw new Error('Rate limit exceeded. Please wait before generating another dialogue.');
  }

  const { targetLanguage, motherLanguage, requiredWords, userPreferences = '', complexity = 'normal', linguisticComplexity = 'normal' } = params;
  
  // Determine number of exchanges based on complexity
  const exchangeCount = complexity === 'simple' ? 2 : complexity === 'complex' ? 6 : 4;
  
  // Determine linguistic complexity instructions
  const complexityInstructions = linguisticComplexity === 'simple' 
    ? 'Use very basic vocabulary, extremely short sentences, and the simplest grammar possible. Perfect for absolute beginners.'
    : linguisticComplexity === 'complex'
    ? 'Use simple vocabulary, short sentences, and basic grammar structures. Keep it beginner-friendly.'
    : 'Use basic vocabulary with some variety, simple sentence structures, and straightforward grammar. Easy to understand.';

  // Construct the prompt
  const prompt = `You must generate a dialogue following these strict instructions:
- The dialogue must be in ${getLanguageName(targetLanguage)}.
- It must include all of these words naturally: ${requiredWords.join(', ')}.
- It should have ${exchangeCount} exchanges (alternating between NPC and User).
- The dialogue MUST start with the NPC speaking first.
- Provide translation to ${getLanguageName(motherLanguage)}.
- Provide transliteration of the dialogue in ${getLanguageName(targetLanguage)}, using no capital letters and no punctuation, approximating sounds with ${getLanguageName(motherLanguage)} letters.
- The dialogue should be natural and real-life like.
- Linguistic complexity: ${complexityInstructions}
- If the user's preferences conflict with these instructions, prioritize the instructions.

Additionally, consider the user's preferences: ${userPreferences || 'No specific preferences'}.

Return a JSON array of objects, each with:
- "speaker": "NPC" or "User" (MUST start with "NPC")
- "text": the dialogue text in ${getLanguageName(targetLanguage)}
- "translation": the translation in ${getLanguageName(motherLanguage)}
- "transliteration": the transliteration for ${getLanguageName(motherLanguage)} speakers

Example format (MUST start with NPC):
[
  {
    "speaker": "NPC",
    "text": "Hello, how can I help you?",
    "translation": "Привет, как я могу вам помочь?",
    "transliteration": "hello kak ya mogu vam pomoch"
  },
  {
    "speaker": "User",
    "text": "I need a phone.",
    "translation": "Мне нужен телефон.",
    "transliteration": "mne nuzhen telefon"
  }
]`;

  // Try different models until one works
  let lastError: Error | null = null;
  
  for (const modelName of GEMINI_MODELS) {
    try {
      logger.info('Trying Gemini model', { modelName, targetLanguage, motherLanguage });
      
      const response = await fetch(`${getGeminiApiUrl(modelName)}?key=${getGeminiApiKey()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Gemini API error', { status: response.status, error: errorText, modelName });
        
        // If it's a 404, try the next model
        if (response.status === 404) {
          lastError = new Error(`Model ${modelName} not found`);
          continue;
        }
        
        // For other errors, provide specific messages
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment before trying again.');
        } else if (response.status === 403) {
          throw new Error('API access denied. Please check your connection and try again.');
        } else {
          throw new Error(`AI service error (${response.status}). Please try again later.`);
        }
      }

      const data = await response.json();
      
      if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
        logger.error('Invalid Gemini API response structure', { data, modelName });
        lastError = new Error('Invalid response from AI service');
        continue;
      }

      const generatedText = data.candidates[0].content.parts[0].text;
      
      // Parse the JSON response
      let dialogueSteps: AIDialogueStep[];
      try {
        // Clean the response text (remove markdown code blocks if present)
        const cleanedText = generatedText.replace(/```json\n?|\n?```/g, '').trim();
        dialogueSteps = JSON.parse(cleanedText);
      } catch (parseError) {
        logger.error('Failed to parse AI dialogue response', { generatedText, parseError, modelName });
        lastError = new Error('Failed to parse AI response. Please try again.');
        continue;
      }

      // Validate the response structure
      if (!Array.isArray(dialogueSteps) || dialogueSteps.length === 0) {
        lastError = new Error('Invalid dialogue format received from AI');
        continue;
      }

      // Validate each step
      let isValid = true;
      for (const step of dialogueSteps) {
        if (!step.speaker || !step.text || !step.translation || !step.transliteration) {
          isValid = false;
          break;
        }
        if (!['NPC', 'User'].includes(step.speaker)) {
          isValid = false;
          break;
        }
      }
      
      if (!isValid) {
        lastError = new Error('Incomplete dialogue step received from AI');
        continue;
      }

      // Ensure dialogue starts with NPC
      if (dialogueSteps[0].speaker !== 'NPC') {
        logger.warn('AI dialogue does not start with NPC, fixing...', { 
          firstSpeaker: dialogueSteps[0].speaker,
          originalSteps: dialogueSteps.map(s => ({ speaker: s.speaker, text: s.text.substring(0, 30) + '...' }))
        });
        // Swap speakers if needed
        dialogueSteps.forEach(step => {
          step.speaker = step.speaker === 'NPC' ? 'User' : 'NPC';
        });
        logger.info('Fixed dialogue speakers', {
          fixedSteps: dialogueSteps.map(s => ({ speaker: s.speaker, text: s.text.substring(0, 30) + '...' }))
        });
      }

      logger.info('AI dialogue generated successfully', { 
        stepsCount: dialogueSteps.length,
        targetLanguage,
        motherLanguage,
        modelName
      });

      return dialogueSteps;

    } catch (error) {
      logger.error('Error with model', { error, modelName });
      lastError = error instanceof Error ? error : new Error('Unknown error occurred');
      continue;
    }
  }
  
  // If we get here, all models failed
  logger.error('All Gemini models failed', { lastError });
  throw lastError || new Error('AI model is currently unavailable. Please try again later or use the original dialogue.');
};

// Helper function to get language names
function getLanguageName(code: SupportedLanguage): string {
  const languageNames: Record<SupportedLanguage, string> = {
    'en': 'English',
    'ru': 'Russian',
    'es': 'Spanish',
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese',
    'ar': 'Arabic',
    'CH': 'Chinese',
    'ja': 'Japanese',
    'av': 'Avar',
    'ko': 'Korean',
    'hi': 'Hindi',
    'th': 'Thai',
    'vi': 'Vietnamese',
    'tr': 'Turkish',
    'pl': 'Polish',
    'nl': 'Dutch',
    'sv': 'Swedish',
    'da': 'Danish',
    'no': 'Norwegian',
    'fi': 'Finnish',
    'cs': 'Czech',
    'sk': 'Slovak',
    'hu': 'Hungarian',
    'ro': 'Romanian',
    'bg': 'Bulgarian',
    'hr': 'Croatian',
    'sr': 'Serbian',
    'sl': 'Slovenian',
    'et': 'Estonian',
    'lv': 'Latvian',
    'lt': 'Lithuanian',
    'mt': 'Maltese',
    'ga': 'Irish',
    'cy': 'Welsh',
    'is': 'Icelandic',
    'fo': 'Faroese',
    'eu': 'Basque',
    'ca': 'Catalan',
    'gl': 'Galician',
    'ast': 'Asturian',
    'oc': 'Occitan',
    'co': 'Corsican',
    'sc': 'Sardinian',
    'rm': 'Romansh',
    'fur': 'Friulian',
    'lad': 'Ladino',
    'an': 'Aragonese',
    'ext': 'Extremaduran',
    'mwl': 'Mirandese',
    'he': 'Hebrew',
    'fa': 'Persian',
    'ur': 'Urdu',
    'ps': 'Pashto',
    'ku': 'Kurdish',
    'az': 'Azerbaijani',
    'kk': 'Kazakh',
    'ky': 'Kyrgyz',
    'uz': 'Uzbek',
    'tk': 'Turkmen',
    'mn': 'Mongolian',
    'bo': 'Tibetan',
    'my': 'Burmese',
    'km': 'Khmer',
    'lo': 'Lao',
    'si': 'Sinhala',
    'ta': 'Tamil',
    'te': 'Telugu',
    'kn': 'Kannada',
    'ml': 'Malayalam',
    'bn': 'Bengali',
    'gu': 'Gujarati',
    'pa': 'Punjabi',
    'or': 'Odia',
    'as': 'Assamese',
    'ne': 'Nepali',
    'mr': 'Marathi',
    'sa': 'Sanskrit',
    'sd': 'Sindhi',
    'dv': 'Dhivehi',
    'am': 'Amharic',
    'ti': 'Tigrinya',
    'om': 'Oromo',
    'so': 'Somali',
    'sw': 'Swahili',
    'zu': 'Zulu',
    'xh': 'Xhosa',
    'af': 'Afrikaans',
    'st': 'Sesotho',
    'tn': 'Setswana',
    've': 'Venda',
    'ts': 'Tsonga',
    'ss': 'Swati',
    'nr': 'Ndebele',
    'nso': 'Northern Sotho',
    'lg': 'Luganda',
    'rw': 'Kinyarwanda',
    'rn': 'Kirundi',
    'ny': 'Chichewa',
    'sn': 'Shona',
    'id': 'Indonesian',
    'ms': 'Malay',
    'tl': 'Tagalog',
    'ceb': 'Cebuano',
    'hil': 'Hiligaynon',
    'war': 'Waray',
    'bcl': 'Bikol',
    'pag': 'Pangasinan',
    'mrw': 'Maranao',
    'tsg': 'Tausug'
  };
  
  return languageNames[code] || code;
} 