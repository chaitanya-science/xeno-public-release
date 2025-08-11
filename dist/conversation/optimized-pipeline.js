"use strict";
/**
 * Optimized Conversation Pipeline
 * Implements parallel processing and performance monitoring
 * Based on Kiro design requirements for 5-second response times
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OptimizedConversationPipeline = void 0;
const interfaces_1 = require("./interfaces");
const types_1 = require("../types");
const performance_manager_1 = require("../performance/performance-manager");
const events_1 = require("events");
class OptimizedConversationPipeline extends events_1.EventEmitter {
    constructor(speechToTextService, textToSpeechService, aiService, logger) {
        super();
        this.speechToTextService = speechToTextService;
        this.textToSpeechService = textToSpeechService;
        this.aiService = aiService;
        this.logger = logger;
        this.TARGET_RESPONSE_TIME = 5000; // 5 seconds as per requirements
        this.mockSessionStore = new Map();
        // Listen to performance alerts
        performance_manager_1.performanceManager.on('performance_alert', (alert) => {
            this.handlePerformanceAlert(alert);
        });
    }
    async startSession(userId) {
        const session = {
            session_id: `session-${Date.now()}`,
            user_id: userId,
            start_time: new Date(),
            conversation_history: [],
            emotional_context: {
                valence: 0,
                arousal: 0.5,
                dominant_emotion: 'neutral',
                confidence: 1.0,
            },
            privacy_level: types_1.PrivacyLevel.MEDIUM,
        };
        this.logger.info('OptimizedConversationPipeline', `Started new session ${session.session_id}`);
        return session;
    }
    async endSession(sessionId) {
        this.logger.info('OptimizedConversationPipeline', `Ending session ${sessionId}`);
        // In a real implementation, you would update the session state in a database
    }
    async processMessage(sessionId, userMessage) {
        const session = await this.getSessionContext(sessionId);
        if (!session) {
            throw new Error(`Session ${sessionId} not found`);
        }
        const response = await this.aiService.generateResponse(userMessage, session, interfaces_1.ResponseType.EMPATHETIC_SUPPORT);
        // Update history
        session.conversation_history.push({
            message_id: `msg-${Date.now()}`,
            timestamp: new Date(),
            speaker: types_1.Speaker.USER,
            content: userMessage,
            confidence_score: 0.9, // Assuming high confidence from text input
        });
        session.conversation_history.push({
            message_id: `msg-${Date.now() + 1}`,
            timestamp: new Date(),
            speaker: types_1.Speaker.COMPANION,
            content: response,
            confidence_score: 1.0,
        });
        return response;
    }
    async getSessionContext(sessionId) {
        // This is a mock implementation. In a real app, you'd fetch this from a store.
        if (!this.mockSessionStore.has(sessionId)) {
            const newSession = await this.startSession('default-user');
            this.mockSessionStore.set(newSession.session_id, newSession);
            return newSession;
        }
        return this.mockSessionStore.get(sessionId) || null;
    }
    async updateEmotionalContext(sessionId, emotionalState) {
        const session = await this.getSessionContext(sessionId);
        if (session) {
            session.emotional_context = emotionalState;
            this.logger.info('OptimizedConversationPipeline', `Updated emotional context for session ${sessionId}`);
        }
    }
    /**
     * Process complete conversation flow with parallel optimization
     * Meets 5-second response time requirement through parallel processing
     */
    async processConversationFlow(sessionId, audioBuffer) {
        const totalStartTime = Date.now();
        try {
            // Phase 1: Speech-to-Text (sequential - must complete first)
            const sttStartTime = Date.now();
            const transcriptionResult = await this.speechToTextService.transcribe(audioBuffer);
            const sttLatency = Date.now() - sttStartTime;
            if (!transcriptionResult.text || transcriptionResult.confidence < 0.5) {
                throw new Error('Speech recognition failed or low confidence');
            }
            // Phase 2: Parallel processing of AI response and TTS preparation
            const aiStartTime = Date.now();
            // Get conversation context
            const session = await this.getSessionContext(sessionId);
            if (!session) {
                throw new Error(`Session ${sessionId} not found`);
            }
            // Process AI response and prepare TTS settings in parallel
            const [aiResponse, ttsOptions] = await Promise.all([
                // AI response generation
                this.aiService.generateResponse(transcriptionResult.text, session, interfaces_1.ResponseType.EMPATHETIC_SUPPORT // Default response type
                ),
                // Prepare optimal TTS settings based on conversation context
                this.prepareTTSSettings(session)
            ]);
            const aiLatency = Date.now() - aiStartTime;
            // Phase 3: TTS synthesis with optimized settings
            const ttsStartTime = Date.now();
            const audioResult = await this.textToSpeechService.synthesizeSpeech(aiResponse, ttsOptions);
            const ttsLatency = Date.now() - ttsStartTime;
            // Update conversation history asynchronously (don't block response)
            this.updateConversationHistoryAsync(sessionId, transcriptionResult.text, aiResponse);
            // Record comprehensive performance metrics
            const totalLatency = Date.now() - totalStartTime;
            performance_manager_1.performanceManager.recordMetrics({
                speechToTextLatency: sttLatency,
                aiResponseLatency: aiLatency,
                textToSpeechLatency: ttsLatency,
                totalResponseTime: totalLatency
            });
            // Emit performance event for monitoring
            this.emit('conversation_processed', {
                sessionId,
                totalLatency,
                sttLatency,
                aiLatency,
                ttsLatency,
                targetMet: totalLatency <= this.TARGET_RESPONSE_TIME
            });
            // Convert AudioBuffer to ArrayBuffer for return
            return this.audioBufferToArrayBuffer(audioResult);
        }
        catch (error) {
            const totalLatency = Date.now() - totalStartTime;
            this.emit('conversation_error', {
                sessionId,
                error: error instanceof Error ? error.message : String(error),
                totalLatency
            });
            throw error;
        }
    }
    /**
     * Process multiple conversations concurrently with load balancing
     */
    async processConcurrentConversations(requests) {
        const startTime = Date.now();
        // Process all requests in parallel with proper error handling
        const results = await Promise.allSettled(requests.map(async (request) => {
            const requestStartTime = Date.now();
            try {
                const result = await this.processConversationFlow(request.sessionId, request.audioBuffer);
                return {
                    sessionId: request.sessionId,
                    result,
                    latency: Date.now() - requestStartTime,
                    success: true
                };
            }
            catch (error) {
                return {
                    sessionId: request.sessionId,
                    error: error instanceof Error ? error.message : String(error),
                    latency: Date.now() - requestStartTime,
                    success: false
                };
            }
        }));
        // Separate successful and failed requests
        const successful = results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(value => value.success);
        const failed = results
            .filter((result) => result.status === 'fulfilled')
            .map(result => result.value)
            .filter(value => !value.success);
        if (failed.length > 0) {
            this.emit('batch_processing_errors', {
                totalRequests: requests.length,
                successful: successful.length,
                failed: failed.length,
                errors: failed.map(f => ({ sessionId: f.sessionId, error: f.error }))
            });
        }
        // Return only successful results
        return successful.map(s => ({
            sessionId: s.sessionId,
            result: s.result,
            latency: s.latency
        }));
    }
    /**
     * Prepare optimal TTS settings based on conversation context
     */
    async prepareTTSSettings(session) {
        // This can run in parallel with AI response generation
        return {
            voice: {
                languageCode: 'en-US',
                name: 'en-US-Neural2-F', // Warm, empathetic voice
                ssmlGender: 'FEMALE'
            },
            audioConfig: {
                audioEncoding: 'LINEAR16',
                speakingRate: this.getSpeakingRateForEmotion(session.emotional_context.dominant_emotion || 'neutral'),
                pitch: this.getPitchForEmotion(session.emotional_context.dominant_emotion || 'neutral'),
                volumeGainDb: 0.0,
                sampleRateHertz: 16000
            }
        };
    }
    /**
     * Update conversation history without blocking the main response
     */
    async updateConversationHistoryAsync(sessionId, userMessage, aiResponse) {
        // Use setImmediate to ensure this doesn't block the response
        setImmediate(async () => {
            try {
                await this.processMessage(sessionId, userMessage);
                // AI response will be added by the conversation manager
            }
            catch (error) {
                this.emit('history_update_error', {
                    sessionId,
                    error: error instanceof Error ? error.message : String(error)
                });
            }
        });
    }
    /**
     * Convert AudioBuffer to ArrayBuffer for network transmission
     */
    audioBufferToArrayBuffer(audioBuffer) {
        // In a real implementation, this would convert the audio buffer properly
        // For now, return a placeholder ArrayBuffer
        const placeholder = new ArrayBuffer(audioBuffer.length || 1024);
        return placeholder;
    }
    /**
     * Handle performance alerts and take corrective action
     */
    handlePerformanceAlert(alert) {
        switch (alert.type) {
            case 'slow_response':
                this.emit('performance_warning', {
                    message: `Response time ${alert.responseTime}ms exceeded target ${alert.target}ms`,
                    suggestion: 'Consider optimizing AI model settings or checking network connectivity'
                });
                break;
            default:
                this.emit('performance_alert', alert);
        }
    }
    /**
     * Get speaking rate based on emotional context
     */
    getSpeakingRateForEmotion(emotion) {
        const rateMap = {
            'anxiety': 0.9, // Slightly slower for calming effect
            'sadness': 0.85, // Slower and more gentle
            'anger': 0.95, // Slightly slower to be calming
            'excitement': 1.1, // Slightly faster to match energy
            'calm': 1.0, // Normal rate
            'neutral': 1.0 // Normal rate
        };
        return rateMap[emotion] || 1.0;
    }
    /**
     * Get pitch adjustment based on emotional context
     */
    getPitchForEmotion(emotion) {
        const pitchMap = {
            'anxiety': -1.0, // Lower pitch for calming
            'sadness': -2.0, // Lower pitch for comfort
            'anger': -1.5, // Lower pitch for de-escalation
            'excitement': 1.0, // Slightly higher pitch
            'calm': 0.0, // Neutral pitch
            'neutral': 0.0 // Neutral pitch
        };
        return pitchMap[emotion] || 0.0;
    }
    /**
     * Get performance statistics for monitoring
     */
    getPerformanceStats() {
        return performance_manager_1.performanceManager.getPerformanceStats();
    }
    /**
     * Cleanup resources
     */
    dispose() {
        this.removeAllListeners();
    }
}
exports.OptimizedConversationPipeline = OptimizedConversationPipeline;
//# sourceMappingURL=optimized-pipeline.js.map