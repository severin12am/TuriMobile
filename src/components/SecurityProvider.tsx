import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getCurrentUserSecure, SecurityError, clearSecurityCaches } from '../services/security';
import { validateSecurityConfig } from '../config/security';
import { logger } from '../services/logger';
import type { User } from '../types';

interface SecurityContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  securityError: string | null;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

interface SecurityProviderProps {
  children: ReactNode;
}

export const SecurityProvider: React.FC<SecurityProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [securityError, setSecurityError] = useState<string | null>(null);

  const refreshUser = async () => {
    try {
      setIsLoading(true);
      setSecurityError(null);
      
      const currentUser = await getCurrentUserSecure();
      setUser(currentUser);
      
      if (currentUser) {
        logger.info('User authenticated in security context', { userId: currentUser.id });
      }
    } catch (error) {
      if (error instanceof SecurityError) {
        setSecurityError(error.message);
        logger.warn('Security error in context', { error: error.message, code: error.code });
      } else {
        setSecurityError('An unexpected security error occurred');
        logger.error('Unexpected error in security context', { error });
      }
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const clearError = () => {
    setSecurityError(null);
  };

  // Initialize security context
  useEffect(() => {
    const initializeSecurity = async () => {
      try {
        // Validate security configuration on startup
        validateSecurityConfig();
        logger.info('Security configuration validated');
        
        // Load initial user
        await refreshUser();
      } catch (error) {
        logger.error('Failed to initialize security context', { error });
        setSecurityError('Failed to initialize security');
        setIsLoading(false);
      }
    };

    initializeSecurity();
  }, []);

  // Handle user logout
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'turi_user' && e.newValue === null) {
        // User logged out in another tab
        setUser(null);
        if (user?.id) {
          clearSecurityCaches(user.id);
        }
        logger.info('User logged out (detected from storage change)');
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [user?.id]);

  // Periodic security validation (every 5 minutes)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(async () => {
      try {
        const currentUser = await getCurrentUserSecure();
        if (!currentUser && user) {
          // Session expired
          setUser(null);
          setSecurityError('Your session has expired. Please log in again.');
          logger.warn('Session expired during periodic check');
        }
      } catch (error) {
        logger.error('Error during periodic security check', { error });
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, [user]);

  const contextValue: SecurityContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    securityError,
    refreshUser,
    clearError,
  };

  return (
    <SecurityContext.Provider value={contextValue}>
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (context === undefined) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};

// Higher-order component for protecting routes/components
interface ProtectedComponentProps {
  children: ReactNode;
  fallback?: ReactNode;
  requireAuth?: boolean;
}

export const ProtectedComponent: React.FC<ProtectedComponentProps> = ({
  children,
  fallback = <div>Access denied</div>,
  requireAuth = true,
}) => {
  const { isAuthenticated, isLoading, securityError } = useSecurity();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (securityError) {
    return (
      <div className="security-error">
        <p>Security Error: {securityError}</p>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

// Hook for secure operations
export const useSecureOperation = () => {
  const { user, isAuthenticated } = useSecurity();

  const executeSecurely = async <T,>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T | null> => {
    if (!isAuthenticated || !user) {
      logger.warn(`Attempted secure operation without authentication: ${operationName}`);
      throw new SecurityError('Authentication required', 'NOT_AUTHENTICATED');
    }

    try {
      logger.info(`Executing secure operation: ${operationName}`, { userId: user.id });
      return await operation();
    } catch (error) {
      if (error instanceof SecurityError) {
        logger.warn(`Security error in operation: ${operationName}`, { 
          error: error.message, 
          code: error.code,
          userId: user.id 
        });
        throw error;
      }
      
      logger.error(`Error in secure operation: ${operationName}`, { 
        error, 
        userId: user.id 
      });
      throw new Error('Operation failed');
    }
  };

  return { executeSecurely, user, isAuthenticated };
}; 