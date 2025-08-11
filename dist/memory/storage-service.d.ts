import { UserProfile, ConversationSession, Memory } from '../types';
import { StorageService } from './interfaces';
export declare class SQLiteStorageService implements StorageService {
    private dbPath;
    private db;
    private encryptionKey;
    constructor(dbPath?: string, encryptionKey?: string);
    private generateEncryptionKey;
    initialize(): Promise<void>;
    private createTables;
    encryptData(data: string): Promise<string>;
    decryptData(encryptedData: string): Promise<string>;
    saveUserProfile(profile: UserProfile): Promise<void>;
    getUserProfile(userId: string): Promise<UserProfile | null>;
    saveConversationSession(session: ConversationSession): Promise<void>;
    getConversationSession(sessionId: string): Promise<ConversationSession | null>;
    saveMemory(memory: Memory, userId: string): Promise<void>;
    getMemories(userId: string, limit?: number): Promise<Memory[]>;
    deleteMemory(memoryId: string): Promise<void>;
    deleteUserData(userId: string): Promise<void>;
    close(): Promise<void>;
    /**
     * Test-friendly alias expected by some integration tests.
     */
    dispose(): Promise<void>;
    /**
     * Force close database connection without waiting for operations to complete
     */
    forceClose(): void;
}
//# sourceMappingURL=storage-service.d.ts.map