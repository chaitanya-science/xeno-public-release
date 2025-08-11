"use strict";
// Privacy-aware logging system for AI Wellness Companion
// This logger filters out personal content while maintaining troubleshooting capabilities
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultLoggerConfig = exports.PrivacyAwareLogger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
exports.getLogger = getLogger;
const fs_1 = require("fs");
const path_1 = require("path");
var LogLevel;
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["INFO"] = 1] = "INFO";
    LogLevel[LogLevel["WARN"] = 2] = "WARN";
    LogLevel[LogLevel["ERROR"] = 3] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class PrivacyAwareLogger {
    constructor(config) {
        this.sensitivePatterns = [];
        this.config = config;
        this.initializeSensitivePatterns();
        this.ensureLogDirectory();
    }
    initializeSensitivePatterns() {
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
    async ensureLogDirectory() {
        try {
            await fs_1.promises.mkdir(this.config.logDir, { recursive: true });
        }
        catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }
    sanitizeMessage(message) {
        let sanitized = message;
        // Apply sensitive pattern filtering
        for (const pattern of this.sensitivePatterns) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }
        // Additional context-aware filtering
        sanitized = this.filterConversationContent(sanitized);
        return sanitized;
    }
    filterConversationContent(message) {
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
    isSystemContent(content) {
        const systemKeywords = [
            'error', 'failed', 'timeout', 'connection', 'api', 'service',
            'initialization', 'startup', 'shutdown', 'configuration',
            'audio', 'microphone', 'speaker', 'wake word', 'detection'
        ];
        const lowerContent = content.toLowerCase();
        return systemKeywords.some(keyword => lowerContent.includes(keyword));
    }
    formatLogEntry(level, component, message, metadata) {
        return {
            timestamp: new Date().toISOString(),
            level: LogLevel[level],
            component,
            message: this.sanitizeMessage(message),
            metadata: metadata ? this.sanitizeMetadata(metadata) : undefined
        };
    }
    sanitizeMetadata(metadata) {
        const sanitized = {};
        for (const [key, value] of Object.entries(metadata)) {
            // Skip sensitive keys entirely
            if (this.isSensitiveKey(key)) {
                sanitized[key] = '[REDACTED]';
                continue;
            }
            // Sanitize string values
            if (typeof value === 'string') {
                sanitized[key] = this.sanitizeMessage(value);
            }
            else if (typeof value === 'object' && value !== null) {
                sanitized[key] = this.sanitizeMetadata(value);
            }
            else {
                sanitized[key] = value;
            }
        }
        return sanitized;
    }
    isSensitiveKey(key) {
        const sensitiveKeys = [
            'apikey', 'api_key', 'token', 'password', 'secret',
            'conversation', 'transcript', 'user_input', 'response',
            'personal_info', 'name', 'email', 'phone', 'address'
        ];
        return sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive));
    }
    async writeToFile(entry) {
        if (!this.config.enableFile)
            return;
        try {
            const logFile = (0, path_1.join)(this.config.logDir, `${entry.component}.log`);
            const logLine = JSON.stringify(entry) + '\n';
            await fs_1.promises.appendFile(logFile, logLine);
            // Check file size and rotate if necessary
            await this.rotateLogIfNeeded(logFile);
        }
        catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }
    async rotateLogIfNeeded(logFile) {
        try {
            const stats = await fs_1.promises.stat(logFile);
            if (stats.size > this.config.maxFileSize) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const rotatedFile = `${logFile}.${timestamp}`;
                await fs_1.promises.rename(logFile, rotatedFile);
                // Clean up old log files
                await this.cleanupOldLogs(logFile);
            }
        }
        catch (error) {
            console.error('Failed to rotate log file:', error);
        }
    }
    async cleanupOldLogs(baseLogFile) {
        try {
            const logDir = (0, path_1.join)(baseLogFile, '..');
            const baseName = baseLogFile.split('/').pop() || '';
            const files = await fs_1.promises.readdir(logDir);
            const logFiles = files
                .filter(file => file.startsWith(baseName) && file !== baseName)
                .map(file => ({
                name: file,
                path: (0, path_1.join)(logDir, file),
                time: fs_1.promises.stat((0, path_1.join)(logDir, file)).then(stats => stats.mtime)
            }));
            if (logFiles.length > this.config.maxFiles) {
                const sortedFiles = await Promise.all(logFiles.map(async (file) => ({
                    ...file,
                    time: await file.time
                })));
                sortedFiles.sort((a, b) => a.time.getTime() - b.time.getTime());
                const filesToDelete = sortedFiles.slice(0, sortedFiles.length - this.config.maxFiles);
                for (const file of filesToDelete) {
                    await fs_1.promises.unlink(file.path);
                }
            }
        }
        catch (error) {
            console.error('Failed to cleanup old logs:', error);
        }
    }
    writeToConsole(entry) {
        if (!this.config.enableConsole)
            return;
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
    shouldLog(level) {
        return level >= this.config.logLevel;
    }
    debug(component, message, metadata) {
        if (!this.shouldLog(LogLevel.DEBUG))
            return;
        const entry = this.formatLogEntry(LogLevel.DEBUG, component, message, metadata);
        this.writeToConsole(entry);
        this.writeToFile(entry);
    }
    info(component, message, metadata) {
        if (!this.shouldLog(LogLevel.INFO))
            return;
        const entry = this.formatLogEntry(LogLevel.INFO, component, message, metadata);
        this.writeToConsole(entry);
        this.writeToFile(entry);
    }
    warn(component, message, metadata) {
        if (!this.shouldLog(LogLevel.WARN))
            return;
        const entry = this.formatLogEntry(LogLevel.WARN, component, message, metadata);
        this.writeToConsole(entry);
        this.writeToFile(entry);
    }
    error(component, message, metadata) {
        if (!this.shouldLog(LogLevel.ERROR))
            return;
        const entry = this.formatLogEntry(LogLevel.ERROR, component, message, metadata);
        this.writeToConsole(entry);
        this.writeToFile(entry);
    }
    async flush() {
        // Ensure all pending writes are completed
        // This is useful for graceful shutdown
        await new Promise(resolve => setTimeout(resolve, 100));
    }
}
exports.PrivacyAwareLogger = PrivacyAwareLogger;
// Singleton logger instance
let loggerInstance = null;
exports.defaultLoggerConfig = {
    logLevel: LogLevel.INFO,
    logDir: process.env.LOG_DIR || './logs',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableConsole: process.env.NODE_ENV !== 'production',
    enableFile: true,
};
function createLogger(level) {
    if (!loggerInstance) {
        const config = { ...exports.defaultLoggerConfig, logLevel: level };
        loggerInstance = new PrivacyAwareLogger(config);
    }
    return loggerInstance;
}
function getLogger() {
    if (!loggerInstance) {
        // Default to INFO level if not initialized
        loggerInstance = new PrivacyAwareLogger(exports.defaultLoggerConfig);
    }
    return loggerInstance;
}
//# sourceMappingURL=logger.js.map