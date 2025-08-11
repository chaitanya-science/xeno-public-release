import { AdvancedCrisisDetector } from '../crisis-detector';
import { ComprehensiveCrisisResourceProvider } from '../resource-provider';
import { ConversationFlowController } from '../../conversation/conversation-flow';
import { ResponseRouter } from '../../conversation/response-router';
import { CrisisType } from '../interfaces';
import { ResponseType } from '../../conversation/interfaces';
import { ConversationSession, Speaker, EmotionalState, PrivacyLevel } from '../../types';

describe('Crisis Detection Integration', () => {
  let crisisDetector: AdvancedCrisisDetector;
  let resourceProvider: ComprehensiveCrisisResourceProvider;
  let conversationFlow: ConversationFlowController;
  let responseRouter: ResponseRouter;

  beforeEach(() => {
    crisisDetector = new AdvancedCrisisDetector();
    resourceProvider = new ComprehensiveCrisisResourceProvider();
    conversationFlow = new ConversationFlowController(crisisDetector);
    responseRouter = new ResponseRouter(conversationFlow);
  });

  describe('End-to-end crisis detection flow', () => {
    it('should detect crisis and provide appropriate resources', async () => {
      const crisisMessage = 'I want to kill myself';
      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: -0.8,
          arousal: 0.9,
          dominant_emotion: 'despair',
          confidence: 0.8
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      // Test crisis detection
      const responseType = await conversationFlow.determineResponseType(crisisMessage, mockSession);
      expect(responseType).toBe(ResponseType.CRISIS_RESPONSE);

      // Test resource provision
      const response = await responseRouter.routeResponse(crisisMessage, mockSession, responseType);
      
      expect(response).toContain('concerned about you');
      expect(response).toContain('988'); // Suicide prevention lifeline
      expect(response).toContain('24/7');
      expect(response).toContain('don\'t have to go through this alone');
    });

    it('should handle medical emergencies appropriately', async () => {
      const emergencyMessage = 'I am having chest pain and cannot breathe';
      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: -0.6,
          arousal: 0.9,
          dominant_emotion: 'panic',
          confidence: 0.9
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      const responseType = await conversationFlow.determineResponseType(emergencyMessage, mockSession);
      expect(responseType).toBe(ResponseType.CRISIS_RESPONSE);

      const response = await responseRouter.routeResponse(emergencyMessage, mockSession, responseType);
      
      expect(response).toContain('medical emergency');
      expect(response).toContain('911');
      expect(response).toContain('could be a medical emergency');
    });

    it('should detect severe distress and provide mental health resources', async () => {
      const distressMessage = 'I feel completely hopeless and overwhelmed';
      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: -0.7,
          arousal: 0.6,
          dominant_emotion: 'despair',
          confidence: 0.7
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      const responseType = await conversationFlow.determineResponseType(distressMessage, mockSession);
      expect(responseType).toBe(ResponseType.EMPATHETIC_SUPPORT);

      const response = await responseRouter.routeResponse(distressMessage, mockSession, responseType);
      
      expect(response.length).toBeGreaterThan(10);
      expect(response).toMatch(/difficult|pain|overwhelming|here|support/i);
    });
  });

  describe('Pattern recognition integration', () => {
    it('should detect escalating distress patterns across conversation', async () => {
      const conversationHistory = [
        { message_id: '1', timestamp: new Date(), speaker: Speaker.USER, content: 'I feel a bit sad', confidence_score: 1.0 },
        { message_id: '2', timestamp: new Date(), speaker: Speaker.COMPANION, content: 'I hear you', confidence_score: 1.0 },
        { message_id: '3', timestamp: new Date(), speaker: Speaker.USER, content: 'I am feeling really down', confidence_score: 1.0 },
        { message_id: '4', timestamp: new Date(), speaker: Speaker.COMPANION, content: 'Tell me more', confidence_score: 1.0 },
        { message_id: '5', timestamp: new Date(), speaker: Speaker.USER, content: 'I feel hopeless and worthless', confidence_score: 1.0 }
      ];

      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: conversationHistory,
        emotional_context: {
          valence: -0.8,
          arousal: 0.7,
          dominant_emotion: 'despair',
          confidence: 0.8
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      const currentMessage = 'I feel hopeless and cannot take this anymore';
      const responseType = await conversationFlow.determineResponseType(currentMessage, mockSession);
      
      expect(responseType).toBe(ResponseType.EMPATHETIC_SUPPORT);
    });

    it('should detect repeated distress themes', async () => {
      const conversationHistory = [
        { message_id: '1', timestamp: new Date(), speaker: Speaker.USER, content: 'I feel so alone', confidence_score: 1.0 },
        { message_id: '2', timestamp: new Date(), speaker: Speaker.USER, content: 'Nobody understands me', confidence_score: 1.0 },
        { message_id: '3', timestamp: new Date(), speaker: Speaker.USER, content: 'I am always by myself', confidence_score: 1.0 },
        { message_id: '4', timestamp: new Date(), speaker: Speaker.USER, content: 'I feel isolated', confidence_score: 1.0 }
      ];

      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: conversationHistory,
        emotional_context: {
          valence: -0.6,
          arousal: 0.5,
          dominant_emotion: 'loneliness',
          confidence: 0.7
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      const currentMessage = 'I feel alone again today';
      const analysis = await crisisDetector.analyzeCrisis(
        currentMessage, 
        conversationHistory.filter(msg => msg.speaker === Speaker.USER).map(msg => msg.content)
      );
      
      expect(analysis.crisisType).toBe(CrisisType.SEVERE_DISTRESS);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('Sensitivity and accuracy', () => {
    it('should not trigger false positives for normal conversation', async () => {
      const normalMessages = [
        'I had a good day at work',
        'I am looking forward to the weekend',
        'I enjoyed talking with my friend',
        'The weather is nice today'
      ];

      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: 0.3,
          arousal: 0.4,
          dominant_emotion: 'content',
          confidence: 0.7
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      for (const message of normalMessages) {
        const responseType = await conversationFlow.determineResponseType(message, mockSession);
        expect(responseType).not.toBe(ResponseType.CRISIS_RESPONSE);
      }
    });

    it('should handle ambiguous statements appropriately', async () => {
      const ambiguousMessages = [
        'I am dying to see that movie',
        'That joke killed me',
        'I could just die of embarrassment',
        'This traffic is killing me slowly'
      ];

      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: 0.1,
          arousal: 0.3,
          dominant_emotion: 'neutral',
          confidence: 0.6
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      for (const message of ambiguousMessages) {
        const analysis = await crisisDetector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.NONE);
      }
    });
  });

  describe('Error handling and fallbacks', () => {
    it('should handle crisis detector failures gracefully', async () => {
      // Mock a failing crisis detector
      const failingDetector = {
        analyzeCrisis: jest.fn().mockRejectedValue(new Error('Analysis failed'))
      } as any;

      const failingFlow = new ConversationFlowController(failingDetector);
      const crisisMessage = 'I want to hurt myself';
      
      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: -0.8,
          arousal: 0.9,
          dominant_emotion: 'despair',
          confidence: 0.8
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      // Should fall back to basic keyword detection
      const responseType = await failingFlow.determineResponseType(crisisMessage, mockSession);
      expect(responseType).toBe(ResponseType.CRISIS_RESPONSE);
    });

    it('should provide basic crisis response when advanced features fail', async () => {
      // Test with a message that should trigger crisis response
      const crisisMessage = 'I want to kill myself';
      const mockSession: ConversationSession = {
        session_id: 'test-session',
        user_id: 'test-user',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: -0.8,
          arousal: 0.9,
          dominant_emotion: 'despair',
          confidence: 0.8
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      // Even if advanced features fail, should still provide crisis response
      const response = await responseRouter.routeResponse(
        crisisMessage, 
        mockSession, 
        ResponseType.CRISIS_RESPONSE
      );
      
      expect(response).toContain('concerned');
      expect(response).toContain('988');
      expect(response).toBeTruthy();
    });
  });

  describe('Resource appropriateness', () => {
    it('should provide age-appropriate resources', async () => {
      const resources = await resourceProvider.getCrisisResources(CrisisType.SELF_HARM);
      
      // Should include general resources suitable for all ages
      const generalResources = resources.filter(r => 
        !r.name.toLowerCase().includes('youth') && 
        !r.name.toLowerCase().includes('teen')
      );
      
      expect(generalResources.length).toBeGreaterThan(0);
    });

    it('should include diverse support options', async () => {
      const resources = await resourceProvider.getCrisisResources(CrisisType.SELF_HARM);
      
      // Should include different types of support
      const phoneSupport = resources.filter(r => r.phone && !r.phone.includes('Text'));
      const textSupport = resources.filter(r => r.phone && r.phone.includes('Text'));
      const onlineSupport = resources.filter(r => r.website);
      
      expect(phoneSupport.length).toBeGreaterThan(0);
      expect(textSupport.length).toBeGreaterThan(0);
      expect(onlineSupport.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and reliability', () => {
    it('should complete crisis analysis within reasonable time', async () => {
      const startTime = Date.now();
      
      await crisisDetector.analyzeCrisis('I feel hopeless and want to give up');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should complete within 1 second
      expect(duration).toBeLessThan(1000);
    });

    it('should handle concurrent crisis analyses', async () => {
      const messages = [
        'I want to hurt myself',
        'I feel hopeless',
        'I am having chest pain',
        'I feel overwhelmed'
      ];

      const promises = messages.map(message => 
        crisisDetector.analyzeCrisis(message)
      );

      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(4);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.crisisType).toBeDefined();
      });
    });
  });
});