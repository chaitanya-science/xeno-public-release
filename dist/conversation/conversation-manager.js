"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CoreConversationManager = void 0;
const interfaces_1 = require("./interfaces");
const types_1 = require("../types");
const uuid_1 = require("uuid");
/**
 * Core conversation manager that handles session management, context preservation,
 * and response routing with empathetic conversation flow
 */
class CoreConversationManager {
    constructor(conversationFlow, responseRouter, settings) {
        this.activeSessions = new Map();
        // Performance tracking for 5-second response requirement
        this.responseTimeTracker = new Map();
        this.MAX_RESPONSE_TIME_MS = 5000; // 5 seconds as per requirement
        this.conversationFlow = conversationFlow;
        this.responseRouter = responseRouter;
        this.settings = {
            maxSessionDuration: 120, // 2 hours default
            maxHistoryLength: 50, // Keep last 50 messages
            responseTimeoutMs: 4500, // Leave 500ms buffer for processing
            topicGuidanceThreshold: 5, // Guide after 5 repetitive exchanges
            privacyLevel: types_1.PrivacyLevel.MEDIUM,
            ...settings
        };
    }
    /**
     * Start a new conversation session for a user
     */
    async startSession(userId) {
        const sessionId = (0, uuid_1.v4)();
        const startTime = new Date();
        // Create initial emotional state
        const initialEmotionalState = {
            valence: 0, // Neutral
            arousal: 0.3, // Slightly alert for conversation
            dominant_emotion: 'neutral',
            confidence: 0.8
        };
        // Create conversation session
        const session = {
            session_id: sessionId,
            user_id: userId,
            start_time: startTime,
            conversation_history: [],
            emotional_context: initialEmotionalState,
            privacy_level: this.settings.privacyLevel
        };
        // Create conversation context for internal tracking
        const context = {
            sessionId,
            userId,
            emotionalState: initialEmotionalState,
            conversationHistory: [],
            lastInteractionTime: startTime,
            responseCount: 0
        };
        this.activeSessions.set(sessionId, context);
        // Add welcome message to history
        const welcomeMessage = {
            message_id: (0, uuid_1.v4)(),
            timestamp: startTime,
            speaker: types_1.Speaker.COMPANION,
            content: this.generateWelcomeMessage(),
            emotional_tone: 'warm',
            confidence_score: 1.0
        };
        session.conversation_history.push(welcomeMessage);
        context.conversationHistory.push(welcomeMessage);
        return session;
    }
    /**
     * End a conversation session and clean up resources
     */
    async endSession(sessionId) {
        const context = this.activeSessions.get(sessionId);
        if (!context) {
            throw new Error(`Session ${sessionId} not found`);
        }
        // Add farewell message
        const farewellMessage = {
            message_id: (0, uuid_1.v4)(),
            timestamp: new Date(),
            speaker: types_1.Speaker.COMPANION,
            content: this.generateFarewellMessage(context),
            emotional_tone: 'warm',
            confidence_score: 1.0
        };
        context.conversationHistory.push(farewellMessage);
        // Clean up session data
        this.activeSessions.delete(sessionId);
        this.responseTimeTracker.delete(sessionId);
        console.log(`Session ${sessionId} ended successfully`);
    }
    /**
     * Process a user message and generate an appropriate response
     * Ensures 5-second response time requirement with emotional tone analysis
     */
    async processMessage(sessionId, userMessage) {
        const startTime = Date.now();
        this.responseTimeTracker.set(sessionId, startTime);
        try {
            const context = this.activeSessions.get(sessionId);
            if (!context) {
                throw new Error(`Session ${sessionId} not found`);
            }
            // Analyze emotional tone of user message
            let emotionalTone;
            try {
                const emotionalState = await this.responseRouter.analyzeEmotionalTone(userMessage);
                emotionalTone = emotionalState.dominant_emotion;
                // Update session emotional context
                context.emotionalState = emotionalState;
            }
            catch (error) {
                console.warn('Failed to analyze emotional tone:', error);
                emotionalTone = 'neutral';
            }
            // Add user message to history with emotional tone
            const userMsg = {
                message_id: (0, uuid_1.v4)(),
                timestamp: new Date(),
                speaker: types_1.Speaker.USER,
                content: userMessage,
                emotional_tone: emotionalTone,
                confidence_score: 1.0 // Assume processed speech is confident
            };
            context.conversationHistory.push(userMsg);
            context.lastInteractionTime = new Date();
            context.responseCount++;
            // Trim history if it gets too long
            this.trimConversationHistory(context);
            // Create session object for flow analysis
            const session = {
                session_id: sessionId,
                user_id: context.userId,
                start_time: new Date(startTime),
                conversation_history: context.conversationHistory,
                emotional_context: context.emotionalState,
                privacy_level: this.settings.privacyLevel
            };
            // Determine response type based on conversation flow
            const responseType = this.conversationFlow.determineResponseType(userMessage, session);
            // Generate response with timeout protection
            const response = await Promise.race([
                this.responseRouter.routeResponse(userMessage, session, responseType),
                this.createTimeoutPromise()
            ]);
            // Add companion response to history
            const companionMsg = {
                message_id: (0, uuid_1.v4)(),
                timestamp: new Date(),
                speaker: types_1.Speaker.COMPANION,
                content: response,
                emotional_tone: this.determineEmotionalTone(responseType, context.emotionalState),
                confidence_score: 0.9
            };
            context.conversationHistory.push(companionMsg);
            // Check response time performance
            const responseTime = Date.now() - startTime;
            if (responseTime > this.MAX_RESPONSE_TIME_MS) {
                console.warn(`Response time exceeded limit: ${responseTime}ms for session ${sessionId}`);
            }
            return response;
        }
        catch (error) {
            const responseTime = Date.now() - startTime;
            console.error(`Error processing message in session ${sessionId} (${responseTime}ms):`, error);
            // Return graceful error response
            return this.generateErrorResponse(error);
        }
        finally {
            this.responseTimeTracker.delete(sessionId);
        }
    }
    /**
     * Get current session context
     */
    async getSessionContext(sessionId) {
        const context = this.activeSessions.get(sessionId);
        if (!context) {
            return null;
        }
        return {
            session_id: sessionId,
            user_id: context.userId,
            start_time: new Date(), // This would be stored in a real implementation
            conversation_history: [...context.conversationHistory],
            emotional_context: { ...context.emotionalState },
            privacy_level: this.settings.privacyLevel
        };
    }
    /**
     * Update emotional context for a session
     */
    async updateEmotionalContext(sessionId, emotionalState) {
        const context = this.activeSessions.get(sessionId);
        if (!context) {
            throw new Error(`Session ${sessionId} not found`);
        }
        context.emotionalState = { ...emotionalState };
        console.log(`Updated emotional context for session ${sessionId}:`, emotionalState);
    }
    /**
     * Get active session count for monitoring
     */
    getActiveSessionCount() {
        return this.activeSessions.size;
    }
    /**
     * Get average response time for performance monitoring
     */
    getAverageResponseTime() {
        // This would be implemented with proper metrics collection
        return 0; // Placeholder
    }
    /**
     * Generate welcome message based on time of day and context
     */
    generateWelcomeMessage() {
        const hour = new Date().getHours();
        let greeting;
        if (hour < 12) {
            greeting = "Good morning";
        }
        else if (hour < 17) {
            greeting = "Good afternoon";
        }
        else {
            greeting = "Good evening";
        }
        const welcomeMessages = [
            `${greeting}! I'm here and ready to listen. How are you feeling today?`,
            `${greeting}! It's wonderful to hear from you. What's on your mind?`,
            `${greeting}! I'm glad you're here. How can I support you today?`
        ];
        return welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
    }
    /**
     * Generate farewell message based on conversation context
     */
    generateFarewellMessage(context) {
        const farewellMessages = [
            "Take care of yourself. I'm always here when you need someone to talk to.",
            "It was wonderful talking with you. Remember, you're not alone.",
            "Thank you for sharing with me today. I'll be here whenever you need support."
        ];
        return farewellMessages[Math.floor(Math.random() * farewellMessages.length)];
    }
    /**
     * Trim conversation history to maintain performance
     */
    trimConversationHistory(context) {
        if (context.conversationHistory.length > this.settings.maxHistoryLength) {
            // Keep the most recent messages, but preserve the welcome message
            const welcomeMessage = context.conversationHistory[0];
            const recentMessages = context.conversationHistory.slice(-this.settings.maxHistoryLength + 1);
            context.conversationHistory = [welcomeMessage, ...recentMessages];
        }
    }
    /**
     * Determine emotional tone for response based on context
     */
    determineEmotionalTone(responseType, emotionalState) {
        switch (responseType) {
            case interfaces_1.ResponseType.EMPATHETIC_SUPPORT:
                return emotionalState.valence < -0.3 ? 'compassionate' : 'warm';
            case interfaces_1.ResponseType.CRISIS_RESPONSE:
                return 'calm';
            case interfaces_1.ResponseType.FOLLOW_UP_QUESTION:
                return 'curious';
            case interfaces_1.ResponseType.TOPIC_GUIDANCE:
                return 'gentle';
            default:
                return 'warm';
        }
    }
    /**
     * Create timeout promise for response time enforcement
     */
    createTimeoutPromise() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Response timeout exceeded'));
            }, this.settings.responseTimeoutMs);
        });
    }
    /**
     * Generate graceful error response
     */
    generateErrorResponse(error) {
        if (error.message?.includes('timeout')) {
            return "I'm taking a moment to think about what you've shared. Could you give me just a second more?";
        }
        return "I'm having a small technical moment. Could you please repeat what you said?";
    }
}
exports.CoreConversationManager = CoreConversationManager;
//# sourceMappingURL=conversation-manager.js.map