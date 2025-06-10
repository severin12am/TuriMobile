# AI Dialogue Generation Feature

## Overview

The Turi Language Learning App now includes an AI-powered dialogue generation feature that allows users to create custom dialogues using Google's Gemini API. This feature provides an alternative to pre-written dialogues while maintaining the same vocabulary learning objectives.

## How It Works

### User Experience
1. **Access**: In the dialogue selection panel, users see a "Generate AI Dialogue" button next to each unlocked dialogue
2. **Customization**: Users can specify preferences (e.g., "Make it about ordering food") and choose complexity level
3. **Generation**: The AI creates a dialogue that includes all required vocabulary words for that dialogue level
4. **Practice**: Users can practice the AI-generated dialogue just like pre-written ones
5. **Quiz**: After completing the AI dialogue, users take the same vocabulary quiz as the original dialogue

### Technical Implementation

#### Components Added
- **`AIDialogueModal.tsx`**: Modal interface for dialogue generation preferences
- **`gemini.ts`**: Service for Google Gemini API integration with rate limiting
- **Enhanced `DialogueSelectionPanel.tsx`**: Added AI generation buttons and modal integration
- **Enhanced `DialogueBox.tsx`**: Support for AI-generated dialogue rendering
- **Enhanced `City.tsx`**: State management for AI dialogues

#### Key Features
- **Rate Limiting**: Maximum 10 requests per minute to prevent API abuse
- **Vocabulary Integration**: Automatically fetches required words from `words_quiz` table
- **Multi-language Support**: Works with all supported language pairs
- **Error Handling**: Graceful fallback when API calls fail
- **Temporary Storage**: AI dialogues are not stored in database (practice only)

## API Integration

### Gemini API Configuration
- **Models**: Fallback system trying `gemini-1.5-flash`, `gemini-1.5-pro`, `gemini-pro`, `gemini-1.0-pro`
- **API Key**: `AIzaSyB7VePKV2OSzDO-2LhFjyLTQckrK7VRW_4`
- **Safety Settings**: Enabled for content filtering
- **Rate Limiting**: 10 requests per minute
- **Fallback**: Automatic model switching if one fails

### Prompt Structure
The AI receives structured prompts that include:
- Target and mother languages
- Required vocabulary words
- User preferences (optional)
- Complexity level (simple/normal/complex)
- Output format specifications

## Data Flow

1. **Word Fetching**: System fetches vocabulary words for the selected dialogue from `words_quiz` table
2. **User Input**: User optionally provides preferences and selects complexity
3. **API Call**: Structured prompt sent to Gemini API with rate limiting
4. **Response Processing**: JSON response parsed and validated
5. **Dialogue Conversion**: AI response converted to internal dialogue format
6. **Rendering**: Dialogue displayed using existing DialogueBox component
7. **Quiz Integration**: Same vocabulary quiz used as original dialogue

## Error Handling

- **Rate Limiting**: "Rate limit exceeded" message with retry suggestion
- **API Failures**: "Unable to generate dialogue" with fallback to original dialogue
- **Invalid Responses**: Validation ensures proper dialogue structure
- **Network Issues**: Graceful error messages with retry options

## User Notifications

- **Experimental Notice**: Users informed that AI dialogues are experimental
- **Quality Disclaimer**: May vary in quality compared to pre-written dialogues
- **Temporary Nature**: AI dialogues not stored permanently
- **Vocabulary Guarantee**: All required words included in generated dialogue

## Future Enhancements

- **Dialogue Saving**: Option to save favorite AI-generated dialogues
- **Advanced Preferences**: More granular control over dialogue themes
- **Quality Feedback**: User rating system for AI dialogues
- **Offline Mode**: Cached AI dialogues for offline practice
- **Multiple AI Models**: Support for different AI providers

## Usage Guidelines

### For Users
- Use AI dialogues to practice vocabulary in different contexts
- Experiment with different themes and complexity levels
- Remember that AI dialogues are for practice only
- Fall back to original dialogues if AI generation fails

### For Developers
- Monitor API usage to stay within rate limits
- Ensure vocabulary words are properly fetched for each dialogue
- Test with different language pairs
- Handle edge cases gracefully

## Security Considerations

- API key is client-side (consider server-side proxy for production)
- Rate limiting prevents abuse
- Content filtering enabled via Gemini safety settings
- No user data stored in AI dialogue generation process

## Testing

To test the AI dialogue feature:
1. Navigate to any character in the 3D city
2. Select a dialogue that has vocabulary words
3. Click "Generate AI Dialogue" button
4. Customize preferences and generate
5. Practice the AI dialogue
6. Complete the vocabulary quiz

## Troubleshooting

### Common Issues

**"AI model is currently unavailable"**
- The Gemini API models are being updated
- Solution: Use the original dialogue instead
- The system automatically tries multiple model versions

**"Rate limit exceeded"**
- Too many requests in a short time
- Solution: Wait 1 minute before trying again
- Rate limit: 10 requests per minute

**"Failed to parse AI response"**
- AI returned invalid JSON format
- Solution: Try again with simpler preferences
- The system validates all responses before displaying

**Network/Connection Errors**
- Check internet connection
- Try refreshing the page
- Use original dialogue as fallback

### Model Fallback System
The system automatically tries these models in order:
1. `gemini-1.5-flash` (fastest, most current)
2. `gemini-1.5-pro` (more capable)
3. `gemini-pro` (legacy)
4. `gemini-1.0-pro` (fallback)

If all models fail, users are directed to use the original dialogue.

The feature integrates seamlessly with the existing learning flow while providing enhanced customization options for language learners. 