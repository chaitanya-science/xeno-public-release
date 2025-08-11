import { AudioCleanupConfig, AudioCleanupService } from './interfaces';
export declare class AutoAudioCleanupService implements AudioCleanupService {
    private config;
    private cleanupTimer;
    private scheduledDeletions;
    private isInitialized;
    constructor(config?: Partial<AudioCleanupConfig>);
    /**
     * Initialize the audio cleanup service
     */
    initialize(): Promise<void>;
    /**
     * Start the automatic cleanup scheduler
     */
    startCleanupScheduler(): void;
    /**
     * Stop the automatic cleanup scheduler
     */
    stopCleanupScheduler(): void;
    /**
     * Clean up temporary audio files
     */
    cleanupTempFiles(): Promise<number>;
    /**
     * Delete a specific audio file
     */
    deleteAudioFile(filePath: string): Promise<void>;
    /**
     * Schedule a file for deletion after a delay
     */
    scheduleFileDeletion(filePath: string, delayMs?: number): void;
    /**
     * Get cleanup statistics
     */
    getCleanupStats(): Promise<{
        totalTempFiles: number;
        totalSizeBytes: number;
        oldestFileAge: number;
        scheduledDeletions: number;
    }>;
    /**
     * Force cleanup of all temporary files regardless of age
     */
    forceCleanupAll(): Promise<number>;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<AudioCleanupConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): AudioCleanupConfig;
    /**
     * Ensure temp directories exist
     */
    private ensureTempDirectories;
    /**
     * Clean up files in a specific directory
     */
    private cleanupDirectory;
    /**
     * Get all audio files in a directory matching our patterns
     */
    private getAudioFilesInDirectory;
    /**
     * Check if a file matches our audio file patterns
     */
    private isAudioFile;
}
/**
 * Global audio cleanup service instance
 */
export declare const audioCleanupService: AutoAudioCleanupService;
/**
 * Initialize audio cleanup with default configuration
 */
export declare function initializeAudioCleanup(config?: Partial<AudioCleanupConfig>): Promise<AutoAudioCleanupService>;
/**
 * Create a temporary audio file with automatic cleanup
 */
export declare function createTempAudioFile(content: Buffer | Uint8Array, extension?: string, directory?: string): Promise<string>;
//# sourceMappingURL=audio-cleanup-service.d.ts.map