// Privacy-aware logging system for AI Wellness Companion
// This logger filters out personal content while maintaining troubleshooting capabilities

import { promises as fs } from 'fs';
import { join } from 'path';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export interface LogEntry {
  timestamp: string;
  level: string;
  component: string;
  message: string;
  metadata?: Record<string, any>;
}

export interface LoggerConfig {
  logLevel: LogLevel;
  logDir: string;
  maxFileSize: number; // in bytes
  maxFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
}

export class PrivacyAwareLogger {
  private config: LoggerConfig;
  private sensitivePatterns: RegExp[] = [];

  constructor(config: LoggerConfig) {
    this.config = config;
    this.initializeSensitivePatterns();
    this.ensureLogDirectory();
  }

  private initializeSensitivePatterns(): void {
    // Patterns to identify and filter sensitive information
    this.sensitivePatterns = [
      // API keys and tokens
      /api[_-]?key["\s]*[:=]["\s]*[a-zA-Z0-9_-]{20,}/gi,
      /token["\s]*[:=]["\s]*[a-zA-Z0-9_.-]{20,}/gi,
      /bearer\s+[a-zA-Z0-9_.-]{20,}/gi,
      
      // Personal identifiers
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN pattern
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // Email
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // Phone numbers
      
      // Credit card patterns
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      
      // Addresses (basic pattern)
      /\b\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\b/gi,
      
      // Names (when preceded by common indicators)
      /(?:my name is|i'm|i am|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/gi,
      
      // Medical information indicators
      /(?:diagnosed with|taking medication|prescription|doctor said|medical condition)\s+([^.!?]+)/gi,
      
      // Financial information
      /\$\d+(?:,\d{3})*(?:\.\d{2})?/g, // Dollar amounts
      /\b(?:account|routing)\s*(?:number|#)\s*:?\s*\d+/gi,
    ];
  }

  private async ensureLogDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.config.logDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create log directory:', error);
    }
  }

  private sanitizeMessage(message: string): string {
    let sanitized = message;
    
    // Apply sensitive pattern filtering
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    
    // Additional context-aware filtering
    sanitized = this.filterConversationContent(sanitized);
    
    return sanitized;
  }

