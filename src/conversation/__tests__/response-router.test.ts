import { ResponseRouter } from '../response-router';
import { ConversationFlowController } from '../conversation-flow';
import { AIService } from '../ai-service';
import { ResponseType } from '../interfaces';
import { ConversationSession, Speaker, PrivacyLevel, EmotionalState } from '../../types';

// Mock AI Service
class MockAIService implements AIService {
  private shouldFail: boolean = false;
  private mockResponse: string = 'AI generated response';
  private mockEmotionalState: EmotionalState = {
    valence: 0,
    arousal: 0.5,
    dominant_emotion: 'neutral',
    confidence: 0.8
  };

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  setMockResponse(response: string) {
    this.mockResponse = response;
  }

  setMockEmotionalState(state: EmotionalState) {
    this.mockEmotionalState = state;
  }

  async generateResponse(
    message: string,
    context: ConversationSession,
    responseType: ResponseType
  ): Promise<string> {
    if (this.shouldFail) {
      throw new Error('Mock AI service failure');
    }
    
    // Simulate therapeutic response adaptation
    const baseResponse = this.mockResponse;
    const emotionalContext = context.emotional_context;
    
    if (responseType === ResponseType.CRISIS_RESPONSE) {
      return `${baseResponse} Please call 988 for immediate support.`;
    }
    
    if (emotionalContext.valence < -0.5) {
      return `${baseResponse} I can hear the pain in what you're sharing.`;
    }
    
    return `${baseResponse} (${responseType})`;
  }

  async analyzeEmotionalTone(message: string): Promise<EmotionalState> {
    if (this.shouldFail) {
      throw new Error('Mock AI service failure');
    }
    
    // Simulate enhanced emotional analysis
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('kill myself') || lowerMessage.includes('suicide')) {
      return {
        valence: -0.9,
        arousal: 0.9,
        dominant_emotion: 'crisis',
        confidence: 0.95
      };
    }
    
    if (lowerMessage.includes('happy') || lowerMessage.includes('joy')) {
      return {
        valence: 0.7,
        arousal: 0.6,
        dominant_emotion: 'joy',
        confidence: 0.8
      };
    }
    
    if (lowerMessage.includes('sad') || lowerMessage.includes('depressed')) {
      return {
        valence: -0.6,
        arousal: 0.3,
        dominant_emotion: 'sadness',
        confidence: 0.8
      };
    }
    
    return this.mockEmotionalState;
  }
}

