// Retry manager tests

import { RetryManagerImpl, RetryConfigFactory } from '../retry-manager';
import { RetryConfig } from '../interfaces';

describe('RetryManager', () => {
  let retryManager: RetryManagerImpl;

  beforeEach(() => {
    retryManager = new RetryManagerImpl();
  });

  describe('executeWithRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = jest.fn().mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on retryable errors', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('NETWORK_ERROR'))
        .mockRejectedValueOnce(new Error('TIMEOUT'))
        .mockResolvedValue('success');

      const result = await retryManager.executeWithRetry(mockOperation, {
        maxAttempts: 3,
        baseDelay: 100
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should fail after max attempts', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('NETWORK_ERROR'));

      await expect(
        retryManager.executeWithRetry(mockOperation, { maxAttempts: 2, baseDelay: 10 })
      ).rejects.toThrow('Operation failed after 2 attempts');

      expect(mockOperation).toHaveBeenCalledTimes(2);
    });

    it('should not retry non-retryable errors', async () => {
      const mockOperation = jest.fn().mockRejectedValue(new Error('AUTHENTICATION_ERROR'));

      await expect(
        retryManager.executeWithRetry(mockOperation, { maxAttempts: 3 })
      ).rejects.toThrow('AUTHENTICATION_ERROR');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should respect custom retry config', async () => {
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('CUSTOM_ERROR'))
        .mockResolvedValue('success');

      const customConfig: Partial<RetryConfig> = {
        maxAttempts: 2,
        baseDelay: 50,
        retryableErrors: ['CUSTOM_ERROR']
      };

      const result = await retryManager.executeWithRetry(mockOperation, customConfig);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(2);
    });
  });

  describe('getBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      const delay1 = retryManager.getBackoffDelay(1, 1000, 2, false);
      const delay2 = retryManager.getBackoffDelay(2, 1000, 2, false);
      const delay3 = retryManager.getBackoffDelay(3, 1000, 2, false);

      expect(delay1).toBe(1000); // 1000 * 2^0
      expect(delay2).toBe(2000); // 1000 * 2^1
      expect(delay3).toBe(4000); // 1000 * 2^2
    });

    it('should add jitter to prevent thundering herd', () => {
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(retryManager.getBackoffDelay(2, 1000, 2, true));
      }

      // With jitter, delays should vary
      const uniqueDelays = new Set(delays);
      expect(uniqueDelays.size).toBeGreaterThan(1);

      // All delays should be around 2000ms (±10%)
      delays.forEach(delay => {
        expect(delay).toBeGreaterThan(1800);
        expect(delay).toBeLessThan(2200);
      });
    });
  });

  describe('shouldRetry', () => {
    it('should return false when max attempts reached', () => {
      const error = new Error('NETWORK_ERROR');
      const shouldRetry = retryManager.shouldRetry(error, 3, 3);

      expect(shouldRetry).toBe(false);
    });

    it('should return true for retryable errors', () => {
      const error = new Error('NETWORK_ERROR');
      const shouldRetry = retryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(true);
    });

    it('should return false for authentication errors', () => {
      const error = new Error('unauthorized');
      const shouldRetry = retryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(false);
    });

    it('should return false for quota exceeded errors', () => {
      const error = new Error('quota exceeded');
      const shouldRetry = retryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(false);
    });

    it('should return true for rate limit errors', () => {
      const error = new Error('rate limit exceeded');
      const shouldRetry = retryManager.shouldRetry(error, 1, 3, ['rate limit']);

      expect(shouldRetry).toBe(true);
    });

    it('should handle error names as well as messages', () => {
      const error = new Error('Something went wrong');
      error.name = 'TIMEOUT';
      const shouldRetry = retryManager.shouldRetry(error, 1, 3);

      expect(shouldRetry).toBe(true);
    });
  });
});

describe('RetryConfigFactory', () => {
  describe('createNetworkRetryConfig', () => {
    it('should create appropriate config for network operations', () => {
      const config = RetryConfigFactory.createNetworkRetryConfig();

      expect(config.maxAttempts).toBe(3);
      expect(config.baseDelay).toBe(1000);
      expect(config.maxDelay).toBe(10000);
      expect(config.backoffMultiplier).toBe(2);
      expect(config.jitter).toBe(true);
      expect(config.retryableErrors).toContain('NETWORK_ERROR');
      expect(config.retryableErrors).toContain('TIMEOUT');
    });
  });

  describe('createAPIRetryConfig', () => {
    it('should create appropriate config for API operations', () => {
      const config = RetryConfigFactory.createAPIRetryConfig();

      expect(config.maxAttempts).toBe(5);
      expect(config.baseDelay).toBe(2000);
      expect(config.maxDelay).toBe(30000);
      expect(config.backoffMultiplier).toBe(1.5);
      expect(config.retryableErrors).toContain('SERVICE_UNAVAILABLE');
      expect(config.retryableErrors).toContain('502');
    });
  });

  describe('createHardwareRetryConfig', () => {
    it('should create appropriate config for hardware operations', () => {
      const config = RetryConfigFactory.createHardwareRetryConfig();

      expect(config.maxAttempts).toBe(2);
      expect(config.baseDelay).toBe(500);
      expect(config.maxDelay).toBe(2000);
      expect(config.jitter).toBe(false);
      expect(config.retryableErrors).toContain('DEVICE_BUSY');
    });
  });

  describe('createCriticalOperationConfig', () => {
    it('should create no-retry config for critical operations', () => {
      const config = RetryConfigFactory.createCriticalOperationConfig();

      expect(config.maxAttempts).toBe(1);
      expect(config.baseDelay).toBe(0);
      expect(config.maxDelay).toBe(0);
      expect(config.retryableErrors).toHaveLength(0);
    });
  });
});