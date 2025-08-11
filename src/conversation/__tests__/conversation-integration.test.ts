import { CoreConversationManager } from '../conversation-manager';
import { ConversationFlowController } from '../conversation-flow';
import { ResponseRouter } from '../response-router';
import { ResponseType } from '../interfaces';
import { PrivacyLevel } from '../../types';

describe('Conversation System Integration', () => {
  let conversationManager: CoreConversationManager;
  let flowController: ConversationFlowController;
  let responseRouter: ResponseRouter;

  beforeEach(() => {
    flowController = new ConversationFlowController();
    responseRouter = new ResponseRouter(flowController);
    conversationManager = new CoreConversationManager(
      flowController,
      responseRouter,
      {
        maxSessionDuration: 60,
        maxHistoryLength: 20,
        responseTimeoutMs: 4000,
        topicGuidanceThreshold: 3,
        privacyLevel: PrivacyLevel.MEDIUM
      }
    );
  });

  describe('end-to-end conversation flow', () => {
    it('should handle a complete conversation from start to finish', async () => {
      // Start session
      const session = await conversationManager.startSession('integration-user');
      expect(session.conversation_history).toHaveLength(1);
      expect(session.conversation_history[0].content).toContain('Good');

      // User expresses sadness
      const sadResponse = await conversationManager.processMessage(
        session.session_id,
        'I am feeling really sad today'
      );
      expect(sadResponse).toBeTruthy();
      expect(sadResponse.length).toBeGreaterThan(0);

      // User shares more details
      const detailResponse = await conversationManager.processMessage(
        session.session_id,
        'My dog passed away yesterday and I miss him so much'
      );
      expect(detailResponse).toBeTruthy();

      // User asks for support
      const supportResponse = await conversationManager.processMessage(
        session.session_id,
        'How do I cope with this loss?'
      );
      expect(supportResponse).toBeTruthy();

      // Check conversation history
      const context = await conversationManager.getSessionContext(session.session_id);
      expect(context?.conversation_history.length).toBe(7); // Welcome + 3 user + 3 companion

      // End session
      await conversationManager.endSession(session.session_id);
      expect(conversationManager.getActiveSessionCount()).toBe(0);
    });

    it('should handle crisis situations appropriately', async () => {
      const session = await conversationManager.startSession('crisis-user');

      const crisisResponse = await conversationManager.processMessage(
        session.session_id,
        'I am thinking about ending my life'
      );

      expect(crisisResponse).toContain('concerned');
      expect(crisisResponse).toContain('988');
      expect(crisisResponse).toContain('safe place');

      await conversationManager.endSession(session.session_id);
    });

    it('should provide topic guidance for repetitive conversations', async () => {
      const session = await conversationManager.startSession('repetitive-user');

      // Simulate repetitive conversation about work
      for (let i = 0; i < 6; i++) {
        await conversationManager.processMessage(
          session.session_id,
          `I hate my job so much, it's terrible ${i}`
        );
      }

      // Next message should trigger topic guidance
      const guidanceResponse = await conversationManager.processMessage(
        session.session_id,
        'My work is still awful'
      );

      expect(guidanceResponse).toMatch(/noticed|focusing|shift|different|explore/i);

      await conversationManager.endSession(session.session_id);
    });

    it('should maintain emotional context throughout conversation', async () => {
      const session = await conversationManager.startSession('emotional-user');

      // Update emotional state to distressed
      await conversationManager.updateEmotionalContext(session.session_id, {
        valence: -0.8,
        arousal: 0.9,
        dominant_emotion: 'distressed',
        confidence: 0.9
      });

      const response = await conversationManager.processMessage(
        session.session_id,
        'I had a difficult day'
      );

      // Should provide empathetic support due to emotional context
      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);

      const context = await conversationManager.getSessionContext(session.session_id);
      expect(context?.emotional_context.valence).toBe(-0.8);

      await conversationManager.endSession(session.session_id);
    });

    it('should handle multiple concurrent sessions', async () => {
      const session1 = await conversationManager.startSession('user-1');
      const session2 = await conversationManager.startSession('user-2');
      const session3 = await conversationManager.startSession('user-3');

      expect(conversationManager.getActiveSessionCount()).toBe(3);

      // Process messages in different sessions
      const response1 = await conversationManager.processMessage(session1.session_id, 'Hello from user 1');
      const response2 = await conversationManager.processMessage(session2.session_id, 'Hello from user 2');
      const response3 = await conversationManager.processMessage(session3.session_id, 'Hello from user 3');

      expect(response1).toBeTruthy();
      expect(response2).toBeTruthy();
      expect(response3).toBeTruthy();

      // Verify sessions are independent
      const context1 = await conversationManager.getSessionContext(session1.session_id);
      const context2 = await conversationManager.getSessionContext(session2.session_id);
      
      expect(context1?.user_id).toBe('user-1');
      expect(context2?.user_id).toBe('user-2');

      // Clean up
      await conversationManager.endSession(session1.session_id);
      await conversationManager.endSession(session2.session_id);
      await conversationManager.endSession(session3.session_id);

      expect(conversationManager.getActiveSessionCount()).toBe(0);
    });
  });

  describe('response time requirements', () => {
    it('should consistently meet 5-second response time requirement', async () => {
      const session = await conversationManager.startSession('timing-user');
      const testMessages = [
        'How are you today?',
        'I feel anxious about my presentation',
        'Can you help me feel better?',
        'What should I do about my stress?',
        'Thank you for listening'
      ];

      for (const message of testMessages) {
        const startTime = Date.now();
        const response = await conversationManager.processMessage(session.session_id, message);
        const responseTime = Date.now() - startTime;

        expect(response).toBeTruthy();
        expect(responseTime).toBeLessThan(5000); // 5 second requirement
      }

      await conversationManager.endSession(session.session_id);
    });
  });

  describe('conversation quality', () => {
    it('should provide contextually appropriate responses', async () => {
      const session = await conversationManager.startSession('quality-user');

      // Test empathetic response to distress
      const distressResponse = await conversationManager.processMessage(
        session.session_id,
        'I feel overwhelmed and don\'t know what to do'
      );
      expect(distressResponse).toMatch(/hear|understand|difficult|support|listen/i);

      // Test follow-up question for explorable content
      const explorableResponse = await conversationManager.processMessage(
        session.session_id,
        'I remember when things were better'
      );
      expect(explorableResponse).toMatch(/tell me more|what|how|when|remember/i);

      // Test clarification for unclear message
      const clarificationResponse = await conversationManager.processMessage(
        session.session_id,
        'um well like'
      );
      expect(clarificationResponse).toMatch(/understand|help me|tell me|repeat/i);

      await conversationManager.endSession(session.session_id);
    });

    it('should maintain conversational flow and context', async () => {
      const session = await conversationManager.startSession('flow-user');

      // Build conversation context
      await conversationManager.processMessage(session.session_id, 'I lost my job last week');
      await conversationManager.processMessage(session.session_id, 'I\'m worried about paying rent');
      
      const contextualResponse = await conversationManager.processMessage(
        session.session_id,
        'What should I do next?'
      );

      expect(contextualResponse).toBeTruthy();
      expect(contextualResponse.length).toBeGreaterThan(10);

      // Verify conversation history is maintained
      const context = await conversationManager.getSessionContext(session.session_id);
      expect(context?.conversation_history.length).toBeGreaterThan(3);

      await conversationManager.endSession(session.session_id);
    });
  });

  describe('error resilience', () => {
    it('should gracefully handle and recover from errors', async () => {
      const session = await conversationManager.startSession('error-user');

      // This should work normally
      const normalResponse = await conversationManager.processMessage(
        session.session_id,
        'Hello, how are you?'
      );
      expect(normalResponse).toBeTruthy();

      // System should continue working after errors
      const recoveryResponse = await conversationManager.processMessage(
        session.session_id,
        'I hope you\'re doing well'
      );
      expect(recoveryResponse).toBeTruthy();

      await conversationManager.endSession(session.session_id);
    });
  });
});