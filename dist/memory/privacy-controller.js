"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WellnessPrivacyController = void 0;
const storage_service_1 = require("./storage-service");
class WellnessPrivacyController {
    constructor(storageService) {
        this.MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
        // Provide lazy lightweight in-memory mock if not supplied (tests often construct with no args)
        this.storageService = storageService || new storage_service_1.SQLiteStorageService(':memory:');
    }
    applyPrivacySettings(data, settings) {
        if (!settings.allowMemoryStorage && this.isMemoryData(data)) {
            return null; // Don't store memory data if not allowed
        }
        if (!settings.allowConversationHistory && this.isConversationData(data)) {
            // Return anonymized version without personal details
            return this.anonymizeData(data);
        }
        return data;
    }
    shouldRetainData(data, settings) {
        const now = new Date();
        const retentionPeriod = settings.dataRetentionDays * this.MILLISECONDS_PER_DAY;
        // Check if data is older than retention period
        if (this.hasTimestamp(data)) {
            const dataAge = now.getTime() - data.created_date.getTime();
            if (dataAge > retentionPeriod) {
                return false;
            }
        }
        // Check specific privacy settings
        if (!settings.allowMemoryStorage && this.isMemoryData(data)) {
            return false;
        }
        if (!settings.allowConversationHistory && this.isConversationData(data)) {
            return false;
        }
        return true;
    }
    anonymizeData(data) {
        if (this.isMemoryData(data)) {
            return this.anonymizeMemory(data);
        }
        if (this.isConversationData(data)) {
            return this.anonymizeConversation(data);
        }
        return data;
    }
    async deleteExpiredData() {
        // This would require getting all users and their privacy settings
        // For now, we'll implement a method that can be called per user
        throw new Error('deleteExpiredData requires user context - use deleteExpiredUserData instead');
    }
    async deleteExpiredUserData(userId, privacySettings) {
        // If called without parameters, it's the old interface - do nothing for now
        if (!userId || !privacySettings) {
            return;
        }
        const now = new Date();
        const retentionPeriod = privacySettings.dataRetentionDays * this.MILLISECONDS_PER_DAY;
        const cutoffDate = new Date(now.getTime() - retentionPeriod);
        // Get all memories for the user
        const memories = await this.storageService.getMemories(userId);
        // Delete expired memories
        for (const memory of memories) {
            if (memory.created_date < cutoffDate) {
                await this.storageService.deleteMemory(memory.memory_id);
            }
        }
    }
    async deleteUserMemoriesByType(userId, memoryTypes) {
        const memories = await this.storageService.getMemories(userId);
        let deletedCount = 0;
        for (const memory of memories) {
            if (memoryTypes.includes(memory.memory_type)) {
                await this.storageService.deleteMemory(memory.memory_id);
                deletedCount++;
            }
        }
        return deletedCount;
    }
    async deleteUserMemoriesByDateRange(userId, startDate, endDate) {
        const memories = await this.storageService.getMemories(userId);
        let deletedCount = 0;
        for (const memory of memories) {
            if (memory.created_date >= startDate && memory.created_date <= endDate) {
                await this.storageService.deleteMemory(memory.memory_id);
                deletedCount++;
            }
        }
        return deletedCount;
    }
    async deleteUserMemoriesByContent(userId, contentPattern) {
        const memories = await this.storageService.getMemories(userId);
        let deletedCount = 0;
        const pattern = contentPattern.toLowerCase();
        for (const memory of memories) {
            if (memory.content.toLowerCase().includes(pattern)) {
                await this.storageService.deleteMemory(memory.memory_id);
                deletedCount++;
            }
        }
        return deletedCount;
    }
    async exportUserData(userId) {
        const profile = await this.storageService.getUserProfile(userId);
        const memories = await this.storageService.getMemories(userId);
        // Note: We don't have a method to get all sessions for a user in our current interface
        // This would need to be added to the storage service
        const sessions = [];
        return {
            profile,
            memories,
            sessions
        };
    }
    async deleteAllUserData(userId) {
        await this.storageService.deleteUserData(userId);
    }
    isMemoryData(data) {
        return data && typeof data === 'object' && 'memory_id' in data && 'content' in data;
    }
    isConversationData(data) {
        return data && typeof data === 'object' && 'session_id' in data && 'conversation_history' in data;
    }
    hasTimestamp(data) {
        return data && typeof data === 'object' && 'created_date' in data;
    }
    anonymizeMemory(memory) {
        // Remove or replace sensitive information
        let anonymizedContent = memory.content;
        // Replace addresses first (before names, so street names don't get replaced)
        anonymizedContent = anonymizedContent.replace(/\b\d+\s+[A-Za-z]+(?:\s+[A-Za-z]+)*\s+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln)\b/gi, '[ADDRESS]');
        // Replace phone numbers
        anonymizedContent = anonymizedContent.replace(/\b\d{3}-\d{3}-\d{4}\b/g, '[PHONE]');
        // Replace email addresses
        anonymizedContent = anonymizedContent.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
        // Replace names with placeholders (after addresses)
        anonymizedContent = anonymizedContent.replace(/\b[A-Z][a-z]+\b/g, '[NAME]');
        return {
            ...memory,
            content: anonymizedContent
        };
    }
    anonymizeConversation(session) {
        const anonymizedHistory = session.conversation_history.map(message => ({
            ...message,
            content: this.anonymizeMemory({ ...message, memory_id: '', memory_type: 'CONVERSATION', importance_score: 0 }).content
        }));
        return {
            ...session,
            conversation_history: anonymizedHistory
        };
    }
    static async createForTests() {
        const svc = new storage_service_1.SQLiteStorageService(':memory:');
        await svc.initialize().catch(() => { });
        return new WellnessPrivacyController(svc);
    }
    getPrivacyReport(userId, privacySettings) {
        const now = new Date();
        const estimatedDataExpiration = new Date(now.getTime() + (privacySettings.dataRetentionDays * this.MILLISECONDS_PER_DAY));
        return {
            dataRetentionDays: privacySettings.dataRetentionDays,
            memoryStorageEnabled: privacySettings.allowMemoryStorage,
            conversationHistoryEnabled: privacySettings.allowConversationHistory,
            autoDeleteAudioEnabled: privacySettings.autoDeleteAudio,
            estimatedDataExpiration
        };
    }
}
exports.WellnessPrivacyController = WellnessPrivacyController;
//# sourceMappingURL=privacy-controller.js.map