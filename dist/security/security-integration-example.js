"use strict";
// Security integration example showing how all components work together
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComprehensiveSecurityAuditService = exports.RaspberryPiSecureBootMonitor = exports.GranularPrivacySettingsManager = exports.AutoAudioCleanupService = exports.SecureTLSManager = exports.SecurityIntegrationExample = void 0;
exports.runSecurityDemo = runSecurityDemo;
const tls_manager_1 = require("./tls-manager");
Object.defineProperty(exports, "SecureTLSManager", { enumerable: true, get: function () { return tls_manager_1.SecureTLSManager; } });
const audio_cleanup_service_1 = require("./audio-cleanup-service");
Object.defineProperty(exports, "AutoAudioCleanupService", { enumerable: true, get: function () { return audio_cleanup_service_1.AutoAudioCleanupService; } });
const privacy_settings_manager_1 = require("./privacy-settings-manager");
Object.defineProperty(exports, "GranularPrivacySettingsManager", { enumerable: true, get: function () { return privacy_settings_manager_1.GranularPrivacySettingsManager; } });
const secure_boot_monitor_1 = require("./secure-boot-monitor");
Object.defineProperty(exports, "RaspberryPiSecureBootMonitor", { enumerable: true, get: function () { return secure_boot_monitor_1.RaspberryPiSecureBootMonitor; } });
const security_audit_service_1 = require("./security-audit-service");
Object.defineProperty(exports, "ComprehensiveSecurityAuditService", { enumerable: true, get: function () { return security_audit_service_1.ComprehensiveSecurityAuditService; } });
const storage_service_1 = require("../memory/storage-service");
const privacy_controller_1 = require("../memory/privacy-controller");
/**
 * Example of how to initialize and use all security components together
 */
