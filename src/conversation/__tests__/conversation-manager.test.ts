import { CoreConversationManager } from '../conversation-manager';
import { ConversationFlowController } from '../conversation-flow';
import { ResponseRouter } from '../response-router';
import { ResponseType } from '../interfaces';
import { Speaker, PrivacyLevel } from '../../types';

// Mock dependencies
jest.mock('../conversation-flow');
jest.mock('../response-router');

describe('CoreConversationManager', () => {
  let conversationManager: CoreConversationManager;
  let mockConversationFlow: jest.Mocked<ConversationFlowController>;
  let mockResponseRouter: jest.Mocked<ResponseRouter>;

  beforeEach(() => {
    // Create mocks
    mockConversationFlow = {
      determineResponseType: jest.fn(),
      shouldGuideTopic: jest.fn(),
      generateTopicSuggestion: jest.fn(),
    } as any;

    mockResponseRouter = {
      routeResponse: jest.fn(),
    } as any;

    // Create conversation manager instance
    conversationManager = new CoreConversationManager(
      mockConversationFlow,
      mockResponseRouter,
      {
        maxSessionDuration: 60,
        maxHistoryLength: 10,
        responseTimeoutMs: 3000,
        topicGuidanceThreshold: 3,
        privacyLevel: PrivacyLevel.MEDIUM
      }
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('session management', () => {
    it('should start a new session successfully', async () => {
      const userId = 'user-123';
      const session = await conversationManager.startSession(userId);

      expect(session.session_id).toBeDefined();
      expect(session.user_id).toBe(userId);
      expect(session.start_time).toBeInstanceOf(Date);
      expect(session.conversation_history).toHaveLength(1);
      expect(session.conversation_history[0].speaker).toBe(Speaker.COMPANION);
      expect(session.conversation_history[0].content).toContain('Good');
      expect(session.emotional_context).toBeDefined();
      expect(session.privacy_level).toBe(PrivacyLevel.MEDIUM);
    });

    it('should generate appropriate welcome message based on time of day', async () => {
      const userId = 'user-123';
      
      // Test morning greeting
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(9);
      const morningSession = await conversationManager.startSession(userId);
      expect(morningSession.conversation_history[0].content).toContain('Good morning');
      
      // Test afternoon greeting
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(14);
      const afternoonSession = await conversationManager.startSession(userId + '2');
      expect(afternoonSession.conversation_history[0].content).toContain('Good afternoon');
      
      // Test evening greeting
      jest.spyOn(Date.prototype, 'getHours').mockReturnValue(19);
      const eveningSession = await conversationManager.startSession(userId + '3');
      expect(eveningSession.conversation_history[0].content).toContain('Good evening');
      
      // Restore original implementation
      jest.restoreAllMocks();
    });

    it('should end session successfully', async () => {
      const userId = 'user-123';
      const session = await conversationManager.startSession(userId);
      
      await expect(conversationManager.endSession(session.session_id)).resolves.not.toThrow();
      
      // Session should no longer be accessible
      const context = await conversationManager.getSessionContext(session.session_id);
      expect(context).toBeNull();
    });

    it('should throw error when ending non-existent session', async () => {
      await expect(conversationManager.endSession('non-existent-session'))
        .rejects.toThrow('Session non-existent-session not found');
    });
  });

  describe('message processing', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await conversationManager.startSession('user-123');
      sessionId = session.session_id;
    });

    it('should process user message and generate response', async () => {
      const userMessage = 'I am feeling sad today';
      const expectedResponse = 'I understand you\'re feeling sad. Can you tell me more about what\'s troubling you?';

      mockConversationFlow.determineResponseType.mockReturnValue(ResponseType.EMPATHETIC_SUPPORT);
      mockResponseRouter.routeResponse.mockResolvedValue(expectedResponse);

      const response = await conversationManager.processMessage(sessionId, userMessage);

      expect(response).toBe(expectedResponse);
      expect(mockConversationFlow.determineResponseType).toHaveBeenCalledWith(
        userMessage,
        expect.objectContaining({
          session_id: sessionId,
          user_id: 'user-123'
        })
      );
      expect(mockResponseRouter.routeResponse).toHaveBeenCalledWith(
        userMessage,
        expect.any(Object),
        ResponseType.EMPATHETIC_SUPPORT
      );
    });

    it('should add messages to conversation history', async () => {
      const userMessage = 'Hello, how are you?';
      mockConversationFlow.determineResponseType.mockReturnValue(ResponseType.GENERAL_CONVERSATION);
      mockResponseRouter.routeResponse.mockResolvedValue('I\'m doing well, thank you for asking!');

      await conversationManager.processMessage(sessionId, userMessage);

      const context = await conversationManager.getSessionContext(sessionId);
      expect(context?.conversation_history).toHaveLength(3); // Welcome + User + Companion
      
      const userMsg = context?.conversation_history[1];
      expect(userMsg?.speaker).toBe(Speaker.USER);
      expect(userMsg?.content).toBe(userMessage);
      
      const companionMsg = context?.conversation_history[2];
      expect(companionMsg?.speaker).toBe(Speaker.COMPANION);
      expect(companionMsg?.content).toBe('I\'m doing well, thank you for asking!');
    });

    it('should handle response timeout gracefully', async () => {
      const userMessage = 'This should timeout';
      
      mockConversationFlow.determineResponseType.mockReturnValue(ResponseType.GENERAL_CONVERSATION);
      mockResponseRouter.routeResponse.mockImplementation(() => 
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)) // Longer than timeout
      );

      const response = await conversationManager.processMessage(sessionId, userMessage);
      
      expect(response).toContain('taking a moment to think');
    });

    it('should meet 5-second response time requirement', async () => {
      const userMessage = 'Quick response test';
      mockConversationFlow.determineResponseType.mockReturnValue(ResponseType.GENERAL_CONVERSATION);
      mockResponseRouter.routeResponse.mockResolvedValue('Quick response');

      const startTime = Date.now();
      await conversationManager.processMessage(sessionId, userMessage);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // 5 second requirement
    });

    it('should trim conversation history when it gets too long', async () => {
      // Set up manager with small history limit
      const smallHistoryManager = new CoreConversationManager(
        mockConversationFlow,
        mockResponseRouter,
        { maxHistoryLength: 3 }
      );

      const session = await smallHistoryManager.startSession('user-123');
      mockConversationFlow.determineResponseType.mockReturnValue(ResponseType.GENERAL_CONVERSATION);
      mockResponseRouter.routeResponse.mockResolvedValue('Response');

      // Add multiple messages to exceed limit
      for (let i = 0; i < 3; i++) {
        await smallHistoryManager.processMessage(session.session_id, `Message ${i}`);
      }

      const context = await smallHistoryManager.getSessionContext(session.session_id);
      expect(context?.conversation_history.length).toBeLessThanOrEqual(4); // Welcome + 3 messages max
      
      // Should preserve welcome message
      expect(context?.conversation_history[0].content).toContain('Good');
    });

    it('should handle non-existent session gracefully', async () => {
      const response = await conversationManager.processMessage('non-existent', 'test');
      expect(response).toContain('technical moment');
    });
  });

  describe('emotional context management', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await conversationManager.startSession('user-123');
      sessionId = session.session_id;
    });

    it('should update emotional context successfully', async () => {
      const newEmotionalState = {
        valence: -0.7,
        arousal: 0.8,
        dominant_emotion: 'distressed',
        confidence: 0.9
      };

      await conversationManager.updateEmotionalContext(sessionId, newEmotionalState);

      const context = await conversationManager.getSessionContext(sessionId);
      expect(context?.emotional_context).toEqual(newEmotionalState);
    });

    it('should throw error when updating non-existent session', async () => {
      const emotionalState = {
        valence: 0,
        arousal: 0,
        dominant_emotion: 'neutral',
        confidence: 0.8
      };

      await expect(conversationManager.updateEmotionalContext('non-existent', emotionalState))
        .rejects.toThrow('Session non-existent not found');
    });
  });

  describe('session context retrieval', () => {
    it('should return session context for existing session', async () => {
      const session = await conversationManager.startSession('user-123');
      const context = await conversationManager.getSessionContext(session.session_id);

      expect(context).not.toBeNull();
      expect(context?.session_id).toBe(session.session_id);
      expect(context?.user_id).toBe('user-123');
      expect(context?.conversation_history).toEqual(session.conversation_history);
    });

    it('should return null for non-existent session', async () => {
      const context = await conversationManager.getSessionContext('non-existent');
      expect(context).toBeNull();
    });
  });

  describe('performance monitoring', () => {
    it('should track active session count', async () => {
      expect(conversationManager.getActiveSessionCount()).toBe(0);

      const session1 = await conversationManager.startSession('user-1');
      expect(conversationManager.getActiveSessionCount()).toBe(1);

      const session2 = await conversationManager.startSession('user-2');
      expect(conversationManager.getActiveSessionCount()).toBe(2);

      await conversationManager.endSession(session1.session_id);
      expect(conversationManager.getActiveSessionCount()).toBe(1);

      await conversationManager.endSession(session2.session_id);
      expect(conversationManager.getActiveSessionCount()).toBe(0);
    });

    it('should provide average response time', () => {
      // This is a placeholder test - in a real implementation,
      // this would test actual response time tracking
      const avgTime = conversationManager.getAverageResponseTime();
      expect(typeof avgTime).toBe('number');
    });
  });

  describe('error handling', () => {
    let sessionId: string;

    beforeEach(async () => {
      const session = await conversationManager.startSession('user-123');
      sessionId = session.session_id;
    });

    it('should handle router errors gracefully', async () => {
      mockConversationFlow.determineResponseType.mockReturnValue(ResponseType.GENERAL_CONVERSATION);
      mockResponseRouter.routeResponse.mockRejectedValue(new Error('Router error'));

      const response = await conversationManager.processMessage(sessionId, 'test message');
      
      expect(response).toContain('technical moment');
    });

    it('should handle flow controller errors gracefully', async () => {
      mockConversationFlow.determineResponseType.mockImplementation(() => {
        throw new Error('Flow error');
      });

      const response = await conversationManager.processMessage(sessionId, 'test message');
      
      expect(response).toContain('technical moment');
    });
  });
});