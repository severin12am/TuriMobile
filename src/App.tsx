import React, { useState, useEffect } from 'react';
import { useStore } from './store/index';
import CityScene from './scenes/City';
import HelperRobot from './components/HelperRobot';
import LoginForm from './components/LoginForm';
import { supabase } from './services/supabase';
import { logger } from './services/logger';
import { login, signUp } from './services/auth';
import HelperRobotPanel from './components/HelperRobotPanel';
import HelperRobotInstructions from './components/HelperRobotInstructions';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [panelInstructions, setPanelInstructions] = useState<Record<string, string>>({ mode: "language_selection" });
  const [robotInstructions, setRobotInstructions] = useState<Record<string, string>>({ mode: "language_selection" });
  const [showHelperRobotPanel, setShowHelperRobotPanel] = useState(false);
  const { 
    isLanguageSelected,
    setUser,
    setIsLoggedIn,
    setLanguages,
    motherLanguage,
    targetLanguage,
    initializeModels,
    user,
    setIsAuthenticated,
    resetState,
    isLoggedIn,
    toggleHelperRobot,
    isHelperRobotOpen,
    setIsLanguageSelected,
    instructionType,
    showInstructions,
    instructionLevel,
    instructionCharacterId,
    hideInstructions,
    setInstructions,
    setIsMovementDisabled
  } = useStore();
  const [isLoading, setIsLoading] = useState(true);

  // Disable movement when login form is shown
  useEffect(() => {
    setIsMovementDisabled(showLogin);
  }, [showLogin, setIsMovementDisabled]);

  // Ensure showHelperRobotPanel state is correct based on login status
  useEffect(() => {
    setShowHelperRobotPanel(isLoggedIn);
  }, [isLoggedIn]);

  // Ensure isHelperRobotOpen is reset when App mounts
  useEffect(() => {
    // If the helper robot panel is open from a previous session,
    // close it so we can properly control its visibility
    if (isHelperRobotOpen) {
      toggleHelperRobot();
    }
  }, [isHelperRobotOpen, toggleHelperRobot]);

  useEffect(() => {
    initializeModels();
    console.log("🔧 App: Initializing 3D models");
  }, []);

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      try {
        // Use our simplified auth approach - check if there's a user in local storage
        const savedUser = localStorage.getItem('turi_user');
        
        if (savedUser) {
          try {
            const userData = JSON.parse(savedUser);
            logger.info('User found in local storage', { username: userData.username });
            setUser(userData);
            setIsLoggedIn(true);
            setIsAuthenticated(true);
            
            // Set the selected languages based on the saved user preferences
            if (userData.mother_language && userData.target_language) {
              setLanguages(
                userData.mother_language as 'en' | 'ru', 
                userData.target_language as 'en' | 'ru'
              );
            }
            
            // Show the helper robot panel automatically for returning users
            // This will be overridden by the effect that syncs with isLoggedIn
            // setShowHelperRobotPanel(true);
          } catch (e) {
            logger.error('Error parsing saved user data', { error: e });
            localStorage.removeItem('turi_user');
          }
        }
        
        setIsLoading(false);
      } catch (error) {
        logger.error('Error checking session', { error });
        setIsLoading(false);
      }
    };
    
    checkSession();
  }, [setIsAuthenticated, setUser, setIsLoggedIn, setLanguages]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await login(email, password);
      
      // Save user to local storage
      localStorage.setItem('turi_user', JSON.stringify(user));
      
      setUser(user);
      setIsLoggedIn(true);
      setIsAuthenticated(true);
      setShowLogin(false);
      
      // Set languages based on user preferences
      setLanguages(user.mother_language, user.target_language);
      
      // Clear language selection instructions and set to logged in mode
      setRobotInstructions({
        mode: "logged_in",
        message: "Click me to see your progress!"
      });
      
      // Show the helper robot panel after login
      setShowHelperRobotPanel(true);
      // Set language as selected to prevent language panel from showing
      setIsLanguageSelected(true);
      
      logger.info('User logged in successfully', { email });
    } catch (error) {
      logger.error('Login failed', { error });
      throw new Error('Login failed');
    }
  };

  const handleCreateAccount = async (email: string, password: string) => {
    try {
      // Use our custom signup function with mother and target language
      const user = await signUp(
        email, 
        password,
        motherLanguage || 'en', 
        targetLanguage || 'ru'
      );
      
      // Save user to local storage
      localStorage.setItem('turi_user', JSON.stringify(user));
      
      setUser(user);
      setIsLoggedIn(true);
      setIsAuthenticated(true);
      setShowLogin(false);
      
      // Clear language selection instructions and set to logged in mode
      setRobotInstructions({
        mode: "logged_in",
        message: "Click me to see your progress!"
      });
      
      // Show the helper robot panel after creating an account
      setShowHelperRobotPanel(true);
      // Set language as selected to prevent language panel from showing
      setIsLanguageSelected(true);
      
      logger.info('Account created successfully', { email });
    } catch (error) {
      logger.error('Account creation failed', { error });
      throw new Error('Account creation failed');
    }
  };

  const handleLanguageSelect = (mother: string, target: string) => {
    setLanguages(mother as 'en' | 'ru', target as 'en' | 'ru');
    setIsLanguageSelected(true);
    logger.info('Language selection', { mother, target });
  };

  const handleLanguageSelectRobot = (mother: string, target: string) => {
    setLanguages(mother as 'en' | 'ru', target as 'en' | 'ru');
    setIsLanguageSelected(true);
    logger.info('Language selection from robot', { mother, target });
  };

  const handleLoginClickRobot = () => {
    console.log("🔧 App: Login button clicked from robot");
    setShowLogin(true);
    // Clear robot instructions to hide the language selection panel
    setRobotInstructions({});
  };

  const handleRobotClick = () => {
    console.log("🔧 App: Helper robot clicked handler called");
    
    // Simply toggle the panel visibility when the robot is clicked
    setShowHelperRobotPanel(prev => !prev);
    logger.info(`Helper robot clicked - ${showHelperRobotPanel ? 'hiding' : 'showing'} panel`);
  };

  const handleCloseHelperRobotPanel = () => {
    setShowHelperRobotPanel(false);
  };

  // Add debug effect for detecting clicks
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent) => {
      const elements = document.elementsFromPoint(e.clientX, e.clientY);
      const classes = elements.map(el => el.className).join(', ');
      console.log(`🔍 Global click at (${e.clientX}, ${e.clientY}) - Elements:`, classes);
    };
    
    if (process.env.NODE_ENV === 'development') {
      window.addEventListener('click', handleGlobalClick);
      console.log("🔧 Added global click debug handler");
    }
    
    return () => {
      if (process.env.NODE_ENV === 'development') {
        window.removeEventListener('click', handleGlobalClick);
      }
    };
  }, []);

  // Add an effect to ensure the helper robot is always visible
  useEffect(() => {
    const ensureHelperRobotVisible = () => {
      console.log("🔧 Ensuring helper robot is visible");
      
      // Ensure the helper robot container is properly displayed
      const robotContainer = document.querySelector('.helper-robot-container');
      if (robotContainer) {
        // Make sure it's visible
        (robotContainer as HTMLElement).style.display = 'block';
        (robotContainer as HTMLElement).style.opacity = '1';
        
        console.log("🔧 Helper robot container found and visibility enforced");
      } else {
        console.log("⚠️ Helper robot container not found in DOM");
      }
    };
    
    // Run immediately
    ensureHelperRobotVisible();
    
    // Also run after a short delay to catch any delayed rendering issues
    const timeoutId = setTimeout(ensureHelperRobotVisible, 500);
    
    return () => clearTimeout(timeoutId);
  }, [isLoggedIn]); // Re-run this when login state changes

  // Update robot instructions based on application state
  useEffect(() => {
    // If user is not logged in and hasn't selected a language, show first-time instructions
    if (!isLoggedIn && !isLanguageSelected) {
      console.log("🔧 Setting helper robot instructions for first-time user");
      setRobotInstructions({
        mode: "language_selection"  // This enables the animated language selection panel
      });
      // Reset helper robot panel visibility to ensure no panel conflict
      setShowHelperRobotPanel(false);
    } 
    // If user is logged in, show returning user instructions
    else if (isLoggedIn) {
      console.log("🔧 Setting helper robot instructions for logged-in user");
      setRobotInstructions({
        mode: "logged_in",
        message: "Click me to see your progress!"
      });
      // We no longer force panel visibility here - it's handled by the dedicated effect
    }
    // If language is selected but not logged in
    else if (isLanguageSelected && !isLoggedIn) {
      console.log("🔧 Setting helper robot instructions for language-selected user");
      setRobotInstructions({
        mode: "language_selected",
        message: "Click me to create an account!"
      });
      // Reset helper robot panel visibility
      setShowHelperRobotPanel(false);
    }
  }, [isLoggedIn, isLanguageSelected]);

  // Show initial navigation instruction after language selection
  useEffect(() => {
    if (isLanguageSelected && !isLoading) {
      // After language selection, guide user to the first character
      setInstructions('navigation', 1, 1);
    }
  }, [isLanguageSelected, isLoading, setInstructions]);

  // Get dialogue and quiz states directly from the store
  const { isDialogueOpen, isQuizActive } = useStore();

  // Handle instructions based on current app state
  useEffect(() => {
    // Prioritize instructions based on what's currently active
    if (isQuizActive) {
      // Quiz has highest priority - show quiz instructions
      setInstructions('quiz');
    } else if (isDialogueOpen) {
      // Dialogue has second priority - show dialogue instructions
      setInstructions('dialogue');
    } else if (isLanguageSelected && !isLoading) {
      // Default to navigation when nothing else is active
      setInstructions('navigation', 1, 1);
    }
  }, [isDialogueOpen, isQuizActive, isLanguageSelected, isLoading, setInstructions]);

  const handleCloseInstructions = () => {
    hideInstructions();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-xl font-semibold">Loading...</div>
      </div>
    );
  }

  // Debug panel state
  console.log("🔧 App state:", {
    isLoggedIn,
    showHelperRobotPanel,
    isHelperRobotOpen,
    panelInstructions,
    robotInstructions,
    isLanguageSelected,
    showLogin
  });

  return (
    <div className="relative min-h-screen bg-gray-900">
      {/* Background Scene */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <CityScene />
      </div>

      {/* Foreground Layer */}
      <div className="relative z-10">
        {/* Helper Robot - ALWAYS VISIBLE WITH CONSISTENT Z-INDEX - This should be the ONLY instance */}
        <div className="fixed top-10 left-10 z-50 pointer-events-auto" style={{ pointerEvents: 'auto' }}>
          <HelperRobot
            instructions={robotInstructions}
            onLanguageSelect={handleLanguageSelectRobot}
            onLogin={handleLoginClickRobot}
            onClick={handleRobotClick}
          />
        </div>

        {/* Optional UI Elements */}
        {/* Helper Robot Panel - Show for logged in users */}
        {isLoggedIn && showHelperRobotPanel && (
          <div className="fixed inset-0 flex items-center justify-center z-40" style={{ pointerEvents: 'auto' }}>
            <HelperRobotPanel onClose={handleCloseHelperRobotPanel} />
          </div>
        )}

        {/* Helper robot instructions */}
        {showInstructions && (
          <HelperRobotInstructions
            instructionType={instructionType}
            level={instructionLevel}
            characterId={instructionCharacterId}
            onClose={handleCloseInstructions}
          />
        )}

        {/* Login Panel - Higher z-index to ensure it appears above the language selection */}
        {showLogin && (
          <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
            <div className="max-w-sm w-full" style={{ pointerEvents: 'auto' }}>
              <LoginForm
                onLogin={handleLogin}
                onCreateAccount={handleCreateAccount}
                onClose={() => {
                  console.log("Login form close clicked");
                  setShowLogin(false);
                  // Restore robot instructions to show language selection panel again
                  if (!isLoggedIn && !isLanguageSelected) {
                    setRobotInstructions({
                      mode: "language_selection"
                    });
                  }
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;