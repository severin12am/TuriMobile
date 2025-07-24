# Gemini API Word Explanation Prompt Shell

This is the ready-to-use prompt template that the application uses to fetch word explanations from Google Gemini API.

## Prompt Template

```
You are a language learning assistant. Provide a moderately detailed explanation in [motherLanguage] for the word '[word]' in [targetLanguage]. Include:

- A clear meaning and usage context.
- 2-3 example sentences in [targetLanguage] with their translations in [motherLanguage].
- If the word is inflective (declinable/conjugatable), list other forms (e.g., cases, tenses) with translations in [motherLanguage].

Format the response as a JSON object with keys: 'meaning', 'examples' (array of {sentence, translation}), and 'inflections' (array of {form, translation} if applicable, otherwise empty array).

Example format:
{
  "meaning": "A detailed explanation of the word's meaning and usage context in [motherLanguage]",
  "examples": [
    {
      "sentence": "Example sentence in [targetLanguage]",
      "translation": "Translation in [motherLanguage]"
    }
  ],
  "inflections": [
    {
      "form": "Inflected form in [targetLanguage]",
      "translation": "Translation in [motherLanguage]"
    }
  ]
}
```

## Usage

To use this prompt:

1. Replace `[word]` with the actual word to explain
2. Replace `[targetLanguage]` with the language being learned (e.g., "Russian", "Spanish")
3. Replace `[motherLanguage]` with the user's native language (e.g., "English", "Spanish")

## Example Implementation

```javascript
const word = "книга";
const targetLanguage = "Russian";
const motherLanguage = "English";

const prompt = `You are a language learning assistant. Provide a moderately detailed explanation in ${motherLanguage} for the word '${word}' in ${targetLanguage}. Include:

- A clear meaning and usage context.
- 2-3 example sentences in ${targetLanguage} with their translations in ${motherLanguage}.
- If the word is inflective (declinable/conjugatable), list other forms (e.g., cases, tenses) with translations in ${motherLanguage}.

Format the response as a JSON object with keys: 'meaning', 'examples' (array of {sentence, translation}), and 'inflections' (array of {form, translation} if applicable, otherwise empty array).`;
```

## Sample API Response

For the word "книга" (Russian for "book"), the API should return:

```json
{
  "meaning": "A book is a written or printed work consisting of pages bound together. In Russian, книга is a feminine noun that refers to any type of book, whether fiction, non-fiction, textbook, or other reading material.",
  "examples": [
    {
      "sentence": "Я читаю интересную книгу",
      "translation": "I am reading an interesting book"
    },
    {
      "sentence": "В библиотеке много книг",
      "translation": "There are many books in the library"
    },
    {
      "sentence": "Она купила новую книгу",
      "translation": "She bought a new book"
    }
  ],
  "inflections": [
    {
      "form": "книги (genitive singular, nominative plural)",
      "translation": "of a book, books"
    },
    {
      "form": "книге (dative, prepositional singular)",
      "translation": "to a book, about a book"
    },
    {
      "form": "книгу (accusative singular)",
      "translation": "a book (direct object)"
    },
    {
      "form": "книгой (instrumental singular)",
      "translation": "with a book"
    }
  ]
}
```

## Configuration

The application uses these API settings:
- **Temperature**: 0.3 (lower for consistent explanations)
- **Max Tokens**: 800
- **Rate Limit**: 10 requests per minute
- **Model Fallback**: gemini-2.5-flash → gemini-2.5-pro → gemini-2.0-flash → gemini-1.5-flash → gemini-1.5-pro

## Error Handling

The system handles:
- Rate limiting exceeded
- Invalid API responses  
- Network connectivity issues
- Malformed JSON responses
- Missing explanation data

## Integration

This prompt is implemented in `src/services/gemini.ts` in the `generateWordExplanation` function and used by the word hover functionality in the DialogueBox component. 