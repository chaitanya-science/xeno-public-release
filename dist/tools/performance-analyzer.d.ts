#!/usr/bin/env node
/**
 * Performance Analysis Tool
 * Analyzes and reports on AI Wellness Companion performance
 * Based on Kiro design requirements
 */
declare class PerformanceAnalyzer {
    runAnalysis(): Promise<void>;
    private displayResponseTimeAnalysis;
    private displayCacheAnalysis;
    private displayMemoryAnalysis;
    private displayRecommendations;
    benchmarkSystem(): Promise<void>;
    private testCachePerformance;
    private testMemoryPerformance;
    private testConcurrentPerformance;
}
export { PerformanceAnalyzer };
//# sourceMappingURL=performance-analyzer.d.ts.map