describe('ResponseRouter', () => {
  let responseRouter: ResponseRouter;
  let conversationFlow: ConversationFlowController;
  let mockAIService: MockAIService;
  let mockContext: ConversationSession;

  beforeEach(() => {
    conversationFlow = new ConversationFlowController();
    mockAIService = new MockAIService();
    responseRouter = new ResponseRouter(conversationFlow, mockAIService);

    mockContext = {
      session_id: 'test-session',
      user_id: 'test-user',
      start_time: new Date(),
      conversation_history: [],
      emotional_context: {
        valence: 0,
        arousal: 0.5,
        dominant_emotion: 'neutral',
        confidence: 0.8
      },
      privacy_level: PrivacyLevel.MEDIUM
    };
  });

  describe('AI Service Integration', () => {
    it('should use AI service for response generation when available', async () => {
      mockAIService.setMockResponse('AI empathetic response');
      
      const response = await responseRouter.routeResponse(
        'I feel sad today',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      expect(response).toBe('AI empathetic response (EMPATHETIC_SUPPORT)');
    });

    it('should fall back to hardcoded responses when AI service fails', async () => {
      mockAIService.setShouldFail(true);
      
      const response = await responseRouter.routeResponse(
        'I feel sad today',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      // Should fall back to hardcoded empathetic response
      expect(response.toLowerCase()).toMatch(/(pain|difficult|overwhelming|courage|here|support|listen|trust|important|valid|feelings)/);
    });

    it('should work without AI service (fallback mode)', async () => {
      const routerWithoutAI = new ResponseRouter(conversationFlow);
      
      const response = await routerWithoutAI.routeResponse(
        'I feel happy today',
        mockContext,
        ResponseType.GENERAL_CONVERSATION
      );

      expect(response).toBeTruthy();
      expect(typeof response).toBe('string');
    });
  });

  describe('Response Type Routing', () => {
    beforeEach(() => {
      // Disable AI service for these tests to test hardcoded responses
      mockAIService.setShouldFail(true);
    });

    it('should generate appropriate crisis responses', async () => {
      const response = await responseRouter.routeResponse(
        'I want to kill myself',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      expect(response).toContain('988');
      expect(response).toContain('concerned');
      expect(response.toLowerCase()).toContain('suicide');
    });

    it('should generate medical emergency responses', async () => {
      const response = await responseRouter.routeResponse(
        'I am having chest pain',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      expect(response).toContain('911');
      expect(response).toContain('emergency');
      expect(response.toLowerCase()).toContain('medical');
    });

    it('should generate empathetic support responses', async () => {
      const response = await responseRouter.routeResponse(
        'I feel overwhelmed',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      expect(response.toLowerCase()).toMatch(/(pain|difficult|overwhelming|courage|here|listen|support|valid|feelings)/);
    });

    it('should generate appropriate follow-up questions', async () => {
      const response = await responseRouter.routeResponse(
        'I feel worried about my family',
        mockContext,
        ResponseType.FOLLOW_UP_QUESTION
      );

      expect(response).toContain('?');
      expect(response.toLowerCase()).toMatch(/(more|tell|what|how)/);
    });

    it('should generate clarification requests', async () => {
      const response = await responseRouter.routeResponse(
        'um',
        mockContext,
        ResponseType.CLARIFICATION_REQUEST
      );

      expect(response.toLowerCase()).toMatch(/(understand|more|again|repeat)/);
    });

    it('should generate general conversation responses', async () => {
      const response = await responseRouter.routeResponse(
        'Today was a good day',
        mockContext,
        ResponseType.GENERAL_CONVERSATION
      );

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(10);
    });
  });

  describe('Crisis Detection', () => {
    beforeEach(() => {
      mockAIService.setShouldFail(true);
    });

    it('should detect self-harm keywords', async () => {
      const selfHarmMessages = [
        'I want to kill myself',
        'I should just end it all',
        'I want to hurt myself',
        'I am going to take my life'
      ];

      for (const message of selfHarmMessages) {
        const response = await responseRouter.routeResponse(
          message,
          mockContext,
          ResponseType.CRISIS_RESPONSE
        );
        
        expect(response).toContain('988');
        expect(response.toLowerCase()).toContain('suicide');
      }
    });

    it('should detect medical emergency keywords', async () => {
      const medicalMessages = [
        'I am having chest pain',
        'I cannot breathe',
        'I think I am having a heart attack',
        'There is so much bleeding'
      ];

      for (const message of medicalMessages) {
        const response = await responseRouter.routeResponse(
          message,
          mockContext,
          ResponseType.CRISIS_RESPONSE
        );
        
        expect(response).toContain('911');
        expect(response.toLowerCase()).toContain('emergency');
      }
    });
  });

  describe('Emotional Tone Analysis', () => {
    it('should use AI service for emotional analysis when available', async () => {
      const mockEmotionalState = {
        valence: -0.7,
        arousal: 0.8,
        dominant_emotion: 'sadness',
        confidence: 0.9
      };
      mockAIService.setMockEmotionalState(mockEmotionalState);

      const result = await responseRouter.analyzeEmotionalTone('I feel very sad');

      expect(result).toEqual(mockEmotionalState);
    });

    it('should fall back to basic analysis when AI service fails', async () => {
      mockAIService.setShouldFail(true);

      const result = await responseRouter.analyzeEmotionalTone('I feel very sad');

      expect(result.valence).toBeLessThan(0);
      expect(result.arousal).toBeGreaterThan(0);
      expect(result.confidence).toBeDefined();
    });

    it('should detect positive emotions in basic analysis', async () => {
      mockAIService.setShouldFail(true);

      const result = await responseRouter.analyzeEmotionalTone('I feel happy and grateful');

      expect(result.valence).toBeGreaterThan(0);
      expect(result.dominant_emotion).toBe('positive');
    });

    it('should detect high arousal emotions in basic analysis', async () => {
      mockAIService.setShouldFail(true);

      const result = await responseRouter.analyzeEmotionalTone('I am so excited and overwhelmed');

      expect(result.arousal).toBeGreaterThan(0.7);
    });

    it('should detect crisis situations in emotional analysis', async () => {
      mockAIService.setShouldFail(true);

      const result = await responseRouter.analyzeEmotionalTone('I want to kill myself');

      expect(result.valence).toBeLessThan(-0.5);
      expect(result.arousal).toBeGreaterThan(0.8);
      expect(result.dominant_emotion).toBe('crisis');
    });
  });

  describe('Response Appropriateness', () => {
    beforeEach(() => {
      mockAIService.setShouldFail(true);
    });

    it('should maintain empathetic tone in all responses', async () => {
      const testMessages = [
        'I feel sad',
        'I am worried',
        'I had a good day',
        'I do not know what to say'
      ];

      for (const message of testMessages) {
        const response = await responseRouter.routeResponse(
          message,
          mockContext,
          ResponseType.EMPATHETIC_SUPPORT
        );

        // Check for empathetic language patterns
        expect(response.toLowerCase()).toMatch(/(hear|understand|feel|with you|here|support|listen)/);
        expect(response).not.toMatch(/^(Yes|No|OK|Sure)\.?$/); // Avoid short, dismissive responses
      }
    });

    it('should ask open-ended questions for follow-ups', async () => {
      const response = await responseRouter.routeResponse(
        'I had an argument with my friend',
        mockContext,
        ResponseType.FOLLOW_UP_QUESTION
      );

      expect(response).toContain('?');
      expect(response.toLowerCase()).toMatch(/(what|how|can you|tell me|more about)/);
      expect(response).not.toMatch(/^(Did|Is|Are|Will|Would) .+\?$/); // Avoid yes/no questions
    });

    it('should provide clear crisis resources without being clinical', async () => {
      const response = await responseRouter.routeResponse(
        'I feel hopeless',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      expect(response).toMatch(/\b(988|911|741741)\b/); // Contains crisis numbers
      expect(response.toLowerCase()).toMatch(/(concerned|care|help|support|not alone)/);
      expect(response).not.toMatch(/\b(diagnosis|treatment|therapy|medication)\b/i); // Avoid clinical terms
    });
  });

  describe('Context Awareness', () => {
    it('should consider emotional context in responses', async () => {
      const distressedContext = {
        ...mockContext,
        emotional_context: {
          valence: -0.8,
          arousal: 0.9,
          dominant_emotion: 'anxiety',
          confidence: 0.9
        }
      };

      mockAIService.setShouldFail(true);

      const response = await responseRouter.routeResponse(
        'I do not know',
        distressedContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      // Should provide more supportive response for distressed user
      expect(response.toLowerCase()).toMatch(/(overwhelming|intensity|difficult|here with you)/);
    });

    it('should adapt to conversation history length', async () => {
      mockAIService.setShouldFail(true);
      
      const contextWithHistory = {
        ...mockContext,
        conversation_history: Array(10).fill(null).map((_, i) => ({
          message_id: `msg-${i}`,
          timestamp: new Date(),
          speaker: i % 2 === 0 ? Speaker.USER : Speaker.COMPANION,
          content: `Message ${i}`,
          confidence_score: 0.9
        }))
      };

      const response = await responseRouter.routeResponse(
        'I keep talking about the same thing',
        contextWithHistory,
        ResponseType.TOPIC_GUIDANCE
      );

      expect(response.toLowerCase()).toMatch(/(different|new|shift|another|explore|care|yourself|talk about)/);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty messages gracefully', async () => {
      const response = await responseRouter.routeResponse(
        '',
        mockContext,
        ResponseType.GENERAL_CONVERSATION
      );

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle very long messages', async () => {
      const longMessage = 'I feel sad '.repeat(100);
      
      const response = await responseRouter.routeResponse(
        longMessage,
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle special characters in messages', async () => {
      const specialMessage = 'I feel @#$% terrible!!! 😢';
      
      const response = await responseRouter.routeResponse(
        specialMessage,
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
    });
  });
});