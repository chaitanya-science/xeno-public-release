/**
 * Memory Optimization Service
 * Implements connection pooling, batch operations, and efficient database access
 * Based on Kiro design requirements for scalable memory management
 */
import { EventEmitter } from 'events';
import { Memory, MemoryType } from '../types';
export interface MemoryPoolConfig {
    maxConnections: number;
    connectionTimeout: number;
    batchSize: number;
    cacheSize: number;
    cleanupInterval: number;
}
export interface BatchOperation {
    type: 'store' | 'retrieve' | 'delete';
    data: any;
    callback: (error: Error | null, result?: any) => void;
}
export declare class OptimizedMemoryService extends EventEmitter {
    private storageService;
    private connectionPool;
    private availableConnections;
    private operationQueue;
    private memoryCache;
    private batchTimer;
    private config;
    constructor(storageService: any, config?: Partial<MemoryPoolConfig>);
    /**
     * Store multiple memories in a single batch operation
     */
    storeMemoriesBatch(userId: string, memories: Array<Omit<Memory, 'memory_id' | 'created_date'>>): Promise<void>;
    /**
     * Retrieve memories with intelligent caching
     */
    retrieveMemoriesOptimized(userId: string, limit: number, memoryType?: MemoryType): Promise<Memory[]>;
    /**
     * Delete memories with batch optimization
     */
    deleteMemoriesBatch(userId: string, memoryIds: string[]): Promise<void>;
    /**
     * Process batch operations when queue is ready
     */
    private processBatchIfReady;
    /**
     * Process queued operations in batch
     */
    private processBatch;
    /**
     * Process multiple store operations efficiently
     */
    private processBatchStoreOperations;
    /**
     * Process multiple retrieve operations efficiently
     */
    private processBatchRetrieveOperations;
    /**
     * Process multiple delete operations efficiently
     */
    private processBatchDeleteOperations;
    /**
     * Get connection from pool
     */
    private getConnection;
    /**
     * Return connection to pool
     */
    private releaseConnection;
    /**
     * Cache memories with LRU eviction
     */
    private cacheMemories;
    /**
     * Invalidate cache entries for a user
     */
    private invalidateUserCache;
    /**
     * Initialize connection pool
     */
    private initializeConnectionPool;
    /**
     * Start cleanup timer for cache and connections
     */
    private startCleanupTimer;
    /**
     * Perform periodic cleanup
     */
    private performCleanup;
    /**
     * Get performance statistics
     */
    getStats(): {
        connectionPoolSize: number;
        availableConnections: number;
        queuedOperations: number;
        cacheSize: number;
        maxCacheSize: number;
    };
    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=optimized-memory-service.d.ts.map