import { ConversationFlow, ResponseType } from './interfaces';
import { ConversationSession, Message } from '../types';
import { AdvancedCrisisDetector } from '../crisis';
/**
 * Controls conversation flow with empathetic response routing
 * and topic guidance to prevent repetitive discussions
 */
export declare class ConversationFlowController implements ConversationFlow {
    private readonly REPETITIVE_THRESHOLD;
    private crisisDetector;
    private readonly DISTRESS_KEYWORDS;
    constructor(crisisDetector?: AdvancedCrisisDetector);
    /**
     * Determine the appropriate response type based on message content and context
     */
    determineResponseType(message: string, context: ConversationSession): ResponseType;
    /**
     * Check if topic guidance is needed to prevent repetitive discussions
     */
    shouldGuideTopic(conversationHistory: Message[]): boolean;
    /**
     * Generate a topic suggestion to guide conversation in new directions
     */
    generateTopicSuggestion(context: ConversationSession): string;
    /**
     * Basic crisis keyword detection as fallback
     */
    private containsBasicCrisisKeywords;
    /**
     * Get crisis detector for external access
     */
    getCrisisDetector(): AdvancedCrisisDetector;
    /**
     * Check if message contains distress-related keywords
     */
    private containsDistressKeywords;
    /**
     * Detect emotional distress from conversation context
     */
    private detectEmotionalDistress;
    /**
     * Check if message is unclear and needs clarification
     */
    private isUnclearMessage;
    /**
     * Determine if a follow-up question would be appropriate
     */
    private shouldAskFollowUp;
    /**
     * Extract main topic from a message for repetition detection
     */
    private extractTopic;
    /**
     * Count occurrences of each topic
     */
    private countTopics;
}
//# sourceMappingURL=conversation-flow.d.ts.map