import React, { useState, useEffect } from 'react';
import { useStore } from './store/index';
import CityScene from './scenes/City';
import HelperRobot from './components/HelperRobot';
import LoginForm from './components/LoginForm';
import { supabase } from './services/supabase';
import { logger } from './services/logger';
import { login, signUp, debugSessionState, refreshSession } from './services/auth';
import HelperRobotPanel from './components/HelperRobotPanel';
import HelperRobotInstructions from './components/HelperRobotInstructions';
import type { SupportedLanguage } from './constants/translations';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

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

  // Proper Supabase session management
  useEffect(() => {
    let mounted = true;
    let sessionCheckTimeout: NodeJS.Timeout | null = null;

    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          logger.error('Error getting initial session', { error });
          setIsLoading(false);
          return;
        }

        if (session?.user && mounted) {
          await handleAuthSession(session);
          if (mounted) {
            setIsLoading(false);
          }
        } else {
          // Check for localStorage fallback for anonymous users
          const savedUser = localStorage.getItem('turi_user');
          if (savedUser && mounted) {
            try {
              const userData = JSON.parse(savedUser);
              logger.info('Found user in localStorage (fallback)', { email: userData.email });
              
              // For RLS to work, we need to ensure this user has a proper session
              // If they don't have a Supabase session, we need to create one or handle it properly
              if (userData.id && userData.id.startsWith('anon_')) {
                // This is an anonymous user, they can work with RLS disabled
                setUser(userData);
                setIsLoggedIn(true);
                setIsAuthenticated(false); // Not authenticated with Supabase, but logged in locally
                
                if (userData.mother_language && userData.target_language) {
                  setLanguages(userData.mother_language, userData.target_language);
                  setIsLanguageSelected(true);
                }
                
                if (mounted) {
                  setIsLoading(false);
                }
              } else {
                // This is a registered user - wait longer for session to potentially restore
                // Don't immediately clear localStorage on page refresh
                logger.info('Registered user found in localStorage, waiting for session restoration');
                
                // Give Supabase more time to restore the session (up to 3 seconds)
                let attempts = 0;
                const maxAttempts = 6; // 6 attempts * 500ms = 3 seconds
                
                const checkSessionRestoration = async () => {
                  if (!mounted) return;
                  
                  attempts++;
                  const { data: { session: delayedSession } } = await supabase.auth.getSession();
                  
                  if (delayedSession?.user) {
                    // Session was restored, handle it
                    logger.info('Session successfully restored after delay', { attempts });
                    await handleAuthSession(delayedSession);
                    if (mounted) {
                      setIsLoading(false);
                    }
                  } else if (attempts < maxAttempts) {
                    // Try again after a short delay
                    sessionCheckTimeout = setTimeout(checkSessionRestoration, 500);
                  } else {
                    // Session truly doesn't exist after multiple attempts
                    // Keep user logged in locally for better UX, but mark as not authenticated
                    logger.warn('No Supabase session found after multiple attempts, keeping user logged in locally');
                    setUser(userData);
                    setIsLoggedIn(true);
                    setIsAuthenticated(false); // Not authenticated with Supabase, but logged in locally
                    
                    if (userData.mother_language && userData.target_language) {
                      setLanguages(userData.mother_language, userData.target_language);
                      setIsLanguageSelected(true);
                    }
                    
                    if (mounted) {
                      setIsLoading(false);
                    }
                  }
                };
                
                // Start the session restoration check
                sessionCheckTimeout = setTimeout(checkSessionRestoration, 500);
              }
            } catch (e) {
              logger.error('Error parsing saved user data', { error: e });
              localStorage.removeItem('turi_user');
              if (mounted) {
                setIsLoading(false);
              }
            }
          } else {
            // No saved user data
            if (mounted) {
              setIsLoading(false);
            }
          }
        }
      } catch (error) {
        logger.error('Error initializing auth', { error });
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Handle auth state changes
    const handleAuthSession = async (session: Session | null) => {
      if (!session?.user) {
        // User logged out
        setUser(null);
        setIsLoggedIn(false);
        setIsAuthenticated(false);
        localStorage.removeItem('turi_user');
        logger.info('User session ended');
        return;
      }

      try {
        // Validate session is still active
        const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !currentUser || currentUser.id !== session.user.id) {
          logger.warn('Session validation failed, user may have been logged out elsewhere');
          setUser(null);
          setIsLoggedIn(false);
          setIsAuthenticated(false);
          localStorage.removeItem('turi_user');
          return;
        }

        // Fetch user profile from our users table
        const { data: userProfile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          logger.error('Error fetching user profile', { error });
          
          // If user doesn't exist in our table but has Supabase auth, create profile
          if (error.code === 'PGRST116') {
            logger.info('Creating user profile for authenticated user');
            const { data: newProfile, error: createError } = await supabase
              .from('users')
              .insert([{
                id: session.user.id,
                email: session.user.email || '',
                password: '',
                mother_language: motherLanguage || 'en',
                target_language: targetLanguage || 'ru',
                total_minutes: 0
              }])
              .select()
              .single();
              
            if (createError) {
              logger.error('Error creating user profile', { error: createError });
              return;
            }
            
            if (newProfile && mounted) {
              localStorage.setItem('turi_user', JSON.stringify(newProfile));
              setUser(newProfile);
              setIsLoggedIn(true);
              setIsAuthenticated(true);
              
              if (newProfile.mother_language && newProfile.target_language) {
                setLanguages(newProfile.mother_language, newProfile.target_language);
                setIsLanguageSelected(true);
              }
              
              logger.info('User profile created and session restored', { userId: newProfile.id });
            }
          } else {
            // Other database errors - keep user logged in locally but not authenticated
            logger.warn('Database error fetching user profile, keeping local session');
            const savedUser = localStorage.getItem('turi_user');
            if (savedUser && mounted) {
              try {
                const userData = JSON.parse(savedUser);
                setUser(userData);
                setIsLoggedIn(true);
                setIsAuthenticated(false); // Not authenticated due to DB error
                
                if (userData.mother_language && userData.target_language) {
                  setLanguages(userData.mother_language, userData.target_language);
                  setIsLanguageSelected(true);
                }
              } catch (e) {
                logger.error('Error parsing saved user data during fallback', { error: e });
              }
            }
          }
          return;
        }

        if (userProfile && mounted) {
          // Save to localStorage for offline access
          localStorage.setItem('turi_user', JSON.stringify(userProfile));
          
          setUser(userProfile);
          setIsLoggedIn(true);
          setIsAuthenticated(true);
          
          if (userProfile.mother_language && userProfile.target_language) {
            setLanguages(userProfile.mother_language, userProfile.target_language);
            setIsLanguageSelected(true);
          }
          
          logger.info('User session restored', { userId: userProfile.id });
        }
      } catch (error) {
        logger.error('Error handling auth session', { error });
        
        // Fallback to localStorage if available
        const savedUser = localStorage.getItem('turi_user');
        if (savedUser && mounted) {
          try {
            const userData = JSON.parse(savedUser);
            logger.info('Falling back to localStorage due to session error');
            setUser(userData);
            setIsLoggedIn(true);
            setIsAuthenticated(false); // Not authenticated due to error
            
            if (userData.mother_language && userData.target_language) {
              setLanguages(userData.mother_language, userData.target_language);
              setIsLanguageSelected(true);
            }
          } catch (e) {
            logger.error('Error parsing saved user data during error fallback', { error: e });
            localStorage.removeItem('turi_user');
          }
        }
      }
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        logger.info('Auth state changed', { event, hasSession: !!session });
        
        switch (event) {
          case 'SIGNED_IN':
          case 'TOKEN_REFRESHED':
            if (session && mounted) {
              await handleAuthSession(session);
            }
            break;
          case 'SIGNED_OUT':
            if (mounted) {
              await handleAuthSession(null);
            }
            break;
          default:
            break;
        }
      }
    );

    // Initialize auth
    initializeAuth();

    // Cleanup
    return () => {
      mounted = false;
      subscription.unsubscribe();
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
    };
  }, [setIsAuthenticated, setUser, setIsLoggedIn, setLanguages, setIsLanguageSelected]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const user = await login(email, password);
      
      // Save user to local storage
      localStorage.setItem('turi_user', JSON.stringify(user));
      
      setUser(user);
      setIsLoggedIn(true);
      setIsAuthenticated(true);
      setShowLogin(false);
      
      if (user.mother_language && user.target_language) {
        setLanguages(user.mother_language, user.target_language);
        setIsLanguageSelected(true);
      }
      
      // Clear language selection instructions and set to logged in mode
      setRobotInstructions({
        mode: "logged_in",
        message: "Click me to see your progress!"
      });
      
      // Show the helper robot panel after login
      setShowHelperRobotPanel(true);
      
      logger.info('Login successful', { email });
    } catch (error) {
      logger.error('Login failed', { error });
      throw error;
    }
  };

  const handleCreateAccount = async (email: string, password: string) => {
    try {
      const user = await signUp(email, password, motherLanguage, targetLanguage);
      
      // Save user to local storage
      localStorage.setItem('turi_user', JSON.stringify(user));
      
      setUser(user);
      setIsLoggedIn(true);
      setIsAuthenticated(true);
      setShowLogin(false);
      
      if (user.mother_language && user.target_language) {
        setLanguages(user.mother_language, user.target_language);
        setIsLanguageSelected(true);
      }
      
      // Clear language selection instructions and set to logged in mode
      setRobotInstructions({
        mode: "logged_in",
        message: "Click me to see your progress!"
      });
      
      // Show the helper robot panel after creating an account
      setShowHelperRobotPanel(true);
      
      logger.info('Account created successfully', { email });
    } catch (error) {
      logger.error('Account creation failed', { error });
      throw new Error('Account creation failed');
    }
  };

  const handleLanguageSelect = (mother: string, target: string) => {
    setLanguages(mother as SupportedLanguage, target as SupportedLanguage);
    setIsLanguageSelected(true);
    logger.info('Language selection', { mother, target });
  };

  const handleLanguageSelectRobot = (mother: string, target: string) => {
    setLanguages(mother as SupportedLanguage, target as SupportedLanguage);
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

  // Development helper for session debugging
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      // Add global debug functions
      (window as any).debugSession = debugSessionState;
      (window as any).refreshSession = refreshSession;
      
      // Log session state when authentication state changes
      const logSessionState = () => {
        setTimeout(() => {
          debugSessionState();
        }, 1000);
      };
      
      // Log initial state
      logSessionState();
      
      console.log('🔧 Development session debugging enabled. Use window.debugSession() to check session state.');
    }
  }, [isLoggedIn, user?.id]);

  // Periodic session validation in development
  useEffect(() => {
    if (process.env.NODE_ENV === 'development' && isLoggedIn) {
      const interval = setInterval(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session && isLoggedIn) {
          console.warn('🚨 Session lost detected! User should be logged in but session is missing.');
          debugSessionState();
        }
      }, 30000); // Check every 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [isLoggedIn]);

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

  // Handle page refresh/reload to preserve session
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Ensure user data is saved before page unload
      if (user && isLoggedIn) {
        try {
          localStorage.setItem('turi_user', JSON.stringify(user));
          logger.info('User data preserved before page unload');
        } catch (error) {
          logger.error('Failed to preserve user data before unload', { error });
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [user, isLoggedIn]);

  // Check if we should show language selection immediately
  const needsLanguageSelection = !isLanguageSelected && !isLoading;

  // If languages aren't selected, show HelperRobot with language selection immediately
  if (needsLanguageSelection) {
    return (
      <div className="relative min-h-screen bg-gray-900">
        {/* Minimal background */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
        
        {/* HelperRobot with language selection - no heavy 3D scene needed */}
        <div className="fixed top-10 left-10 z-50">
          <HelperRobot
            instructions={{ mode: "language_selection" }}
            onLanguageSelect={handleLanguageSelectRobot}
            onLogin={handleLoginClickRobot}
            onClick={handleRobotClick}
          />
        </div>

        {/* Login Panel - Higher z-index to appear above language selection */}
        {showLogin && (
          <div className="fixed inset-0 flex items-center justify-center z-[102] bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
            <div className="max-w-sm w-full" style={{ pointerEvents: 'auto' }}>
              <LoginForm
                onLogin={handleLogin}
                onCreateAccount={handleCreateAccount}
                onClose={() => {
                  console.log("Login form close clicked");
                  setShowLogin(false);
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

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
          <div className="fixed inset-0 flex items-center justify-center z-[102] bg-black/50 backdrop-blur-sm" style={{ pointerEvents: 'auto' }}>
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