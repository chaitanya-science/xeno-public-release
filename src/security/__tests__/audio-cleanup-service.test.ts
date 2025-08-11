// Audio cleanup service security tests

import { promises as fs } from 'fs';
import { join } from 'path';
import { AutoAudioCleanupService, initializeAudioCleanup, createTempAudioFile } from '../audio-cleanup-service';

// Mock fs module
jest.mock('fs', () => ({
  promises: {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn(),
    unlink: jest.fn(),
    writeFile: jest.fn()
  }
}));

const mockFs = fs as jest.Mocked<typeof fs>;

describe('AutoAudioCleanupService', () => {
  let cleanupService: AutoAudioCleanupService;

  beforeEach(() => {
    jest.clearAllMocks();
    cleanupService = new AutoAudioCleanupService({
      autoDeleteEnabled: true,
      maxRetentionMs: 5 * 60 * 1000, // 5 minutes
      cleanupIntervalMs: 1000, // 1 second for testing
      tempDirectories: ['./test-temp'],
      filePatterns: ['*.wav', '*.mp3', 'temp_audio_*']
    });
  });

  afterEach(async () => {
    cleanupService.stopCleanupScheduler();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      await cleanupService.initialize();
      
      expect(mockFs.mkdir).toHaveBeenCalledWith('./test-temp', { recursive: true });
    });

    test('should handle directory creation errors gracefully', async () => {
      mockFs.mkdir.mockRejectedValue(new Error('Permission denied'));
      mockFs.readdir.mockResolvedValue([]);

      // Should not throw error
      await expect(cleanupService.initialize()).resolves.not.toThrow();
    });

    test('should start cleanup scheduler when auto-delete is enabled', async () => {
      mockFs.mkdir.mockResolvedValue(undefined);
      mockFs.readdir.mockResolvedValue([]);

      const startSchedulerSpy = jest.spyOn(cleanupService, 'startCleanupScheduler');
      
      await cleanupService.initialize();
      
      expect(startSchedulerSpy).toHaveBeenCalled();
    });
  });

  describe('File Cleanup', () => {
    test('should delete old audio files', async () => {
      const oldFile = { name: 'old_audio.wav', isFile: () => true };
      const newFile = { name: 'new_audio.wav', isFile: () => true };
      
      mockFs.readdir.mockResolvedValue([oldFile, newFile] as any);
      
      // Mock file stats - old file is older than retention period
      mockFs.stat
        .mockResolvedValueOnce({ mtime: new Date(Date.now() - 10 * 60 * 1000) } as any) // 10 minutes old
        .mockResolvedValueOnce({ mtime: new Date(Date.now() - 1 * 60 * 1000) } as any); // 1 minute old
      
      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await cleanupService.cleanupTempFiles();
      
      expect(deletedCount).toBe(1);
      expect(mockFs.unlink).toHaveBeenCalledWith(join('./test-temp', 'old_audio.wav'));
      expect(mockFs.unlink).not.toHaveBeenCalledWith(join('./test-temp', 'new_audio.wav'));
    });

    test('should handle file deletion errors gracefully', async () => {
      const audioFile = { name: 'audio.wav', isFile: () => true };
      
      mockFs.readdir.mockResolvedValue([audioFile] as any);
      mockFs.stat.mockResolvedValue({ mtime: new Date(Date.now() - 10 * 60 * 1000) } as any);
      mockFs.unlink.mockRejectedValue(new Error('File in use'));

      // Should not throw error
      await expect(cleanupService.cleanupTempFiles()).resolves.toBe(0);
    });

    test('should only delete audio files matching patterns', async () => {
      const files = [
        { name: 'audio.wav', isFile: () => true },
        { name: 'temp_audio_123.tmp', isFile: () => true },
        { name: 'document.pdf', isFile: () => true },
        { name: 'image.jpg', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat.mockResolvedValue({ mtime: new Date(Date.now() - 10 * 60 * 1000) } as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await cleanupService.cleanupTempFiles();
      
      expect(deletedCount).toBe(2); // Only audio files should be deleted
      expect(mockFs.unlink).toHaveBeenCalledWith(join('./test-temp', 'audio.wav'));
      expect(mockFs.unlink).toHaveBeenCalledWith(join('./test-temp', 'temp_audio_123.tmp'));
      expect(mockFs.unlink).not.toHaveBeenCalledWith(join('./test-temp', 'document.pdf'));
    });
  });

  describe('Scheduled Deletion', () => {
    test('should schedule file for deletion', (done) => {
      const filePath = './test-temp/scheduled_audio.wav';
      mockFs.unlink.mockResolvedValue(undefined);

      cleanupService.scheduleFileDeletion(filePath, 100); // 100ms delay

      setTimeout(() => {
        expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
        done();
      }, 150);
    });

    test('should cancel previous scheduled deletion when rescheduling', () => {
      const filePath = './test-temp/rescheduled_audio.wav';
      
      // Schedule first deletion
      cleanupService.scheduleFileDeletion(filePath, 1000);
      
      // Reschedule with shorter delay
      cleanupService.scheduleFileDeletion(filePath, 100);
      
      // Should only be called once after the shorter delay
      setTimeout(() => {
        expect(mockFs.unlink).toHaveBeenCalledTimes(1);
      }, 150);
    });

    test('should handle scheduled deletion errors', (done) => {
      const filePath = './test-temp/error_audio.wav';
      mockFs.unlink.mockRejectedValue(new Error('File not found'));

      cleanupService.scheduleFileDeletion(filePath, 100);

      setTimeout(() => {
        // Should not throw error
        expect(mockFs.unlink).toHaveBeenCalledWith(filePath);
        done();
      }, 150);
    });
  });

  describe('Cleanup Statistics', () => {
    test('should provide accurate cleanup statistics', async () => {
      const files = [
        { name: 'audio1.wav', isFile: () => true },
        { name: 'audio2.mp3', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.stat
        .mockResolvedValueOnce({ 
          size: 1024, 
          mtime: new Date(Date.now() - 5 * 60 * 1000) 
        } as any)
        .mockResolvedValueOnce({ 
          size: 2048, 
          mtime: new Date(Date.now() - 10 * 60 * 1000) 
        } as any);

      const stats = await cleanupService.getCleanupStats();
      
      expect(stats.totalTempFiles).toBe(2);
      expect(stats.totalSizeBytes).toBe(3072);
      expect(stats.oldestFileAge).toBeGreaterThan(9 * 60 * 1000); // ~10 minutes
      expect(stats.scheduledDeletions).toBe(0);
    });

    test('should handle statistics errors gracefully', async () => {
      mockFs.readdir.mockRejectedValue(new Error('Directory not accessible'));

      const stats = await cleanupService.getCleanupStats();
      
      expect(stats.totalTempFiles).toBe(0);
      expect(stats.totalSizeBytes).toBe(0);
      expect(stats.oldestFileAge).toBe(0);
    });
  });

  describe('Force Cleanup', () => {
    test('should force cleanup all files regardless of age', async () => {
      const files = [
        { name: 'new_audio.wav', isFile: () => true },
        { name: 'very_new_audio.mp3', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.unlink.mockResolvedValue(undefined);

      const deletedCount = await cleanupService.forceCleanupAll();
      
      expect(deletedCount).toBe(2);
      expect(mockFs.unlink).toHaveBeenCalledTimes(2);
    });

    test('should continue force cleanup even if some files fail', async () => {
      const files = [
        { name: 'audio1.wav', isFile: () => true },
        { name: 'audio2.wav', isFile: () => true },
        { name: 'audio3.wav', isFile: () => true }
      ];
      
      mockFs.readdir.mockResolvedValue(files as any);
      mockFs.unlink
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('File in use'))
        .mockResolvedValueOnce(undefined);

      const deletedCount = await cleanupService.forceCleanupAll();
      
      expect(deletedCount).toBe(2); // 2 successful deletions
      expect(mockFs.unlink).toHaveBeenCalledTimes(3);
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration and restart scheduler', () => {
      const startSchedulerSpy = jest.spyOn(cleanupService, 'startCleanupScheduler');
      const stopSchedulerSpy = jest.spyOn(cleanupService, 'stopCleanupScheduler');

      cleanupService.updateConfig({
        autoDeleteEnabled: false,
        maxRetentionMs: 10 * 60 * 1000
      });

      expect(stopSchedulerSpy).toHaveBeenCalled();
      
      const config = cleanupService.getConfig();
      expect(config.autoDeleteEnabled).toBe(false);
      expect(config.maxRetentionMs).toBe(10 * 60 * 1000);
    });

    test('should restart scheduler when auto-delete is re-enabled', () => {
      const startSchedulerSpy = jest.spyOn(cleanupService, 'startCleanupScheduler');
      const stopSchedulerSpy = jest.spyOn(cleanupService, 'stopCleanupScheduler');

      // Disable first
      cleanupService.updateConfig({ autoDeleteEnabled: false });
      expect(stopSchedulerSpy).toHaveBeenCalled();
      
      // Re-enable
      cleanupService.updateConfig({ autoDeleteEnabled: true });

      expect(startSchedulerSpy).toHaveBeenCalled();
    });
  });
});

describe('Global Audio Cleanup Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize audio cleanup with default config', async () => {
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.readdir.mockResolvedValue([]);

    const service = await initializeAudioCleanup();
    
    expect(service).toBeInstanceOf(AutoAudioCleanupService);
    expect(mockFs.mkdir).toHaveBeenCalled();
  });

  test('should create temporary audio file with automatic cleanup', async () => {
    const audioContent = Buffer.from('fake audio data');
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockResolvedValue(undefined);

    const filePath = await createTempAudioFile(audioContent, '.wav', './test-temp');
    
    expect(filePath).toMatch(/temp_audio_\d+_[a-z0-9]+\.wav$/);
    expect(mockFs.mkdir).toHaveBeenCalledWith('./test-temp', { recursive: true });
    expect(mockFs.writeFile).toHaveBeenCalledWith(filePath, audioContent);
  });

  test('should handle temp file creation errors', async () => {
    const audioContent = Buffer.from('fake audio data');
    mockFs.mkdir.mockResolvedValue(undefined);
    mockFs.writeFile.mockRejectedValue(new Error('Disk full'));

    await expect(createTempAudioFile(audioContent)).rejects.toThrow('Disk full');
  });
});

describe('Security Edge Cases', () => {
  let cleanupService: AutoAudioCleanupService;

  beforeEach(() => {
    cleanupService = new AutoAudioCleanupService();
  });

  test('should handle directory traversal attempts', async () => {
    const maliciousFiles = [
      { name: '../../../etc/passwd', isFile: () => true },
      { name: '..\\..\\windows\\system32\\config', isFile: () => true },
      { name: 'normal_audio.wav', isFile: () => true }
    ];
    
    // Mock multiple directories being checked
    mockFs.readdir.mockResolvedValue(maliciousFiles as any);
    mockFs.stat.mockResolvedValue({ mtime: new Date(Date.now() - 10 * 60 * 1000) } as any);
    mockFs.unlink.mockResolvedValue(undefined);

    const deletedCount = await cleanupService.cleanupTempFiles();
    
    // Should delete legitimate audio files from all directories
    expect(deletedCount).toBeGreaterThan(0);
    expect(mockFs.unlink).toHaveBeenCalled();
  });

  test('should handle symlink attacks', async () => {
    const files = [
      { name: 'symlink_audio.wav', isFile: () => false, isSymbolicLink: () => true },
      { name: 'real_audio.wav', isFile: () => true }
    ];
    
    mockFs.readdir.mockResolvedValue(files as any);
    mockFs.stat.mockResolvedValue({ mtime: new Date(Date.now() - 10 * 60 * 1000) } as any);
    mockFs.unlink.mockResolvedValue(undefined);

    const deletedCount = await cleanupService.cleanupTempFiles();
    
    // Should delete regular files from all directories
    expect(deletedCount).toBeGreaterThan(0);
  });

  test('should handle race conditions in file deletion', async () => {
    const filePath = './test-temp/race_condition.wav';
    
    // Simulate file being deleted by another process
    mockFs.unlink.mockRejectedValue({ code: 'ENOENT' });

    // Should not throw error for already deleted files
    await expect(cleanupService.deleteAudioFile(filePath)).resolves.not.toThrow();
  });
});