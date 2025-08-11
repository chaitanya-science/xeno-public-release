/**
 * Performance Manager - Central optimization service
 * Implements caching, connection pooling, and async coordination
 * Based on Kiro design requirements for 5-second response times
 */

import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  wakeWordLatency: number;
  speechToTextLatency: number;
  aiResponseLatency: number;
  textToSpeechLatency: number;
  totalResponseTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  hits: number;
}

export class PerformanceManager extends EventEmitter {
  private responseCache = new Map<string, CacheEntry<string>>();
  private audioCache = new Map<string, CacheEntry<ArrayBuffer>>();
  private metrics: PerformanceMetrics[] = [];
  private connectionPool = new Map<string, any>();
  private readonly CACHE_TTL = 30000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 100;
  private readonly TARGET_RESPONSE_TIME = 5000; // 5 seconds as per requirements
  private metricsCollectionInterval: NodeJS.Timeout | null = null;
  private cacheCleanupInterval: NodeJS.Timeout | null = null;
  private logger: any = console;

  constructor() {
    super();
    if (process.env.NODE_ENV !== 'test') {
      this.startMetricsCollection();
      this.startCacheCleanup();
    }
  }

  setLogger(logger: any): void {
    this.logger = logger;
  }

  /**
   * Cache AI responses to reduce API calls for similar inputs
   */
  getCachedResponse(prompt: string, context: string): string | null {
    const key = this.generateCacheKey(prompt, context);
    const entry = this.responseCache.get(key);
    
    if (entry && entry.expiresAt > Date.now()) {
      entry.hits++;
      this.emit('cache_hit', { type: 'response', key });
      return entry.data;
    }
    
    if (entry) {
      this.responseCache.delete(key);
    }
    return null;
  }

  /**
   * Store AI response in cache for future use
   */
  cacheResponse(prompt: string, context: string, response: string): void {
    if (this.responseCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry(this.responseCache);
    }

    const key = this.generateCacheKey(prompt, context);
    this.responseCache.set(key, {
      data: response,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
      hits: 0
    });
  }

  /**
   * Cache audio buffers to avoid re-processing identical text
   */
  getCachedAudio(text: string, voiceSettings: string): ArrayBuffer | null {
    const key = this.generateCacheKey(text, voiceSettings);
    const entry = this.audioCache.get(key);
    
    if (entry && entry.expiresAt > Date.now()) {
      entry.hits++;
      this.emit('cache_hit', { type: 'audio', key });
      return entry.data;
    }
    
    if (entry) {
      this.audioCache.delete(key);
    }
    return null;
  }

  /**
   * Store audio in cache
   */
  cacheAudio(text: string, voiceSettings: string, audioBuffer: ArrayBuffer): void {
    if (this.audioCache.size >= this.MAX_CACHE_SIZE) {
      this.evictOldestCacheEntry(this.audioCache);
    }

    const key = this.generateCacheKey(text, voiceSettings);
    this.audioCache.set(key, {
      data: audioBuffer,
      timestamp: Date.now(),
      expiresAt: Date.now() + this.CACHE_TTL,
      hits: 0
    });
  }

  /**
   * Get or create connection pool entry
   */
  getConnection(service: string, factory: () => any): any {
    if (!this.connectionPool.has(service)) {
      this.connectionPool.set(service, factory());
    }
    return this.connectionPool.get(service);
  }

  /**
   * Record performance metrics
   */
  recordMetrics(metrics: Partial<PerformanceMetrics>): void {
    const fullMetrics: PerformanceMetrics = {
      wakeWordLatency: 0,
      speechToTextLatency: 0,
      aiResponseLatency: 0,
      textToSpeechLatency: 0,
      totalResponseTime: 0,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      ...metrics
    };

    this.metrics.push(fullMetrics);
    
    // Keep only last 100 measurements
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }

    // Alert if response time exceeds target
    if (fullMetrics.totalResponseTime > this.TARGET_RESPONSE_TIME) {
      this.emit('performance_alert', {
        type: 'slow_response',
        responseTime: fullMetrics.totalResponseTime,
        target: this.TARGET_RESPONSE_TIME
      });
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    averageResponseTime: number;
    cacheHitRate: number;
    memoryUsage: number;
    recentMetrics: PerformanceMetrics[];
  } {
    if (this.metrics.length === 0) {
      return {
        averageResponseTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        recentMetrics: []
      };
    }

    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.totalResponseTime, 0);
    const averageResponseTime = totalResponseTime / this.metrics.length;

