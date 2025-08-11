import { PrivacySettings, PrivacySettingsManager } from './interfaces';
import { StorageService } from '../memory/interfaces';
import { WellnessPrivacyController } from '../memory/privacy-controller';
export declare class GranularPrivacySettingsManager implements PrivacySettingsManager {
    private storageService;
    private privacyController;
    private settingsCache;
    constructor(storageService: StorageService, privacyController: WellnessPrivacyController);
    /**
     * Get privacy settings for a user
     */
    getPrivacySettings(userId: string): Promise<PrivacySettings>;
    /**
     * Update privacy settings for a user
     */
    updatePrivacySettings(userId: string, settings: Partial<PrivacySettings>): Promise<void>;
    /**
     * Validate privacy settings
     */
    validatePrivacySettings(settings: PrivacySettings): boolean;
    /**
     * Apply privacy filters to data based on user settings
     */
    applyPrivacyFilters(data: any, settings: PrivacySettings): any;
    /**
     * Export user data according to privacy settings
     */
    exportUserData(userId: string): Promise<any>;
    /**
     * Delete user data according to privacy settings
     */
    deleteUserData(userId: string, options?: {
        keepProfile?: boolean;
    }): Promise<void>;
    /**
     * Get privacy compliance report for a user
     */
    getPrivacyComplianceReport(userId: string): Promise<{
        userId: string;
        settings: PrivacySettings;
        dataRetentionStatus: string;
        encryptionStatus: string;
        anonymizationStatus: string;
        dataControlsAvailable: string[];
        lastAuditDate: Date;
        complianceScore: number;
    }>;
    /**
     * Bulk update privacy settings for multiple users
     */
    bulkUpdatePrivacySettings(updates: Array<{
        userId: string;
        settings: Partial<PrivacySettings>;
    }>): Promise<{
        successful: string[];
        failed: Array<{
            userId: string;
            error: string;
        }>;
    }>;
    /**
     * Get default privacy settings
     */
    private getDefaultPrivacySettings;
    /**
     * Validate and normalize privacy settings
     */
    private validateAndNormalizeSettings;
    /** Map snake_case keys coming from tests to camelCase */
    private normalizeIncomingSettings;
    /**
     * Apply privacy changes when settings are updated
     */
    private applyPrivacyChanges;
}
/**
 * Create privacy settings manager with dependencies
 */
export declare function createPrivacySettingsManager(storageService: StorageService, privacyController: WellnessPrivacyController): GranularPrivacySettingsManager;
//# sourceMappingURL=privacy-settings-manager.d.ts.map