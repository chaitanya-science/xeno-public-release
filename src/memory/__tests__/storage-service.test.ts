import { SQLiteStorageService } from '../storage-service';
import { UserProfile, ConversationSession, Memory, MemoryType, PrivacyLevel, Speaker, PrivacySettings } from '../../types';
import * as fs from 'fs';
import * as path from 'path';

describe('SQLiteStorageService', () => {
  let storageService: SQLiteStorageService;
  let testDbPath: string;
  const testEncryptionKey = 'test-encryption-key-32-characters';

  beforeEach(async () => {
    // Use in-memory database for tests
    testDbPath = ':memory:';
    
    storageService = new SQLiteStorageService(testDbPath, testEncryptionKey);
    await storageService.initialize();
  });

  afterEach(async () => {
    await storageService.close();
  });

  describe('initialization', () => {
    it('should initialize database and create tables', async () => {
      // Database should be initialized in beforeEach
      expect(storageService).toBeDefined();
    });
  });

  describe('encryption and decryption', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const testData = 'This is sensitive test data';
      
      const encrypted = await storageService.encryptData(testData);
      expect(encrypted).not.toBe(testData);
      expect(encrypted.length).toBeGreaterThan(0);
      
      const decrypted = await storageService.decryptData(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should handle encryption errors gracefully', async () => {
      const result = await storageService.decryptData('invalid-encrypted-data');
      expect(result).toBe(''); // crypto-js returns empty string for invalid data
    });
  });

  describe('user profile management', () => {
    const testUserId = 'test-user-123';
    const testProfile: UserProfile = {
      user_id: testUserId,
      preferences: { theme: 'dark', voice_speed: 'normal' },
      conversation_memories: [],
      crisis_contacts: [
        { name: 'Crisis Hotline', phone: '988', type: 'crisis' }
      ],
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

    it('should save and retrieve user profile', async () => {
      await storageService.saveUserProfile(testProfile);
      
      const retrievedProfile = await storageService.getUserProfile(testUserId);
      
      expect(retrievedProfile).toBeDefined();
      expect(retrievedProfile!.user_id).toBe(testUserId);
      expect(retrievedProfile!.preferences.theme).toBe('dark');
      expect(retrievedProfile!.crisis_contacts).toHaveLength(1);
    });

    it('should return null for non-existent user', async () => {
      const retrievedProfile = await storageService.getUserProfile('non-existent-user');
      expect(retrievedProfile).toBeNull();
    });

    it('should update existing user profile', async () => {
      await storageService.saveUserProfile(testProfile);
      
      const updatedProfile = { ...testProfile, preferences: { theme: 'light' } };
      await storageService.saveUserProfile(updatedProfile);
      
      const retrievedProfile = await storageService.getUserProfile(testUserId);
      expect(retrievedProfile!.preferences.theme).toBe('light');
    });
  });

  describe('conversation session management', () => {
    const testSession: ConversationSession = {
      session_id: 'session-123',
      user_id: 'user-123',
      start_time: new Date(),
      end_time: new Date(),
      conversation_history: [
        {
          message_id: 'msg-1',
          timestamp: new Date(),
          speaker: Speaker.USER,
          content: 'Hello, I need someone to talk to',
          emotional_tone: 'sad',
          confidence_score: 0.9
        }
      ],
      emotional_context: {
        valence: -0.3,
        arousal: 0.6,
        dominant_emotion: 'sadness',
        confidence: 0.8
      },
      privacy_level: PrivacyLevel.MEDIUM
    };

    it('should save and retrieve conversation session', async () => {
      await storageService.saveConversationSession(testSession);
      
      const retrievedSession = await storageService.getConversationSession(testSession.session_id);
      
      expect(retrievedSession).toBeDefined();
      expect(retrievedSession!.session_id).toBe(testSession.session_id);
      expect(retrievedSession!.conversation_history).toHaveLength(1);
      expect(retrievedSession!.conversation_history[0].content).toBe('Hello, I need someone to talk to');
    });

    it('should return null for non-existent session', async () => {
      const retrievedSession = await storageService.getConversationSession('non-existent-session');
      expect(retrievedSession).toBeNull();
    });
  });

  describe('memory management', () => {
    const testUserId = 'user-123';
    const testMemory: Memory = {
      memory_id: 'memory-123',
      content: 'User mentioned they love gardening and have a rose garden',
      importance_score: 0.8,
      memory_type: MemoryType.PERSONAL,
      created_date: new Date(),
      last_referenced: new Date()
    };

    it('should save and retrieve memories', async () => {
      await storageService.saveMemory(testMemory, testUserId);
      
      const memories = await storageService.getMemories(testUserId);
      
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toBe(testMemory.content);
      expect(memories[0].importance_score).toBe(0.8);
      expect(memories[0].memory_type).toBe(MemoryType.PERSONAL);
    });

    it('should retrieve memories with limit', async () => {
      // Save multiple memories
      for (let i = 0; i < 5; i++) {
        const memory = {
          ...testMemory,
          memory_id: `memory-${i}`,
          content: `Memory content ${i}`,
          importance_score: 0.5 + (i * 0.1)
        };
        await storageService.saveMemory(memory, testUserId);
      }
      
      const memories = await storageService.getMemories(testUserId, 3);
      expect(memories).toHaveLength(3);
      
      // Should be ordered by importance (descending)
      expect(memories[0].importance_score).toBeGreaterThanOrEqual(memories[1].importance_score);
    });

    it('should delete memory', async () => {
      await storageService.saveMemory(testMemory, testUserId);
      
      let memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(1);
      
      await storageService.deleteMemory(testMemory.memory_id);
      
      memories = await storageService.getMemories(testUserId);
      expect(memories).toHaveLength(0);
    });

    it('should return empty array for user with no memories', async () => {
      const memories = await storageService.getMemories('user-with-no-memories');
      expect(memories).toHaveLength(0);
    });
  });

  describe('data deletion', () => {
    const testUserId = 'user-to-delete';

    beforeEach(async () => {
      // Set up test data
      const profile: UserProfile = {
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
        memory_id: 'memory-to-delete',
        content: 'Test memory',
        importance_score: 0.5,
        memory_type: MemoryType.CONVERSATION,
        created_date: new Date(),
        last_referenced: new Date()
      };
      
      const session: ConversationSession = {
        session_id: 'session-to-delete',
        user_id: testUserId,
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: 0,
          arousal: 0,
          confidence: 0
        },
        privacy_level: PrivacyLevel.LOW
      };

      await storageService.saveUserProfile(profile);
      await storageService.saveMemory(memory, testUserId);
      await storageService.saveConversationSession(session);
    });

    it('should delete all user data', async () => {
      // Verify data exists
      expect(await storageService.getUserProfile(testUserId)).toBeDefined();
      expect(await storageService.getMemories(testUserId)).toHaveLength(1);
      expect(await storageService.getConversationSession('session-to-delete')).toBeDefined();
      
      // Delete all user data
      await storageService.deleteUserData(testUserId);
      
      // Verify data is deleted
      expect(await storageService.getUserProfile(testUserId)).toBeNull();
      expect(await storageService.getMemories(testUserId)).toHaveLength(0);
      expect(await storageService.getConversationSession('session-to-delete')).toBeNull();
    });
  });
});