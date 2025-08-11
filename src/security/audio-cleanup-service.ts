// Automatic temporary audio file deletion service

import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { AudioCleanupConfig, AudioCleanupService } from './interfaces';

export class AutoAudioCleanupService implements AudioCleanupService {
  private config: AudioCleanupConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;
  private scheduledDeletions: Map<string, NodeJS.Timeout> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<AudioCleanupConfig>) {
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
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

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
    } catch (error) {
      console.error('Failed to initialize audio cleanup service:', error);
      throw error;
    }
  }

  /**
   * Start the automatic cleanup scheduler
   */
  startCleanupScheduler(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      try {
        const deletedCount = await this.cleanupTempFiles();
        if (deletedCount > 0) {
          console.log(`Audio cleanup: Deleted ${deletedCount} temporary files`);
        }
      } catch (error) {
        console.error('Error during scheduled audio cleanup:', error);
      }
    }, this.config.cleanupIntervalMs);

    console.log(`Audio cleanup scheduler started (interval: ${this.config.cleanupIntervalMs}ms)`);
  }

  /**
   * Stop the automatic cleanup scheduler
   */
  stopCleanupScheduler(): void {
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
  async cleanupTempFiles(): Promise<number> {
    let totalDeleted = 0;
    const now = Date.now();

    for (const directory of this.config.tempDirectories) {
      try {
        const deleted = await this.cleanupDirectory(directory, now);
        totalDeleted += deleted;
      } catch (error) {
        // Directory might not exist or be inaccessible, continue with others
        console.debug(`Could not cleanup directory ${directory}:`, error);
      }
    }

    return totalDeleted;
  }

  /**
   * Delete a specific audio file
   */
  async deleteAudioFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      console.debug(`Deleted audio file: ${filePath}`);
      
      // Remove from scheduled deletions if it exists
      if (this.scheduledDeletions.has(filePath)) {
        clearTimeout(this.scheduledDeletions.get(filePath)!);
        this.scheduledDeletions.delete(filePath);
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        console.error(`Failed to delete audio file ${filePath}:`, error);
        throw error;
      }
    }
  }

  /**
   * Schedule a file for deletion after a delay
   */
  scheduleFileDeletion(filePath: string, delayMs?: number): void {
    const delay = delayMs || this.config.maxRetentionMs;
    
    // Clear existing scheduled deletion for this file
    if (this.scheduledDeletions.has(filePath)) {
      clearTimeout(this.scheduledDeletions.get(filePath)!);
    }

    const timeout = setTimeout(async () => {
      try {
        await this.deleteAudioFile(filePath);
        this.scheduledDeletions.delete(filePath);
      } catch (error) {
        console.error(`Failed to delete scheduled file ${filePath}:`, error);
      }
    }, delay);

    this.scheduledDeletions.set(filePath, timeout);
    console.debug(`Scheduled deletion of ${filePath} in ${delay}ms`);
  }

  /**
   * Get cleanup statistics
   */
  async getCleanupStats(): Promise<{
    totalTempFiles: number;
    totalSizeBytes: number;
    oldestFileAge: number;
    scheduledDeletions: number;
  }> {
    let totalFiles = 0;
    let totalSize = 0;
    let oldestAge = 0;
    const now = Date.now();

    for (const directory of this.config.tempDirectories) {
      try {
        const files = await this.getAudioFilesInDirectory(directory);
        for (const file of files) {
          try {
            const stats = await fs.stat(file);
            totalFiles++;
            totalSize += stats.size;
            const age = now - stats.mtime.getTime();
            if (age > oldestAge) {
              oldestAge = age;
            }
          } catch (error) {
            // File might have been deleted, continue
          }
        }
      } catch (error) {
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
  async forceCleanupAll(): Promise<number> {
    let totalDeleted = 0;

    for (const directory of this.config.tempDirectories) {
      try {
        const files = await this.getAudioFilesInDirectory(directory);
        for (const file of files) {
          try {
            await this.deleteAudioFile(file);
            totalDeleted++;
          } catch (error) {
            console.error(`Failed to force delete ${file}:`, error);
          }
        }
      } catch (error) {
        console.debug(`Could not access directory ${directory} for force cleanup:`, error);
      }
    }

    return totalDeleted;
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AudioCleanupConfig>): void {
    const wasEnabled = this.config.autoDeleteEnabled;
    this.config = { ...this.config, ...newConfig };

    // Restart scheduler if auto-delete setting changed
    if (wasEnabled !== this.config.autoDeleteEnabled) {
      if (this.config.autoDeleteEnabled) {
        this.startCleanupScheduler();
      } else {
        this.stopCleanupScheduler();
      }
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AudioCleanupConfig {
    return { ...this.config };
  }

  /**
   * Ensure temp directories exist
   */
  private async ensureTempDirectories(): Promise<void> {
    for (const directory of this.config.tempDirectories) {
      try {
        await fs.mkdir(directory, { recursive: true });
      } catch (error) {
        // Directory might already exist or be inaccessible
        console.debug(`Could not create temp directory ${directory}:`, error);
      }
    }
  }

  /**
   * Clean up files in a specific directory
   */
  private async cleanupDirectory(directory: string, currentTime: number): Promise<number> {
    let deletedCount = 0;

    try {
      const files = await this.getAudioFilesInDirectory(directory);
      
      for (const filePath of files) {
        try {
          const stats = await fs.stat(filePath);
          const fileAge = currentTime - stats.mtime.getTime();
          
          if (fileAge > this.config.maxRetentionMs) {
            await this.deleteAudioFile(filePath);
            deletedCount++;
          }
        } catch (error) {
          // File might have been deleted by another process
          if ((error as any).code !== 'ENOENT') {
            console.error(`Error checking file ${filePath}:`, error);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to cleanup directory ${directory}: ${error}`);
    }

    return deletedCount;
  }

  /**
   * Get all audio files in a directory matching our patterns
   */
  private async getAudioFilesInDirectory(directory: string): Promise<string[]> {
    const audioFiles: string[] = [];

    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isFile()) {
          const filePath = join(directory, entry.name);
          if (this.isAudioFile(entry.name)) {
            audioFiles.push(filePath);
          }
        }
      }
    } catch (error) {
      if ((error as any).code !== 'ENOENT') {
        throw error;
      }
    }

    return audioFiles;
  }

  /**
   * Check if a file matches our audio file patterns
   */
  private isAudioFile(fileName: string): boolean {
    const lowerName = fileName.toLowerCase();
    
    // Check file extensions
    const audioExtensions = ['.wav', '.mp3', '.ogg', '.m4a', '.webm', '.tmp'];
    if (audioExtensions.includes(extname(lowerName))) {
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

/**
 * Global audio cleanup service instance
 */
export const audioCleanupService = new AutoAudioCleanupService();

/**
 * Initialize audio cleanup with default configuration
 */
export async function initializeAudioCleanup(config?: Partial<AudioCleanupConfig>): Promise<AutoAudioCleanupService> {
  const service = new AutoAudioCleanupService(config);
  await service.initialize();
  return service;
}

/**
 * Create a temporary audio file with automatic cleanup
 */
export async function createTempAudioFile(
  content: Buffer | Uint8Array,
  extension: string = '.wav',
  directory: string = './temp/audio'
): Promise<string> {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const fileName = `temp_audio_${timestamp}_${random}${extension}`;
  const filePath = join(directory, fileName);

  try {
    // Ensure directory exists
    await fs.mkdir(directory, { recursive: true });
    
    // Write file
    await fs.writeFile(filePath, content);
    
    // Schedule automatic deletion
    audioCleanupService.scheduleFileDeletion(filePath);
    
    return filePath;
  } catch (error) {
    console.error(`Failed to create temp audio file ${filePath}:`, error);
    throw error;
  }
}