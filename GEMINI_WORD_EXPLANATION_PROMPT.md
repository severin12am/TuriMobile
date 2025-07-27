# Gemini API Word Explanation Prompt Shell

This is the ready-to-use prompt template that the application uses to fetch word explanations from Google Gemini API.

## Prompt Template

```
You are a language learning assistant. Explain the word '[word]' in [targetLanguage] using [motherLanguage]. Include:A concise meaning (1-2 sentences for simple words; 3-4 for complex words).
4 example sentences, if possible: 2 general in [targetLanguage] with [motherLanguage] translations, and 2 from popular movies, series, books, or memes a native speaker would associate with the word. Include the source in the translation, e.g., "Translation (from 'The Great Gatsby')." If media/meme examples are unavailable, use general examples. Return fewer than 4 examples if necessary.
For inflective words, list relevant forms (e.g., singular/plural for nouns, cases in [targetLanguage], genders for adjectives/nouns, persons for pronouns, or key verb forms like infinitive/imperative/past). For non-inflective words (e.g., adverbs) or languages without certain categories (e.g., no cases in English), return an empty inflections array.

Return a JSON object with keys: 'meaning', 'examples' (array of {sentence, translation}), and 'inflections' (array of {form, translation} or empty).Example format:
{
  "meaning": "Concise meaning in [motherLanguage]",
  "examples": [
    {
      "sentence": "Sentence in [targetLanguage]",
      "translation": "Translation in [motherLanguage] (optional source)"
    }
  ],
  "inflections": [
    {
      "form": "Form in [targetLanguage]",
      "translation": "Translation in [motherLanguage]"
    }
  ]
}
```


## Usage

To use this prompt:
1. Replace `[word]` with the word to explain (e.g., "книга" or "сегодня").
2. Replace `[targetLanguage]` with the language being learned (e.g., "Russian", "Spanish").
3. Replace `[motherLanguage]` with the user's native language (e.g., "English", "Spanish").
The prompt provides a concise meaning, 4 example sentences (2 general, 2 from popular media/memes with sources in translations), and relevant grammatical forms (or none for non-inflective words).

## Example Implementation

```javascript
const word = "книга";
const targetLanguage = "Russian";
const motherLanguage = "English";

const prompt = `You are a language learning assistant. Explain the word '${word}' in ${targetLanguage} using ${motherLanguage}. Include:

- A concise meaning (1-2 sentences for simple words; 3-4 for complex words).
- 4 example sentences, if possible: 2 general in ${targetLanguage} with ${motherLanguage} translations, and 2 from popular movies, series, books, or memes a native speaker would associate with the word. Include the source in the translation, e.g., "Translation (from 'The Great Gatsby')." If media/meme examples are unavailable, use general examples. Return fewer than 4 examples if necessary.
- For inflective words, list relevant forms (e.g., singular/plural for nouns, cases in ${targetLanguage], genders for adjectives/nouns, persons for pronouns, or key verb forms like infinitive/imperative/past). For non-inflective words (e.g., adverbs) or languages without certain categories (e.g., no cases in English), return an empty inflections array.

Return a JSON object with keys: 'meaning', 'examples' (array of {sentence, translation}), and 'inflections' (array of {form, translation} or empty).`;
```

## Sample API Response

For the word "книга" (Russian for "book"), the API should return:

```json
{
  "meaning": "'Книга' is a Russian feminine noun meaning 'book,' used for any written or printed work.",
  "examples": [
    {
      "sentence": "Я читаю интересную книгу.",
      "translation": "I’m reading an interesting book."
    },
    {
      "sentence": "В библиотеке много книг.",
      "translation": "There are many books in the library."
    },
    {
      "sentence": "Книга – лучший подарок!",
      "translation": "A book is the best gift! (from a popular Russian saying)"
    },
    {
      "sentence": "Я взял книгу из библиотеки Хогвартса.",
      "translation": "I took a book from the Hogwarts library (from 'Harry Potter' Russian translation)."
    }
  ],
  "inflections": [
    {
      "form": "книга (nominative singular)",
      "translation": "book"
    },
    {
      "form": "книги (genitive singular, nominative plural)",
      "translation": "of a book, books"
    },
    {
      "form": "книге (dative/prepositional singular)",
      "translation": "to/about a book"
    },
    {
      "form": "книгу (accusative singular)",
      "translation": "book (direct object)"
    },
    {
      "form": "книгой (instrumental singular)",
      "translation": "with a book"
    }
  ]
}
For a non-inflective word like "сегодня" (Russian for "today"):
{
  "meaning": "'Сегодня' is a Russian adverb meaning 'today,' used to refer to the current day.",
  "examples": [
    {
      "sentence": "Сегодня я иду в парк.",
      "translation": "Today, I’m going to the park."
    },
    {
      "sentence": "Сегодня очень жарко.",
      "translation": "It’s very hot today."
    },
    {
      "sentence": "Сегодня твой день!",
      "translation": "Today is your day! (from 'Бригада' TV series)"
    },
    {
      "sentence": "Сегодня всё будет по-новому!",
      "translation": "Today, everything will be new! (from a Russian motivational meme)"
    }
  ],
  "inflections": []
}
```

## Configuration

The application uses these API settings:Temperature: 0.3 (for consistent explanations)
Max Tokens: 0
Rate Limit: 10 requests per minute
Model Fallback: gemini-2.5-flash → gemini-2.5-pro → gemini-2.0-flash → gemini-1.5-flash → gemini-1.5-pro

Monitor token usage to ensure responses fit within the 800-token limit, especially for complex words. Consider caching frequent words (e.g., "книга") to reduce API calls.

Error Handling
The system handles:Rate limiting exceeded
Invalid API responses
Network connectivity issues
Malformed JSON responses
Missing explanation data
Fewer than 4 examples (displays available examples)

## Integration

This prompt is implemented in src/services/gemini.ts in the generateWordExplanation function and used by the word hover functionality in the DialogueBox component. No code changes are needed, as the JSON structure remains consistent (keys: meaning, examples, inflections).