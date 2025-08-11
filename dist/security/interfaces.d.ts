export interface TLSConfig {
    minVersion: string;
    maxVersion: string;
    ciphers: string | string[];
    honorCipherOrder: boolean;
    rejectUnauthorized: boolean;
    checkServerIdentity: boolean;
}
export interface AudioCleanupConfig {
    autoDeleteEnabled: boolean;
    maxRetentionMs: number;
    cleanupIntervalMs: number;
    tempDirectories: string[];
    filePatterns: string[];
}
export interface PrivacySettings {
    dataRetentionDays: number;
    autoDeleteAudio: boolean;
    allowMemoryStorage: boolean;
    allowConversationHistory: boolean;
    allowAnalytics: boolean;
    allowCrashReporting: boolean;
    encryptionEnabled: boolean;
    anonymizeData: boolean;
    allowDataExport: boolean;
    allowDataDeletion: boolean;
}
export interface SecureBootConfig {
    enableTamperDetection: boolean;
    checkSystemIntegrity: boolean;
    monitorFileChanges: boolean;
    alertOnSuspiciousActivity: boolean;
    trustedBootEnabled: boolean;
    secureBootKeys: string[];
}
export interface SecurityAuditResult {
    timestamp: Date;
    component: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    message: string;
    details?: any;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
export interface TLSManager {
    configureSecureDefaults(): TLSConfig;
    validateTLSConnection(url: string): Promise<boolean>;
    createSecureAgent(): any;
    getSecureRequestOptions(url: string): any;
}
export interface AudioCleanupService {
    initialize(): Promise<void>;
    startCleanupScheduler(): void;
    stopCleanupScheduler(): void;
    cleanupTempFiles(): Promise<number>;
    deleteAudioFile(filePath: string): Promise<void>;
    scheduleFileDeletion(filePath: string, delayMs?: number): void;
}
export interface PrivacySettingsManager {
    getPrivacySettings(userId: string): Promise<PrivacySettings>;
    updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void>;
    validatePrivacySettings(settings: PrivacySettings): boolean;
    applyPrivacyFilters(data: any, settings: PrivacySettings): any;
    exportUserData(userId: string): Promise<any>;
    deleteUserData(userId: string, options?: {
        keepProfile?: boolean;
    }): Promise<void>;
}
export interface SecureBootMonitor {
    initialize(): Promise<void>;
    checkSystemIntegrity(): Promise<SecurityAuditResult[]>;
    detectTampering(): Promise<boolean>;
    monitorFileChanges(): void;
    getSecurityStatus(): Promise<SecurityAuditResult[]>;
}
export interface SecurityAuditService {
    runFullSecurityAudit(): Promise<SecurityAuditResult[]>;
    auditDataProtection(): Promise<SecurityAuditResult[]>;
    auditAccessControl(): Promise<SecurityAuditResult[]>;
    auditNetworkSecurity(): Promise<SecurityAuditResult[]>;
    auditSystemIntegrity(): Promise<SecurityAuditResult[]>;
    generateSecurityReport(): Promise<string>;
}
export interface SecurityEvent {
    id: string;
    timestamp: Date;
    type: 'AUTHENTICATION' | 'AUTHORIZATION' | 'DATA_ACCESS' | 'SYSTEM_INTEGRITY' | 'NETWORK_SECURITY';
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    source: string;
    message: string;
    details: any;
    resolved: boolean;
}
export interface SecurityMetrics {
    totalEvents: number;
    criticalEvents: number;
    highSeverityEvents: number;
    lastAuditTime: Date;
    systemIntegrityScore: number;
    dataProtectionScore: number;
    networkSecurityScore: number;
}
//# sourceMappingURL=interfaces.d.ts.map