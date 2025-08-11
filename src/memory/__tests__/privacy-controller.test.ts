import { WellnessPrivacyController } from '../privacy-controller';
import { SQLiteStorageService } from '../storage-service';
import { Memory, MemoryType, ConversationSession, PrivacySettings, Speaker, PrivacyLevel } from '../../types';
import * as fs from 'fs';

describe('WellnessPrivacyController', () => {
  let privacyController: WellnessPrivacyController;
  let storageService: SQLiteStorageService;
  let testDbPath: string;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Use in-memory database for tests
    testDbPath = ':memory:';
    
    storageService = new SQLiteStorageService(testDbPath, 'test-key');
    await storageService.initialize();
    privacyController = new WellnessPrivacyController(storageService);
  });

  afterEach(async () => {
    await storageService.close();
  });

  describe('privacy settings application', () => {
    const restrictiveSettings: PrivacySettings = {
      dataRetentionDays: 7,
      allowMemoryStorage: false,
      allowConversationHistory: false,
      autoDeleteAudio: true,
      allowAnalytics: false,
      allowCrashReporting: false,
      encryptionEnabled: true,
      anonymizeData: true,
      allowDataExport: false,
      allowDataDeletion: true
    };

    const permissiveSettings: PrivacySettings = {
      dataRetentionDays: 365,
      allowMemoryStorage: true,
      allowConversationHistory: true,
      autoDeleteAudio: true,
      allowAnalytics: true,
      allowCrashReporting: true,
      encryptionEnabled: true,
      anonymizeData: true,
      allowDataExport: true,
      allowDataDeletion: true
    };

    it('should block memory storage when not allowed', () => {
      const memory: Memory = {
        memory_id: 'test-memory',
        content: 'Test memory content',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      const result = privacyController.applyPrivacySettings(memory, restrictiveSettings);
      expect(result).toBeNull();
    });

    it('should allow memory storage when permitted', () => {
      const memory: Memory = {
        memory_id: 'test-memory',
        content: 'Test memory content',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      const result = privacyController.applyPrivacySettings(memory, permissiveSettings);
      expect(result).toEqual(memory);
    });

    it('should anonymize conversation data when history not allowed', () => {
      const session: ConversationSession = {
        session_id: 'test-session',
        user_id: testUserId,
        start_time: new Date(),
        conversation_history: [
          {
            message_id: 'msg-1',
            timestamp: new Date(),
            speaker: Speaker.USER,
            content: 'My name is John Smith and I live at 123 Main Street',
            confidence_score: 0.9
          }
        ],
        emotional_context: {
          valence: 0,
          arousal: 0,
          confidence: 0
        },
        privacy_level: PrivacyLevel.HIGH
      };

      const result = privacyController.applyPrivacySettings(session, restrictiveSettings);
      expect(result.conversation_history[0].content).toContain('[NAME]');
      expect(result.conversation_history[0].content).toContain('[ADDRESS]');
    });
  });

  describe('data retention', () => {
    it('should retain data within retention period', () => {
      const recentMemory: Memory = {
        memory_id: 'recent-memory',
        content: 'Recent memory',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        last_referenced: new Date()
      };

      const settings: PrivacySettings = {
          dataRetentionDays: 30,
          allowMemoryStorage: true,
          allowConversationHistory: true,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        };

      const shouldRetain = privacyController.shouldRetainData(recentMemory, settings);
      expect(shouldRetain).toBe(true);
    });

    it('should not retain data beyond retention period', () => {
      const oldMemory: Memory = {
        memory_id: 'old-memory',
        content: 'Old memory',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        last_referenced: new Date()
      };

      const settings: PrivacySettings = {
          dataRetentionDays: 30,
          allowMemoryStorage: true,
          allowConversationHistory: true,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        };

      const shouldRetain = privacyController.shouldRetainData(oldMemory, settings);
      expect(shouldRetain).toBe(false);
    });

    it('should not retain memory data when storage not allowed', () => {
      const memory: Memory = {
        memory_id: 'test-memory',
        content: 'Test memory',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      const settings: PrivacySettings = {
          dataRetentionDays: 30,
          allowMemoryStorage: false,
          allowConversationHistory: true,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        };

      const shouldRetain = privacyController.shouldRetainData(memory, settings);
      expect(shouldRetain).toBe(false);
    });
  });

  describe('data anonymization', () => {
    it('should anonymize personal information in memory content', () => {
      const memory: Memory = {
        memory_id: 'test-memory',
        content: 'My name is John Smith, my phone is 555-123-4567, email john@example.com, and I live at 123 Oak Street',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      const anonymized = privacyController.anonymizeData(memory) as Memory;
      
      expect(anonymized.content).toContain('[NAME]');
      expect(anonymized.content).toContain('[PHONE]');
      expect(anonymized.content).toContain('[EMAIL]');
      expect(anonymized.content).toContain('[ADDRESS]');
      expect(anonymized.content).not.toContain('John Smith');
      expect(anonymized.content).not.toContain('555-123-4567');
      expect(anonymized.content).not.toContain('john@example.com');
    });

    it('should anonymize conversation session data', () => {
      const session: ConversationSession = {
        session_id: 'test-session',
        user_id: testUserId,
        start_time: new Date(),
        conversation_history: [
          {
            message_id: 'msg-1',
            timestamp: new Date(),
            speaker: Speaker.USER,
            content: 'Hi, I am Sarah Johnson and my email is sarah@test.com',
            confidence_score: 0.9
          }
        ],
        emotional_context: {
          valence: 0,
          arousal: 0,
          confidence: 0
        },
        privacy_level: PrivacyLevel.HIGH
      };

      const anonymized = privacyController.anonymizeData(session) as ConversationSession;
      
      expect(anonymized.conversation_history[0].content).toContain('[NAME]');
      expect(anonymized.conversation_history[0].content).toContain('[EMAIL]');
      expect(anonymized.conversation_history[0].content).not.toContain('Sarah Johnson');
      expect(anonymized.conversation_history[0].content).not.toContain('sarah@test.com');
    });
  });

  describe('expired data deletion', () => {
    beforeEach(async () => {
      // Set up test memories with different ages
      const oldMemory: Memory = {
        memory_id: 'old-memory',
        content: 'Old memory content',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        last_referenced: new Date()
      };

      const recentMemory: Memory = {
        memory_id: 'recent-memory',
        content: 'Recent memory content',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        last_referenced: new Date()
      };

      await storageService.saveMemory(oldMemory, testUserId);
      await storageService.saveMemory(recentMemory, testUserId);
    });

    it('should delete expired user data based on retention settings', async () => {
      const settings: PrivacySettings = {
          dataRetentionDays: 7,  // 7-day retention - should delete 10-day-old memory
          allowMemoryStorage: true,
          allowConversationHistory: true,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        };

      let memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(2);

      await privacyController.deleteExpiredUserData(testUserId, settings);

      memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(1);
      expect(memories[0].memory_id).toBe('recent-memory');
    });
  });

  describe('selective memory deletion', () => {
    beforeEach(async () => {
      const memories = [
        {
          memory_id: 'personal-1',
          content: 'Personal memory 1',
          importance_score: 0.8,
          memory_type: MemoryType.PERSONAL,
          created_date: new Date(),
          last_referenced: new Date()
        },
        {
          memory_id: 'preference-1',
          content: 'Preference memory 1',
          importance_score: 0.6,
          memory_type: MemoryType.PREFERENCE,
          created_date: new Date(),
          last_referenced: new Date()
        },
        {
          memory_id: 'conversation-1',
          content: 'Conversation memory 1',
          importance_score: 0.4,
          memory_type: MemoryType.CONVERSATION,
          created_date: new Date(),
          last_referenced: new Date()
        }
      ];

      for (const memory of memories) {
        await storageService.saveMemory(memory, testUserId);
      }
    });

    it('should delete memories by type', async () => {
      let memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(3);

      const deletedCount = await privacyController.deleteUserMemoriesByType(
        testUserId, 
        [MemoryType.PERSONAL, MemoryType.PREFERENCE]
      );

      expect(deletedCount).toBe(2);

      memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(1);
      expect(memories[0].memory_type).toBe(MemoryType.CONVERSATION);
    });

    it('should delete memories by date range', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
      const endDate = new Date(); // now

      const deletedCount = await privacyController.deleteUserMemoriesByDateRange(
        testUserId,
        startDate,
        endDate
      );

      expect(deletedCount).toBe(3); // All memories should be in this range

      const memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(0);
    });

    it('should delete memories by content pattern', async () => {
      const deletedCount = await privacyController.deleteUserMemoriesByContent(
        testUserId,
        'Personal'
      );

      expect(deletedCount).toBe(1);

      const memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(2);
      expect(memories.every(m => !m.content.includes('Personal'))).toBe(true);
    });
  });

  describe('data export', () => {
    beforeEach(async () => {
      // Set up test data
      const profile = {
        user_id: testUserId,
        preferences: { theme: 'dark' },
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: {
          dataRetentionDays: 30,
          allowMemoryStorage: true,
          allowConversationHistory: true,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        },
        last_interaction: new Date()
      };

      const memory: Memory = {
        memory_id: 'export-memory',
        content: 'Memory for export',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      await storageService.saveUserProfile(profile);
      await storageService.saveMemory(memory, testUserId);
    });

    it('should export all user data', async () => {
      const exportedData = await privacyController.exportUserData(testUserId);

      expect(exportedData.profile).toBeDefined();
      expect(exportedData.profile!.user_id).toBe(testUserId);
      expect(exportedData.memories).toHaveLength(1);
      expect(exportedData.memories[0].content).toBe('Memory for export');
      expect(exportedData.sessions).toHaveLength(0); // No sessions in this test
    });
  });

  describe('complete data deletion', () => {
    beforeEach(async () => {
      // Set up comprehensive test data
      const profile = {
        user_id: testUserId,
        preferences: {},
        conversation_memories: [],
        crisis_contacts: [],
        privacy_settings: {
          dataRetentionDays: 30,
          allowMemoryStorage: true,
          allowConversationHistory: true,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        },
        last_interaction: new Date()
      };

      const memory: Memory = {
        memory_id: 'delete-memory',
        content: 'Memory to delete',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      await storageService.saveUserProfile(profile);
      await storageService.saveMemory(memory, testUserId);
    });

    it('should delete all user data completely', async () => {
      // Verify data exists
      expect(await storageService.getUserProfile(testUserId)).toBeDefined();
      expect(await storageService.getMemories(testUserId)).toHaveLength(1);

      await privacyController.deleteAllUserData(testUserId);

      // Verify all data is deleted
      expect(await storageService.getUserProfile(testUserId)).toBeNull();
      expect(await storageService.getMemories(testUserId)).toHaveLength(0);
    });
  });

  describe('privacy reporting', () => {
    it('should generate privacy report', () => {
      const settings: PrivacySettings = {
          dataRetentionDays: 30,
          allowMemoryStorage: true,
          allowConversationHistory: false,
          autoDeleteAudio: true,
          allowAnalytics: false,
          allowCrashReporting: false,
          encryptionEnabled: true,
          anonymizeData: true,
          allowDataExport: true,
          allowDataDeletion: true
        };

      const report = privacyController.getPrivacyReport(testUserId, settings);

      expect(report.dataRetentionDays).toBe(30);
      expect(report.memoryStorageEnabled).toBe(true);
      expect(report.conversationHistoryEnabled).toBe(false);
      expect(report.autoDeleteAudioEnabled).toBe(true);
      expect(report.estimatedDataExpiration).toBeInstanceOf(Date);
    });
  });
});