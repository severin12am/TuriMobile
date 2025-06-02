import React, { useState } from 'react';
import { User, Check, X } from 'lucide-react';
import { logger } from '../services/logger';
import { transferAnonymousProgressToUser } from '../services/auth';
import AppPanel from './AppPanel';
import { PanelBackdrop } from './AppPanel';
import { PanelTitle, PanelButton, PanelInput } from './PanelElements';
import { useStore } from '../store';

interface SignupPromptProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onCreateAccount: (email: string, password: string) => Promise<void>;
  onClose: () => void;
  onSkip?: () => void;
}



// Import centralized translations
import { getTranslation } from '../constants/translations';

const SignupPrompt: React.FC<SignupPromptProps> = ({ 
  onLogin, 
  onCreateAccount, 
  onClose,
  onSkip
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get mother language from store
  const { motherLanguage } = useStore();
  
  // Use centralized translation system
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("SignupPrompt: Form submitted");
    setError('');
    setIsLoading(true);
    
    try {
      if (!email || !email.includes('@')) {
        throw new Error(getTranslation(motherLanguage, 'emailRequired'));
      }
      
      if (isLogin) {
        await onLogin(email, password);
        logger.info('User logged in', { email });
      } else {
        await onCreateAccount(email, password);
        logger.info('User account created', { email });
      }
    } catch (err) {
      let errorMessage = err instanceof Error ? err.message : 'An error occurred';
      
      // Check if the error is related to email confirmation
      if (errorMessage.includes('email_not_confirmed') || errorMessage.includes('email is not confirmed')) {
        errorMessage = 'Email verification has been temporarily disabled. Please try logging in again.';
      }
      
      setError(errorMessage);
      logger.error('Login/signup error', { message: err instanceof Error ? err.message : 'Unknown error' });
      setIsLoading(false);
    }
  };
  
  const handleCloseClick = () => {
    console.log("SignupPrompt: Close button clicked");
    onClose();
  };
  
  const handleToggleMode = () => {
    console.log("SignupPrompt: Toggling between login and signup mode");
    setIsLogin(!isLogin);
  };
  
  const handleSkip = () => {
    console.log("SignupPrompt: Skip button clicked");
    if (onSkip) {
      onSkip();
    }
  };
  
  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("SignupPrompt: Email changed");
    setEmail(e.target.value);
  };
  
  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log("SignupPrompt: Password changed");
    setPassword(e.target.value);
  };
  
  return (
    <PanelBackdrop zIndex={50} style={{ pointerEvents: 'auto' }}>
      <div style={{ pointerEvents: 'auto' }}>
        <AppPanel width="450px" padding={32} style={{ pointerEvents: 'auto' }}>
          <div className="flex justify-between items-center mb-6">
            <PanelTitle>
              {isLogin ? getTranslation(motherLanguage, 'welcomeBack') : getTranslation(motherLanguage, 'saveProgress')}
            </PanelTitle>
            <button 
              onClick={handleCloseClick}
              className="rounded-full bg-white/10 hover:bg-white/20 h-8 w-8 flex items-center justify-center transition-colors"
              type="button"
              aria-label="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="mb-6">
            <p className="text-white/80">
              {isLogin 
                ? getTranslation(motherLanguage, 'loginInfo')
                : getTranslation(motherLanguage, 'createAccountInfo')}
            </p>
            
            <p className="text-amber-300 mt-3 text-sm">
              {getTranslation(motherLanguage, 'accountRequired')}
            </p>
          </div>
          
          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-200 px-4 py-3 rounded-md mb-4">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4" style={{ pointerEvents: 'auto' }}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
                {getTranslation(motherLanguage, 'email')}
              </label>
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className="panel-input w-full"
                  placeholder={getTranslation(motherLanguage, 'enterEmail')}
                  required
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
                {getTranslation(motherLanguage, 'password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={handlePasswordChange}
                  className="panel-input w-full"
                  placeholder={getTranslation(motherLanguage, 'enterPassword')}
                  required
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
            
            <PanelButton
              type="submit"
              variant="primary"
              className="w-full flex items-center justify-center"
              disabled={isLoading}
              style={{ pointerEvents: 'auto' }}
            >
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
              ) : (
                <Check className="w-5 h-5 mr-2" />
              )}
              {isLogin ? getTranslation(motherLanguage, 'logIn') : getTranslation(motherLanguage, 'createAccount')}
            </PanelButton>
          </form>
          
          <div className="mt-6 text-center border-t border-white/10 pt-4">
            <button
              onClick={handleToggleMode}
              className="text-blue-400 hover:text-blue-300 text-sm font-medium"
              type="button"
              style={{ pointerEvents: 'auto' }}
            >
              {isLogin ? getTranslation(motherLanguage, 'needAccount') : getTranslation(motherLanguage, 'haveAccount')}
            </button>
            
            {onSkip && (
              <PanelButton
                onClick={handleSkip}
                className="mt-3 w-full text-sm"
                type="button"
                style={{ pointerEvents: 'auto' }}
              >
                {getTranslation(motherLanguage, 'skipForNow')}
              </PanelButton>
            )}
          </div>
        </AppPanel>
      </div>
    </PanelBackdrop>
  );
};

export default SignupPrompt; 