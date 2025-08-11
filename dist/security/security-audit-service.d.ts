import { SecurityAuditService, SecurityAuditResult, SecurityMetrics } from './interfaces';
import { SecureTLSManager } from './tls-manager';
import { AutoAudioCleanupService } from './audio-cleanup-service';
import { GranularPrivacySettingsManager } from './privacy-settings-manager';
import { RaspberryPiSecureBootMonitor } from './secure-boot-monitor';
import { StorageService } from '../memory/interfaces';
export declare class ComprehensiveSecurityAuditService implements SecurityAuditService {
    private tlsManager;
    private audioCleanupService;
    private privacySettingsManager;
    private secureBootMonitor;
    private storageService;
    private securityEvents;
    constructor(tlsManager: SecureTLSManager, audioCleanupService: AutoAudioCleanupService, privacySettingsManager: GranularPrivacySettingsManager, secureBootMonitor: RaspberryPiSecureBootMonitor, storageService: StorageService);
    /**
     * Run comprehensive security audit
     */
    runFullSecurityAudit(): Promise<SecurityAuditResult[]>;
    /**
     * Audit data protection measures
     */
    auditDataProtection(): Promise<SecurityAuditResult[]>;
    /**
     * Audit access control mechanisms
     */
    auditAccessControl(): Promise<SecurityAuditResult[]>;
    /**
     * Audit network security
     */
    auditNetworkSecurity(): Promise<SecurityAuditResult[]>;
    /**
     * Audit system integrity
     */
    auditSystemIntegrity(): Promise<SecurityAuditResult[]>;
    /**
     * Generate comprehensive security report
     */
    generateSecurityReport(): Promise<string>;
    /**
     * Get security metrics
     */
    getSecurityMetrics(): Promise<SecurityMetrics>;
    /**
     * Check encryption status
     */
    private checkEncryptionStatus;
    /**
     * Check audio cleanup status
     */
    private checkAudioCleanup;
    /**
     * Check data retention policies
     */
    private checkDataRetentionPolicies;
    /**
     * Check privacy compliance
     */
    private checkPrivacyCompliance;
    /**
     * Check database access controls
     */
    private checkDatabaseAccess;
    /**
     * Check file permissions
     */
    private checkFilePermissions;
    /**
     * Check API key security
     */
    private checkApiKeySecurity;
    /**
     * Check TLS configuration
     */
    private checkTLSConfiguration;
    /**
     * Check external API connections
     */
    private checkExternalAPIConnections;
    /**
     * Check network exposure
     */
    private checkNetworkExposure;
    /**
     * Calculate data protection score
     */
    private calculateDataProtectionScore;
    /**
     * Calculate network security score
     */
    private calculateNetworkSecurityScore;
    /**
     * Generate security recommendations
     */
    private generateRecommendations;
    /**
     * Assess compliance status
     */
    private assessComplianceStatus;
    /**
     * Log security event
     */
    private logSecurityEvent;
    /**
     * Generate unique event ID
     */
    private generateEventId;
}
/**
 * Create comprehensive security audit service
 */
export declare function createSecurityAuditService(tlsManager: SecureTLSManager, audioCleanupService: AutoAudioCleanupService, privacySettingsManager: GranularPrivacySettingsManager, secureBootMonitor: RaspberryPiSecureBootMonitor, storageService: StorageService): ComprehensiveSecurityAuditService;
//# sourceMappingURL=security-audit-service.d.ts.map