class SecurityIntegrationExample {
    constructor() {
        // Initialize core services
        this.storageService = new storage_service_1.SQLiteStorageService('./data/wellness_companion.db');
        this.privacyController = new privacy_controller_1.WellnessPrivacyController(this.storageService);
        // Initialize security components
        this.tlsManager = new tls_manager_1.SecureTLSManager();
        this.audioCleanupService = new audio_cleanup_service_1.AutoAudioCleanupService({
            autoDeleteEnabled: true,
            maxRetentionMs: 5 * 60 * 1000, // 5 minutes
            cleanupIntervalMs: 60 * 1000, // 1 minute
            tempDirectories: ['./temp/audio', './data/temp'],
            filePatterns: ['*.wav', '*.mp3', '*.ogg', 'temp_audio_*']
        });
        this.privacySettingsManager = new privacy_settings_manager_1.GranularPrivacySettingsManager(this.storageService, this.privacyController);
        this.secureBootMonitor = new secure_boot_monitor_1.RaspberryPiSecureBootMonitor({
            enableTamperDetection: true,
            checkSystemIntegrity: true,
            monitorFileChanges: true,
            alertOnSuspiciousActivity: true
        });
        this.securityAuditService = new security_audit_service_1.ComprehensiveSecurityAuditService(this.tlsManager, this.audioCleanupService, this.privacySettingsManager, this.secureBootMonitor, this.storageService);
    }
    /**
     * Initialize all security components
     */
    async initialize() {
        console.log('Initializing security components...');
        try {
            // Initialize storage
            await this.storageService.initialize();
            console.log('✓ Storage service initialized');
            // Initialize audio cleanup
            await this.audioCleanupService.initialize();
            console.log('✓ Audio cleanup service initialized');
            // Initialize secure boot monitor
            await this.secureBootMonitor.initialize();
            console.log('✓ Secure boot monitor initialized');
            console.log('✓ All security components initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize security components:', error);
            throw error;
        }
    }
    /**
     * Demonstrate secure API communication
     */
    async demonstrateSecureAPICall() {
        console.log('\n--- Demonstrating Secure API Communication ---');
        try {
            // Validate TLS connection
            const isSecure = await this.tlsManager.validateTLSConnection('https://api.openai.com');
            console.log(`OpenAI API TLS validation: ${isSecure ? 'SECURE' : 'INSECURE'}`);
            // Get TLS information
            const tlsInfo = await this.tlsManager.getTLSInfo('https://api.openai.com');
            console.log(`TLS Protocol: ${tlsInfo.protocol}`);
            console.log(`TLS Cipher: ${tlsInfo.cipher?.name}`);
            console.log(`Certificate Valid: ${tlsInfo.authorized}`);
            // Create secure fetch function
            const secureFetch = this.tlsManager.createSecureFetch();
            console.log('✓ Secure fetch function created with TLS 1.3 enforcement');
        }
        catch (error) {
            console.error('Secure API demonstration failed:', error);
        }
    }
    /**
     * Demonstrate audio cleanup functionality
     */
    async demonstrateAudioCleanup() {
        console.log('\n--- Demonstrating Audio Cleanup ---');
        try {
            // Get cleanup statistics
            const stats = await this.audioCleanupService.getCleanupStats();
            console.log(`Temporary files: ${stats.totalTempFiles}`);
            console.log(`Total size: ${Math.round(stats.totalSizeBytes / 1024)} KB`);
            console.log(`Oldest file age: ${Math.round(stats.oldestFileAge / 1000)} seconds`);
            console.log(`Scheduled deletions: ${stats.scheduledDeletions}`);
            // Perform cleanup
            const deletedCount = await this.audioCleanupService.cleanupTempFiles();
            console.log(`✓ Cleaned up ${deletedCount} temporary audio files`);
        }
        catch (error) {
            console.error('Audio cleanup demonstration failed:', error);
        }
    }
    /**
     * Demonstrate privacy settings management
     */
    async demonstratePrivacySettings() {
        console.log('\n--- Demonstrating Privacy Settings ---');
        const testUserId = 'demo-user-123';
        try {
            // Get default privacy settings
            const defaultSettings = await this.privacySettingsManager.getPrivacySettings(testUserId);
            console.log('Default privacy settings:', {
                dataRetentionDays: defaultSettings.dataRetentionDays,
                encryptionEnabled: defaultSettings.encryptionEnabled,
                autoDeleteAudio: defaultSettings.autoDeleteAudio
            });
            // Update privacy settings
            await this.privacySettingsManager.updatePrivacySettings(testUserId, {
                dataRetentionDays: 7,
                anonymizeData: true,
                allowAnalytics: false
            });
            console.log('✓ Privacy settings updated');
            // Get compliance report
            const complianceReport = await this.privacySettingsManager.getPrivacyComplianceReport(testUserId);
            console.log(`Privacy compliance score: ${complianceReport.complianceScore}/100`);
            console.log(`Data controls available: ${complianceReport.dataControlsAvailable.join(', ')}`);
        }
        catch (error) {
            console.error('Privacy settings demonstration failed:', error);
        }
    }
    /**
     * Demonstrate system integrity monitoring
     */
    async demonstrateSystemIntegrity() {
        console.log('\n--- Demonstrating System Integrity Monitoring ---');
        try {
            // Check system integrity
            const integrityResults = await this.secureBootMonitor.checkSystemIntegrity();
            console.log(`System integrity checks: ${integrityResults.length} performed`);
            const passedChecks = integrityResults.filter(r => r.status === 'PASS').length;
            const failedChecks = integrityResults.filter(r => r.status === 'FAIL').length;
            console.log(`✓ Passed: ${passedChecks}, ✗ Failed: ${failedChecks}`);
            // Check for tampering
            const tamperingDetected = await this.secureBootMonitor.detectTampering();
            console.log(`Tampering detected: ${tamperingDetected ? 'YES' : 'NO'}`);
            // Get security status
            const securityStatus = await this.secureBootMonitor.getSecurityStatus();
            const criticalIssues = securityStatus.filter(s => s.severity === 'CRITICAL').length;
            console.log(`Critical security issues: ${criticalIssues}`);
        }
        catch (error) {
            console.error('System integrity demonstration failed:', error);
        }
    }
    /**
     * Run comprehensive security audit
     */
    async runSecurityAudit() {
        console.log('\n--- Running Comprehensive Security Audit ---');
        try {
            // Run full security audit
            const auditResults = await this.securityAuditService.runFullSecurityAudit();
            const summary = {
                totalChecks: auditResults.length,
                passed: auditResults.filter(r => r.status === 'PASS').length,
                failed: auditResults.filter(r => r.status === 'FAIL').length,
                warnings: auditResults.filter(r => r.status === 'WARNING').length,
                critical: auditResults.filter(r => r.severity === 'CRITICAL').length,
                high: auditResults.filter(r => r.severity === 'HIGH').length
            };
            console.log('Security Audit Summary:');
            console.log(`  Total checks: ${summary.totalChecks}`);
            console.log(`  ✓ Passed: ${summary.passed}`);
            console.log(`  ✗ Failed: ${summary.failed}`);
            console.log(`  ⚠ Warnings: ${summary.warnings}`);
            console.log(`  🔴 Critical issues: ${summary.critical}`);
            console.log(`  🟠 High severity issues: ${summary.high}`);
            // Get security metrics
            const metrics = await this.securityAuditService.getSecurityMetrics();
            console.log('\nSecurity Metrics:');
            console.log(`  System integrity score: ${metrics.systemIntegrityScore}%`);
            console.log(`  Data protection score: ${metrics.dataProtectionScore}%`);
            console.log(`  Network security score: ${metrics.networkSecurityScore}%`);
            // Generate detailed report
            const report = await this.securityAuditService.generateSecurityReport();
            console.log('\n✓ Detailed security report generated');
            // Show failed checks
            const failedChecks = auditResults.filter(r => r.status === 'FAIL');
            if (failedChecks.length > 0) {
                console.log('\nFailed Security Checks:');
                failedChecks.forEach(check => {
                    console.log(`  - ${check.component}: ${check.message} (${check.severity})`);
                });
            }
        }
        catch (error) {
            console.error('Security audit failed:', error);
        }
    }
    /**
     * Run complete security demonstration
     */
    async runDemo() {
        console.log('🔒 AI Wellness Companion - Security Features Demonstration\n');
        try {
            await this.initialize();
            await this.demonstrateSecureAPICall();
            await this.demonstrateAudioCleanup();
            await this.demonstratePrivacySettings();
            await this.demonstrateSystemIntegrity();
            await this.runSecurityAudit();
            console.log('\n✅ Security demonstration completed successfully!');
            console.log('\nSecurity Features Implemented:');
            console.log('  ✓ TLS 1.3 encryption for external API communications');
            console.log('  ✓ Automatic temporary audio file deletion');
            console.log('  ✓ Granular privacy settings with user control');
            console.log('  ✓ Secure boot process and tamper detection');
            console.log('  ✓ Comprehensive security audit system');
        }
        catch (error) {
            console.error('Security demonstration failed:', error);
        }
    }
    /**
     * Cleanup resources
     */
    async cleanup() {
        try {
            this.audioCleanupService.stopCleanupScheduler();
            await this.storageService.close();
            console.log('✓ Security components cleaned up');
        }
        catch (error) {
            console.error('Cleanup failed:', error);
        }
    }
}
exports.SecurityIntegrationExample = SecurityIntegrationExample;
/**
 * Run the security demonstration
 */
async function runSecurityDemo() {
    const demo = new SecurityIntegrationExample();
    try {
        await demo.runDemo();
    }
    finally {
        await demo.cleanup();
    }
}
//# sourceMappingURL=security-integration-example.js.map