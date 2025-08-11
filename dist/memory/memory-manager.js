"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellnessMemoryManager = void 0;
const uuid_1 = require("uuid");
const types_1 = require("../types");
class WellnessMemoryManager {
    get MAX_MEMORIES_PER_USER() { return 1000; }
    constructor(storageService) {
        this.IMPORTANCE_DECAY_FACTOR = 0.95;
        this.DAYS_TO_MILLISECONDS = 24 * 60 * 60 * 1000;
        this.storageService = storageService;
    }
    async initialize() {
        // No-op for tests to satisfy interface expectation
        return;
    }
    async storeMemory(userId, memory) {
        // Auto-fill missing last_referenced if not provided
        const now = new Date();
        const memoryWithRef = { ...memory };
        if (!memoryWithRef.last_referenced)
            memoryWithRef.last_referenced = now;
        const memoryId = (0, uuid_1.v4)();
        const fullMemory = {
            ...memoryWithRef,
            memory_id: memoryId,
            created_date: now,
            importance_score: memoryWithRef.importance_score || 0
        };
        // Calculate importance score if not provided
        if (!memoryWithRef.importance_score) {
            fullMemory.importance_score = this.calculateImportanceScore(fullMemory);
        }
        await this.storageService.saveMemory(fullMemory, userId);
        // Check if we need to prune memories after adding new one
        await this.pruneMemories(userId);
        return memoryId;
    }
    async retrieveMemories(userId, queryOrLimit, maybeLimit) {
        let query;
        let limit;
        if (typeof queryOrLimit === 'number') {
            limit = queryOrLimit;
        }
        else {
            query = queryOrLimit;
            limit = maybeLimit;
        }
        const memories = await this.storageService.getMemories(userId, limit);
        // Update last_referenced timestamp for retrieved memories
        const now = new Date();
        for (const memory of memories) {
            memory.last_referenced = now;
            await this.storageService.saveMemory(memory, userId);
        }
        // Filter by query if provided
        if (query) {
            const queryLower = query.toLowerCase();
            return memories.filter(m => m.content.toLowerCase().includes(queryLower));
        }
        return memories;
    }
    async updateMemory(memoryId, updates) {
        // First, we need to find the memory to get the user_id
        // This is a limitation of our current storage interface - we need the user_id
        // In a real implementation, we might store user_id in the memory table or have a different approach
        throw new Error('updateMemory requires user_id - consider retrieving memory first to get user context');
    }
    async deleteMemory(memoryId) {
        await this.storageService.deleteMemory(memoryId);
    }
    async pruneMemories(userId) {
        const allMemories = await this.storageService.getMemories(userId);
        if (allMemories.length <= this.MAX_MEMORIES_PER_USER) {
            return;
        }
        // Update importance scores based on age and access patterns
        const updatedMemories = allMemories.map(memory => {
            const updatedMemory = { ...memory };
            updatedMemory.importance_score = this.getMemoryImportance(updatedMemory);
            return updatedMemory;
        });
        // Sort by importance (descending) and keep only the most important ones
        updatedMemories.sort((a, b) => b.importance_score - a.importance_score);
        const memoriesToKeep = updatedMemories.slice(0, this.MAX_MEMORIES_PER_USER);
        const memoriesToDelete = updatedMemories.slice(this.MAX_MEMORIES_PER_USER);
        // Update the memories we're keeping with new importance scores
        for (const memory of memoriesToKeep) {
            await this.storageService.saveMemory(memory, userId);
        }
        // Delete the least important memories
        for (const memory of memoriesToDelete) {
            await this.storageService.deleteMemory(memory.memory_id);
        }
    }
    getMemoryImportance(memory) {
        const now = new Date();
        const daysSinceCreated = (now.getTime() - memory.created_date.getTime()) / this.DAYS_TO_MILLISECONDS;
        const daysSinceReferenced = (now.getTime() - memory.last_referenced.getTime()) / this.DAYS_TO_MILLISECONDS;
        // Base importance score
        let importance = memory.importance_score;
        // Apply time decay - memories become less important over time
        const ageDecay = Math.pow(this.IMPORTANCE_DECAY_FACTOR, daysSinceCreated);
        const accessDecay = Math.pow(this.IMPORTANCE_DECAY_FACTOR, daysSinceReferenced);
        // Memory type modifiers
        const typeMultiplier = this.getTypeImportanceMultiplier(memory.memory_type);
        // Calculate final importance
        importance = importance * ageDecay * accessDecay * typeMultiplier;
        return Math.max(0, Math.min(1, importance)); // Clamp between 0 and 1
    }
    calculateImportanceScore(memory) {
        let score = 0.5; // Base score
        // Content-based scoring
        const content = memory.content.toLowerCase();
        // Higher importance for emotional content
        const emotionalKeywords = ['feel', 'sad', 'happy', 'worried', 'excited', 'afraid', 'love', 'hate', 'angry'];
        const emotionalMatches = emotionalKeywords.filter(keyword => content.includes(keyword)).length;
        score += emotionalMatches * 0.1;
        // Higher importance for personal information
        const personalKeywords = ['family', 'friend', 'work', 'home', 'health', 'memory', 'remember'];
        const personalMatches = personalKeywords.filter(keyword => content.includes(keyword)).length;
        score += personalMatches * 0.08;
        // Higher importance for preferences
        if (content.includes('like') || content.includes('prefer') || content.includes('enjoy')) {
            score += 0.15;
        }
        // Length bonus for detailed memories
        if (memory.content.length > 100) {
            score += 0.1;
        }
        // Type-based scoring
        score *= this.getTypeImportanceMultiplier(memory.memory_type);
        return Math.max(0, Math.min(1, score)); // Clamp between 0 and 1
    }
    getTypeImportanceMultiplier(memoryType) {
        switch (memoryType) {
            case types_1.MemoryType.PERSONAL:
                return 1.2; // Personal information is most important
            case types_1.MemoryType.PREFERENCE:
                return 1.1; // Preferences are quite important
            case types_1.MemoryType.CONVERSATION:
                return 1.0; // Regular conversation memories
            default:
                return 1.0;
        }
    }
    async searchMemories(userId, query, limit = 10) {
        const allMemories = await this.storageService.getMemories(userId);
        const queryLower = query.toLowerCase();
        // Simple text search with relevance scoring
        const scoredMemories = allMemories
            .map(memory => {
            const content = memory.content.toLowerCase();
            let relevanceScore = 0;
            // Exact phrase match
            if (content.includes(queryLower)) {
                relevanceScore += 1.0;
            }
            // Individual word matches
            const queryWords = queryLower.split(' ');
            const contentWords = content.split(' ');
            const matchingWords = queryWords.filter(word => contentWords.includes(word));
            relevanceScore += (matchingWords.length / queryWords.length) * 0.5;
            return {
                memory,
                relevanceScore: relevanceScore * memory.importance_score
            };
        })
            .filter(item => item.relevanceScore > 0)
            .sort((a, b) => b.relevanceScore - a.relevanceScore)
            .slice(0, limit)
            .map(item => item.memory);
        // Update last_referenced for searched memories
        const now = new Date();
        for (const memory of scoredMemories) {
            memory.last_referenced = now;
            await this.storageService.saveMemory(memory, userId);
        }
        return scoredMemories;
    }
    async getMemoryStats(userId) {
        const memories = await this.storageService.getMemories(userId);
        const stats = {
            totalMemories: memories.length,
            memoryTypes: {
                [types_1.MemoryType.PERSONAL]: 0,
                [types_1.MemoryType.PREFERENCE]: 0,
                [types_1.MemoryType.CONVERSATION]: 0
            },
            averageImportance: 0,
            oldestMemory: undefined,
            newestMemory: undefined
        };
        if (memories.length === 0) {
            return stats;
        }
        let totalImportance = 0;
        let oldestDate = memories[0].created_date;
        let newestDate = memories[0].created_date;
        for (const memory of memories) {
            stats.memoryTypes[memory.memory_type]++;
            totalImportance += memory.importance_score;
            if (memory.created_date < oldestDate) {
                oldestDate = memory.created_date;
            }
            if (memory.created_date > newestDate) {
                newestDate = memory.created_date;
            }
        }
        stats.averageImportance = totalImportance / memories.length;
        stats.oldestMemory = oldestDate;
        stats.newestMemory = newestDate;
        return stats;
    }
}
exports.WellnessMemoryManager = WellnessMemoryManager;
//# sourceMappingURL=memory-manager.js.map