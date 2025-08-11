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

export class OptimizedMemoryService extends EventEmitter {
  private connectionPool: any[] = [];
  private availableConnections: any[] = [];
  private operationQueue: BatchOperation[] = [];
  private memoryCache = new Map<string, Memory[]>();
  private batchTimer: NodeJS.Timeout | null = null;
  private config: MemoryPoolConfig;

  constructor(
    private storageService: any,
    config?: Partial<MemoryPoolConfig>
  ) {
    super();
    
    this.config = {
      maxConnections: 5,
      connectionTimeout: 10000,
      batchSize: 20,
      cacheSize: 500,
      cleanupInterval: 300000, // 5 minutes
      ...config
    };

    this.initializeConnectionPool();
    this.startCleanupTimer();
  }

  /**
   * Store multiple memories in a single batch operation
   */
  async storeMemoriesBatch(
    userId: string,
    memories: Array<Omit<Memory, 'memory_id' | 'created_date'>>
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type: 'store',
        data: { userId, memories },
        callback: (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      });

      this.processBatchIfReady();
    });
  }

  /**
   * Retrieve memories with intelligent caching
   */
  async retrieveMemoriesOptimized(
    userId: string,
    limit: number,
    memoryType?: MemoryType
  ): Promise<Memory[]> {
    const cacheKey = `${userId}-${limit}-${memoryType || 'all'}`;
    
    // Check cache first
    if (this.memoryCache.has(cacheKey)) {
      const cached = this.memoryCache.get(cacheKey)!;
      this.emit('cache_hit', { userId, cacheKey });
      return cached;
    }

    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type: 'retrieve',
        data: { userId, limit, memoryType, cacheKey },
        callback: (error, result) => {
          if (error) {
            reject(error);
          } else {
            // Cache the result
            this.cacheMemories(cacheKey, result);
            resolve(result);
          }
        }
      });

      this.processBatchIfReady();
    });
  }

  /**
   * Delete memories with batch optimization
   */
  async deleteMemoriesBatch(
    userId: string,
    memoryIds: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      this.operationQueue.push({
        type: 'delete',
        data: { userId, memoryIds },
        callback: (error, result) => {
          if (error) reject(error);
          else {
            // Invalidate cache for this user
            this.invalidateUserCache(userId);
            resolve(result);
          }
        }
      });

      this.processBatchIfReady();
    });
  }

  /**
   * Process batch operations when queue is ready
   */
  private processBatchIfReady(): void {
    if (this.operationQueue.length >= this.config.batchSize) {
      this.processBatch();
    } else if (!this.batchTimer) {
      // Process batch after small delay to allow more operations to queue
      this.batchTimer = setTimeout(() => {
        this.processBatch();
      }, 100);
    }
  }

  /**
   * Process queued operations in batch
   */
  private async processBatch(): Promise<void> {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    if (this.operationQueue.length === 0) return;

    const operations = this.operationQueue.splice(0, this.config.batchSize);
    const connection = await this.getConnection();

    try {
      // Group operations by type for efficient processing
      const storeOps = operations.filter(op => op.type === 'store');
      const retrieveOps = operations.filter(op => op.type === 'retrieve');
      const deleteOps = operations.filter(op => op.type === 'delete');

      // Process store operations
      if (storeOps.length > 0) {
        await this.processBatchStoreOperations(connection, storeOps);
      }

      // Process retrieve operations
      if (retrieveOps.length > 0) {
        await this.processBatchRetrieveOperations(connection, retrieveOps);
      }

      // Process delete operations
      if (deleteOps.length > 0) {
        await this.processBatchDeleteOperations(connection, deleteOps);
      }

    } catch (error) {
      // Handle batch errors
      operations.forEach(op => {
        op.callback(error instanceof Error ? error : new Error(String(error)));
      });
    } finally {
      this.releaseConnection(connection);
    }

    // Continue processing if there are more operations
    if (this.operationQueue.length > 0) {
      setImmediate(() => this.processBatch());
    }
  }

  /**
   * Process multiple store operations efficiently
   */
  private async processBatchStoreOperations(
    connection: any,
    operations: BatchOperation[]
  ): Promise<void> {
    const allMemories: Array<{ userId: string; memory: any }> = [];
    
    // Collect all memories to store
    operations.forEach(op => {
      const { userId, memories } = op.data;
      memories.forEach((memory: any) => {
        allMemories.push({ userId, memory });
      });
    });

    try {
      // Use a single transaction for all stores
      await this.storageService.storeMemoriesBatch(connection, allMemories);
      
      // Call success callbacks
      operations.forEach(op => op.callback(null));
      
      this.emit('batch_store_completed', { count: allMemories.length });
    } catch (error) {
      operations.forEach(op => op.callback(error as Error));
    }
  }

  /**
   * Process multiple retrieve operations efficiently
   */
  private async processBatchRetrieveOperations(
    connection: any,
    operations: BatchOperation[]
  ): Promise<void> {
    // Group by user for efficient querying
    const userGroups = new Map<string, BatchOperation[]>();
    
    operations.forEach(op => {
      const { userId } = op.data;
      if (!userGroups.has(userId)) {
        userGroups.set(userId, []);
      }
      userGroups.get(userId)!.push(op);
    });

    // Process each user group
    for (const [userId, userOps] of userGroups) {
      try {
        // Get all memories for this user at once
        const allMemories = await this.storageService.retrieveAllMemories(connection, userId);
        
        // Filter and distribute results to each operation
        userOps.forEach(op => {
          const { limit, memoryType, cacheKey } = op.data;
          
          let filteredMemories = allMemories;
          if (memoryType) {
            filteredMemories = allMemories.filter((m: Memory) => m.memory_type === memoryType);
          }
          
          const result = filteredMemories.slice(0, limit);
          op.callback(null, result);
        });
        
      } catch (error) {
        userOps.forEach(op => op.callback(error as Error));
      }
    }
  }

  /**
   * Process multiple delete operations efficiently
   */
  private async processBatchDeleteOperations(
    connection: any,
    operations: BatchOperation[]
  ): Promise<void> {
    const allDeletes: Array<{ userId: string; memoryIds: string[] }> = [];
    
    operations.forEach(op => {
      allDeletes.push(op.data);
    });

    try {
      await this.storageService.deleteMemoriesBatch(connection, allDeletes);
      operations.forEach(op => op.callback(null));
      
      this.emit('batch_delete_completed', { operations: allDeletes.length });
    } catch (error) {
      operations.forEach(op => op.callback(error as Error));
    }
  }

  /**
   * Get connection from pool
   */
  private async getConnection(): Promise<any> {
    if (this.availableConnections.length > 0) {
      return this.availableConnections.pop();
    }

    // Wait for connection or create new one if under limit
    if (this.connectionPool.length < this.config.maxConnections) {
      const connection = await this.storageService.createConnection();
      this.connectionPool.push(connection);
      return connection;
    }

    // Wait for available connection
    return new Promise((resolve) => {
      const checkForConnection = () => {
        if (this.availableConnections.length > 0) {
          resolve(this.availableConnections.pop());
        } else {
          setTimeout(checkForConnection, 10);
        }
      };
      checkForConnection();
    });
  }

  /**
   * Return connection to pool
   */
  private releaseConnection(connection: any): void {
    this.availableConnections.push(connection);
  }

  /**
   * Cache memories with LRU eviction
   */
  private cacheMemories(cacheKey: string, memories: Memory[]): void {
    if (this.memoryCache.size >= this.config.cacheSize) {
      // Simple LRU: remove first entry
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }
    
    this.memoryCache.set(cacheKey, memories);
  }

  /**
   * Invalidate cache entries for a user
   */
  private invalidateUserCache(userId: string): void {
    for (const [key] of this.memoryCache) {
      if (key.startsWith(userId)) {
        this.memoryCache.delete(key);
      }
    }
  }

  /**
   * Initialize connection pool
   */
  private async initializeConnectionPool(): Promise<void> {
    try {
      // Create initial connections
      const initialConnections = Math.min(2, this.config.maxConnections);
      for (let i = 0; i < initialConnections; i++) {
        const connection = await this.storageService.createConnection();
        this.connectionPool.push(connection);
        this.availableConnections.push(connection);
      }
      
      this.emit('pool_initialized', { 
        initialConnections,
        maxConnections: this.config.maxConnections
      });
    } catch (error) {
      this.emit('pool_initialization_error', error);
    }
  }

  /**
   * Start cleanup timer for cache and connections
   */
  private startCleanupTimer(): void {
    setInterval(() => {
      this.performCleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Perform periodic cleanup
   */
  private async performCleanup(): Promise<void> {
    // Clear old cache entries (simple time-based eviction)
    const cacheKeysToDelete: string[] = [];
    
    for (const [key] of this.memoryCache) {
      // In a real implementation, you'd track timestamps
      // For now, just limit cache size
      if (this.memoryCache.size > this.config.cacheSize * 0.8) {
        cacheKeysToDelete.push(key);
      }
    }
    
    cacheKeysToDelete.forEach(key => this.memoryCache.delete(key));
    
    this.emit('cleanup_completed', {
      cacheEntriesRemoved: cacheKeysToDelete.length,
      currentCacheSize: this.memoryCache.size
    });
  }

  /**
   * Get performance statistics
   */
  getStats() {
    return {
      connectionPoolSize: this.connectionPool.length,
      availableConnections: this.availableConnections.length,
      queuedOperations: this.operationQueue.length,
      cacheSize: this.memoryCache.size,
      maxCacheSize: this.config.cacheSize
    };
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    // Close all connections
    await Promise.all(
      this.connectionPool.map(connection => 
        this.storageService.closeConnection(connection)
      )
    );
    
    this.connectionPool.length = 0;
    this.availableConnections.length = 0;
    this.operationQueue.length = 0;
    this.memoryCache.clear();
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }
    
    this.removeAllListeners();
  }
}