  private filterConversationContent(message: string): string {
    // Remove potential conversation content while keeping system information
    const conversationIndicators = [
      /user said[:\s]+"([^"]+)"/gi,
      /user input[:\s]+"([^"]+)"/gi,
      /conversation[:\s]+"([^"]+)"/gi,
      /response[:\s]+"([^"]+)"/gi,
      /transcript[:\s]+"([^"]+)"/gi,
    ];
    
    let filtered = message;
    for (const indicator of conversationIndicators) {
      filtered = filtered.replace(indicator, (match, content) => {
        // Keep system-related content, filter personal content
        if (this.isSystemContent(content)) {
          return match;
        }
        return match.replace(content, '[CONVERSATION_CONTENT_REDACTED]');
      });
    }
    
    return filtered;
  }

  private isSystemContent(content: string): boolean {
    const systemKeywords = [
      'error', 'failed', 'timeout', 'connection', 'api', 'service',
      'initialization', 'startup', 'shutdown', 'configuration',
      'audio', 'microphone', 'speaker', 'wake word', 'detection'
    ];
    
    const lowerContent = content.toLowerCase();
    return systemKeywords.some(keyword => lowerContent.includes(keyword));
  }

  private formatLogEntry(level: LogLevel, component: string, message: string, metadata?: Record<string, any>): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level: LogLevel[level],
      component,
      message: this.sanitizeMessage(message),
      metadata: metadata ? this.sanitizeMetadata(metadata) : undefined
    };
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(metadata)) {
      // Skip sensitive keys entirely
      if (this.isSensitiveKey(key)) {
        sanitized[key] = '[REDACTED]';
        continue;
      }
      
      // Sanitize string values
      if (typeof value === 'string') {
        sanitized[key] = this.sanitizeMessage(value);
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value);
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }

  private isSensitiveKey(key: string): boolean {
    const sensitiveKeys = [
      'apikey', 'api_key', 'token', 'password', 'secret',
      'conversation', 'transcript', 'user_input', 'response',
      'personal_info', 'name', 'email', 'phone', 'address'
    ];
    
    return sensitiveKeys.some(sensitive => 
      key.toLowerCase().includes(sensitive)
    );
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.config.enableFile) return;
    
    try {
      const logFile = join(this.config.logDir, `${entry.component}.log`);
      const logLine = JSON.stringify(entry) + '\n';
      
      await fs.appendFile(logFile, logLine);
      
      // Check file size and rotate if necessary
      await this.rotateLogIfNeeded(logFile);
    } catch (error) {
      console.error('Failed to write to log file:', error);
    }
  }

  private async rotateLogIfNeeded(logFile: string): Promise<void> {
    try {
      const stats = await fs.stat(logFile);
      
      if (stats.size > this.config.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = `${logFile}.${timestamp}`;
        
        await fs.rename(logFile, rotatedFile);
        
        // Clean up old log files
        await this.cleanupOldLogs(logFile);
      }
    } catch (error) {
      console.error('Failed to rotate log file:', error);
    }
  }

  private async cleanupOldLogs(baseLogFile: string): Promise<void> {
    try {
      const logDir = join(baseLogFile, '..');
      const baseName = baseLogFile.split('/').pop() || '';
      const files = await fs.readdir(logDir);
      
      const logFiles = files
        .filter(file => file.startsWith(baseName) && file !== baseName)
        .map(file => ({
          name: file,
          path: join(logDir, file),
          time: fs.stat(join(logDir, file)).then(stats => stats.mtime)
        }));
      
      if (logFiles.length > this.config.maxFiles) {
        const sortedFiles = await Promise.all(
          logFiles.map(async file => ({
            ...file,
            time: await file.time
          }))
        );
        
        sortedFiles.sort((a, b) => a.time.getTime() - b.time.getTime());
        
        const filesToDelete = sortedFiles.slice(0, sortedFiles.length - this.config.maxFiles);
        
        for (const file of filesToDelete) {
          await fs.unlink(file.path);
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }

  private writeToConsole(entry: LogEntry): void {
    if (!this.config.enableConsole) return;
    
    const timestamp = entry.timestamp.substring(11, 19); // HH:MM:SS
    const level = entry.level.padEnd(5);
    const component = entry.component.padEnd(15);
    
    let output = `${timestamp} [${level}] ${component} ${entry.message}`;
    
    if (entry.metadata) {
      output += ` ${JSON.stringify(entry.metadata)}`;
    }
    
    // Use appropriate console method based on log level
    switch (entry.level) {
      case 'ERROR':
        console.error(output);
        break;
      case 'WARN':
        console.warn(output);
        break;
      case 'DEBUG':
        console.debug(output);
        break;
      default:
        console.log(output);
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.logLevel;
  }

  public debug(component: string, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;
    
    const entry = this.formatLogEntry(LogLevel.DEBUG, component, message, metadata);
    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  public info(component: string, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.INFO)) return;
    
    const entry = this.formatLogEntry(LogLevel.INFO, component, message, metadata);
    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  public warn(component: string, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.WARN)) return;
    
    const entry = this.formatLogEntry(LogLevel.WARN, component, message, metadata);
    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  public error(component: string, message: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;
    
    const entry = this.formatLogEntry(LogLevel.ERROR, component, message, metadata);
    this.writeToConsole(entry);
    this.writeToFile(entry);
  }

  public async flush(): Promise<void> {
    // Ensure all pending writes are completed
    // This is useful for graceful shutdown
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// Singleton logger instance
let loggerInstance: PrivacyAwareLogger | null = null;

export const defaultLoggerConfig: LoggerConfig = {
  logLevel: LogLevel.INFO,
  logDir: process.env.LOG_DIR || './logs',
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  enableConsole: process.env.NODE_ENV !== 'production',
  enableFile: true,
};

export function createLogger(level: LogLevel): PrivacyAwareLogger {
  if (!loggerInstance) {
    const config = { ...defaultLoggerConfig, logLevel: level };
    loggerInstance = new PrivacyAwareLogger(config);
  }
  return loggerInstance;
}

export function getLogger(): PrivacyAwareLogger {
  if (!loggerInstance) {
    // Default to INFO level if not initialized
    loggerInstance = new PrivacyAwareLogger(defaultLoggerConfig);
  }
  return loggerInstance;
}