# Environment Setup Guide

## Overview

The Turi Language Learning App uses environment variables to securely store API keys and configuration. This prevents sensitive information from being exposed in the source code.

## Required Environment Variables

Create a `.env` file in the root directory of the project with the following variables:

```env
# Google Gemini API Configuration
VITE_GOOGLE_GEMINI_API_KEY=your_google_gemini_api_key_here

# Supabase Configuration (Optional - fallback values exist)
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here
```

## How to Set Up

1. **Create `.env` file**: In the root directory, create a file named `.env`
2. **Add your API keys**: Replace the placeholder values with your actual API keys
3. **Restart the development server**: Run `npm run dev` again after creating the .env file

## Security Notes

- ✅ The `.env` file is already included in `.gitignore`
- ✅ Environment variables are loaded at build time (not runtime)
- ✅ Fallback values exist for development, but you should use your own keys
- ⚠️ Never commit API keys to version control
- ⚠️ Rotate API keys regularly for security

## Getting API Keys

### Google Gemini API Key
1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Navigate to "Get API key"
4. Create a new API key or use an existing one
5. Copy the key and add it to your `.env` file

### Supabase Keys
1. Go to your [Supabase Dashboard](https://app.supabase.com/)
2. Select your project
3. Go to Settings > API
4. Copy the "URL" and "anon public" key
5. Add them to your `.env` file

## Fallback Behavior

If environment variables are not set, the app will use fallback values:
- A development warning will be shown in the console
- The app will still function but should not be used in production
- It's recommended to set your own keys even for development

## Troubleshooting

### "Missing API key" Error
- Ensure your `.env` file is in the root directory (same level as `package.json`)
- Check that the variable names match exactly (case-sensitive)
- Restart the development server after creating/modifying the `.env` file

### Development Warning in Console
- This is normal if you haven't set custom environment variables
- Add the variables to your `.env` file to remove the warnings
- The app will work with fallback values but custom keys are recommended 