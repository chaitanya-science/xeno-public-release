import { ConversationSession, EmotionalState } from '../types';
import { ResponseType } from './interfaces';
export interface AIService {
    generateResponse(message: string, context: ConversationSession, responseType: ResponseType): Promise<string>;
    analyzeEmotionalTone(message: string): Promise<EmotionalState>;
}
export interface ConversationAIConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    baseUrl?: string;
    timeout?: number;
}
export type AIServiceConfig = ConversationAIConfig;
export interface TherapeuticPromptConfig {
    systemPrompts: Record<ResponseType, string>;
    emotionalAdaptation: boolean;
    contextWindow: number;
    empathyLevel: 'moderate' | 'high' | 'very_high';
}
/**
 * AI service for generating therapeutic responses using OpenAI GPT-5
 * Provides empathetic, contextual responses based on conversation context
 * Implements therapeutic system prompts and emotional tone adaptation
 */
export declare class OpenAIService implements AIService {
    private config;
    private therapeuticConfig;
    private baseUrl;
    private secureFetch;
    constructor(config: ConversationAIConfig, therapeuticConfig?: Partial<TherapeuticPromptConfig>);
    /**
     * Generate contextual response using AI model with therapeutic prompts
     * Adapts response based on emotional state and conversation context
     * Implements caching and performance optimization
     */
    generateResponse(message: string, context: ConversationSession, responseType: ResponseType): Promise<string>;
    /**
     * Analyze emotional tone of user message with enhanced accuracy
     * Uses specialized prompts for therapeutic context
     */
    analyzeEmotionalTone(message: string): Promise<EmotionalState>;
    /**
     * Get default therapeutic system prompts for each response type
     */
    private getDefaultSystemPrompts;
    /**
     * Build therapeutic system prompt adapted to emotional context
     */
    private buildTherapeuticSystemPrompt;
    /**
     * Build emotional adaptation instructions based on user's emotional state
     */
    private buildEmotionalAdaptation;
    /**
     * Build empathy level adjustments
     */
    private buildEmpathyAdjustment;
    /**
     * Build adapted prompt based on context and response type
     */
    private buildAdaptedPrompt;
    /**
     * Build conversation context from session history
     */
    private buildConversationContext;
    /**
     * Build emotional context description
     */
    private buildEmotionalContext;
    /**
     * Build conversation messages for API context
     */
    private buildConversationMessages;
    /**
     * Get adapted temperature based on response type and emotional state
     */
    private getAdaptedTemperature;
    /**
     * Validate and clean AI response for appropriateness
     */
    private validateAndCleanResponse;
    /**
     * Get fallback response when AI service fails
     */
    private getFallbackResponse;
    /**
     * Validate emotional state analysis results
     */
    private validateEmotionalState;
    /**
     * Enhanced sentiment analysis with therapeutic context
     */
    private enhancedSentimentAnalysis;
    /**
     * Build system prompt based on response type (legacy method for compatibility)
     */
    private buildSystemPrompt;
    /**
     * Basic sentiment analysis fallback (legacy method)
     */
    private basicSentimentAnalysis;
}
/**
 * Factory function to create OpenAI service with secure configuration
 */
export declare function createOpenAIService(apiKey: string, options?: {
    model?: string;
    maxTokens?: number;
    temperature?: number;
    baseUrl?: string;
    timeout?: number;
    empathyLevel?: 'moderate' | 'high' | 'very_high';
    emotionalAdaptation?: boolean;
}): OpenAIService;
/**
 * Validate API key format (basic validation)
 */
export declare function validateOpenAIApiKey(apiKey: string): boolean;
//# sourceMappingURL=ai-service.d.ts.map