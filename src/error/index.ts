// Error handling and recovery module exports

export * from './interfaces';
export * from './error-recovery-service';
export * from './retry-manager';
export * from './offline-mode-manager';
export * from './hardware-monitor';

// Re-export commonly used types
export type {
  ErrorRecoveryService,
  RetryManager,
  OfflineModeManager,
  HardwareMonitor,
  NetworkError,
  HardwareError,
  APIError,
  RecoveryAction,
  RetryConfig,
  SystemStatus,
  OfflineCapabilities,
  HardwareStatus,
  SystemResourceStatus,
  HardwareFailure
} from './interfaces';