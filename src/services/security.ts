import { supabase } from './supabase';
import { logger } from './logger';
import type { User } from '../types';
import { getSecurityConfig } from '../config/security';

// Get security configuration
const SECURITY_CONFIG = getSecurityConfig();

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number; hourlyCount: number; hourlyResetTime: number }>();

// Session cache to avoid repeated database calls
const sessionCache = new Map<string, { user: User; timestamp: number }>();

/**
 * Security error types
 */
export class SecurityError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecurityError';
  }
}

/**
 * Validate user ID format to prevent injection attacks
 */
export const validateUserId = (userId: string): boolean => {
  if (!userId || typeof userId !== 'string') {
    return false;
  }
  
  return SECURITY_CONFIG.USER_ID_PATTERNS.some(pattern => pattern.test(userId));
};

/**
 * Sanitize input to prevent injection attacks
 */
export const sanitizeInput = (input: any): any => {
  if (!SECURITY_CONFIG.FEATURES.ENABLE_INPUT_SANITIZATION) {
    return input;
  }
  
  if (typeof input === 'string') {
    // Remove potentially dangerous characters and limit length
    return input
      .replace(/[<>'"&]/g, '') // Remove HTML/script injection chars
      .replace(/[;-]/g, '') // Remove SQL injection chars
      .substring(0, SECURITY_CONFIG.INPUT_VALIDATION.MAX_STRING_LENGTH);
  }
  
  if (typeof input === 'number') {
    // Ensure it's a safe number
    return isFinite(input) ? input : 0;
  }
  
  if (Array.isArray(input)) {
    return input.map(sanitizeInput);
  }
  
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(input)) {
      // Only allow safe property names
      if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
        sanitized[key] = sanitizeInput(value);
      }
    }
    return sanitized;
  }
  
  return input;
};

/**
 * Rate limiting check
 */
export const checkRateLimit = (userId: string): boolean => {
  if (!SECURITY_CONFIG.FEATURES.ENABLE_RATE_LIMITING) {
    return true;
  }
  
  const now = Date.now();
  const userLimits = rateLimitStore.get(userId);
  
  if (!userLimits) {
    rateLimitStore.set(userId, {
      count: 1,
      resetTime: now + 60000, // 1 minute
      hourlyCount: 1,
      hourlyResetTime: now + 3600000 // 1 hour
    });
    return true;
  }
  
  // Check minute limit
  if (now > userLimits.resetTime) {
    userLimits.count = 1;
    userLimits.resetTime = now + 60000;
  } else {
    userLimits.count++;
    if (userLimits.count > SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE) {
      if (SECURITY_CONFIG.LOGGING.LOG_RATE_LIMIT_VIOLATIONS) {
        logger.warn('Rate limit exceeded (per minute)', { userId, count: userLimits.count });
      }
      return false;
    }
  }
  
  // Check hourly limit
  if (now > userLimits.hourlyResetTime) {
    userLimits.hourlyCount = 1;
    userLimits.hourlyResetTime = now + 3600000;
  } else {
    userLimits.hourlyCount++;
    if (userLimits.hourlyCount > SECURITY_CONFIG.RATE_LIMITING.MAX_REQUESTS_PER_HOUR) {
      if (SECURITY_CONFIG.LOGGING.LOG_RATE_LIMIT_VIOLATIONS) {
        logger.warn('Rate limit exceeded (per hour)', { userId, count: userLimits.hourlyCount });
      }
      return false;
    }
  }
  
  return true;
};

/**
 * Get and validate current user session
 */
