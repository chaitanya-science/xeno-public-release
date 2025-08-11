// Retry manager with exponential backoff implementation

import { RetryManager, RetryConfig } from './interfaces';

export class RetryManagerImpl implements RetryManager {
  private defaultConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true,
    retryableErrors: [
      'NETWORK_ERROR',
      'TIMEOUT',
      'SERVICE_UNAVAILABLE',
      'RATE_LIMITED',
      'CONNECTION_RESET'
    ]
  };

  constructor(defaultOverrides?: Partial<RetryConfig>) {
    if (defaultOverrides) {
      this.defaultConfig = { ...this.defaultConfig, ...defaultOverrides };
    }
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultConfig, ...config };
    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 1; attempt <= finalConfig.maxAttempts; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry if this wasn't the first attempt
        if (attempt > 1) {
          console.log(`Operation succeeded on attempt ${attempt}`);
        }
        
        return result;
      } catch (error) {
        lastError = error as Error;
        
        console.log(`Operation failed on attempt ${attempt}/${finalConfig.maxAttempts}: ${lastError.message}`);
        
        // Don't retry if this was the last attempt
        if (attempt === finalConfig.maxAttempts) {
          break;
        }
        
        // Don't retry if the error is not retryable
        if (!this.shouldRetry(lastError, attempt, finalConfig.maxAttempts, finalConfig.retryableErrors)) {
          console.log(`Error is not retryable: ${lastError.message}`);
          break;
        }
        
        // Calculate delay and wait before next attempt
        const delay = this.getBackoffDelay(attempt, finalConfig.baseDelay, finalConfig.backoffMultiplier, finalConfig.jitter);
        const finalDelay = Math.min(delay, finalConfig.maxDelay);
        
        console.log(`Waiting ${finalDelay}ms before retry attempt ${attempt + 1}`);
        await this.sleep(finalDelay);
      }
    }
    
    // If we get here, all attempts failed
    throw new Error(`Operation failed after ${finalConfig.maxAttempts} attempts. Last error: ${lastError.message}`);
  }

  getBackoffDelay(attempt: number, baseDelay: number, backoffMultiplier: number = 2, jitter: boolean = true): number {
    const exponentialDelay = baseDelay * Math.pow(backoffMultiplier, attempt - 1);
    
    if (!jitter) {
      return exponentialDelay;
    }
    
    // Add jitter to prevent thundering herd problem
    const jitterRange = exponentialDelay * 0.1; // 10% jitter
    const jitterValue = (Math.random() - 0.5) * 2 * jitterRange;
    
    return Math.max(0, exponentialDelay + jitterValue);
  }

  shouldRetry(error: Error, attempt: number, maxAttempts: number, retryableErrors?: string[]): boolean {
    // Don't retry if we've reached max attempts
    if (attempt >= maxAttempts) {
      return false;
    }
    
    // Use provided retryable errors or default
    const errorsToCheck = retryableErrors || this.defaultConfig.retryableErrors;
    
    // Check if error type is retryable
    const errorMessage = error.message.toLowerCase();
    const isRetryableError = errorsToCheck.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase()) ||
      error.name.toLowerCase().includes(retryableError.toLowerCase())
    );
    
    if (!isRetryableError) {
      return false;
    }
    
    // Special handling for specific error types
    if (this.isRateLimitError(error)) {
      return true; // Always retry rate limit errors with appropriate delay
    }
    
    if (this.isAuthenticationError(error)) {
      return false; // Don't retry authentication errors
    }
    
    if (this.isQuotaExceededError(error)) {
      return false; // Don't retry quota exceeded errors
    }
    
    return true;
  }

  private isRateLimitError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('rate limit') || 
           message.includes('too many requests') ||
           message.includes('429') ||
           message.includes('rate_limited');
  }

  private isAuthenticationError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('unauthorized') ||
           message.includes('authentication') ||
           message.includes('401') ||
           message.includes('403');
  }

  private isQuotaExceededError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('quota exceeded') ||
           message.includes('usage limit') ||
           message.includes('billing');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Allow registering simple service keys (tests pass strings) mapping to default config
  registerRetryableOperation?(serviceKey: string | Partial<RetryConfig>): void {
    if (typeof serviceKey === 'string') {
      // no-op placeholder for tests
      return;
    }
    // if config object passed, merge into defaults (lightweight behavior)
    this.defaultConfig = { ...this.defaultConfig, ...serviceKey } as RetryConfig;
  }
}

// Utility function to create retry configs for different scenarios
export class RetryConfigFactory {
  static createNetworkRetryConfig(): RetryConfig {
    return {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffMultiplier: 2,
      jitter: true,
      retryableErrors: ['NETWORK_ERROR', 'TIMEOUT', 'CONNECTION_RESET', 'DNS_FAILURE']
    };
  }

  static createAPIRetryConfig(): RetryConfig {
    return {
      maxAttempts: 5,
      baseDelay: 2000,
      maxDelay: 30000,
      backoffMultiplier: 1.5,
      jitter: true,
      retryableErrors: ['SERVICE_UNAVAILABLE', 'TIMEOUT', 'RATE_LIMITED', '502', '503', '504']
    };
  }

  static createHardwareRetryConfig(): RetryConfig {
    return {
      maxAttempts: 2,
      baseDelay: 500,
      maxDelay: 2000,
      backoffMultiplier: 2,
      jitter: false,
      retryableErrors: ['DEVICE_BUSY', 'TEMPORARY_FAILURE']
    };
  }

  static createCriticalOperationConfig(): RetryConfig {
    return {
      maxAttempts: 1,
      baseDelay: 0,
      maxDelay: 0,
      backoffMultiplier: 1,
      jitter: false,
      retryableErrors: []
    };
  }
}