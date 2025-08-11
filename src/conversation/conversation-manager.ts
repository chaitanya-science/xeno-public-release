import { ConversationManager, ConversationContext, ConversationSettings, ResponseType } from './interfaces';
import { ConversationSession, Message, Speaker, EmotionalState, PrivacyLevel } from '../types';
import { ConversationFlowController } from './conversation-flow';
import { ResponseRouter } from './response-router';
import { v4 as uuidv4 } from 'uuid';

/**
 * Core conversation manager that handles session management, context preservation,
 * and response routing with empathetic conversation flow
 */
export class CoreConversationManager implements ConversationManager {
  private activeSessions: Map<string, ConversationContext> = new Map();
  private conversationFlow: ConversationFlowController;
  private responseRouter: ResponseRouter;
  private settings: ConversationSettings;

  // Performance tracking for 5-second response requirement
  private responseTimeTracker: Map<string, number> = new Map();
  private readonly MAX_RESPONSE_TIME_MS = 5000; // 5 seconds as per requirement

  constructor(
    conversationFlow: ConversationFlowController,
    responseRouter: ResponseRouter,
    settings?: Partial<ConversationSettings>
  ) {
    this.conversationFlow = conversationFlow;
    this.responseRouter = responseRouter;
    this.settings = {
      maxSessionDuration: 120, // 2 hours default
      maxHistoryLength: 50, // Keep last 50 messages
      responseTimeoutMs: 4500, // Leave 500ms buffer for processing
      topicGuidanceThreshold: 5, // Guide after 5 repetitive exchanges
      privacyLevel: PrivacyLevel.MEDIUM,
      ...settings
    };
  }

  /**
   * Start a new conversation session for a user
   */
  async startSession(userId: string): Promise<ConversationSession> {
    const sessionId = uuidv4();
    const startTime = new Date();

    // Create initial emotional state
    const initialEmotionalState: EmotionalState = {
      valence: 0, // Neutral
      arousal: 0.3, // Slightly alert for conversation
      dominant_emotion: 'neutral',
      confidence: 0.8
    };

    // Create conversation session
    const session: ConversationSession = {
      session_id: sessionId,
      user_id: userId,
      start_time: startTime,
      conversation_history: [],
      emotional_context: initialEmotionalState,
      privacy_level: this.settings.privacyLevel
    };

    // Create conversation context for internal tracking
    const context: ConversationContext = {
      sessionId,
      userId,
      emotionalState: initialEmotionalState,
      conversationHistory: [],
      lastInteractionTime: startTime,
      responseCount: 0
    };

    this.activeSessions.set(sessionId, context);

    // Add welcome message to history
    const welcomeMessage: Message = {
      message_id: uuidv4(),
      timestamp: startTime,
      speaker: Speaker.COMPANION,
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
  async endSession(sessionId: string): Promise<void> {
    const context = this.activeSessions.get(sessionId);
    if (!context) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Add farewell message
    const farewellMessage: Message = {
      message_id: uuidv4(),
      timestamp: new Date(),
      speaker: Speaker.COMPANION,
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
  async processMessage(sessionId: string, userMessage: string): Promise<string> {
    const startTime = Date.now();
    this.responseTimeTracker.set(sessionId, startTime);

    try {
      const context = this.activeSessions.get(sessionId);
      if (!context) {
        throw new Error(`Session ${sessionId} not found`);
      }

      // Analyze emotional tone of user message
      let emotionalTone: string | undefined;
      try {
        const emotionalState = await this.responseRouter.analyzeEmotionalTone(userMessage);
        emotionalTone = emotionalState.dominant_emotion;
        
        // Update session emotional context
        context.emotionalState = emotionalState;
      } catch (error) {
        console.warn('Failed to analyze emotional tone:', error);
        emotionalTone = 'neutral';
      }

      // Add user message to history with emotional tone
      const userMsg: Message = {
        message_id: uuidv4(),
        timestamp: new Date(),
        speaker: Speaker.USER,
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
      const session: ConversationSession = {
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
      const companionMsg: Message = {
        message_id: uuidv4(),
        timestamp: new Date(),
        speaker: Speaker.COMPANION,
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

    } catch (error) {
      const responseTime = Date.now() - startTime;
      console.error(`Error processing message in session ${sessionId} (${responseTime}ms):`, error);
      
      // Return graceful error response
      return this.generateErrorResponse(error);
    } finally {
      this.responseTimeTracker.delete(sessionId);
    }
  }

  /**
   * Get current session context
   */
  async getSessionContext(sessionId: string): Promise<ConversationSession | null> {
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
  async updateEmotionalContext(sessionId: string, emotionalState: EmotionalState): Promise<void> {
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
  getActiveSessionCount(): number {
    return this.activeSessions.size;
  }

  /**
   * Get average response time for performance monitoring
   */
  getAverageResponseTime(): number {
    // This would be implemented with proper metrics collection
    return 0; // Placeholder
  }

  /**
   * Generate welcome message based on time of day and context
   */
  private generateWelcomeMessage(): string {
    const hour = new Date().getHours();
    let greeting: string;

    if (hour < 12) {
      greeting = "Good morning";
    } else if (hour < 17) {
      greeting = "Good afternoon";
    } else {
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
  private generateFarewellMessage(context: ConversationContext): string {
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
  private trimConversationHistory(context: ConversationContext): void {
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
  private determineEmotionalTone(responseType: ResponseType, emotionalState: EmotionalState): string {
    switch (responseType) {
      case ResponseType.EMPATHETIC_SUPPORT:
        return emotionalState.valence < -0.3 ? 'compassionate' : 'warm';
      case ResponseType.CRISIS_RESPONSE:
        return 'calm';
      case ResponseType.FOLLOW_UP_QUESTION:
        return 'curious';
      case ResponseType.TOPIC_GUIDANCE:
        return 'gentle';
      default:
        return 'warm';
    }
  }

  /**
   * Create timeout promise for response time enforcement
   */
  private createTimeoutPromise(): Promise<string> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('Response timeout exceeded'));
      }, this.settings.responseTimeoutMs);
    });
  }

  /**
   * Generate graceful error response
   */
  private generateErrorResponse(error: any): string {
    if (error.message?.includes('timeout')) {
      return "I'm taking a moment to think about what you've shared. Could you give me just a second more?";
    }
    
    return "I'm having a small technical moment. Could you please repeat what you said?";
  }
}