// Health check service tests

import { DefaultHealthCheckService } from '../health-check-service';
import { HealthStatus } from '../interfaces';

// Mock child_process
jest.mock('child_process', () => ({
  exec: jest.fn()
}));

// Mock fs promises
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn()
  }
}));

const mockExec = require('child_process').exec;
const mockReadFile = require('fs').promises.readFile;

describe('DefaultHealthCheckService', () => {
  let healthService: DefaultHealthCheckService;

  beforeEach(() => {
    healthService = new DefaultHealthCheckService();
    jest.clearAllMocks();
    
    // Setup default mocks
    mockExec.mockImplementation((command: string, callback: Function) => {
      if (command.includes('ping')) {
        callback(null, { stdout: 'PING 8.8.8.8' });
      } else if (command.includes('top')) {
        callback(null, { stdout: '15.2' });
      } else if (command.includes('free')) {
        callback(null, { stdout: '8192 2048' });
      } else if (command.includes('df')) {
        callback(null, { stdout: '32G 8G 25' });
      } else if (command.includes('aplay') || command.includes('arecord')) {
        callback(null, { stdout: 'card 0: device 0' });
      } else {
        callback(null, { stdout: '' });
      }
    });

    mockReadFile.mockResolvedValue('45000'); // CPU temperature in millidegrees
  });

  afterEach(() => {
    healthService.stopMonitoring();
  });

  describe('System Startup and Monitoring', () => {
    test('should start monitoring and mark system as ready', async () => {
      const startTime = Date.now();
      
      expect(healthService.isSystemReady()).toBe(false);
      
      await healthService.startMonitoring();
      
      expect(healthService.isSystemReady()).toBe(true);
      
      const startupTime = healthService.getStartupTime();
      expect(startupTime).toBeGreaterThan(0);
      expect(startupTime).toBeLessThan(5000); // Should start within 5 seconds for test
    });

    test('should meet 30-second startup requirement', async () => {
      const startTime = Date.now();
      
      await healthService.startMonitoring();
      
      const actualStartupTime = Date.now() - startTime;
      expect(actualStartupTime).toBeLessThan(30000); // 30-second requirement
    });

    test('should stop monitoring cleanly', async () => {
      await healthService.startMonitoring();
      
      expect(() => healthService.stopMonitoring()).not.toThrow();
      expect(healthService.isSystemReady()).toBe(true); // Should remain ready
    });
  });

  describe('Component Health Checks', () => {
    beforeEach(async () => {
      await healthService.startMonitoring();
    });

    test('should check all system components', async () => {
      const health = await healthService.getCurrentHealth();
      
      expect(health.components).toHaveLength(4);
      expect(health.components.map(c => c.name)).toEqual([
        'Audio System',
        'Conversation Manager',
        'Memory Manager',
        'Crisis Detection'
      ]);
      
      health.components.forEach(component => {
        expect(component.status).toBeDefined();
        expect(component.lastCheck).toBeInstanceOf(Date);
        expect(component.message).toBeTruthy();
        expect(typeof component.responseTime).toBe('number');
      });
    });

    test('should check individual components', async () => {
      const audioHealth = await healthService.checkComponent('Audio System');
      
      expect(audioHealth.name).toBe('Audio System');
      expect(audioHealth.status).toBe(HealthStatus.HEALTHY);
      expect(audioHealth.message).toContain('functioning normally');
      expect(audioHealth.details).toHaveProperty('microphone');
      expect(audioHealth.details).toHaveProperty('speaker');
    });

    test('should handle component check errors', async () => {
      await expect(
        healthService.checkComponent('NonExistent Component')
      ).rejects.toThrow('Component monitor not found');
    });
  });

  describe('Network Connectivity Monitoring', () => {
    beforeEach(async () => {
      await healthService.startMonitoring();
    });

    test('should check network connectivity successfully', async () => {
      const networkHealth = await healthService.checkNetworkConnectivity();
      
      expect(networkHealth.status).toBe(HealthStatus.HEALTHY);
      expect(networkHealth.internetConnectivity).toBe(true);
      expect(networkHealth.apiEndpoints.openai).toBe(true);
      expect(networkHealth.apiEndpoints.speechServices).toBe(true);
      expect(networkHealth.message).toContain('working normally');
      expect(typeof networkHealth.latency).toBe('number');
    });

    test('should handle network connectivity failure', async () => {
      // Mock ping failure
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('ping')) {
          callback(new Error('Network unreachable'));
        } else {
          callback(null, { stdout: '' });
        }
      });

      const networkHealth = await healthService.checkNetworkConnectivity();
      
      expect(networkHealth.status).toBe(HealthStatus.CRITICAL);
      expect(networkHealth.internetConnectivity).toBe(false);
      expect(networkHealth.message).toContain('limited functionality');
    });

    test('should provide user-friendly network status messages', async () => {
      const networkHealth = await healthService.checkNetworkConnectivity();
      
      expect(networkHealth.message).not.toContain('API');
      expect(networkHealth.message).not.toContain('HTTP');
      expect(networkHealth.message).not.toContain('endpoint');
      // Should use user-friendly language
      expect(networkHealth.message).toMatch(/working normally|unavailable|limited/);
    });
  });

  describe('Hardware Status Monitoring', () => {
    beforeEach(async () => {
      await healthService.startMonitoring();
    });

    test('should check hardware status successfully', async () => {
      const hardwareHealth = await healthService.checkHardwareStatus();
      
      expect(hardwareHealth.status).toBe(HealthStatus.HEALTHY);
      expect(hardwareHealth.cpu.usage).toBe(15.2);
      expect(hardwareHealth.cpu.temperature).toBe(45); // 45000 millidegrees / 1000
      expect(hardwareHealth.memory.total).toBe(8192);
      expect(hardwareHealth.memory.used).toBe(2048);
      expect(hardwareHealth.memory.percentage).toBe(25);
      expect(hardwareHealth.storage.percentage).toBe(25);
      expect(hardwareHealth.audio.microphone).toBe(true);
      expect(hardwareHealth.audio.speaker).toBe(true);
      expect(hardwareHealth.message).toContain('functioning normally');
    });

    test('should detect critical hardware conditions', async () => {
      // Mock high CPU usage
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('top')) {
          callback(null, { stdout: '95.0' }); // High CPU usage
        } else if (command.includes('free')) {
          callback(null, { stdout: '8192 2048' });
        } else if (command.includes('df')) {
          callback(null, { stdout: '32G 8G 25' });
        } else if (command.includes('aplay') || command.includes('arecord')) {
          callback(null, { stdout: 'card 0: device 0' });
        } else {
          callback(null, { stdout: '' });
        }
      });

      const hardwareHealth = await healthService.checkHardwareStatus();
      
      expect(hardwareHealth.status).toBe(HealthStatus.CRITICAL);
      expect(hardwareHealth.message).toContain('Critical hardware issues');
      expect(hardwareHealth.message).toContain('high CPU usage');
    });

    test('should detect audio hardware issues', async () => {
      // Mock missing audio devices
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('aplay') || command.includes('arecord')) {
          callback(null, { stdout: 'no audio' });
        } else if (command.includes('top')) {
          callback(null, { stdout: '15.2' });
        } else if (command.includes('free')) {
          callback(null, { stdout: '8192 2048' });
        } else if (command.includes('df')) {
          callback(null, { stdout: '32G 8G 25' });
        } else {
          callback(null, { stdout: '' });
        }
      });

      const hardwareHealth = await healthService.checkHardwareStatus();
      
      expect(hardwareHealth.status).toBe(HealthStatus.CRITICAL);
      expect(hardwareHealth.audio.microphone).toBe(false);
      expect(hardwareHealth.audio.speaker).toBe(false);
      expect(hardwareHealth.message).toContain('microphone not detected');
      expect(hardwareHealth.message).toContain('speaker not detected');
    });

    test('should provide simple diagnostic reporting', async () => {
      const hardwareHealth = await healthService.checkHardwareStatus();
      
      // Messages should be user-friendly, not technical
      expect(hardwareHealth.message).not.toContain('CPU');
      expect(hardwareHealth.message).not.toContain('RAM');
      expect(hardwareHealth.message).not.toContain('filesystem');
      // Should use simple language
      expect(hardwareHealth.message).toMatch(/functioning normally|issues detected|performance may be affected/);
    });
  });

  describe('Overall System Health', () => {
    test('should determine overall system health correctly', async () => {
      await healthService.startMonitoring();
      const systemHealth = await healthService.getCurrentHealth();
      
      expect(systemHealth.overall).toBe(HealthStatus.HEALTHY);
      expect(systemHealth.components).toHaveLength(4);
      expect(systemHealth.networkConnectivity).toBeDefined();
      expect(systemHealth.hardwareStatus).toBeDefined();
      expect(systemHealth.startupTime).toBeGreaterThanOrEqual(0);
      expect(systemHealth.lastHealthCheck).toBeInstanceOf(Date);
    });

    test('should report critical status when any component is critical', async () => {
      // Mock network failure to cause critical status
      mockExec.mockImplementation((command: string, callback: Function) => {
        if (command.includes('ping')) {
          callback(new Error('Network unreachable'));
        } else {
          callback(null, { stdout: '' });
        }
      });

      await healthService.startMonitoring();
      const systemHealth = await healthService.getCurrentHealth();
      
      expect(systemHealth.overall).toBe(HealthStatus.CRITICAL);
    });
  });

  describe('Health Change Notifications', () => {
    test('should notify health change callbacks', async () => {
      const healthChangeCallback = jest.fn();
      healthService.onHealthChange(healthChangeCallback);
      
      await healthService.startMonitoring();
      
      // Wait a bit for the initial health check
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(healthChangeCallback).toHaveBeenCalled();
      const callArgs = healthChangeCallback.mock.calls[0][0];
      expect(callArgs).toHaveProperty('overall');
      expect(callArgs).toHaveProperty('components');
      expect(callArgs).toHaveProperty('networkConnectivity');
      expect(callArgs).toHaveProperty('hardwareStatus');
    });

    test('should handle callback errors gracefully', async () => {
      const faultyCallback = jest.fn(() => {
        throw new Error('Callback error');
      });
      
      healthService.onHealthChange(faultyCallback);
      
      // Should not throw when starting monitoring
      await expect(healthService.startMonitoring()).resolves.not.toThrow();
    });
  });

  describe('Performance Requirements', () => {
    test('should complete health checks within reasonable time', async () => {
      await healthService.startMonitoring();
      
      const startTime = Date.now();
      await healthService.getCurrentHealth();
      const checkTime = Date.now() - startTime;
      
      // Health check should complete within 5 seconds
      expect(checkTime).toBeLessThan(5000);
    });

    test('should have responsive component checks', async () => {
      await healthService.startMonitoring();
      
      const startTime = Date.now();
      const componentHealth = await healthService.checkComponent('Audio System');
      const checkTime = Date.now() - startTime;
      
      // Individual component checks should be fast
      expect(checkTime).toBeLessThan(2000);
      expect(componentHealth.responseTime).toBeLessThan(2000);
    });
  });
});