    const totalCacheEntries = this.responseCache.size + this.audioCache.size;
    const totalHits = Array.from(this.responseCache.values()).reduce((sum, entry) => sum + entry.hits, 0) +
                     Array.from(this.audioCache.values()).reduce((sum, entry) => sum + entry.hits, 0);
    const cacheHitRate = totalCacheEntries > 0 ? totalHits / totalCacheEntries : 0;

    const latestMetrics = this.metrics[this.metrics.length - 1];
    const memoryUsage = latestMetrics.memoryUsage.heapUsed / 1024 / 1024; // MB

    return {
      averageResponseTime,
      cacheHitRate,
      memoryUsage,
      recentMetrics: this.metrics.slice(-10)
    };
  }

  /**
   * Optimize system based on current performance
   */
  async optimizeSystem(): Promise<void> {
    const stats = this.getPerformanceStats();
    
    // Clear cache if hit rate is low
    if (stats.cacheHitRate < 0.1 && this.responseCache.size > 50) {
      this.responseCache.clear();
      this.audioCache.clear();
      this.emit('cache_cleared', { reason: 'low_hit_rate' });
    }

    // Force garbage collection if memory usage is high
    if (stats.memoryUsage > 200) { // 200MB threshold
      if (global.gc) {
        global.gc();
        this.emit('garbage_collected', { memoryBefore: stats.memoryUsage });
      }
    }

    // Close unused connections
    this.cleanupConnections();
  }

  /**
   * Log final performance metrics
   */
  reportMetrics(): void {
    const summary = this.getAggregatedMetrics();
    this.logger.info('PerformanceSummary', 'Final performance metrics', { summary });
  }

  private getAggregatedMetrics(): any {
    if (this.metrics.length === 0) {
      return { message: 'No metrics recorded.' };
    }
    const summary = this.metrics.reduce((acc, metrics) => {
      Object.keys(metrics).forEach(key => {
        if (typeof (metrics as any)[key] === 'number') {
          (acc as any)[key] = ((acc as any)[key] || 0) + (metrics as any)[key];
        }
      });
      return acc;
    }, {} as any);

    Object.keys(summary).forEach(key => {
      summary[key] /= this.metrics.length;
    });
    summary.totalSamples = this.metrics.length;
    return summary;
  }

  private generateCacheKey(input1: string, input2: string): string {
    // Use simple hash for cache key to avoid memory overhead
    return Buffer.from(input1 + input2).toString('base64').slice(0, 32);
  }

  private evictOldestCacheEntry<T>(cache: Map<string, CacheEntry<T>>): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    
    for (const [key, entry] of cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }
    
    if (oldestKey) {
      cache.delete(oldestKey);
    }
  }

  private startMetricsCollection(): void {
    if (process.env.NODE_ENV === 'test') return; // disable in tests
    this.metricsCollectionInterval = setInterval(() => {
      this.recordMetrics({});
    }, 10000); // Every 10 seconds
  }

  private startCacheCleanup(): void {
    if (process.env.NODE_ENV === 'test') return; // disable in tests
    this.cacheCleanupInterval = setInterval(() => {
      const now = Date.now();
      
      // Clean expired response cache entries
      for (const [key, entry] of this.responseCache.entries()) {
        if (entry.expiresAt < now) {
          this.responseCache.delete(key);
        }
      }
      
      // Clean expired audio cache entries
      for (const [key, entry] of this.audioCache.entries()) {
        if (entry.expiresAt < now) {
          this.audioCache.delete(key);
        }
      }
    }, 60000); // Every minute
  }

  private cleanupConnections(): void {
    // Implementation would depend on specific connection types
    // For now, just emit event for other services to handle
    this.emit('cleanup_connections');
  }

  /**
   * Cleanup resources
   */
  dispose(): void {
    // Clear all intervals
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
    
    if (this.cacheCleanupInterval) {
      clearInterval(this.cacheCleanupInterval);
      this.cacheCleanupInterval = null;
    }

    // Clear all caches and connections
    this.responseCache.clear();
    this.audioCache.clear();
    this.connectionPool.clear();
    this.metrics.length = 0;
    
    // Remove all event listeners
    this.removeAllListeners();
  }
}

// Singleton instance
export const performanceManager = new PerformanceManager();
