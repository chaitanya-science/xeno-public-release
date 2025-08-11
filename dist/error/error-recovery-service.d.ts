import { ErrorRecoveryService, NetworkError, HardwareError, APIError, RecoveryAction, SystemStatus, OfflineModeManager, HardwareMonitor, RetryManager } from './interfaces';
export declare class ErrorRecoveryServiceImpl implements ErrorRecoveryService {
    private systemStatus;
    private offlineModeManager;
    private hardwareMonitor;
    private retryManager;
    private errorHistory;
    private recoveryInProgress;
    constructor(retryManager: RetryManager, offlineModeManager: OfflineModeManager, hardwareMonitor?: HardwareMonitor);
    private createDefaultHardwareMonitor;
    handleNetworkError(error: NetworkError): Promise<RecoveryAction>;
    handleHardwareError(error: HardwareError): Promise<RecoveryAction>;
    handleAPIError(error: APIError): Promise<RecoveryAction>;
    enterOfflineMode(): Promise<void>;
    exitOfflineMode(): Promise<void>;
    isOfflineMode(): boolean;
    getSystemStatus(): SystemStatus;
    getCircuitBreakerStatus?(serviceKey: string): Promise<'OPEN' | 'CLOSED' | 'HALF_OPEN'>;
    private handleConnectionLoss;
    private handleAPITimeout;
    private handleDNSFailure;
    private handleRateLimit;
    private handleMicrophoneFailure;
    private handleSpeakerFailure;
    private handleMemoryExhaustion;
    private handleCPUOverload;
    private handleAuthenticationError;
    private handleQuotaExceeded;
    private handleServiceUnavailable;
    private handleInvalidRequest;
    private handleGenericNetworkError;
    private handleGenericHardwareError;
    private handleGenericAPIError;
    private checkNetworkRecovery;
    private performMemoryCleanup;
}
//# sourceMappingURL=error-recovery-service.d.ts.map