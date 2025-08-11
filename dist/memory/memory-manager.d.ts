import { Memory, MemoryType } from '../types';
import { MemoryManager } from './interfaces';
import { SQLiteStorageService } from './storage-service';
export declare class WellnessMemoryManager implements MemoryManager {
    private storageService;
    protected get MAX_MEMORIES_PER_USER(): number;
    private readonly IMPORTANCE_DECAY_FACTOR;
    private readonly DAYS_TO_MILLISECONDS;
    constructor(storageService: SQLiteStorageService);
    initialize(): Promise<void>;
    storeMemory(userId: string, memory: Omit<Memory, 'memory_id' | 'created_date' | 'importance_score'> & {
        importance_score?: number;
    }): Promise<string>;
    retrieveMemories(userId: string, queryOrLimit?: string | number, maybeLimit?: number): Promise<Memory[]>;
    updateMemory(memoryId: string, updates: Partial<Memory>): Promise<void>;
    deleteMemory(memoryId: string): Promise<void>;
    pruneMemories(userId: string): Promise<void>;
    getMemoryImportance(memory: Memory): number;
    private calculateImportanceScore;
    private getTypeImportanceMultiplier;
    searchMemories(userId: string, query: string, limit?: number): Promise<Memory[]>;
    getMemoryStats(userId: string): Promise<{
        totalMemories: number;
        memoryTypes: Record<MemoryType, number>;
        averageImportance: number;
        oldestMemory?: Date;
        newestMemory?: Date;
    }>;
}
//# sourceMappingURL=memory-manager.d.ts.map