import { ConversationManager, ConversationSettings } from './interfaces';
import { ConversationSession, EmotionalState } from '../types';
import { ConversationFlowController } from './conversation-flow';
import { ResponseRouter } from './response-router';
/**
 * Core conversation manager that handles session management, context preservation,
 * and response routing with empathetic conversation flow
 */
export declare class CoreConversationManager implements ConversationManager {
    private activeSessions;
    private conversationFlow;
    private responseRouter;
    private settings;
    private responseTimeTracker;
    private readonly MAX_RESPONSE_TIME_MS;
    constructor(conversationFlow: ConversationFlowController, responseRouter: ResponseRouter, settings?: Partial<ConversationSettings>);
    /**
     * Start a new conversation session for a user
     */
    startSession(userId: string): Promise<ConversationSession>;
    /**
     * End a conversation session and clean up resources
     */
    endSession(sessionId: string): Promise<void>;
    /**
     * Process a user message and generate an appropriate response
     * Ensures 5-second response time requirement with emotional tone analysis
     */
    processMessage(sessionId: string, userMessage: string): Promise<string>;
    /**
     * Get current session context
     */
    getSessionContext(sessionId: string): Promise<ConversationSession | null>;
    /**
     * Update emotional context for a session
     */
    updateEmotionalContext(sessionId: string, emotionalState: EmotionalState): Promise<void>;
    /**
     * Get active session count for monitoring
     */
    getActiveSessionCount(): number;
    /**
     * Get average response time for performance monitoring
     */
    getAverageResponseTime(): number;
    /**
     * Generate welcome message based on time of day and context
     */
    private generateWelcomeMessage;
    /**
     * Generate farewell message based on conversation context
     */
    private generateFarewellMessage;
    /**
     * Trim conversation history to maintain performance
     */
    private trimConversationHistory;
    /**
     * Determine emotional tone for response based on context
     */
    private determineEmotionalTone;
    /**
     * Create timeout promise for response time enforcement
     */
    private createTimeoutPromise;
    /**
     * Generate graceful error response
     */
    private generateErrorResponse;
}
//# sourceMappingURL=conversation-manager.d.ts.map