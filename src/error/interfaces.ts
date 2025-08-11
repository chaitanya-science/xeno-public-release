// Error handling and recovery interfaces

export interface ErrorRecoveryService {
  handleNetworkError(error: NetworkError): Promise<RecoveryAction>;
  handleHardwareError(error: HardwareError): Promise<RecoveryAction>;
  handleAPIError(error: APIError): Promise<RecoveryAction>;
  enterOfflineMode(): Promise<void>;
  exitOfflineMode(): Promise<void>;
  isOfflineMode(): boolean;
  getSystemStatus(): SystemStatus;
  getCircuitBreakerStatus?(serviceKey: string): Promise<any>;
}

export interface RetryManager {
  executeWithRetry<T>(
    operation: () => Promise<T>,
    config?: Partial<RetryConfig>
  ): Promise<T>;
  getBackoffDelay(
    attempt: number,
    baseDelay: number,
    backoffMultiplier?: number,
    jitter?: boolean
  ): number;
  shouldRetry(
    error: Error,
    attempt: number,
    maxAttempts: number,
    retryableErrors?: string[]
  ): boolean;
  registerRetryableOperation?(serviceKey: string | Partial<RetryConfig>): void;
}

export interface OfflineModeManager {
  activate(): Promise<void>;
  deactivate(): Promise<void>;
  isActive(): boolean;
  getCachedResponse(input: string): Promise<string | null>;
  addCachedResponse(input: string, response: string): Promise<void>;
  getOfflineCapabilities(): OfflineCapabilities;
  explainLimitedFunctionality(): string;
}

export interface HardwareMonitor {
  checkMicrophone(): Promise<HardwareStatus>;
  checkSpeaker(): Promise<HardwareStatus>;
  checkSystemResources(): Promise<SystemResourceStatus>;
  detectHardwareFailures(): Promise<HardwareFailure[]>;
  generateUserFriendlyReport(failures: HardwareFailure[]): string;
}

export interface NetworkError extends Error {
  type: 'CONNECTION_LOST' | 'API_TIMEOUT' | 'DNS_FAILURE' | 'RATE_LIMITED';
  endpoint?: string;
  statusCode?: number;
  retryable: boolean;
  retryAfter?: number;
}

export interface HardwareError extends Error {
  type: 'MICROPHONE_FAILURE' | 'SPEAKER_FAILURE' | 'MEMORY_EXHAUSTED' | 'CPU_OVERLOAD';
  component: string;
  severity: 'WARNING' | 'CRITICAL';
  userFriendlyMessage: string;
}

export interface APIError extends Error {
  type: 'AUTHENTICATION' | 'QUOTA_EXCEEDED' | 'SERVICE_UNAVAILABLE' | 'INVALID_REQUEST';
  service: 'OPENAI' | 'SPEECH_TO_TEXT' | 'TEXT_TO_SPEECH';
  statusCode?: number;
  retryAfter?: number;
  retryable: boolean;
}

export interface RecoveryAction {
  type: 'RETRY' | 'FALLBACK' | 'OFFLINE_MODE' | 'USER_NOTIFICATION' | 'SYSTEM_RESTART';
  delay?: number;
  message?: string;
  fallbackService?: string;
  userAction?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors: string[];
}

export interface SystemStatus {
  mode: 'NORMAL' | 'DEGRADED' | 'OFFLINE' | 'MAINTENANCE';
  availableServices: string[];
  unavailableServices: string[];
  lastError?: Error;
  recoveryInProgress: boolean;
}

export interface OfflineCapabilities {
  canProcessWakeWord: boolean;
  canProvideBasicResponses: boolean;
  canAccessMemories: boolean;
  canDetectCrisis: boolean;
  limitedFunctionality: string[];
  // Added alias fields expected by integration tests
  basicConversation?: boolean; // mirrors canProvideBasicResponses
  crisisDetection?: boolean;   // mirrors canDetectCrisis
  speechRecognition?: boolean; // offline speech recognition availability
  textToSpeech?: boolean;      // offline tts availability
}

export interface HardwareStatus {
  component: string;
  status: 'WORKING' | 'DEGRADED' | 'FAILED';
  message: string;
  lastCheck: Date;
  details?: Record<string, any>;
}

export interface SystemResourceStatus {
  cpu: {
    usage: number;
    status: 'NORMAL' | 'HIGH' | 'CRITICAL';
  };
  memory: {
    usage: number;
    available: number;
    status: 'NORMAL' | 'HIGH' | 'CRITICAL';
  };
  storage: {
    usage: number;
    available: number;
    status: 'NORMAL' | 'HIGH' | 'CRITICAL';
  };
}

export interface HardwareFailure {
  component: string;
  type: 'FAILURE' | 'DEGRADATION' | 'WARNING';
  message: string;
  userFriendlyMessage: string;
  suggestedAction?: string;
  timestamp: Date;
}

export interface ErrorMetrics {
  totalErrors: number;
  errorsByType: Record<string, number>;
  recoverySuccessRate: number;
  averageRecoveryTime: number;
  offlineModeActivations: number;
  lastErrorTime?: Date;
}