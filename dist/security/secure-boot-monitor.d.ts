import { SecureBootConfig, SecureBootMonitor, SecurityAuditResult } from './interfaces';
export declare class RaspberryPiSecureBootMonitor implements SecureBootMonitor {
    private config;
    private fileWatcher;
    private systemHashes;
    private isInitialized;
    constructor(config?: Partial<SecureBootConfig>);
    /**
     * Initialize the secure boot monitor
     */
    initialize(): Promise<void>;
    /**
     * Check system integrity
     */
    checkSystemIntegrity(): Promise<SecurityAuditResult[]>;
    /**
     * Detect tampering attempts
     */
    detectTampering(): Promise<boolean>;
    /**
     * Monitor file changes in critical system directories
     */
    monitorFileChanges(): void;
    /**
     * Get current security status
     */
    getSecurityStatus(): Promise<SecurityAuditResult[]>;
    /**
     * Verify we're running on a Raspberry Pi
     */
    private verifyRaspberryPi;
    /**
     * Initialize system integrity baseline
     */
    private initializeSystemBaseline;
    /**
     * Check boot configuration
     */
    private checkBootConfiguration;
    /**
     * Check system files integrity
     */
    private checkSystemFiles;
    /**
     * Check kernel modules
     */
    private checkKernelModules;
    /**
     * Check firmware integrity
     */
    private checkFirmwareIntegrity;
    /**
     * Check for unauthorized modifications
     */
    private checkUnauthorizedModifications;
    /**
     * Check secure boot status
     */
    private checkSecureBootStatus;
    /**
     * Handle file change events
     */
    private handleFileChange;
    /**
     * Alert on suspicious activity
     */
    private alertSuspiciousActivity;
    /**
     * Check if a port is authorized
     */
    private isAuthorizedPort;
    /**
     * Check if a process is suspicious
     */
    private isSuspiciousProcess;
}
/**
 * Global secure boot monitor instance
 */
export declare const secureBootMonitor: RaspberryPiSecureBootMonitor;
/**
 * Initialize secure boot monitoring with configuration
 */
export declare function initializeSecureBootMonitor(config?: Partial<SecureBootConfig>): Promise<RaspberryPiSecureBootMonitor>;
//# sourceMappingURL=secure-boot-monitor.d.ts.map