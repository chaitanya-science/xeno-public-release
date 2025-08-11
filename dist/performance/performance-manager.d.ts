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
export declare class PerformanceManager extends EventEmitter {
    private responseCache;
    private audioCache;
    private metrics;
    private connectionPool;
    private readonly CACHE_TTL;
    private readonly MAX_CACHE_SIZE;
    private readonly TARGET_RESPONSE_TIME;
    private metricsCollectionInterval;
    private cacheCleanupInterval;
    private logger;
    constructor();
    setLogger(logger: any): void;
    /**
     * Cache AI responses to reduce API calls for similar inputs
     */
    getCachedResponse(prompt: string, context: string): string | null;
    /**
     * Store AI response in cache for future use
     */
    cacheResponse(prompt: string, context: string, response: string): void;
    /**
     * Cache audio buffers to avoid re-processing identical text
     */
    getCachedAudio(text: string, voiceSettings: string): ArrayBuffer | null;
    /**
     * Store audio in cache
     */
    cacheAudio(text: string, voiceSettings: string, audioBuffer: ArrayBuffer): void;
    /**
     * Get or create connection pool entry
     */
    getConnection(service: string, factory: () => any): any;
    /**
     * Record performance metrics
     */
    recordMetrics(metrics: Partial<PerformanceMetrics>): void;
    /**
     * Get performance statistics
     */
    getPerformanceStats(): {
        averageResponseTime: number;
        cacheHitRate: number;
        memoryUsage: number;
        recentMetrics: PerformanceMetrics[];
    };
    /**
     * Optimize system based on current performance
     */
    optimizeSystem(): Promise<void>;
    /**
     * Log final performance metrics
     */
    reportMetrics(): void;
    private getAggregatedMetrics;
    private generateCacheKey;
    private evictOldestCacheEntry;
    private startMetricsCollection;
    private startCacheCleanup;
    private cleanupConnections;
    /**
     * Cleanup resources
     */
    dispose(): void;
}
export declare const performanceManager: PerformanceManager;
//# sourceMappingURL=performance-manager.d.ts.map