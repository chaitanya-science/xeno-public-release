// Conversation management interfaces

import { Message, ConversationSession, UserProfile, EmotionalState, PrivacyLevel } from '../types';

export interface ConversationManager {
  startSession(userId: string): Promise<ConversationSession>;
  endSession(sessionId: string): Promise<void>;
  processMessage(sessionId: string, userMessage: string): Promise<string>;
  getSessionContext(sessionId: string): Promise<ConversationSession | null>;
  updateEmotionalContext(sessionId: string, emotionalState: EmotionalState): Promise<void>;
}

export interface ConversationFlow {
  determineResponseType(message: string, context: ConversationSession): ResponseType;
  shouldGuideTopic(conversationHistory: Message[]): boolean;
  generateTopicSuggestion(context: ConversationSession): string;
}

export interface ResponseRouter {
  routeResponse(
    message: string, 
    context: ConversationSession, 
    responseType: ResponseType
  ): Promise<string>;
}

export interface ConversationContext {
  sessionId: string;
  userId: string;
  currentTopic?: string;
  emotionalState: EmotionalState;
  conversationHistory: Message[];
  lastInteractionTime: Date;
  responseCount: number;
}

export enum ResponseType {
  EMPATHETIC_SUPPORT = 'EMPATHETIC_SUPPORT',
  FOLLOW_UP_QUESTION = 'FOLLOW_UP_QUESTION',
  TOPIC_GUIDANCE = 'TOPIC_GUIDANCE',
  CRISIS_RESPONSE = 'CRISIS_RESPONSE',
  CLARIFICATION_REQUEST = 'CLARIFICATION_REQUEST',
  GENERAL_CONVERSATION = 'GENERAL_CONVERSATION'
}

export interface ConversationMetrics {
  sessionDuration: number;
  messageCount: number;
  averageResponseTime: number;
  topicChanges: number;
  emotionalStateChanges: number;
}

export interface ConversationSettings {
  maxSessionDuration: number; // in minutes
  maxHistoryLength: number; // number of messages to keep in context
  responseTimeoutMs: number; // maximum time to generate response
  topicGuidanceThreshold: number; // number of repetitive exchanges before guidance
  privacyLevel: PrivacyLevel;
}