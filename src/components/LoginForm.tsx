import React, { useState } from 'react';
import { X } from 'lucide-react';
import { logger } from '../services/logger';
import AppPanel from './AppPanel';
import { PanelTitle, PanelButton, PanelInput } from './PanelElements';
import { useStore } from '../store';

interface LoginFormProps {
  onLogin: (email: string, password: string) => Promise<void>;
  onCreateAccount: (email: string, password: string) => Promise<void>;
  onClose: () => void;
}



// Import centralized translations
import { getTranslation } from '../constants/translations';

const LoginForm: React.FC<LoginFormProps> = ({ onLogin, onCreateAccount, onClose }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Get mother language from store
  const { motherLanguage } = useStore();
  
  // Use centralized translation system
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Login form submitted");
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
      let errorMessage = err instanceof Error ? err.message : getTranslation(motherLanguage, 'error');
      
      // Check if the error is related to email confirmation
      if (errorMessage.includes('email_not_confirmed') || errorMessage.includes('email is not confirmed')) {
        errorMessage = 'Email verification has been temporarily disabled. Please try logging in again.';
      }
      
      setError(errorMessage);
      logger.error('Login/signup error', { message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCloseClick = () => {
    console.log("Close button clicked in LoginForm");
    onClose();
  };
  
  const handleModeToggle = () => {
    console.log("Toggling between login and signup mode");
    setIsLogin(!isLogin);
  };
  
  return (
    <AppPanel width="450px" padding={0} className="overflow-hidden max-w-md w-full" style={{ pointerEvents: 'auto' }}>
      <div className="p-4 flex justify-between items-center border-b border-white/10">
        <PanelTitle className="m-0">
          {isLogin ? getTranslation(motherLanguage, 'logIn') : getTranslation(motherLanguage, 'createAccount')}
        </PanelTitle>
        <button
          onClick={handleCloseClick}
          className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
          aria-label="Close panel"
        >
          <X size={18} />
        </button>
      </div>
        
      <div className="p-6" style={{ pointerEvents: 'auto' }}>
        {error && (
          <div className="bg-red-900/30 border border-red-800/50 text-red-200 px-4 py-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-white/80 mb-1">
              {getTranslation(motherLanguage, 'email')}
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="panel-input"
                placeholder={getTranslation(motherLanguage, 'enterEmail')}
                required
              />
            </div>
          </div>
          
          <div className="mb-6">
            <label htmlFor="password" className="block text-sm font-medium text-white/80 mb-1">
              {getTranslation(motherLanguage, 'password')}
            </label>
            <div className="relative">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="panel-input"
                placeholder={getTranslation(motherLanguage, 'enterPassword')}
                required
              />
            </div>
          </div>
          
          <PanelButton
            type="submit"
            variant="primary"
            className="w-full flex items-center justify-center"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full mr-2" />
            ) : null}
            {isLogin ? getTranslation(motherLanguage, 'logIn') : getTranslation(motherLanguage, 'createAccount')}
          </PanelButton>
        </form>
        
        <div className="mt-4 text-center">
          <button
            onClick={handleModeToggle}
            className="text-blue-400 hover:text-blue-300 text-sm"
            type="button"
          >
            {isLogin ? getTranslation(motherLanguage, 'needAccount') : getTranslation(motherLanguage, 'haveAccount')}
          </button>
        </div>
      </div>
    </AppPanel>
  );
};

export default LoginForm;