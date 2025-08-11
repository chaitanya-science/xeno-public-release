import { ConversationFlowController } from '../conversation-flow';
import { ResponseType } from '../interfaces';
import { ConversationSession, Message, Speaker, PrivacyLevel } from '../../types';

describe('ConversationFlowController', () => {
  let flowController: ConversationFlowController;

  beforeEach(() => {
    flowController = new ConversationFlowController();
  });

  describe('response type determination', () => {
    const createMockSession = (messages: Partial<Message>[] = []): ConversationSession => ({
      session_id: 'test-session',
      user_id: 'test-user',
      start_time: new Date(),
      conversation_history: messages.map((msg, index) => ({
        message_id: `msg-${index}`,
        timestamp: new Date(),
        speaker: Speaker.USER,
        content: '',
        confidence_score: 1.0,
        ...msg
      })),
      emotional_context: {
        valence: 0,
        arousal: 0.3,
        dominant_emotion: 'neutral',
        confidence: 0.8
      },
      privacy_level: PrivacyLevel.MEDIUM
    });

    describe('crisis detection', () => {
      it('should detect suicide-related crisis keywords', () => {
        const crisisMessages = [
          'I want to kill myself',
          'I\'m thinking about suicide',
          'I can\'t go on anymore',
          'Life is not worth living',
          'I want to end it all'
        ];

        crisisMessages.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).toBe(ResponseType.CRISIS_RESPONSE);
        });
      });

      it('should detect medical emergency keywords', () => {
        const emergencyMessages = [
          'I\'m having chest pain',
          'I can\'t breathe',
          'I think I\'m having a heart attack',
          'Call 911',
          'I need an ambulance'
        ];

        emergencyMessages.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).toBe(ResponseType.CRISIS_RESPONSE);
        });
      });

      it('should not trigger crisis response for casual mentions', () => {
        const casualMessages = [
          'I killed it at work today',
          'This traffic is killing me',
          'I\'m dying to see that movie'
        ];

        casualMessages.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).not.toBe(ResponseType.CRISIS_RESPONSE);
        });
      });
    });

    describe('distress detection', () => {
      it('should detect emotional distress keywords', () => {
        const distressMessages = [
          'I feel so depressed',
          'I\'m having a panic attack',
          'I feel hopeless',
          'I\'m overwhelmed',
          'I can\'t cope anymore'
        ];

        distressMessages.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).toBe(ResponseType.EMPATHETIC_SUPPORT);
        });
      });

      it('should detect emotional distress from context', () => {
        const session = createMockSession();
        session.emotional_context = {
          valence: -0.8, // Very negative
          arousal: 0.9,  // Very high arousal
          dominant_emotion: 'distressed',
          confidence: 0.9
        };

        const responseType = flowController.determineResponseType('I had a bad day', session);
        expect(responseType).toBe(ResponseType.EMPATHETIC_SUPPORT);
      });
    });

    describe('topic guidance', () => {
      it('should suggest topic guidance for repetitive conversations', () => {
        const repetitiveMessages = Array(6).fill(null).map((_, i) => ({
          speaker: Speaker.USER,
          content: `I keep thinking about my family problems ${i}`
        }));

        const session = createMockSession(repetitiveMessages);
        const responseType = flowController.determineResponseType('More family issues', session);
        expect(responseType).toBe(ResponseType.TOPIC_GUIDANCE);
      });

      it('should not suggest guidance for varied conversations', () => {
        const variedMessages = [
          { speaker: Speaker.USER, content: 'I had a good day at work' },
          { speaker: Speaker.USER, content: 'My health has been concerning me' },
          { speaker: Speaker.USER, content: 'I miss my old friends' }
        ];

        const session = createMockSession(variedMessages);
        const responseType = flowController.determineResponseType('Tell me about today', session);
        expect(responseType).not.toBe(ResponseType.TOPIC_GUIDANCE);
      });
    });

    describe('clarification requests', () => {
      it('should request clarification for very short messages', () => {
        const unclearMessages = ['um', 'uh', 'hmm', 'well'];

        unclearMessages.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).toBe(ResponseType.CLARIFICATION_REQUEST);
        });
      });

      it('should request clarification for filler-only messages', () => {
        const session = createMockSession();
        const responseType = flowController.determineResponseType('um well like you know', session);
        expect(responseType).toBe(ResponseType.CLARIFICATION_REQUEST);
      });
    });

    describe('follow-up questions', () => {
      it('should suggest follow-up for explorable statements', () => {
        const followUpTriggers = [
          'I feel worried about something',
          'I remember when I was young',
          'I think about my future',
          'I experienced something difficult'
        ];

        followUpTriggers.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).toBe(ResponseType.FOLLOW_UP_QUESTION);
        });
      });

      it('should not suggest follow-up for questions', () => {
        const session = createMockSession();
        const responseType = flowController.determineResponseType('How are you doing?', session);
        expect(responseType).not.toBe(ResponseType.FOLLOW_UP_QUESTION);
      });
    });

    describe('general conversation', () => {
      it('should default to general conversation for normal messages', () => {
        const normalMessages = [
          'Hello there',
          'I went to the store today',
          'The weather is nice',
          'I watched a movie last night'
        ];

        normalMessages.forEach(message => {
          const session = createMockSession();
          const responseType = flowController.determineResponseType(message, session);
          expect(responseType).toBe(ResponseType.GENERAL_CONVERSATION);
        });
      });
    });
  });

  describe('topic guidance logic', () => {
    it('should not guide topic for short conversations', () => {
      const shortHistory = [
        { speaker: Speaker.USER, content: 'Hello' },
        { speaker: Speaker.COMPANION, content: 'Hi there' }
      ];

      const shouldGuide = flowController.shouldGuideTopic(shortHistory as Message[]);
      expect(shouldGuide).toBe(false);
    });

    it('should guide topic when same topic appears repeatedly', () => {
      const repetitiveHistory = Array(10).fill(null).map((_, i) => ({
        message_id: `msg-${i}`,
        timestamp: new Date(),
        speaker: i % 2 === 0 ? Speaker.USER : Speaker.COMPANION,
        content: i % 2 === 0 ? `Family problem ${i}` : 'I understand',
        confidence_score: 1.0
      }));

      const shouldGuide = flowController.shouldGuideTopic(repetitiveHistory as Message[]);
      expect(shouldGuide).toBe(true);
    });

    it('should generate appropriate topic suggestions', () => {
      const session: ConversationSession = {
        session_id: 'test',
        user_id: 'test',
        start_time: new Date(),
        conversation_history: [],
        emotional_context: {
          valence: 0,
          arousal: 0.3,
          dominant_emotion: 'neutral',
          confidence: 0.8
        },
        privacy_level: PrivacyLevel.MEDIUM
      };

      const suggestion = flowController.generateTopicSuggestion(session);
      expect(typeof suggestion).toBe('string');
      expect(suggestion.length).toBeGreaterThan(0);
      expect(suggestion).toMatch(/would you like|perhaps|wondering|sense|sometimes|shift|explore/i);
    });
  });

  describe('topic extraction', () => {
    it('should extract topics correctly from messages', () => {
      // This tests the private extractTopic method indirectly through shouldGuideTopic
      const familyMessages = Array(6).fill(null).map((_, i) => ({
        message_id: `msg-${i}`,
        timestamp: new Date(),
        speaker: Speaker.USER,
        content: `My mother called me today ${i}`,
        confidence_score: 1.0
      }));

      const shouldGuide = flowController.shouldGuideTopic(familyMessages as Message[]);
      expect(shouldGuide).toBe(true);
    });

    it('should handle mixed topics appropriately', () => {
      const mixedMessages = [
        { speaker: Speaker.USER, content: 'My family is doing well' },
        { speaker: Speaker.USER, content: 'Work has been stressful' },
        { speaker: Speaker.USER, content: 'I went to the doctor' },
        { speaker: Speaker.USER, content: 'My friends are supportive' },
        { speaker: Speaker.USER, content: 'I feel happy today' }
      ].map((msg, i) => ({
        message_id: `msg-${i}`,
        timestamp: new Date(),
        confidence_score: 1.0,
        ...msg
      }));

      const shouldGuide = flowController.shouldGuideTopic(mixedMessages as Message[]);
      expect(shouldGuide).toBe(false);
    });
  });

  describe('edge cases', () => {
    const createMockSession = (messages: Partial<Message>[] = []): ConversationSession => ({
      session_id: 'test-session',
      user_id: 'test-user',
      start_time: new Date(),
      conversation_history: messages.map((msg, index) => ({
        message_id: `msg-${index}`,
        timestamp: new Date(),
        speaker: Speaker.USER,
        content: '',
        confidence_score: 1.0,
        ...msg
      })),
      emotional_context: {
        valence: 0,
        arousal: 0.3,
        dominant_emotion: 'neutral',
        confidence: 0.8
      },
      privacy_level: PrivacyLevel.MEDIUM
    });

    it('should handle empty messages gracefully', () => {
      const session = createMockSession();
      const responseType = flowController.determineResponseType('', session);
      expect(responseType).toBe(ResponseType.CLARIFICATION_REQUEST);
    });

    it('should handle very long messages', () => {
      const longMessage = 'I feel like '.repeat(100) + 'this is a very long message about my feelings';
      const session = createMockSession();
      const responseType = flowController.determineResponseType(longMessage, session);
      expect(responseType).toBe(ResponseType.FOLLOW_UP_QUESTION);
    });

    it('should handle messages with mixed emotional content', () => {
      const mixedMessage = 'I feel happy but also worried about my future and sometimes I think about suicide but not really';
      const session = createMockSession();
      const responseType = flowController.determineResponseType(mixedMessage, session);
      // Crisis keywords should take priority
      expect(responseType).toBe(ResponseType.CRISIS_RESPONSE);
    });

    it('should handle case-insensitive keyword matching', () => {
      const upperCaseMessage = 'I FEEL DEPRESSED AND OVERWHELMED';
      const session = createMockSession();
      const responseType = flowController.determineResponseType(upperCaseMessage, session);
      expect(responseType).toBe(ResponseType.EMPATHETIC_SUPPORT);
    });
  });
});