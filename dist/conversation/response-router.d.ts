import { ResponseRouter as IResponseRouter, ResponseType } from './interfaces';
import { ConversationSession } from '../types';
import { ConversationFlowController } from './conversation-flow';
import { AIService } from './ai-service';
/**
 * Routes responses based on conversation context and response type
 * Provides empathetic, contextual responses for different situations
 * Integrates with AI service for dynamic response generation
 */
export declare class ResponseRouter implements IResponseRouter {
    private conversationFlow;
    private aiService?;
    private resourceProvider;
    constructor(conversationFlow: ConversationFlowController, aiService?: AIService);
    /**
     * Route response based on message content, context, and determined response type
     * Uses AI service for dynamic response generation when available
     */
    routeResponse(message: string, context: ConversationSession, responseType: ResponseType): Promise<string>;
    /**
     * Generate comprehensive crisis response with appropriate resources and support
     */
    private generateCrisisResponse;
    /**
     * Generate basic crisis response as fallback
     */
    private generateBasicCrisisResponse;
    /**
     * Generate empathetic support response
     */
    private generateEmpatheticResponse;
    /**
     * Generate thoughtful follow-up questions
     */
    private generateFollowUpQuestion;
    /**
     * Generate clarification requests for unclear messages
     */
    private generateClarificationRequest;
    /**
     * Generate general conversational responses
     */
    private generateGeneralResponse;
    /**
     * Check for self-harm related keywords
     */
    private containsSelfHarmKeywords;
    /**
     * Check for medical emergency keywords
     */
    private containsMedicalEmergencyKeywords;
    /**
     * Check for positive keywords
     */
    private containsPositiveKeywords;
    /**
     * Analyze emotional tone of user message using AI service
     */
    analyzeEmotionalTone(message: string): Promise<import("../types").EmotionalState>;
    /**
     * Basic emotional analysis fallback
     */
    private basicEmotionalAnalysis;
}
//# sourceMappingURL=response-router.d.ts.map