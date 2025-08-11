"use strict";
// Granular privacy settings manager with user control
Object.defineProperty(exports, "__esModule", { value: true });
exports.GranularPrivacySettingsManager = void 0;
exports.createPrivacySettingsManager = createPrivacySettingsManager;
class GranularPrivacySettingsManager {
    constructor(storageService, privacyController) {
        this.settingsCache = new Map();
        this.storageService = storageService;
        this.privacyController = privacyController;
    }
    /**
     * Get privacy settings for a user
     */
    async getPrivacySettings(userId) {
        // Check cache first
        if (this.settingsCache.has(userId)) {
            return this.settingsCache.get(userId);
        }
        try {
            const userProfile = await this.storageService.getUserProfile(userId);
            const settings = userProfile?.privacy_settings || this.getDefaultPrivacySettings();
            // Normalize potential snake_case keys from tests
            const normalizedRaw = this.normalizeIncomingSettings(settings);
            // Validate and normalize settings
            const validatedSettings = this.validateAndNormalizeSettings(normalizedRaw);
            // Cache the settings
            this.settingsCache.set(userId, validatedSettings);
            return validatedSettings;
        }
        catch (error) {
            console.error(`Failed to get privacy settings for user ${userId}:`, error);
            return this.getDefaultPrivacySettings();
        }
    }
    /**
     * Update privacy settings for a user
     */
    async updatePrivacySettings(userId, settings) {
        try {
            const currentSettings = await this.getPrivacySettings(userId);
            const mergedRaw = { ...currentSettings, ...this.normalizeIncomingSettings(settings) };
            const newSettings = this.validateAndNormalizeSettings(mergedRaw);
            // Validate new settings
            if (!this.validatePrivacySettings(newSettings)) {
                throw new Error('Invalid privacy settings provided');
            }
            // Get user profile
            let userProfile = await this.storageService.getUserProfile(userId);
            if (!userProfile) {
                // Create new user profile if it doesn't exist
                userProfile = {
                    user_id: userId,
                    preferences: {},
                    conversation_memories: [],
                    crisis_contacts: [],
                    privacy_settings: newSettings,
                    last_interaction: new Date()
                };
            }
            else {
                userProfile.privacy_settings = newSettings;
            }
            // Save updated profile
            await this.storageService.saveUserProfile(userProfile);
            // Update cache
            this.settingsCache.set(userId, newSettings);
            // Apply privacy changes immediately
            await this.applyPrivacyChanges(userId, currentSettings, newSettings);
            console.log(`Privacy settings updated for user ${userId}`);
        }
        catch (error) {
            console.error(`Failed to update privacy settings for user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Validate privacy settings
     */
    validatePrivacySettings(settings) {
        try {
            // Check required fields
            if (typeof settings.dataRetentionDays !== 'number' || settings.dataRetentionDays < 1) {
                return false;
            }
            // Check boolean fields
            const booleanFields = [
                'autoDeleteAudio',
                'allowMemoryStorage',
                'allowConversationHistory',
                'allowAnalytics',
                'allowCrashReporting',
                'encryptionEnabled',
                'anonymizeData',
                'allowDataExport',
                'allowDataDeletion'
            ];
            for (const field of booleanFields) {
                if (typeof settings[field] !== 'boolean') {
                    return false;
                }
            }
            // Validate data retention range (1 day to 5 years)
            if (settings.dataRetentionDays < 1 || settings.dataRetentionDays > 1825) {
                return false;
            }
            // Logical validations
            if (!settings.allowDataDeletion && !settings.allowDataExport) {
                // User must have at least one data control option
                return false;
            }
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Apply privacy filters to data based on user settings
     */
    applyPrivacyFilters(data, settings) {
        if (!data)
            return data;
        let filteredData = { ...data };
        // Apply anonymization if enabled
        if (settings.anonymizeData) {
            filteredData = this.privacyController.anonymizeData(filteredData);
        }
        // Remove analytics data if not allowed
        if (!settings.allowAnalytics) {
            delete filteredData.analytics;
            delete filteredData.usage_metrics;
            delete filteredData.performance_data;
        }
        // Remove crash reporting data if not allowed
        if (!settings.allowCrashReporting) {
            delete filteredData.crash_reports;
            delete filteredData.error_logs;
            delete filteredData.debug_info;
        }
        // Filter memory storage
        if (!settings.allowMemoryStorage) {
            delete filteredData.memories;
            delete filteredData.conversation_memories;
        }
        // Filter conversation history
        if (!settings.allowConversationHistory) {
            delete filteredData.conversation_history;
            if (filteredData.sessions) {
                filteredData.sessions = filteredData.sessions.map((session) => ({
                    ...session,
                    conversation_history: []
                }));
            }
        }
        return filteredData;
    }
    /**
     * Export user data according to privacy settings
     */
    async exportUserData(userId) {
        const settings = await this.getPrivacySettings(userId);
        if (!settings.allowDataExport) {
            throw new Error('Data export is not allowed for this user');
        }
        try {
            const userData = await this.privacyController.exportUserData(userId);
            // Apply privacy filters to exported data
            const filteredData = this.applyPrivacyFilters(userData, settings);
            // Add export metadata
            const exportData = {
                export_timestamp: new Date().toISOString(),
                user_id: userId,
                privacy_settings: settings,
                data: filteredData
            };
            return exportData;
        }
        catch (error) {
            console.error(`Failed to export data for user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Delete user data according to privacy settings
     */
    async deleteUserData(userId, options) {
        const settings = await this.getPrivacySettings(userId);
        if (!settings.allowDataDeletion) {
            throw new Error('Data deletion is not allowed for this user');
        }
        try {
            if (options?.keepProfile) {
                // Delete only conversation data and memories
                const memories = await this.storageService.getMemories?.(userId) || [];
                for (const memory of memories) {
                    await this.storageService.deleteMemory?.(memory.memory_id);
                }
            }
            else {
                // Delete all user data
                await this.privacyController.deleteAllUserData(userId);
            }
            // Clear from cache
            this.settingsCache.delete(userId);
            console.log(`User data deleted for ${userId} (keepProfile: ${options?.keepProfile})`);
        }
        catch (error) {
            console.error(`Failed to delete data for user ${userId}:`, error);
            throw error;
        }
    }
    /**
     * Get privacy compliance report for a user
     */
    async getPrivacyComplianceReport(userId) {
        const settings = await this.getPrivacySettings(userId);
        const userData = await this.privacyController.exportUserData(userId);
        // Calculate compliance score (0-100)
        let complianceScore = 0;
        // Encryption (25 points)
        if (settings.encryptionEnabled)
            complianceScore += 25;
        // Data retention policy (20 points)
        if (settings.dataRetentionDays <= 90)
            complianceScore += 20;
        else if (settings.dataRetentionDays <= 365)
            complianceScore += 15;
        else
            complianceScore += 10;
        // User controls (25 points)
        const controlsCount = [
            settings.allowDataExport,
            settings.allowDataDeletion,
            settings.anonymizeData
        ].filter(Boolean).length;
        complianceScore += Math.round((controlsCount / 3) * 25);
        // Privacy features (20 points)
        const privacyFeaturesCount = [
            settings.autoDeleteAudio,
            !settings.allowAnalytics,
            !settings.allowCrashReporting
        ].filter(Boolean).length;
        complianceScore += Math.round((privacyFeaturesCount / 3) * 20);
        // Data minimization (10 points)
        if (!settings.allowMemoryStorage || !settings.allowConversationHistory) {
            complianceScore += 10;
        }
        const dataControlsAvailable = [];
        if (settings.allowDataExport)
            dataControlsAvailable.push('Data Export');
        if (settings.allowDataDeletion)
            dataControlsAvailable.push('Data Deletion');
        if (settings.anonymizeData)
            dataControlsAvailable.push('Data Anonymization');
        return {
            userId,
            settings,
            dataRetentionStatus: `${settings.dataRetentionDays} days`,
            encryptionStatus: settings.encryptionEnabled ? 'Enabled (AES-256)' : 'Disabled',
            anonymizationStatus: settings.anonymizeData ? 'Enabled' : 'Disabled',
            dataControlsAvailable,
            lastAuditDate: new Date(),
            complianceScore
        };
    }
    /**
     * Bulk update privacy settings for multiple users
     */
    async bulkUpdatePrivacySettings(updates) {
        const successful = [];
        const failed = [];
        for (const update of updates) {
            try {
                await this.updatePrivacySettings(update.userId, update.settings);
                successful.push(update.userId);
            }
            catch (error) {
                failed.push({
                    userId: update.userId,
                    error: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return { successful, failed };
    }
    /**
     * Get default privacy settings
     */
    getDefaultPrivacySettings() {
        return {
            dataRetentionDays: 30,
            autoDeleteAudio: true,
            allowMemoryStorage: true,
            allowConversationHistory: true,
            allowAnalytics: false,
            allowCrashReporting: false,
            encryptionEnabled: true,
            anonymizeData: false,
            allowDataExport: true,
            allowDataDeletion: true
        };
    }
    /**
     * Validate and normalize privacy settings
     */
    validateAndNormalizeSettings(settings) {
        const defaults = this.getDefaultPrivacySettings();
        return {
            dataRetentionDays: Math.max(1, Math.min(1825, settings.dataRetentionDays || defaults.dataRetentionDays)),
            autoDeleteAudio: Boolean(settings.autoDeleteAudio ?? defaults.autoDeleteAudio),
            allowMemoryStorage: Boolean(settings.allowMemoryStorage ?? defaults.allowMemoryStorage),
            allowConversationHistory: Boolean(settings.allowConversationHistory ?? defaults.allowConversationHistory),
            allowAnalytics: Boolean(settings.allowAnalytics ?? defaults.allowAnalytics),
            allowCrashReporting: Boolean(settings.allowCrashReporting ?? defaults.allowCrashReporting),
            encryptionEnabled: Boolean(settings.encryptionEnabled ?? defaults.encryptionEnabled),
            anonymizeData: Boolean(settings.anonymizeData ?? defaults.anonymizeData),
            allowDataExport: Boolean(settings.allowDataExport ?? defaults.allowDataExport),
            allowDataDeletion: Boolean(settings.allowDataDeletion ?? defaults.allowDataDeletion)
        };
    }
    /** Map snake_case keys coming from tests to camelCase */
    normalizeIncomingSettings(raw) {
        if (!raw || typeof raw !== 'object')
            return raw;
        const map = {
            data_retention_days: 'dataRetentionDays',
            auto_delete_audio: 'autoDeleteAudio',
            allow_memory_storage: 'allowMemoryStorage',
            allow_conversation_history: 'allowConversationHistory',
            allow_analytics: 'allowAnalytics',
            allow_crash_reporting: 'allowCrashReporting',
            encryption_enabled: 'encryptionEnabled',
            anonymize_data: 'anonymizeData',
            allow_data_export: 'allowDataExport',
            allow_data_deletion: 'allowDataDeletion'
        };
        const out = { ...raw };
        for (const [snake, camel] of Object.entries(map)) {
            if (snake in out && !(camel in out)) {
                out[camel] = out[snake];
            }
        }
        return out;
    }
    /**
     * Apply privacy changes when settings are updated
     */
    async applyPrivacyChanges(userId, oldSettings, newSettings) {
        // If data retention period decreased, clean up old data
        if (newSettings.dataRetentionDays < oldSettings.dataRetentionDays) {
            await this.privacyController.deleteExpiredUserData();
        }
        // If memory storage was disabled, delete memories
        if (oldSettings.allowMemoryStorage && !newSettings.allowMemoryStorage) {
            const memories = await this.storageService.getMemories?.(userId) || [];
            for (const memory of memories) {
                await this.storageService.deleteMemory?.(memory.memory_id);
            }
        }
        // If conversation history was disabled, clean up history
        if (oldSettings.allowConversationHistory && !newSettings.allowConversationHistory) {
            // This would require additional storage service methods to clean conversation history
            console.log(`Conversation history disabled for user ${userId} - cleanup needed`);
        }
    }
}
exports.GranularPrivacySettingsManager = GranularPrivacySettingsManager;
/**
 * Create privacy settings manager with dependencies
 */
function createPrivacySettingsManager(storageService, privacyController) {
    return new GranularPrivacySettingsManager(storageService, privacyController);
}
//# sourceMappingURL=privacy-settings-manager.js.map