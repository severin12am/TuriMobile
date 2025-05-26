// Advanced logger service with deduplication and filtering

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: any;
  hash?: string; // For deduplication
}

interface LoggerConfig {
  maxInMemoryLogs: number;
  deduplicationEnabled: boolean;
  deduplicationWindow: number; // in milliseconds
  consoleOutput: boolean;
  excludePatterns: RegExp[]; // Patterns to exclude from logging
}

/**
 * Enhanced logger with deduplication and filtering capabilities
 * 
 * Features:
 * - Multiple log levels (debug, info, warn, error)
 * - In-memory and localStorage persistence
 * - Log deduplication to prevent spamming
 * - Pattern-based log filtering
 * - Log download functionality
 */
class Logger {
  private logs: LogEntry[] = [];
  private recentLogHashes: Map<string, number> = new Map(); // Hash -> timestamp
  private config: LoggerConfig = {
    maxInMemoryLogs: 100,
    deduplicationEnabled: true,
    deduplicationWindow: 2000, // 2 seconds
    consoleOutput: true,
    excludePatterns: [
      /Character model loaded successfully/i,   // Filter out character model loaded messages
      /State reset to initial values/i          // Filter out state reset messages
    ]
  };
  
  constructor() {
    this.loadFromStorage();
    window.addEventListener('beforeunload', () => {
      this.saveToStorage();
    });
  }
  
  /**
   * Configure logger behavior
   * @param {Partial<LoggerConfig>} config - Configuration options to update
   */
  configure(config: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
  }
  
  /**
   * Generate a timestamp for log entries
   * @returns {string} ISO timestamp
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }
  
  /**
   * Format a log entry for display
   * @param {LogEntry} entry - The log entry to format
   * @returns {string} Formatted log string
   */
  private formatLogEntry(entry: LogEntry): string {
    let formattedData = '';
    if (entry.data) {
      try {
        formattedData = JSON.stringify(entry.data);
      } catch (e) {
        formattedData = '[Unstringifiable data]';
      }
    }
    
    return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message} ${formattedData}`;
  }
  
  /**
   * Create a hash for a log entry to identify duplicates
   * @param {LogLevel} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional log data
   * @returns {string} Hash string
   */
  private createLogHash(level: LogLevel, message: string, data?: any): string {
    let dataStr = '';
    if (data) {
      try {
        dataStr = JSON.stringify(data);
      } catch (e) {
        dataStr = 'unstringifiable';
      }
    }
    return `${level}:${message}:${dataStr}`;
  }
  
  /**
   * Check if a log should be filtered out based on configured patterns
   * @param {string} message - Log message to check
   * @returns {boolean} True if log should be filtered out
   */
  private shouldFilterLog(message: string): boolean {
    return this.config.excludePatterns.some(pattern => pattern.test(message));
  }
  
  /**
   * Check if a log is a duplicate based on hash and time window
   * @param {string} hash - Log hash
   * @returns {boolean} True if log is a duplicate within the window
   */
  private isDuplicate(hash: string): boolean {
    if (!this.config.deduplicationEnabled) return false;
    
    const now = Date.now();
    const lastSeen = this.recentLogHashes.get(hash);
    
    if (lastSeen && now - lastSeen < this.config.deduplicationWindow) {
      // Update the timestamp for this hash
      this.recentLogHashes.set(hash, now);
      return true;
    }
    
    // Clean up old hashes
    for (const [existingHash, timestamp] of this.recentLogHashes.entries()) {
      if (now - timestamp > this.config.deduplicationWindow) {
        this.recentLogHashes.delete(existingHash);
      }
    }
    
    // Add new hash
    this.recentLogHashes.set(hash, now);
    return false;
  }
  
  /**
   * Add a log entry to the log store
   * @param {LogLevel} level - Log level
   * @param {string} message - Log message
   * @param {any} data - Additional data
   */
  private addLog(level: LogLevel, message: string, data?: any) {
    // Check if we should filter this log
    if (this.shouldFilterLog(message)) {
      return;
    }
    
    // Create hash for deduplication
    const hash = this.createLogHash(level, message, data);
    
    // Check if this is a duplicate log within the window
    if (this.isDuplicate(hash)) {
      return;
    }
    
    const entry: LogEntry = {
      timestamp: this.getTimestamp(),
      level,
      message,
      data,
      hash
    };
    
    this.logs.push(entry);
    
    // Output to console if enabled
    if (this.config.consoleOutput) {
      console[level](this.formatLogEntry(entry));
    }
    
    // Always log to console for important messages during development
    if (level === 'error' || level === 'warn') {
      const isImportant = message.includes('user_id') || 
                          message.includes('progress') || 
                          message.includes('language_level');
      
      if (isImportant) {
        console.group(`🔍 DEBUG ${level.toUpperCase()}: ${message}`);
        console.log('Data:', data);
        console.log('Timestamp:', entry.timestamp);
        console.groupEnd();
      }
    }
    
    // Trim in-memory logs if they exceed maximum
    if (this.logs.length > this.config.maxInMemoryLogs) {
      this.logs = this.logs.slice(-this.config.maxInMemoryLogs);
    }
  }
  
  /**
   * Log a debug message
   * @param {string} message - Message to log
   * @param {any} data - Additional data to include
   */
  debug(message: string, data?: any) {
    this.addLog('debug', message, data);
  }
  
  /**
   * Log an info message
   * @param {string} message - Message to log
   * @param {any} data - Additional data to include
   */
  info(message: string, data?: any) {
    this.addLog('info', message, data);
  }
  
  /**
   * Log a warning message
   * @param {string} message - Message to log
   * @param {any} data - Additional data to include
   */
  warn(message: string, data?: any) {
    this.addLog('warn', message, data);
  }
  
  /**
   * Log an error message
   * @param {string} message - Message to log
   * @param {any} data - Additional data to include
   */
  error(message: string, data?: any) {
    this.addLog('error', message, data);
  }
  
  /**
   * Get all stored logs
   * @returns {LogEntry[]} Array of log entries
   */
  getAllLogs(): LogEntry[] {
    return [...this.logs];
  }
  
  /**
   * Save logs to localStorage
   */
  saveToStorage() {
    try {
      const allLogs = [...this.logs];
      localStorage.setItem('app_logs', JSON.stringify(allLogs));
    } catch (e) {
      console.error('Failed to save logs to localStorage', e);
    }
  }
  
  /**
   * Load logs from localStorage
   */
  loadFromStorage() {
    try {
      const savedLogs = localStorage.getItem('app_logs');
      if (savedLogs) {
        this.logs = JSON.parse(savedLogs);
      }
    } catch (e) {
      console.error('Failed to load logs from localStorage', e);
    }
  }
  
  /**
   * Download logs as a text file
   */
  downloadLogs() {
    try {
      const logText = this.logs.map(log => this.formatLogEntry(log)).join('\n');
      const blob = new Blob([logText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `app-logs-${new Date().toISOString().split('T')[0]}.log`;
      a.click();
      
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to download logs', e);
    }
  }
  
  /**
   * Clear all stored logs
   */
  clearLogs() {
    this.logs = [];
    this.recentLogHashes.clear();
    localStorage.removeItem('app_logs');
  }
}

export const logger = new Logger();