// Privacy settings manager security tests

import { GranularPrivacySettingsManager, createPrivacySettingsManager } from '../privacy-settings-manager';
import { PrivacySettings } from '../interfaces';
import { StorageService } from '../../memory/interfaces';
import { WellnessPrivacyController } from '../../memory/privacy-controller';
import { UserProfile } from '../../types';

// Mock dependencies
const mockStorageService: jest.Mocked<StorageService> = {
  initialize: jest.fn(),
  saveUserProfile: jest.fn(),
  getUserProfile: jest.fn(),
  saveConversationSession: jest.fn(),
  getConversationSession: jest.fn(),
  deleteUserData: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn()
};

const mockPrivacyController: jest.Mocked<WellnessPrivacyController> = {
  applyPrivacySettings: jest.fn(),
  shouldRetainData: jest.fn(),
  anonymizeData: jest.fn(),
  deleteExpiredData: jest.fn(),
  deleteExpiredUserData: jest.fn(),
  deleteUserMemoriesByType: jest.fn(),
  deleteUserMemoriesByDateRange: jest.fn(),
  deleteUserMemoriesByContent: jest.fn(),
  exportUserData: jest.fn(),
  deleteAllUserData: jest.fn(),
  getPrivacyReport: jest.fn()
} as any;

describe('GranularPrivacySettingsManager', () => {
  let privacyManager: GranularPrivacySettingsManager;
  const testUserId = 'test-user-123';

  beforeEach(() => {
    jest.clearAllMocks();
    privacyManager = new GranularPrivacySettingsManager(mockStorageService, mockPrivacyController);
  });

  describe('Privacy Settings Retrieval', () => {
    test('should return default settings for new user', async () => {
      mockStorageService.getUserProfile.mockResolvedValue(null);

      const settings = await privacyManager.getPrivacySettings(testUserId);

      expect(settings).toEqual({
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
      });
    });

    test('should return existing user settings', async () => {
      const existingProfile: UserProfile = {
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: {
          dataRetentionDays: 7,
          autoDeleteAudio: true,
          allowMemoryStorage: false,
          allowConversationHistory: false,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        },
        last_interaction: new Date()
      };

      mockStorageService.getUserProfile.mockResolvedValue(existingProfile);

      const settings = await privacyManager.getPrivacySettings(testUserId);

      expect(settings.dataRetentionDays).toBe(7);
      expect(settings.allowMemoryStorage).toBe(false);
      expect(settings.anonymizeData).toBe(true);
    });

    test('should cache settings for performance', async () => {
      const existingProfile: UserProfile = {
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: {
          dataRetentionDays: 15,
          autoDeleteAudio: true,
          allowMemoryStorage: true,
          allowConversationHistory: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: false,
          allowDataExport: true,
          allowDataDeletion: true
        },
        last_interaction: new Date()
      };

      mockStorageService.getUserProfile.mockResolvedValue(existingProfile);

      // First call
      await privacyManager.getPrivacySettings(testUserId);
      // Second call
      await privacyManager.getPrivacySettings(testUserId);

      // Should only call storage service once due to caching
      expect(mockStorageService.getUserProfile).toHaveBeenCalledTimes(1);
    });
  });

  describe('Privacy Settings Updates', () => {
    test('should update privacy settings successfully', async () => {
      const existingProfile: UserProfile = {
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: {
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
        },
        last_interaction: new Date()
      };

      mockStorageService.getUserProfile.mockResolvedValue(existingProfile);
      mockStorageService.saveUserProfile.mockResolvedValue(undefined);
      mockPrivacyController.deleteExpiredUserData.mockResolvedValue(undefined);

      const updates: Partial<PrivacySettings> = {
        dataRetentionDays: 7,
        anonymizeData: true,
        allowMemoryStorage: false
      };

      await privacyManager.updatePrivacySettings(testUserId, updates);

      expect(mockStorageService.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          privacy_settings: expect.objectContaining({
            dataRetentionDays: 7,
            anonymizeData: true,
            allowMemoryStorage: false
          })
        })
      );
    });

    test('should create new profile if user does not exist', async () => {
      mockStorageService.getUserProfile.mockResolvedValue(null);
      mockStorageService.saveUserProfile.mockResolvedValue(undefined);

      const updates: Partial<PrivacySettings> = {
        dataRetentionDays: 14,
        allowAnalytics: true
      };

      await privacyManager.updatePrivacySettings(testUserId, updates);

      expect(mockStorageService.saveUserProfile).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: testUserId,
          privacy_settings: expect.objectContaining({
            dataRetentionDays: 14,
            allowAnalytics: true
          })
        })
      );
    });

    test('should reject invalid privacy settings', async () => {
      const invalidSettings: Partial<PrivacySettings> = {
        dataRetentionDays: -1, // Invalid
        allowDataExport: false,
        allowDataDeletion: false // Both data controls disabled
      };

      await expect(
        privacyManager.updatePrivacySettings(testUserId, invalidSettings)
      ).rejects.toThrow('Invalid privacy settings provided');
    });

    test('should apply privacy changes when settings are updated', async () => {
      const existingProfile: UserProfile = {
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: {
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
        },
        last_interaction: new Date()
      };

      mockStorageService.getUserProfile.mockResolvedValue(existingProfile);
      mockStorageService.saveUserProfile.mockResolvedValue(undefined);
      mockPrivacyController.deleteExpiredUserData.mockResolvedValue(undefined);

      const updates: Partial<PrivacySettings> = {
        allowMemoryStorage: false // Disabling memory storage
      };

      await privacyManager.updatePrivacySettings(testUserId, updates);

      // Privacy changes should be applied
      expect(mockPrivacyController.deleteExpiredUserData).toHaveBeenCalled();
    });
  });

  describe('Privacy Settings Validation', () => {
    test('should validate correct privacy settings', () => {
      const validSettings: PrivacySettings = {
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

      const isValid = privacyManager.validatePrivacySettings(validSettings);
      expect(isValid).toBe(true);
    });

    test('should reject settings with invalid data retention', () => {
      const invalidSettings: PrivacySettings = {
        dataRetentionDays: 0, // Invalid
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

      const isValid = privacyManager.validatePrivacySettings(invalidSettings);
      expect(isValid).toBe(false);
    });

    test('should reject settings with no data control options', () => {
      const invalidSettings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: false, // Both disabled
        allowDataDeletion: false // Both disabled
      };

      const isValid = privacyManager.validatePrivacySettings(invalidSettings);
      expect(isValid).toBe(false);
    });

    test('should reject settings with excessive retention period', () => {
      const invalidSettings: PrivacySettings = {
        dataRetentionDays: 2000, // Too long (>5 years)
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

      const isValid = privacyManager.validatePrivacySettings(invalidSettings);
      expect(isValid).toBe(false);
    });
  });

  describe('Privacy Filters', () => {
    test('should apply anonymization when enabled', () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: true, // Enabled
        allowDataExport: true,
        allowDataDeletion: true
      };

      const testData = { name: 'John Doe', message: 'Hello world' };
      mockPrivacyController.anonymizeData.mockReturnValue({ name: '[NAME]', message: 'Hello world' });

      const filteredData = privacyManager.applyPrivacyFilters(testData, settings);

      expect(mockPrivacyController.anonymizeData).toHaveBeenCalledWith(testData);
      expect(filteredData.name).toBe('[NAME]');
    });

    test('should remove analytics data when not allowed', () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false, // Disabled
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: true,
        allowDataDeletion: true
      };

      const testData = {
        message: 'Hello',
        analytics: { clicks: 5 },
        usage_metrics: { time: 100 }
      };

      const filteredData = privacyManager.applyPrivacyFilters(testData, settings);

      expect(filteredData.message).toBe('Hello');
      expect(filteredData.analytics).toBeUndefined();
      expect(filteredData.usage_metrics).toBeUndefined();
    });

    test('should remove crash reporting data when not allowed', () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false, // Disabled
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: true,
        allowDataDeletion: true
      };

      const testData = {
        message: 'Hello',
        crash_reports: [{ error: 'Something failed' }],
        error_logs: ['Error 1', 'Error 2']
      };

      const filteredData = privacyManager.applyPrivacyFilters(testData, settings);

      expect(filteredData.message).toBe('Hello');
      expect(filteredData.crash_reports).toBeUndefined();
      expect(filteredData.error_logs).toBeUndefined();
    });
  });

  describe('Data Export', () => {
    test('should export user data when allowed', async () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: true, // Allowed
        allowDataDeletion: true
      };

      const mockUserData = {
        profile: {
          user_id: testUserId,
          preferences: {},
          conversation_memories: [],
          crisis_contacts: [],
          privacy_settings: settings,
          last_interaction: new Date()
        },
        memories: [],
        sessions: []
      };

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: settings,
        last_interaction: new Date()
      });

      mockPrivacyController.exportUserData.mockResolvedValue(mockUserData);

      const exportData = await privacyManager.exportUserData(testUserId);

      expect(exportData).toHaveProperty('export_timestamp');
      expect(exportData).toHaveProperty('user_id', testUserId);
      expect(exportData).toHaveProperty('privacy_settings', settings);
      expect(exportData).toHaveProperty('data');
    });

    test('should reject export when not allowed', async () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: false, // Not allowed
        allowDataDeletion: true
      };

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: settings,
        last_interaction: new Date()
      });

      await expect(privacyManager.exportUserData(testUserId)).rejects.toThrow(
        'Data export is not allowed for this user'
      );
    });
  });

  describe('Data Deletion', () => {
    test('should delete user data when allowed', async () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: true,
        allowDataDeletion: true // Allowed
      };

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: settings,
        last_interaction: new Date()
      });

      mockPrivacyController.deleteAllUserData.mockResolvedValue(undefined);

      await privacyManager.deleteUserData(testUserId);

      expect(mockPrivacyController.deleteAllUserData).toHaveBeenCalledWith(testUserId);
    });

    test('should reject deletion when not allowed', async () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: false,
        allowDataExport: true,
        allowDataDeletion: false // Not allowed
      };

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: settings,
        last_interaction: new Date()
      });

      await expect(privacyManager.deleteUserData(testUserId)).rejects.toThrow(
        'Data deletion is not allowed for this user'
      );
    });

    test('should support partial deletion with keepProfile option', async () => {
      const settings: PrivacySettings = {
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

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: settings,
        last_interaction: new Date()
      });

      await privacyManager.deleteUserData(testUserId, { keepProfile: true });

      // Should use privacy controller for partial deletion
      expect(mockPrivacyController.deleteAllUserData).not.toHaveBeenCalled();
    });
  });

  describe('Privacy Compliance Report', () => {
    test('should generate comprehensive compliance report', async () => {
      const settings: PrivacySettings = {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        allowMemoryStorage: true,
        allowConversationHistory: true,
        allowAnalytics: false,
        allowCrashReporting: false,
        encryptionEnabled: true,
        anonymizeData: true,
        allowDataExport: true,
        allowDataDeletion: true
      };

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: settings,
        last_interaction: new Date()
      });

      mockPrivacyController.exportUserData.mockResolvedValue({
        profile: null,
        memories: [],
        sessions: []
      });

      const report = await privacyManager.getPrivacyComplianceReport(testUserId);

      expect(report.userId).toBe(testUserId);
      expect(report.settings).toEqual(settings);
      expect(report.encryptionStatus).toBe('Enabled (AES-256)');
      expect(report.anonymizationStatus).toBe('Enabled');
      expect(report.dataControlsAvailable).toContain('Data Export');
      expect(report.dataControlsAvailable).toContain('Data Deletion');
      expect(report.complianceScore).toBeGreaterThan(0);
    });

    test('should calculate compliance score correctly', async () => {
      const highComplianceSettings: PrivacySettings = {
        dataRetentionDays: 7, // Short retention = high score
        autoDeleteAudio: true,
        allowMemoryStorage: false, // Data minimization
        allowConversationHistory: false, // Data minimization
        allowAnalytics: false, // Privacy-focused
        allowCrashReporting: false, // Privacy-focused
        encryptionEnabled: true, // Security
        anonymizeData: true, // Privacy control
        allowDataExport: true, // User control
        allowDataDeletion: true // User control
      };

      mockStorageService.getUserProfile.mockResolvedValue({
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: highComplianceSettings,
        last_interaction: new Date()
      });

      mockPrivacyController.exportUserData.mockResolvedValue({
        profile: null,
        memories: [],
        sessions: []
      });

      const report = await privacyManager.getPrivacyComplianceReport(testUserId);

      expect(report.complianceScore).toBeGreaterThan(80); // Should be high compliance
    });
  });

  describe('Bulk Operations', () => {
    test('should handle bulk privacy settings updates', async () => {
      const updates = [
        { userId: 'user1', settings: { dataRetentionDays: 7 } },
        { userId: 'user2', settings: { anonymizeData: true } },
        { userId: 'user3', settings: { allowAnalytics: false } }
      ];

      // Mock successful updates for user1 and user2, failure for user3
      mockStorageService.getUserProfile
        .mockResolvedValueOnce({
          user_id: 'user1',
          preferences: {},
          conversation_memories: [],
          crisis_contacts: [],
          privacy_settings: {
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
          },
          last_interaction: new Date()
        })
        .mockResolvedValueOnce({
          user_id: 'user2',
          preferences: {},
          conversation_memories: [],
          crisis_contacts: [],
          privacy_settings: {
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
          },
          last_interaction: new Date()
        })
        .mockResolvedValueOnce({
          user_id: 'user3',
          preferences: {},
          conversation_memories: [],
          crisis_contacts: [],
          privacy_settings: {
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
          },
          last_interaction: new Date()
        });

      mockStorageService.saveUserProfile.mockResolvedValue(undefined);
      mockPrivacyController.deleteExpiredUserData.mockResolvedValue(undefined);

      const result = await privacyManager.bulkUpdatePrivacySettings(updates);

      expect(result.successful).toEqual(['user1', 'user2', 'user3']);
      expect(result.failed).toHaveLength(0);
    });
  });
});

describe('Privacy Settings Manager Factory', () => {
  test('should create privacy settings manager with dependencies', () => {
    const manager = createPrivacySettingsManager(mockStorageService, mockPrivacyController);
    expect(manager).toBeInstanceOf(GranularPrivacySettingsManager);
  });
});