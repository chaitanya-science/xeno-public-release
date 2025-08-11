import { RetryManager, RetryConfig } from './interfaces';
export declare class RetryManagerImpl implements RetryManager {
    private defaultConfig;
    constructor(defaultOverrides?: Partial<RetryConfig>);
    executeWithRetry<T>(operation: () => Promise<T>, config?: Partial<RetryConfig>): Promise<T>;
    getBackoffDelay(attempt: number, baseDelay: number, backoffMultiplier?: number, jitter?: boolean): number;
    shouldRetry(error: Error, attempt: number, maxAttempts: number, retryableErrors?: string[]): boolean;
    private isRateLimitError;
    private isAuthenticationError;
    private isQuotaExceededError;
    private sleep;
    registerRetryableOperation?(serviceKey: string | Partial<RetryConfig>): void;
}
export declare class RetryConfigFactory {
    static createNetworkRetryConfig(): RetryConfig;
    static createAPIRetryConfig(): RetryConfig;
    static createHardwareRetryConfig(): RetryConfig;
    static createCriticalOperationConfig(): RetryConfig;
}
//# sourceMappingURL=retry-manager.d.ts.map