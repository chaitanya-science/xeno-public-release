// Error recovery service tests

import { ErrorRecoveryServiceImpl } from '../error-recovery-service';
import { OfflineModeManager, HardwareMonitor, RetryManager, NetworkError, HardwareError, APIError } from '../interfaces';

// Mock dependencies
const mockOfflineModeManager: jest.Mocked<OfflineModeManager> = {
  activate: jest.fn(),
  deactivate: jest.fn(),
  isActive: jest.fn(),
  getCachedResponse: jest.fn(),
  addCachedResponse: jest.fn(),
  getOfflineCapabilities: jest.fn(),
  explainLimitedFunctionality: jest.fn()
};

const mockHardwareMonitor: jest.Mocked<HardwareMonitor> = {
  checkMicrophone: jest.fn(),
  checkSpeaker: jest.fn(),
  checkSystemResources: jest.fn(),
  detectHardwareFailures: jest.fn(),
  generateUserFriendlyReport: jest.fn()
};

const mockRetryManager: jest.Mocked<RetryManager> = {
  executeWithRetry: jest.fn(),
  getBackoffDelay: jest.fn(),
  shouldRetry: jest.fn()
};

describe('ErrorRecoveryService', () => {
  let errorRecoveryService: ErrorRecoveryServiceImpl;

  beforeEach(() => {
    jest.clearAllMocks();
    errorRecoveryService = new ErrorRecoveryServiceImpl(
      mockRetryManager,
      mockOfflineModeManager,
      mockHardwareMonitor
    );
  });

  describe('handleNetworkError', () => {
    it('should handle connection loss by entering offline mode', async () => {
      // Mock fetch to simulate network failure
      global.fetch = jest.fn().mockRejectedValue(new Error('Network error'));
      
      const networkError: NetworkError = {
        name: 'NetworkError',
        message: 'Connection lost',
        type: 'CONNECTION_LOST',
        retryable: false
      };

      const action = await errorRecoveryService.handleNetworkError(networkError);

      expect(action.type).toBe('OFFLINE_MODE');
      expect(action.message).toContain('lost internet connection');
      expect(action.userAction).toBe('check_network');
    });

    it('should handle API timeout with retry', async () => {
      const networkError: NetworkError = {
        name: 'NetworkError',
        message: 'Request timeout',
        type: 'API_TIMEOUT',
        retryable: true
      };

      const action = await errorRecoveryService.handleNetworkError(networkError);

      expect(action.type).toBe('RETRY');
      expect(action.delay).toBe(5000);
      expect(action.message).toContain('longer than expected');
    });

    it('should handle rate limiting with appropriate delay', async () => {
      const networkError: NetworkError = {
        name: 'NetworkError',
        message: 'Rate limited',
        type: 'RATE_LIMITED',
        retryable: true,
        retryAfter: 30000
      };

      const action = await errorRecoveryService.handleNetworkError(networkError);

      expect(action.type).toBe('RETRY');
      expect(action.delay).toBe(30000);
      expect(action.message).toContain('30 seconds');
    });
  });

  describe('handleHardwareError', () => {
    it('should handle microphone failure with user notification', async () => {
      const hardwareError: HardwareError = {
        name: 'HardwareError',
        message: 'Microphone not accessible',
        type: 'MICROPHONE_FAILURE',
        component: 'microphone',
        severity: 'CRITICAL',
        userFriendlyMessage: 'Microphone is not working'
      };

      mockHardwareMonitor.checkMicrophone.mockResolvedValue({
        component: 'microphone',
        status: 'FAILED',
        message: 'Device not found',
        lastCheck: new Date()
      });

      const action = await errorRecoveryService.handleHardwareError(hardwareError);

      expect(action.type).toBe('USER_NOTIFICATION');
      expect(action.message).toContain('trouble with my microphone');
      expect(action.userAction).toBe('check_microphone');
    });

    it('should handle memory exhaustion with cleanup and retry', async () => {
      const hardwareError: HardwareError = {
        name: 'HardwareError',
        message: 'Out of memory',
        type: 'MEMORY_EXHAUSTED',
        component: 'memory',
        severity: 'CRITICAL',
        userFriendlyMessage: 'System is out of memory'
      };

      const action = await errorRecoveryService.handleHardwareError(hardwareError);

      expect(action.type).toBe('RETRY');
      expect(action.delay).toBe(2000);
      expect(action.message).toContain('free up some memory');
    });

    it('should handle CPU overload with fallback processing', async () => {
      const hardwareError: HardwareError = {
        name: 'HardwareError',
        message: 'CPU usage too high',
        type: 'CPU_OVERLOAD',
        component: 'cpu',
        severity: 'WARNING',
        userFriendlyMessage: 'System is working hard'
      };

      const action = await errorRecoveryService.handleHardwareError(hardwareError);

      expect(action.type).toBe('FALLBACK');
      expect(action.fallbackService).toBe('reduced_processing');
      expect(action.message).toContain('simpler processing');
    });
  });

  describe('handleAPIError', () => {
    it('should handle authentication error by entering offline mode', async () => {
      const apiError: APIError = {
        name: 'APIError',
        message: 'Invalid API key',
        type: 'AUTHENTICATION',
        service: 'OPENAI',
        retryable: false
      };

      const action = await errorRecoveryService.handleAPIError(apiError);

      expect(action.type).toBe('OFFLINE_MODE');
      expect(action.message).toContain('authentication credentials');
      expect(action.userAction).toBe('check_api_keys');
    });

    it('should handle quota exceeded with fallback', async () => {
      const apiError: APIError = {
        name: 'APIError',
        message: 'Quota exceeded',
        type: 'QUOTA_EXCEEDED',
        service: 'OPENAI',
        retryable: false,
        retryAfter: 3600000
      };

      const action = await errorRecoveryService.handleAPIError(apiError);

      expect(action.type).toBe('FALLBACK');
      expect(action.fallbackService).toBe('cached_responses');
      expect(action.message).toContain('usage limit');
      expect(action.delay).toBe(3600000);
    });

    it('should handle service unavailable with retry', async () => {
      const apiError: APIError = {
        name: 'APIError',
        message: 'Service temporarily unavailable',
        type: 'SERVICE_UNAVAILABLE',
        service: 'SPEECH_TO_TEXT',
        retryable: true
      };

      const action = await errorRecoveryService.handleAPIError(apiError);

      expect(action.type).toBe('RETRY');
      expect(action.delay).toBe(30000);
      expect(action.message).toContain('temporarily unavailable');
    });
  });

  describe('offline mode management', () => {
    it('should enter offline mode successfully', async () => {
      mockOfflineModeManager.activate.mockResolvedValue();

      await errorRecoveryService.enterOfflineMode();

      expect(mockOfflineModeManager.activate).toHaveBeenCalled();
      
      const status = errorRecoveryService.getSystemStatus();
      expect(status.mode).toBe('OFFLINE');
      expect(status.availableServices).toContain('wake_word');
      expect(status.unavailableServices).toContain('ai_responses');
    });

    it('should exit offline mode successfully', async () => {
      mockOfflineModeManager.deactivate.mockResolvedValue();

      await errorRecoveryService.exitOfflineMode();

      expect(mockOfflineModeManager.deactivate).toHaveBeenCalled();
      
      const status = errorRecoveryService.getSystemStatus();
      expect(status.mode).toBe('NORMAL');
      expect(status.availableServices).toContain('conversation');
      expect(status.unavailableServices).toHaveLength(0);
    });

    it('should report offline mode status correctly', () => {
      mockOfflineModeManager.isActive.mockReturnValue(true);

      const isOffline = errorRecoveryService.isOfflineMode();

      expect(isOffline).toBe(true);
      expect(mockOfflineModeManager.isActive).toHaveBeenCalled();
    });
  });

  describe('system status', () => {
    it('should return current system status', () => {
      const status = errorRecoveryService.getSystemStatus();

      expect(status).toHaveProperty('mode');
      expect(status).toHaveProperty('availableServices');
      expect(status).toHaveProperty('unavailableServices');
      expect(status).toHaveProperty('recoveryInProgress');
      expect(Array.isArray(status.availableServices)).toBe(true);
      expect(Array.isArray(status.unavailableServices)).toBe(true);
    });

    it('should track recovery in progress', async () => {
      mockOfflineModeManager.activate.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );

      const enterPromise = errorRecoveryService.enterOfflineMode();
      
      // Check status while recovery is in progress
      const statusDuringRecovery = errorRecoveryService.getSystemStatus();
      expect(statusDuringRecovery.recoveryInProgress).toBe(true);

      await enterPromise;

      // Check status after recovery is complete
      const statusAfterRecovery = errorRecoveryService.getSystemStatus();
      expect(statusAfterRecovery.recoveryInProgress).toBe(false);
    });
  });
});