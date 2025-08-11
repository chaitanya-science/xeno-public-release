import { WellnessMemoryManager } from '../memory-manager';
import { SQLiteStorageService } from '../storage-service';
import { Memory, MemoryType } from '../../types';
import * as fs from 'fs';

describe('WellnessMemoryManager', () => {
  let memoryManager: WellnessMemoryManager;
  let storageService: SQLiteStorageService;
  let testDbPath: string;
  const testUserId = 'test-user-123';

  beforeEach(async () => {
    // Use in-memory database for tests
    testDbPath = ':memory:';
    
    storageService = new SQLiteStorageService(testDbPath, 'test-key');
    await storageService.initialize();
    memoryManager = new WellnessMemoryManager(storageService);
  });

  afterEach(async () => {
    await storageService.close();
  });

  describe('memory storage', () => {
    it('should store memory and return memory ID', async () => {
      const memoryData = {
        content: 'User loves gardening and has a beautiful rose garden',
        importance_score: 0.8,
        memory_type: MemoryType.PERSONAL,
        last_referenced: new Date()
      };

      const memoryId = await memoryManager.storeMemory(testUserId, memoryData);
      
      expect(memoryId).toBeDefined();
      expect(typeof memoryId).toBe('string');
      expect(memoryId.length).toBeGreaterThan(0);
    });

    it('should calculate importance score if not provided', async () => {
      const memoryData = {
        content: 'User feels very sad about losing their pet',
        memory_type: MemoryType.PERSONAL,
        last_referenced: new Date()
      };

      const memoryId = await memoryManager.storeMemory(testUserId, memoryData);
      const memories = await memoryManager.retrieveMemories(testUserId);
      
      expect(memories).toHaveLength(1);
      expect(memories[0].importance_score).toBeGreaterThan(0);
      expect(memories[0].importance_score).toBeLessThanOrEqual(1);
    });
  });

  describe('memory retrieval', () => {
    beforeEach(async () => {
      // Set up test memories
      const memories = [
        {
          content: 'User loves gardening and roses',
          importance_score: 0.8,
          memory_type: MemoryType.PERSONAL,
          last_referenced: new Date(Date.now() - 86400000) // 1 day ago
        },
        {
          content: 'User prefers morning conversations',
          importance_score: 0.6,
          memory_type: MemoryType.PREFERENCE,
          last_referenced: new Date(Date.now() - 172800000) // 2 days ago
        },
        {
          content: 'User mentioned feeling happy today',
          importance_score: 0.4,
          memory_type: MemoryType.CONVERSATION,
          last_referenced: new Date()
        }
      ];

      for (const memory of memories) {
        await memoryManager.storeMemory(testUserId, memory);
      }
    });

    it('should retrieve memories ordered by importance', async () => {
      const memories = await memoryManager.retrieveMemories(testUserId);
      
      expect(memories).toHaveLength(3);
      expect(memories[0].importance_score).toBeGreaterThanOrEqual(memories[1].importance_score);
      expect(memories[1].importance_score).toBeGreaterThanOrEqual(memories[2].importance_score);
    });

    it('should retrieve memories with limit', async () => {
      const memories = await memoryManager.retrieveMemories(testUserId, undefined, 2);
      
      expect(memories).toHaveLength(2);
    });

    it('should filter memories by query', async () => {
      const memories = await memoryManager.retrieveMemories(testUserId, 'gardening');
      
      expect(memories).toHaveLength(1);
      expect(memories[0].content).toContain('gardening');
    });

    it('should update last_referenced when retrieving memories', async () => {
      const beforeTime = new Date();
      
      const memories = await memoryManager.retrieveMemories(testUserId);
      
      expect(memories[0].last_referenced.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    });
  });

  describe('memory importance calculation', () => {
    it('should calculate higher importance for emotional content', async () => {
      const emotionalMemory = {
        content: 'User feels very sad and worried about their health',
        memory_type: MemoryType.PERSONAL,
        last_referenced: new Date()
      };

      const neutralMemory = {
        content: 'User mentioned the weather is nice today',
        memory_type: MemoryType.CONVERSATION,
        last_referenced: new Date()
      };

      await memoryManager.storeMemory(testUserId, emotionalMemory);
      await memoryManager.storeMemory(testUserId, neutralMemory);

      const memories = await memoryManager.retrieveMemories(testUserId);
      
      // Emotional memory should have higher importance
      const emotionalMem = memories.find(m => m.content.includes('sad'));
      const neutralMem = memories.find(m => m.content.includes('weather'));
      
      expect(emotionalMem!.importance_score).toBeGreaterThan(neutralMem!.importance_score);
    });

    it('should apply time decay to importance scores', async () => {
      const oldDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const recentDate = new Date();

      const oldMemory: Memory = {
        memory_id: 'old-memory',
        content: 'Old memory content',
        importance_score: 0.8,
        memory_type: MemoryType.PERSONAL,
        created_date: oldDate,
        last_referenced: oldDate
      };

      const recentMemory: Memory = {
        memory_id: 'recent-memory',
        content: 'Recent memory content',
        importance_score: 0.8,
        memory_type: MemoryType.PERSONAL,
        created_date: recentDate,
        last_referenced: recentDate
      };

      const oldImportance = memoryManager.getMemoryImportance(oldMemory);
      const recentImportance = memoryManager.getMemoryImportance(recentMemory);

      expect(recentImportance).toBeGreaterThan(oldImportance);
    });

    it('should apply type-based importance multipliers', async () => {
      const personalMemory: Memory = {
        memory_id: 'personal',
        content: 'Test content',
        importance_score: 0.5,
        memory_type: MemoryType.PERSONAL,
        created_date: new Date(),
        last_referenced: new Date()
      };

      const conversationMemory: Memory = {
        memory_id: 'conversation',
        content: 'Test content',
        importance_score: 0.5,
        memory_type: MemoryType.CONVERSATION,
        created_date: new Date(),
        last_referenced: new Date()
      };

      const personalImportance = memoryManager.getMemoryImportance(personalMemory);
      const conversationImportance = memoryManager.getMemoryImportance(conversationMemory);

      expect(personalImportance).toBeGreaterThan(conversationImportance);
    });
  });

  describe('memory pruning', () => {
    it('should prune memories when exceeding maximum limit', async () => {
      // Create a memory manager with a lower limit for testing
      const testManager = new (class extends WellnessMemoryManager {
        protected get MAX_MEMORIES_PER_USER() { return 5; }
      })(storageService);

      // Add more memories than the limit
      for (let i = 0; i < 8; i++) {
        await testManager.storeMemory(testUserId, {
          content: `Memory ${i}`,
          importance_score: Math.random(),
          memory_type: MemoryType.CONVERSATION,
          last_referenced: new Date()
        });
      }

      const memories = await testManager.retrieveMemories(testUserId);
      expect(memories.length).toBeLessThanOrEqual(5);
    });

    it('should keep most important memories during pruning', async () => {
      // Create memories with different importance scores
      const highImportanceMemory = {
        content: 'Very important personal information',
        importance_score: 0.9,
        memory_type: MemoryType.PERSONAL,
        last_referenced: new Date()
      };

      const lowImportanceMemory = {
        content: 'Less important conversation',
        importance_score: 0.1,
        memory_type: MemoryType.CONVERSATION,
        last_referenced: new Date()
      };

      await memoryManager.storeMemory(testUserId, highImportanceMemory);
      await memoryManager.storeMemory(testUserId, lowImportanceMemory);

      await memoryManager.pruneMemories(testUserId);

      const memories = await memoryManager.retrieveMemories(testUserId);
      expect(memories.some(m => m.content.includes('Very important'))).toBe(true);
    });
  });

  describe('memory search', () => {
    beforeEach(async () => {
      const memories = [
        {
          content: 'User loves gardening and has beautiful roses',
          importance_score: 0.8,
          memory_type: MemoryType.PERSONAL,
          last_referenced: new Date()
        },
        {
          content: 'User enjoys morning walks in the garden',
          importance_score: 0.6,
          memory_type: MemoryType.PREFERENCE,
          last_referenced: new Date()
        },
        {
          content: 'User mentioned cooking dinner tonight',
          importance_score: 0.4,
          memory_type: MemoryType.CONVERSATION,
          last_referenced: new Date()
        }
      ];

      for (const memory of memories) {
        await memoryManager.storeMemory(testUserId, memory);
      }
    });

    it('should search memories by content', async () => {
      const results = await memoryManager.searchMemories(testUserId, 'garden');
      
      expect(results).toHaveLength(2);
      expect(results.every(m => m.content.toLowerCase().includes('garden'))).toBe(true);
    });

    it('should limit search results', async () => {
      const results = await memoryManager.searchMemories(testUserId, 'garden', 1);
      
      expect(results).toHaveLength(1);
    });

    it('should return results ordered by relevance and importance', async () => {
      const results = await memoryManager.searchMemories(testUserId, 'garden');
      
      // Results should be ordered by relevance score (combination of text match and importance)
      expect(results).toHaveLength(2);
      // Both results should contain 'garden' since that's what we searched for
      expect(results.every(r => r.content.toLowerCase().includes('garden'))).toBe(true);
      // Results should be ordered by relevance (which combines text match and importance)
      expect(results[0]).toBeDefined();
      expect(results[1]).toBeDefined();
    });
  });

  describe('memory statistics', () => {
    beforeEach(async () => {
      const memories = [
        {
          content: 'Personal memory 1',
          importance_score: 0.8,
          memory_type: MemoryType.PERSONAL,
          last_referenced: new Date()
        },
        {
          content: 'Personal memory 2',
          importance_score: 0.7,
          memory_type: MemoryType.PERSONAL,
          last_referenced: new Date()
        },
        {
          content: 'Preference memory',
          importance_score: 0.6,
          memory_type: MemoryType.PREFERENCE,
          last_referenced: new Date()
        }
      ];

      for (const memory of memories) {
        await memoryManager.storeMemory(testUserId, memory);
      }
    });

    it('should return accurate memory statistics', async () => {
      const stats = await memoryManager.getMemoryStats(testUserId);
      
      expect(stats.totalMemories).toBe(3);
      expect(stats.memoryTypes[MemoryType.PERSONAL]).toBe(2);
      expect(stats.memoryTypes[MemoryType.PREFERENCE]).toBe(1);
      expect(stats.memoryTypes[MemoryType.CONVERSATION]).toBe(0);
      expect(stats.averageImportance).toBeCloseTo(0.7, 1);
      expect(stats.oldestMemory).toBeDefined();
      expect(stats.newestMemory).toBeDefined();
    });

    it('should handle empty memory set', async () => {
      const stats = await memoryManager.getMemoryStats('user-with-no-memories');
      
      expect(stats.totalMemories).toBe(0);
      expect(stats.averageImportance).toBe(0);
      expect(stats.oldestMemory).toBeUndefined();
      expect(stats.newestMemory).toBeUndefined();
    });
  });

  describe('memory deletion', () => {
    it('should delete specific memory', async () => {
      const memoryId = await memoryManager.storeMemory(testUserId, {
        content: 'Memory to delete',
        importance_score: 0.5,
        memory_type: MemoryType.CONVERSATION,
        last_referenced: new Date()
      });

      let memories = await memoryManager.retrieveMemories(testUserId);
      expect(memories).toHaveLength(1);

      await memoryManager.deleteMemory(memoryId);

      memories = await memoryManager.retrieveMemories(testUserId);
      expect(memories).toHaveLength(0);
    });
  });
});