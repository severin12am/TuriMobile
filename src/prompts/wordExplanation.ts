/**
 * Word explanation prompt template for Google Gemini API
 * This is the detailed prompt that generates comprehensive word explanations
 * including meaning, examples from media/culture, inflections, and transliterations
 */
export const generateWordExplanationPrompt = (
  word: string, 
  targetLanguage: string, 
  motherLanguage: string
): string => {
  return `You are a language learning assistant. Explain the word '${word}' in ${targetLanguage} using ${motherLanguage}. Include:

- A concise meaning (1-2 sentences for simple words; 3-4 for complex words).
- 4 example sentences, if possible: 2 general in ${targetLanguage} with ${motherLanguage} translations and transliterations, and 2 from popular culture. Include the source in the translation, e.g., "Translation (from 'The Great Gatsby')." If popular culture reference examples are unavailable, use general examples. Return fewer than 4 examples if necessary. Provide transliterations for each sentence in ${targetLanguage} using a standard system (e.g., Pinyin for Chinese, Romaji for Japanese, or IPA for others).
- For inflective words, list relevant forms (e.g., singular/plural for nouns, cases in ${targetLanguage}, genders for adjectives/nouns, persons for pronouns, or key verb forms like infinitive/imperative/past). For non-inflective words (e.g., adverbs) or languages without certain categories (e.g., no cases in English), return an empty inflections array. Provide transliterations for each inflection form.

Return a JSON object with keys: 'meaning', 'examples' (array of {sentence, transliteration, translation}), and 'inflections' (array of {form, transliteration, translation} or empty).

Example format:
{
  "meaning": "Concise meaning in ${motherLanguage}",
  "examples": [
    {
      "sentence": "Sentence in ${targetLanguage}",
      "transliteration": "Transliteration of the sentence",
      "translation": "Translation in ${motherLanguage} (optional source)"
    }
  ],
  "inflections": [
    {
      "form": "Form in ${targetLanguage}",
      "transliteration": "Transliteration of the form",
      "translation": "Translation in ${motherLanguage}"
    }
  ]
}`;
};