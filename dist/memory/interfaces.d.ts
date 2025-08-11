import { Memory, UserProfile, ConversationSession, PrivacySettings } from '../types';
export interface MemoryManager {
    initialize?(): Promise<void>;
    storeMemory(userId: string, memory: Omit<Memory, 'memory_id' | 'created_date' | 'importance_score'> & {
        importance_score?: number;
    }): Promise<string>;
    retrieveMemories(userId: string, query?: string, limit?: number): Promise<Memory[]>;
    updateMemory(memoryId: string, updates: Partial<Memory>): Promise<void>;
    deleteMemory(memoryId: string): Promise<void>;
    pruneMemories(userId: string): Promise<void>;
    getMemoryImportance(memory: Memory): number;
}
export interface StorageService {
    initialize(): Promise<void>;
    saveUserProfile(profile: UserProfile): Promise<void>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    saveConversationSession(session: ConversationSession): Promise<void>;
    getConversationSession(sessionId: string): Promise<ConversationSession | null>;
    deleteUserData(userId: string): Promise<void>;
    encryptData(data: string): Promise<string>;
    decryptData(encryptedData: string): Promise<string>;
    saveMemory?(memory: Memory, userId: string): Promise<void>;
    getMemories?(userId: string, limit?: number): Promise<Memory[]>;
    deleteMemory?(memoryId: string): Promise<void>;
}
export interface PrivacyController {
    applyPrivacySettings(data: any, settings: PrivacySettings): any;
    shouldRetainData(data: any, settings: PrivacySettings): boolean;
    anonymizeData(data: any): any;
    deleteExpiredData(): Promise<void>;
    deleteExpiredUserData(userId?: string, settings?: PrivacySettings): Promise<void>;
}
//# sourceMappingURL=interfaces.d.ts.map