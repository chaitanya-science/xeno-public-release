import { SecureTLSManager } from './tls-manager';
import { AutoAudioCleanupService } from './audio-cleanup-service';
import { GranularPrivacySettingsManager } from './privacy-settings-manager';
import { RaspberryPiSecureBootMonitor } from './secure-boot-monitor';
import { ComprehensiveSecurityAuditService } from './security-audit-service';
/**
 * Example of how to initialize and use all security components together
 */
export declare class SecurityIntegrationExample {
    private tlsManager;
    private audioCleanupService;
    private privacySettingsManager;
    private secureBootMonitor;
    private securityAuditService;
    private storageService;
    private privacyController;
    constructor();
    /**
     * Initialize all security components
     */
    initialize(): Promise<void>;
    /**
     * Demonstrate secure API communication
     */
    demonstrateSecureAPICall(): Promise<void>;
    /**
     * Demonstrate audio cleanup functionality
     */
    demonstrateAudioCleanup(): Promise<void>;
    /**
     * Demonstrate privacy settings management
     */
    demonstratePrivacySettings(): Promise<void>;
    /**
     * Demonstrate system integrity monitoring
     */
    demonstrateSystemIntegrity(): Promise<void>;
    /**
     * Run comprehensive security audit
     */
    runSecurityAudit(): Promise<void>;
    /**
     * Run complete security demonstration
     */
    runDemo(): Promise<void>;
    /**
     * Cleanup resources
     */
    cleanup(): Promise<void>;
}
/**
 * Run the security demonstration
 */
export declare function runSecurityDemo(): Promise<void>;
export { SecureTLSManager, AutoAudioCleanupService, GranularPrivacySettingsManager, RaspberryPiSecureBootMonitor, ComprehensiveSecurityAuditService };
//# sourceMappingURL=security-integration-example.d.ts.map