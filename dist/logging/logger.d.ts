export declare enum LogLevel {
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
    maxFileSize: number;
    maxFiles: number;
    enableConsole: boolean;
    enableFile: boolean;
}
export declare class PrivacyAwareLogger {
    private config;
    private sensitivePatterns;
    constructor(config: LoggerConfig);
    private initializeSensitivePatterns;
    private ensureLogDirectory;
    private sanitizeMessage;
    private filterConversationContent;
    private isSystemContent;
    private formatLogEntry;
    private sanitizeMetadata;
    private isSensitiveKey;
    private writeToFile;
    private rotateLogIfNeeded;
    private cleanupOldLogs;
    private writeToConsole;
    private shouldLog;
    debug(component: string, message: string, metadata?: Record<string, any>): void;
    info(component: string, message: string, metadata?: Record<string, any>): void;
    warn(component: string, message: string, metadata?: Record<string, any>): void;
    error(component: string, message: string, metadata?: Record<string, any>): void;
    flush(): Promise<void>;
}
export declare const defaultLoggerConfig: LoggerConfig;
export declare function createLogger(level: LogLevel): PrivacyAwareLogger;
export declare function getLogger(): PrivacyAwareLogger;
//# sourceMappingURL=logger.d.ts.map