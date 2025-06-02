/**
 * Security Configuration
 * 
 * This file contains all security-related configuration for the application.
 * Adjust these settings based on your security requirements.
 */

export const SECURITY_CONFIG = {
  // Rate limiting settings
  RATE_LIMITING: {
    MAX_REQUESTS_PER_MINUTE: 60,
    MAX_REQUESTS_PER_HOUR: 1000,
    MAX_LOGIN_ATTEMPTS_PER_HOUR: 10,
    BLOCK_DURATION_MINUTES: 15, // How long to block after too many failed attempts
  },

  // Session management
  SESSION: {
    TIMEOUT_MINUTES: 60,
    REFRESH_THRESHOLD_MINUTES: 10, // Refresh session if expires within this time
    MAX_CONCURRENT_SESSIONS: 3,
  },

  // Input validation
  INPUT_VALIDATION: {
    MAX_STRING_LENGTH: 1000,
    MAX_EMAIL_LENGTH: 254,
    MIN_PASSWORD_LENGTH: 6,
    MAX_PASSWORD_LENGTH: 128,
    ALLOWED_EMAIL_DOMAINS: [], // Empty array means all domains allowed
    BLOCKED_EMAIL_DOMAINS: ['tempmail.com', '10minutemail.com'], // Block temporary email services
  },

  // User ID patterns (for validation)
  USER_ID_PATTERNS: [
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i, // UUID
    /^anon_\d+_[a-z0-9]{9}$/i // Anonymous user pattern
  ],

  // Database operation security
  DATABASE: {
    MAX_QUERY_RESULTS: 1000,
    ALLOWED_SORT_FIELDS: ['id', 'created_at', 'updated_at', 'name', 'level'],
    MAX_BATCH_SIZE: 100,
  },

  // Logging and monitoring
  LOGGING: {
    LOG_FAILED_ATTEMPTS: true,
    LOG_SUCCESSFUL_OPERATIONS: true,
    LOG_RATE_LIMIT_VIOLATIONS: true,
    SENSITIVE_FIELDS: ['password', 'token', 'secret'], // Fields to redact in logs
  },

  // Feature flags for security
  FEATURES: {
    ENABLE_RATE_LIMITING: true,
    ENABLE_INPUT_SANITIZATION: true,
    ENABLE_SESSION_VALIDATION: true,
    ENABLE_AUDIT_LOGGING: true,
    REQUIRE_EMAIL_VERIFICATION: false, // Set to true in production
    ALLOW_ANONYMOUS_USERS: true,
  },

  // Content Security Policy
  CSP: {
    ALLOWED_ORIGINS: ['https://fjvltffpcafcbbpwzyml.supabase.co'],
    ALLOWED_SCRIPTS: ['self', 'unsafe-inline'], // Be more restrictive in production
    ALLOWED_STYLES: ['self', 'unsafe-inline'],
  },

  // Error messages (don't reveal too much information)
  ERROR_MESSAGES: {
    GENERIC_ERROR: 'An error occurred. Please try again.',
    AUTHENTICATION_FAILED: 'Invalid credentials.',
    ACCESS_DENIED: 'Access denied.',
    RATE_LIMIT_EXCEEDED: 'Too many requests. Please try again later.',
    INVALID_INPUT: 'Invalid input provided.',
    SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  },
};

/**
 * Environment-specific security overrides
 */
export const getSecurityConfig = () => {
  const config = { ...SECURITY_CONFIG };
  
  // Production overrides
  if (process.env.NODE_ENV === 'production') {
    config.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE = 30; // More restrictive in production
    config.RATE_LIMITING.MAX_REQUESTS_PER_HOUR = 500;
    config.SESSION.TIMEOUT_MINUTES = 30; // Shorter sessions in production
    config.FEATURES.REQUIRE_EMAIL_VERIFICATION = true;
    config.CSP.ALLOWED_SCRIPTS = ['self']; // No unsafe-inline in production
    config.CSP.ALLOWED_STYLES = ['self'];
  }
  
  // Development overrides
  if (process.env.NODE_ENV === 'development') {
    config.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE = 120; // More lenient in development
    config.LOGGING.LOG_SUCCESSFUL_OPERATIONS = false; // Less verbose logging
  }
  
  return config;
};

/**
 * Validate security configuration on startup
 */
export const validateSecurityConfig = () => {
  const config = getSecurityConfig();
  
  const errors: string[] = [];
  
  if (config.RATE_LIMITING.MAX_REQUESTS_PER_MINUTE <= 0) {
    errors.push('MAX_REQUESTS_PER_MINUTE must be positive');
  }
  
  if (config.SESSION.TIMEOUT_MINUTES <= 0) {
    errors.push('SESSION.TIMEOUT_MINUTES must be positive');
  }
  
  if (config.INPUT_VALIDATION.MIN_PASSWORD_LENGTH < 6) {
    errors.push('MIN_PASSWORD_LENGTH should be at least 6');
  }
  
  if (errors.length > 0) {
    throw new Error(`Security configuration errors: ${errors.join(', ')}`);
  }
  
  return true;
}; 