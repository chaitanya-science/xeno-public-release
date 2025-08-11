"use strict";
// Automatic temporary audio file deletion service
Object.defineProperty(exports, "__esModule", { value: true });
exports.audioCleanupService = exports.AutoAudioCleanupService = void 0;
exports.initializeAudioCleanup = initializeAudioCleanup;
exports.createTempAudioFile = createTempAudioFile;
const fs_1 = require("fs");
const path_1 = require("path");
class AutoAudioCleanupService {
    constructor(config) {
        this.cleanupTimer = null;
        this.scheduledDeletions = new Map();
        this.isInitialized = false;
        this.config = {
            autoDeleteEnabled: true,
            maxRetentionMs: 5 * 60 * 1000, // 5 minutes default
            cleanupIntervalMs: 60 * 1000, // 1 minute cleanup interval
            tempDirectories: [
                './temp',
                './temp/audio',
                './data/temp',
                '/tmp/wellness-companion',
                process.env.TMPDIR || '/tmp'
            ],
            filePatterns: [
                '*.wav',
                '*.mp3',
                '*.ogg',
                '*.m4a',
                '*.webm',
                '*.tmp',
                'audio_*',
                'temp_audio_*',
                'recording_*',
                'tts_*'
            ],
            ...config
        };
    }
    /**
     * Initialize the audio cleanup service
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Ensure temp directories exist
            await this.ensureTempDirectories();
            // Perform initial cleanup
            await this.cleanupTempFiles();
            // Start automatic cleanup if enabled
            if (this.config.autoDeleteEnabled) {
                this.startCleanupScheduler();
            }
            this.isInitialized = true;
            console.log('Audio cleanup service initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize audio cleanup service:', error);
            throw error;
        }
    }
    /**
     * Start the automatic cleanup scheduler
     */
    startCleanupScheduler() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
        this.cleanupTimer = setInterval(async () => {
            try {
                const deletedCount = await this.cleanupTempFiles();
                if (deletedCount > 0) {
                    console.log(`Audio cleanup: Deleted ${deletedCount} temporary files`);
                }
            }
            catch (error) {
                console.error('Error during scheduled audio cleanup:', error);
            }
        }, this.config.cleanupIntervalMs);
        console.log(`Audio cleanup scheduler started (interval: ${this.config.cleanupIntervalMs}ms)`);
    }
    /**
     * Stop the automatic cleanup scheduler
     */
    stopCleanupScheduler() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            console.log('Audio cleanup scheduler stopped');
        }
        // Clear all scheduled deletions
        for (const [filePath, timeout] of this.scheduledDeletions) {
            clearTimeout(timeout);
        }
        this.scheduledDeletions.clear();
    }
    /**
     * Clean up temporary audio files
     */
    async cleanupTempFiles() {
        let totalDeleted = 0;
        const now = Date.now();
        for (const directory of this.config.tempDirectories) {
            try {
                const deleted = await this.cleanupDirectory(directory, now);
                totalDeleted += deleted;
            }
            catch (error) {
                // Directory might not exist or be inaccessible, continue with others
                console.debug(`Could not cleanup directory ${directory}:`, error);
            }
        }
        return totalDeleted;
    }
    /**
     * Delete a specific audio file
     */
    async deleteAudioFile(filePath) {
        try {
            await fs_1.promises.unlink(filePath);
            console.debug(`Deleted audio file: ${filePath}`);
            // Remove from scheduled deletions if it exists
            if (this.scheduledDeletions.has(filePath)) {
                clearTimeout(this.scheduledDeletions.get(filePath));
                this.scheduledDeletions.delete(filePath);
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                console.error(`Failed to delete audio file ${filePath}:`, error);
                throw error;
            }
        }
    }
    /**
     * Schedule a file for deletion after a delay
     */
    scheduleFileDeletion(filePath, delayMs) {
        const delay = delayMs || this.config.maxRetentionMs;
        // Clear existing scheduled deletion for this file
        if (this.scheduledDeletions.has(filePath)) {
            clearTimeout(this.scheduledDeletions.get(filePath));
        }
        const timeout = setTimeout(async () => {
            try {
                await this.deleteAudioFile(filePath);
                this.scheduledDeletions.delete(filePath);
            }
            catch (error) {
                console.error(`Failed to delete scheduled file ${filePath}:`, error);
            }
        }, delay);
        this.scheduledDeletions.set(filePath, timeout);
        console.debug(`Scheduled deletion of ${filePath} in ${delay}ms`);
    }
    /**
     * Get cleanup statistics
     */
    async getCleanupStats() {
        let totalFiles = 0;
        let totalSize = 0;
        let oldestAge = 0;
        const now = Date.now();
        for (const directory of this.config.tempDirectories) {
            try {
                const files = await this.getAudioFilesInDirectory(directory);
                for (const file of files) {
                    try {
                        const stats = await fs_1.promises.stat(file);
                        totalFiles++;
                        totalSize += stats.size;
                        const age = now - stats.mtime.getTime();
                        if (age > oldestAge) {
                            oldestAge = age;
                        }
                    }
                    catch (error) {
                        // File might have been deleted, continue
                    }
                }
            }
            catch (error) {
                // Directory might not exist, continue
            }
        }
        return {
            totalTempFiles: totalFiles,
            totalSizeBytes: totalSize,
            oldestFileAge: oldestAge,
            scheduledDeletions: this.scheduledDeletions.size
        };
    }
    /**
     * Force cleanup of all temporary files regardless of age
     */
    async forceCleanupAll() {
        let totalDeleted = 0;
        for (const directory of this.config.tempDirectories) {
            try {
                const files = await this.getAudioFilesInDirectory(directory);
                for (const file of files) {
                    try {
                        await this.deleteAudioFile(file);
                        totalDeleted++;
                    }
                    catch (error) {
                        console.error(`Failed to force delete ${file}:`, error);
                    }
                }
            }
            catch (error) {
                console.debug(`Could not access directory ${directory} for force cleanup:`, error);
            }
        }
        return totalDeleted;
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        const wasEnabled = this.config.autoDeleteEnabled;
        this.config = { ...this.config, ...newConfig };
        // Restart scheduler if auto-delete setting changed
        if (wasEnabled !== this.config.autoDeleteEnabled) {
            if (this.config.autoDeleteEnabled) {
                this.startCleanupScheduler();
            }
            else {
                this.stopCleanupScheduler();
            }
        }
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Ensure temp directories exist
     */
    async ensureTempDirectories() {
        for (const directory of this.config.tempDirectories) {
            try {
                await fs_1.promises.mkdir(directory, { recursive: true });
            }
            catch (error) {
                // Directory might already exist or be inaccessible
                console.debug(`Could not create temp directory ${directory}:`, error);
            }
        }
    }
    /**
     * Clean up files in a specific directory
     */
    async cleanupDirectory(directory, currentTime) {
        let deletedCount = 0;
        try {
            const files = await this.getAudioFilesInDirectory(directory);
            for (const filePath of files) {
                try {
                    const stats = await fs_1.promises.stat(filePath);
                    const fileAge = currentTime - stats.mtime.getTime();
                    if (fileAge > this.config.maxRetentionMs) {
                        await this.deleteAudioFile(filePath);
                        deletedCount++;
                    }
                }
                catch (error) {
                    // File might have been deleted by another process
                    if (error.code !== 'ENOENT') {
                        console.error(`Error checking file ${filePath}:`, error);
                    }
                }
            }
        }
        catch (error) {
            throw new Error(`Failed to cleanup directory ${directory}: ${error}`);
        }
        return deletedCount;
    }
    /**
     * Get all audio files in a directory matching our patterns
     */
    async getAudioFilesInDirectory(directory) {
        const audioFiles = [];
        try {
            const entries = await fs_1.promises.readdir(directory, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isFile()) {
                    const filePath = (0, path_1.join)(directory, entry.name);
                    if (this.isAudioFile(entry.name)) {
                        audioFiles.push(filePath);
                    }
                }
            }
        }
        catch (error) {
            if (error.code !== 'ENOENT') {
                throw error;
            }
        }
        return audioFiles;
    }
    /**
     * Check if a file matches our audio file patterns
     */
    isAudioFile(fileName) {
        const lowerName = fileName.toLowerCase();
        // Check file extensions
        const audioExtensions = ['.wav', '.mp3', '.ogg', '.m4a', '.webm', '.tmp'];
        if (audioExtensions.includes((0, path_1.extname)(lowerName))) {
            return true;
        }
        // Check filename patterns
        const patterns = [
            /^audio_/,
            /^temp_audio_/,
            /^recording_/,
            /^tts_/,
            /^speech_/,
            /^voice_/
        ];
        return patterns.some(pattern => pattern.test(lowerName));
    }
}
exports.AutoAudioCleanupService = AutoAudioCleanupService;
/**
 * Global audio cleanup service instance
 */
exports.audioCleanupService = new AutoAudioCleanupService();
/**
 * Initialize audio cleanup with default configuration
 */
async function initializeAudioCleanup(config) {
    const service = new AutoAudioCleanupService(config);
    await service.initialize();
    return service;
}
/**
 * Create a temporary audio file with automatic cleanup
 */
async function createTempAudioFile(content, extension = '.wav', directory = './temp/audio') {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2);
    const fileName = `temp_audio_${timestamp}_${random}${extension}`;
    const filePath = (0, path_1.join)(directory, fileName);
    try {
        // Ensure directory exists
        await fs_1.promises.mkdir(directory, { recursive: true });
        // Write file
        await fs_1.promises.writeFile(filePath, content);
        // Schedule automatic deletion
        exports.audioCleanupService.scheduleFileDeletion(filePath);
        return filePath;
    }
    catch (error) {
        console.error(`Failed to create temp audio file ${filePath}:`, error);
        throw error;
    }
}
//# sourceMappingURL=audio-cleanup-service.js.map