export const getCurrentUserSecure = async (): Promise<User | null> => {
  try {
    // Try to get session from Supabase auth
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      logger.error('Error getting session in security check', { error });
      return null;
    }
    
    if (session?.user) {
      // Check session cache first
      const cached = sessionCache.get(session.user.id);
      if (cached && Date.now() - cached.timestamp < SECURITY_CONFIG.SESSION.TIMEOUT_MINUTES * 60000) {
        return cached.user;
      }
      
      // Fetch user profile with validation
      const { data: userProfile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
      
      if (profileError) {
        logger.error('Error fetching user profile in security check', { error: profileError });
        return null;
      }
      
      if (userProfile) {
        // Cache the user session
        sessionCache.set(session.user.id, {
          user: userProfile,
          timestamp: Date.now()
        });
        
        return userProfile;
      }
    }
    
    // Fallback to localStorage for anonymous users (when RLS is disabled)
    if (SECURITY_CONFIG.FEATURES.ALLOW_ANONYMOUS_USERS && typeof window !== 'undefined' && window.localStorage) {
      const savedUser = localStorage.getItem('turi_user');
      if (savedUser) {
        try {
          const userData = JSON.parse(savedUser);
          if (validateUserId(userData.id)) {
            return userData;
          }
        } catch (e) {
          logger.error('Error parsing saved user data in security check', { error: e });
          localStorage.removeItem('turi_user');
        }
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error in getCurrentUserSecure', { error });
    return null;
  }
};

/**
 * Validate that a user can access specific data
 */
export const validateUserAccess = async (requestedUserId: string, operation: string): Promise<User> => {
  // Validate user ID format
  if (!validateUserId(requestedUserId)) {
    throw new SecurityError(
      SECURITY_CONFIG.ERROR_MESSAGES.INVALID_INPUT, 
      'INVALID_USER_ID'
    );
  }
  
  // Get current authenticated user
  const currentUser = await getCurrentUserSecure();
  if (!currentUser) {
    throw new SecurityError(
      SECURITY_CONFIG.ERROR_MESSAGES.AUTHENTICATION_FAILED, 
      'NOT_AUTHENTICATED'
    );
  }
  
  // Check rate limiting
  if (!checkRateLimit(currentUser.id)) {
    throw new SecurityError(
      SECURITY_CONFIG.ERROR_MESSAGES.RATE_LIMIT_EXCEEDED, 
      'RATE_LIMIT_EXCEEDED'
    );
  }
  
  // Validate user can only access their own data
  if (currentUser.id !== requestedUserId) {
    if (SECURITY_CONFIG.LOGGING.LOG_FAILED_ATTEMPTS) {
      logger.warn('Unauthorized access attempt', {
        currentUserId: currentUser.id,
        requestedUserId,
        operation
      });
    }
    throw new SecurityError(
      SECURITY_CONFIG.ERROR_MESSAGES.ACCESS_DENIED, 
      'ACCESS_DENIED'
    );
  }
  
  // Log the operation for audit trail
  if (SECURITY_CONFIG.FEATURES.ENABLE_AUDIT_LOGGING) {
    logger.info('Authorized database operation', {
      userId: currentUser.id,
      operation,
      timestamp: new Date().toISOString()
    });
  }
  
  return currentUser;
};

/**
 * Secure wrapper for database operations
 */
export const secureQuery = async <T>(
  operation: string,
  userId: string,
  queryFn: () => Promise<{ data: T | null; error: any }>
): Promise<{ data: T | null; error: any }> => {
  try {
    // Validate access
    await validateUserAccess(userId, operation);
    
    // Execute the query
    const result = await queryFn();
    
    // Log successful operations
    if (!result.error && SECURITY_CONFIG.LOGGING.LOG_SUCCESSFUL_OPERATIONS) {
      logger.info('Secure database operation completed', {
        operation,
        userId,
        hasData: !!result.data
      });
    }
    
    return result;
  } catch (error) {
    if (error instanceof SecurityError) {
      if (SECURITY_CONFIG.LOGGING.LOG_FAILED_ATTEMPTS) {
        logger.warn('Security check failed', {
          operation,
          userId,
          error: error.message,
          code: error.code
        });
      }
      return { data: null, error };
    }
    
    logger.error('Unexpected error in secure query', {
      operation,
      userId,
      error
    });
    return { data: null, error };
  }
};

/**
 * Validate and sanitize user input for database operations
 */
export const validateAndSanitizeUserInput = (input: any, allowedFields: string[]): any => {
  if (!input || typeof input !== 'object') {
    throw new SecurityError(
      SECURITY_CONFIG.ERROR_MESSAGES.INVALID_INPUT, 
      'INVALID_INPUT'
    );
  }
  
  const sanitized: any = {};
  
  for (const field of allowedFields) {
    if (input.hasOwnProperty(field)) {
      sanitized[field] = sanitizeInput(input[field]);
    }
  }
  
  return sanitized;
};

/**
 * Clear security caches (useful for logout)
 */
export const clearSecurityCaches = (userId?: string): void => {
  if (userId) {
    sessionCache.delete(userId);
    rateLimitStore.delete(userId);
  } else {
    sessionCache.clear();
    rateLimitStore.clear();
  }
  
  logger.info('Security caches cleared', { userId: userId || 'all' });
};

/**
 * Security middleware for API-like operations
 */
export const withSecurity = <T extends any[], R>(
  operation: string,
  fn: (...args: T) => Promise<R>
) => {
  return async (...args: T): Promise<R> => {
    try {
      // Extract userId from first argument if it's a string that looks like a user ID
      const firstArg = args[0];
      if (typeof firstArg === 'string' && validateUserId(firstArg)) {
        await validateUserAccess(firstArg, operation);
      }
      
      return await fn(...args);
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      
      logger.error(`Error in secured operation: ${operation}`, { error });
      throw new Error(SECURITY_CONFIG.ERROR_MESSAGES.GENERIC_ERROR);
    }
  };
}; 