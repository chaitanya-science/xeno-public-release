/**
 * Optimized Conversation Pipeline
 * Implements parallel processing and performance monitoring
 * Based on Kiro design requirements for 5-second response times
 */
import { ConversationManager } from './interfaces';
import { ConversationSession } from '../types';
import { SpeechToTextService } from '../audio/interfaces';
import { TextToSpeechService } from '../audio/tts-interfaces';
import { OpenAIService } from './ai-service';
import { EventEmitter } from 'events';
import { PrivacyAwareLogger } from '../logging/logger';
export declare class OptimizedConversationPipeline extends EventEmitter implements ConversationManager {
    private speechToTextService;
    private textToSpeechService;
    private aiService;
    private logger;
    private readonly TARGET_RESPONSE_TIME;
    constructor(speechToTextService: SpeechToTextService, textToSpeechService: TextToSpeechService, aiService: OpenAIService, logger: PrivacyAwareLogger);
    startSession(userId: string): Promise<ConversationSession>;
    endSession(sessionId: string): Promise<void>;
    processMessage(sessionId: string, userMessage: string): Promise<string>;
    getSessionContext(sessionId: string): Promise<ConversationSession | null>;
    updateEmotionalContext(sessionId: string, emotionalState: any): Promise<void>;
    private mockSessionStore;
    /**
     * Process complete conversation flow with parallel optimization
     * Meets 5-second response time requirement through parallel processing
     */
    processConversationFlow(sessionId: string, audioBuffer: Buffer): Promise<ArrayBuffer>;
    /**
     * Process multiple conversations concurrently with load balancing
     */
    processConcurrentConversations(requests: Array<{
        sessionId: string;
        audioBuffer: Buffer;
    }>): Promise<Array<{
        sessionId: string;
        result: ArrayBuffer;
        latency: number;
    }>>;
    /**
     * Prepare optimal TTS settings based on conversation context
     */
    private prepareTTSSettings;
    /**
     * Update conversation history without blocking the main response
     */
    private updateConversationHistoryAsync;
    /**
     * Convert AudioBuffer to ArrayBuffer for network transmission
     */
    private audioBufferToArrayBuffer;
    /**
     * Handle performance alerts and take corrective action
     */
    private handlePerformanceAlert;
    /**
     * Get speaking rate based on emotional context
     */
    private getSpeakingRateForEmotion;
    /**
     * Get pitch adjustment based on emotional context
     */
    private getPitchForEmotion;
    /**
     * Get performance statistics for monitoring
     */
    getPerformanceStats(): {
        averageResponseTime: number;
        cacheHitRate: number;
        memoryUsage: number;
        recentMetrics: import("../performance/performance-manager").PerformanceMetrics[];
    };
    /**
     * Cleanup resources
     */
    dispose(): void;
}
//# sourceMappingURL=optimized-pipeline.d.ts.map