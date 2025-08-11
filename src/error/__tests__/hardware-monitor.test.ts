// Hardware monitor tests

import { HardwareMonitorImpl } from '../hardware-monitor';
import { HardwareStatus, SystemResourceStatus, HardwareFailure } from '../interfaces';
import * as fs from 'fs/promises';

// Mock fs module
jest.mock('fs/promises');
const mockFs = fs as jest.Mocked<typeof fs>;

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

describe('HardwareMonitor', () => {
  let hardwareMonitor: HardwareMonitorImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    hardwareMonitor = new HardwareMonitorImpl();
    
    // Mock the private methods to avoid timeout issues
    jest.spyOn(hardwareMonitor as any, 'getCPUUsage').mockResolvedValue(25);
    jest.spyOn(hardwareMonitor as any, 'getStorageInfo').mockResolvedValue({
      used: 1000000000,
      available: 4000000000,
      usagePercent: 20
    });
  });

  describe('checkMicrophone', () => {
    it('should return working status when microphone is available', async () => {
      // Mock successful audio device check
      mockFs.readFile.mockResolvedValue('0 [Device]: USB Audio Device');

      const status = await hardwareMonitor.checkMicrophone();

      expect(status.component).toBe('microphone');
      expect(status.status).toBe('WORKING');
      expect(status.message).toContain('working properly');
      expect(status.lastCheck).toBeInstanceOf(Date);
    });

    it('should return failed status when no microphone is detected', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      // Mock no audio devices
      mockFs.readFile.mockResolvedValue('');

      const status = await hardwareMonitor.checkMicrophone();

      expect(status.component).toBe('microphone');
      expect(status.status).toBe('FAILED');
      expect(status.message).toContain('No microphone device detected');
    });

    it('should handle errors gracefully', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      // Mock file read error that will cause checkAudioDevice to return false
      mockFs.readFile.mockRejectedValue(new Error('Permission denied'));

      const status = await hardwareMonitor.checkMicrophone();

      expect(status.component).toBe('microphone');
      expect(status.status).toBe('FAILED');
      expect(status.message).toContain('No microphone device detected');
    });

    it('should cache results for 30 seconds', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockFs.readFile.mockResolvedValue('0 [Device]: USB Audio Device');

      // First call
      const status1 = await hardwareMonitor.checkMicrophone();
      
      // Second call immediately after
      const status2 = await hardwareMonitor.checkMicrophone();

      expect(mockFs.readFile).toHaveBeenCalledTimes(1);
      expect(status1.lastCheck).toEqual(status2.lastCheck);
    });
  });

  describe('checkSpeaker', () => {
    it('should return working status when speaker is available', async () => {
      mockFs.readFile.mockResolvedValue('0 [Device]: USB Audio Device');

      const status = await hardwareMonitor.checkSpeaker();

      expect(status.component).toBe('speaker');
      expect(status.status).toBe('WORKING');
      expect(status.message).toContain('working properly');
    });

    it('should return failed status when no speaker is detected', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockFs.readFile.mockResolvedValue('');

      const status = await hardwareMonitor.checkSpeaker();

      expect(status.component).toBe('speaker');
      expect(status.status).toBe('FAILED');
      expect(status.message).toContain('No speaker device detected');
    });
  });

  describe('checkSystemResources', () => {
    it('should return system resource status', async () => {
      const status = await hardwareMonitor.checkSystemResources();

      expect(status).toHaveProperty('cpu');
      expect(status).toHaveProperty('memory');
      expect(status).toHaveProperty('storage');

      expect(status.cpu).toHaveProperty('usage');
      expect(status.cpu).toHaveProperty('status');
      expect(status.memory).toHaveProperty('usage');
      expect(status.memory).toHaveProperty('available');
      expect(status.memory).toHaveProperty('status');
      expect(status.storage).toHaveProperty('usage');
      expect(status.storage).toHaveProperty('available');
      expect(status.storage).toHaveProperty('status');
    }, 10000);

    it('should classify resource usage correctly', async () => {
      const status = await hardwareMonitor.checkSystemResources();

      // CPU status should be one of the expected values
      expect(['NORMAL', 'HIGH', 'CRITICAL']).toContain(status.cpu.status);
      expect(['NORMAL', 'HIGH', 'CRITICAL']).toContain(status.memory.status);
      expect(['NORMAL', 'HIGH', 'CRITICAL']).toContain(status.storage.status);
    }, 10000);
  });

  describe('detectHardwareFailures', () => {
    it('should detect microphone failures', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      // Mock failed microphone
      mockFs.readFile.mockResolvedValue('');

      const failures = await hardwareMonitor.detectHardwareFailures();

      const micFailure = failures.find(f => f.component === 'microphone');
      expect(micFailure).toBeDefined();
      expect(micFailure?.type).toBe('FAILURE');
      expect(micFailure?.userFriendlyMessage).toContain('cannot hear you');
    }, 10000);

    it('should detect speaker failures', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      // Mock failed speaker
      mockFs.readFile.mockResolvedValue('');

      const failures = await hardwareMonitor.detectHardwareFailures();

      const speakerFailure = failures.find(f => f.component === 'speaker');
      expect(speakerFailure).toBeDefined();
      expect(speakerFailure?.type).toBe('FAILURE');
      expect(speakerFailure?.userFriendlyMessage).toContain('cannot speak to you');
    }, 10000);

    it('should return empty array when no failures detected', async () => {
      // Mock working hardware
      mockFs.readFile.mockResolvedValue('0 [Device]: USB Audio Device');

      const failures = await hardwareMonitor.detectHardwareFailures();

      // Filter out any resource-related failures for this test
      const hardwareFailures = failures.filter(f => 
        f.component === 'microphone' || f.component === 'speaker'
      );
      
      expect(hardwareFailures).toHaveLength(0);
    }, 10000);

    it('should include timestamp in failures', async () => {
      // Set platform to Linux for this test
      Object.defineProperty(process, 'platform', { value: 'linux' });
      
      mockFs.readFile.mockResolvedValue('');

      const failures = await hardwareMonitor.detectHardwareFailures();

      failures.forEach(failure => {
        expect(failure.timestamp).toBeInstanceOf(Date);
      });
    }, 10000);
  });

  describe('generateUserFriendlyReport', () => {
    it('should generate positive report for no failures', () => {
      const report = hardwareMonitor.generateUserFriendlyReport([]);

      expect(report).toContain('All my hardware is working properly');
      expect(report).toContain('Everything looks good');
    });

    it('should categorize failures correctly', () => {
      const failures: HardwareFailure[] = [
        {
          component: 'microphone',
          type: 'FAILURE',
          message: 'Mic failed',
          userFriendlyMessage: 'Cannot hear you',
          timestamp: new Date()
        },
        {
          component: 'speaker',
          type: 'WARNING',
          message: 'Speaker degraded',
          userFriendlyMessage: 'Audio quality reduced',
          timestamp: new Date()
        }
      ];

      const report = hardwareMonitor.generateUserFriendlyReport(failures);

      expect(report).toContain('🔴 Critical Issues:');
      expect(report).toContain('⚠️ Warnings:');
      expect(report).toContain('Cannot hear you');
      expect(report).toContain('Audio quality reduced');
    });

    it('should include suggestions when available', () => {
      const failures: HardwareFailure[] = [
        {
          component: 'microphone',
          type: 'FAILURE',
          message: 'Mic failed',
          userFriendlyMessage: 'Cannot hear you',
          suggestedAction: 'Check microphone connection',
          timestamp: new Date()
        }
      ];

      const report = hardwareMonitor.generateUserFriendlyReport(failures);

      expect(report).toContain('Suggestion: Check microphone connection');
    });

    it('should include restart suggestion', () => {
      const failures: HardwareFailure[] = [
        {
          component: 'microphone',
          type: 'FAILURE',
          message: 'Mic failed',
          userFriendlyMessage: 'Cannot hear you',
          timestamp: new Date()
        }
      ];

      const report = hardwareMonitor.generateUserFriendlyReport(failures);

      expect(report).toContain('restart me');
    });
  });

  describe('platform-specific behavior', () => {
    const originalPlatform = process.platform;

    afterEach(() => {
      Object.defineProperty(process, 'platform', {
        value: originalPlatform
      });
    });

    it('should handle Linux platform correctly', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'linux'
      });

      mockFs.readFile.mockResolvedValue('0 [Device]: USB Audio Device');

      const status = await hardwareMonitor.checkMicrophone();

      expect(mockFs.readFile).toHaveBeenCalledWith('/proc/asound/cards', 'utf8');
      expect(status.status).toBe('WORKING');
    });

    it('should handle non-Linux platforms', async () => {
      Object.defineProperty(process, 'platform', {
        value: 'darwin'
      });

      const status = await hardwareMonitor.checkMicrophone();

      // Should not try to read /proc/asound/cards on non-Linux
      expect(mockFs.readFile).not.toHaveBeenCalled();
      expect(status.status).toBe('WORKING'); // Assumes devices are available
    });
  });
});