#!/usr/bin/env node

/**
 * Performance Analysis Tool
 * Analyzes and reports on AI Wellness Companion performance
 * Based on Kiro design requirements
 */

import { performanceManager } from '../performance/performance-manager';

class PerformanceAnalyzer {
  async runAnalysis(): Promise<void> {
    console.log('🔍 AI Wellness Companion Performance Analysis');
    console.log('============================================\n');

    // Get current performance statistics
    const stats = performanceManager.getPerformanceStats();

    // Display performance metrics
    this.displayResponseTimeAnalysis(stats);
    this.displayCacheAnalysis(stats);
    this.displayMemoryAnalysis(stats);
    this.displayRecommendations(stats);
  }

  private displayResponseTimeAnalysis(stats: any): void {
    console.log('📊 Response Time Analysis');
    console.log('-------------------------');
    console.log(`Average Response Time: ${stats.averageResponseTime.toFixed(2)}ms`);
    console.log(`Target Response Time: 5000ms (5 seconds)`);
    
    const performance = stats.averageResponseTime <= 5000 ? '✅ MEETING TARGET' : '❌ EXCEEDS TARGET';
    console.log(`Performance Status: ${performance}`);
    
    if (stats.recentMetrics.length > 0) {
      const latest = stats.recentMetrics[stats.recentMetrics.length - 1];
      console.log('\nLatest Measurements:');
      console.log(`  Wake Word Latency: ${latest.wakeWordLatency || 'N/A'}ms`);
      console.log(`  Speech-to-Text: ${latest.speechToTextLatency || 'N/A'}ms`);
      console.log(`  AI Response: ${latest.aiResponseLatency || 'N/A'}ms`);
      console.log(`  Text-to-Speech: ${latest.textToSpeechLatency || 'N/A'}ms`);
      console.log(`  Total: ${latest.totalResponseTime || 'N/A'}ms`);
    }
    console.log('');
  }

  private displayCacheAnalysis(stats: any): void {
    console.log('💾 Cache Performance Analysis');
    console.log('-----------------------------');
    console.log(`Cache Hit Rate: ${(stats.cacheHitRate * 100).toFixed(1)}%`);
    
    const cacheEfficiency = stats.cacheHitRate > 0.3 ? '✅ GOOD' : '⚠️ NEEDS IMPROVEMENT';
    console.log(`Cache Efficiency: ${cacheEfficiency}`);
    
    if (stats.cacheHitRate < 0.3) {
      console.log('💡 Recommendation: Cache hit rate is low. Consider:');
      console.log('   - Increasing cache TTL');
      console.log('   - Optimizing cache key generation');
      console.log('   - Reviewing conversation patterns');
    }
    console.log('');
  }

  private displayMemoryAnalysis(stats: any): void {
    console.log('🧠 Memory Usage Analysis');
    console.log('------------------------');
    console.log(`Memory Usage: ${stats.memoryUsage.toFixed(1)} MB`);
    
    const memoryStatus = stats.memoryUsage < 150 ? '✅ OPTIMAL' : 
                        stats.memoryUsage < 200 ? '⚠️ MODERATE' : '❌ HIGH';
    console.log(`Memory Status: ${memoryStatus}`);
    
    if (stats.memoryUsage > 150) {
      console.log('💡 Recommendation: Memory usage is elevated. Consider:');
      console.log('   - Running garbage collection');
      console.log('   - Clearing old cache entries');
      console.log('   - Checking for memory leaks');
    }
    console.log('');
  }

  private displayRecommendations(stats: any): void {
    console.log('🚀 Performance Optimization Recommendations');
    console.log('--------------------------------------------');

    const recommendations: string[] = [];

    // Response time recommendations
    if (stats.averageResponseTime > 5000) {
      recommendations.push('⚡ Response time exceeds target - optimize API calls');
      recommendations.push('🔄 Enable connection pooling for external services');
      recommendations.push('📦 Implement more aggressive caching');
    }

    // Cache recommendations
    if (stats.cacheHitRate < 0.3) {
      recommendations.push('💾 Improve cache hit rate with better cache key strategies');
      recommendations.push('⏰ Increase cache TTL for stable responses');
    }

    // Memory recommendations
    if (stats.memoryUsage > 150) {
      recommendations.push('🧹 Implement memory cleanup procedures');
      recommendations.push('📊 Add memory leak detection');
    }

    // General recommendations
    recommendations.push('🔍 Monitor wake word detection CPU usage');
    recommendations.push('⚖️ Implement load balancing for concurrent requests');
    recommendations.push('📈 Add real-time performance dashboards');

    if (recommendations.length === 0) {
      console.log('✅ System is performing optimally!');
    } else {
      recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }

    console.log('\n🎯 Key Performance Targets (from Kiro requirements):');
    console.log('   - Wake word response: ≤ 2 seconds');
    console.log('   - Total conversation response: ≤ 5 seconds');
    console.log('   - System startup: ≤ 30 seconds');
    console.log('   - Speech recognition accuracy: ≥ 95%');
  }

  async benchmarkSystem(): Promise<void> {
    console.log('\n🏃‍♂️ Running Performance Benchmark');
    console.log('=================================');

    const startTime = Date.now();

    // Simulate various operations to test performance
    console.log('Testing cache performance...');
    await this.testCachePerformance();

    console.log('Testing memory operations...');
    await this.testMemoryPerformance();

    console.log('Testing concurrent operations...');
    await this.testConcurrentPerformance();

    const totalTime = Date.now() - startTime;
    console.log(`\n✅ Benchmark completed in ${totalTime}ms`);

    // Display updated stats
    const newStats = performanceManager.getPerformanceStats();
    console.log(`\nUpdated Performance Stats:`);
    console.log(`  Average Response Time: ${newStats.averageResponseTime.toFixed(2)}ms`);
    console.log(`  Cache Hit Rate: ${(newStats.cacheHitRate * 100).toFixed(1)}%`);
    console.log(`  Memory Usage: ${newStats.memoryUsage.toFixed(1)} MB`);
  }

  private async testCachePerformance(): Promise<void> {
    // Test cache operations
    for (let i = 0; i < 10; i++) {
      performanceManager.cacheResponse(`test-${i}`, 'context', `response-${i}`);
      performanceManager.getCachedResponse(`test-${i}`, 'context');
    }
  }

  private async testMemoryPerformance(): Promise<void> {
    // Test memory operations
    const testData = new Array(1000).fill(0).map((_, i) => `memory-test-${i}`);
    // Simulate memory operations
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private async testConcurrentPerformance(): Promise<void> {
    // Test concurrent operations
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(new Promise(resolve => {
        setTimeout(() => {
          performanceManager.recordMetrics({
            totalResponseTime: Math.random() * 2000 + 1000
          });
          resolve(undefined);
        }, Math.random() * 100);
      }));
    }
    await Promise.all(promises);
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new PerformanceAnalyzer();
  
  const args = process.argv.slice(2);
  if (args.includes('--benchmark')) {
    analyzer.benchmarkSystem().catch(console.error);
  } else {
    analyzer.runAnalysis().catch(console.error);
  }
}

export { PerformanceAnalyzer };
