import { PrivacySettings, Memory, ConversationSession, UserProfile } from '../types';
import { PrivacyController } from './interfaces';
import { SQLiteStorageService } from './storage-service';
export declare class WellnessPrivacyController implements PrivacyController {
    private storageService;
    private readonly MILLISECONDS_PER_DAY;
    constructor(storageService?: SQLiteStorageService);
    applyPrivacySettings(data: any, settings: PrivacySettings): any;
    shouldRetainData(data: any, settings: PrivacySettings): boolean;
    anonymizeData(data: any): any;
    deleteExpiredData(): Promise<void>;
    deleteExpiredUserData(userId?: string, privacySettings?: PrivacySettings): Promise<void>;
    deleteUserMemoriesByType(userId: string, memoryTypes: string[]): Promise<number>;
    deleteUserMemoriesByDateRange(userId: string, startDate: Date, endDate: Date): Promise<number>;
    deleteUserMemoriesByContent(userId: string, contentPattern: string): Promise<number>;
    exportUserData(userId: string): Promise<{
        profile: UserProfile | null;
        memories: Memory[];
        sessions: ConversationSession[];
    }>;
    deleteAllUserData(userId: string): Promise<void>;
    private isMemoryData;
    private isConversationData;
    private hasTimestamp;
    private anonymizeMemory;
    private anonymizeConversation;
    static createForTests(): Promise<WellnessPrivacyController>;
    getPrivacyReport(userId: string, privacySettings: PrivacySettings): {
        dataRetentionDays: number;
        memoryStorageEnabled: boolean;
        conversationHistoryEnabled: boolean;
        autoDeleteAudioEnabled: boolean;
        estimatedDataExpiration: Date;
    };
}
//# sourceMappingURL=privacy-controller.d.ts.map