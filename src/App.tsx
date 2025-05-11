import React, { useState, useEffect } from 'react';
import { useStore } from './store/index';
import CityScene from './scenes/City';
import HelperRobot from './components/HelperRobot';
import LoginForm from './components/LoginForm';
import { supabase } from './services/supabase';
import { logger } from './services/logger';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [panelInstructions, setPanelInstructions] = useState<Record<string, string>>({});
  const [robotInstructions, setRobotInstructions] = useState<Record<string, string>>({});
  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const { 
    isLanguageSelected,
    setUser,
    setIsLoggedIn,
    setLanguages,
    motherLanguage,
    initializeModels,
    user,
    setIsAuthenticated
  } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeModels();
  }, []);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data?.session) {
          logger.info('User already authenticated');
          setIsAuthenticated(true);
          setUser(data.session.user);
        }
        
        setIsLoading(false);
      } catch (error) {
        logger.error('Error checking session', { error });
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [setIsAuthenticated, setUser]);

  const handleLogin = async (username: string, password: string) => {
    try {
      const user = await supabase.auth.signInWithPassword({
        email: username,
        password: password
      });
      setUser(user.data.user);
      setIsLoggedIn(true);
      setShowLogin(false);
      setIsPanelVisible(false);
      logger.info('User logged in successfully', { username });
    } catch (error) {
      logger.error('Login failed', { error });
      throw new Error('Login failed');
    }
  };

  const handleCreateAccount = async (username: string, password: string) => {
    try {
      const user = await supabase.auth.signUp({
        email: username,
        password: password
      });
      setUser(user.data.user);
      setIsLoggedIn(true);
      setShowLogin(false);
      setIsPanelVisible(false);
      logger.info('Account created successfully', { username });
    } catch (error) {
      logger.error('Account creation failed', { error });
      throw new Error('Account creation failed');
    }
  };

  const handleLanguageSelect = (mother: string, target: string) => {
    setLanguages(mother as 'en' | 'ru', target as 'en' | 'ru');
    setIsPanelVisible(false);
    logger.info('Language selection', { mother, target });
  };

  const handleLanguageSelectRobot = (mother: string, target: string) => {
    setLanguages(mother as 'en' | 'ru', target as 'en' | 'ru');
    logger.info('Language selection from robot', { mother, target });
  };

  const handleLoginClickRobot = () => {
    setShowLogin(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Background Scene */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <CityScene />
      </div>

      {/* Foreground Layer */}
      <div className="relative z-10 pointer-events-none">
        {/* Always-visible Helper Robot */}
        <div className="absolute top-10 left-10 pointer-events-auto">
          <HelperRobot
            instructions={robotInstructions}
            onLanguageSelect={handleLanguageSelectRobot}
            onLogin={handleLoginClickRobot}
          />
        </div>

        {/* Panel (language selection/login) */}
        {isPanelVisible && (
          <div className="fixed inset-0 flex items-center justify-center pointer-events-none">
            <div className="pointer-events-auto max-w-sm w-full">
              {showLogin ? (
                <LoginForm
                  onLogin={handleLogin}
                  onCreateAccount={handleCreateAccount}
                  onClose={() => setShowLogin(false)}
                />
              ) : (
                <HelperRobot
                  instructions={panelInstructions}
                  onLanguageSelect={handleLanguageSelect}
                  onLogin={() => setShowLogin(true)}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;