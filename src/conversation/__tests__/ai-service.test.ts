import { OpenAIService, createOpenAIService, validateOpenAIApiKey, AIServiceConfig, TherapeuticPromptConfig } from '../ai-service';
import { ResponseType } from '../interfaces';
import { ConversationSession, Speaker, PrivacyLevel, EmotionalState } from '../../types';

// Mock fetch for testing
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

describe('OpenAIService', () => {
  let aiService: OpenAIService;
  let mockConfig: AIServiceConfig;
  let mockContext: ConversationSession;

  beforeEach(() => {
    mockConfig = {
      apiKey: 'sk-test-key-1234567890abcdef',
  model: 'gpt-5',
      maxTokens: 150,
      temperature: 0.7,
      baseUrl: 'https://api.openai.com/v1',
      timeout: 5000
    };

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

    aiService = new OpenAIService(mockConfig);
    mockFetch.mockClear();
  });

  describe('Constructor and Configuration', () => {
    it('should create service with default therapeutic configuration', () => {
      const service = new OpenAIService(mockConfig);
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should accept custom therapeutic configuration', () => {
      const therapeuticConfig: Partial<TherapeuticPromptConfig> = {
        empathyLevel: 'very_high',
        emotionalAdaptation: false,
        contextWindow: 10
      };

      const service = new OpenAIService(mockConfig, therapeuticConfig);
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should set default values for missing config options', () => {
      const minimalConfig = {
        apiKey: 'sk-test-key',
  model: 'gpt-5',
        maxTokens: 100,
        temperature: 0.5
      };

      const service = new OpenAIService(minimalConfig);
      expect(service).toBeInstanceOf(OpenAIService);
    });
  });

  describe('Response Generation', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'I understand you\'re feeling sad. That sounds really difficult to carry.'
            }
          }]
        })
      } as Response);
    });

    it('should generate empathetic support responses', async () => {
      const response = await aiService.generateResponse(
        'I feel very sad today',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      expect(response).toBe('I understand you\'re feeling sad. That sounds really difficult to carry.');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer sk-test-key-1234567890abcdef',
            'Content-Type': 'application/json'
          })
        })
      );
    });

    it('should generate crisis responses with appropriate resources', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'I\'m really concerned about you. Please call 988 for immediate support.'
            }
          }]
        })
      } as Response);

      const response = await aiService.generateResponse(
        'I want to hurt myself',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      expect(response).toContain('988');
      expect(response).toContain('concerned');
    });

    it('should adapt temperature based on response type', async () => {
      await aiService.generateResponse(
        'I need help',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const requestBody = JSON.parse(lastCall[1]?.body as string);
      
      // Crisis responses should use lower temperature
      expect(requestBody.temperature).toBeLessThanOrEqual(0.3);
    });

    it('should include conversation context in API calls', async () => {
      const contextWithHistory = {
        ...mockContext,
        conversation_history: [
          {
            message_id: 'msg-1',
            timestamp: new Date(),
            speaker: Speaker.USER,
            content: 'Hello',
            confidence_score: 1.0
          },
          {
            message_id: 'msg-2',
            timestamp: new Date(),
            speaker: Speaker.COMPANION,
            content: 'Hi there! How are you feeling?',
            confidence_score: 1.0
          }
        ]
      };

      await aiService.generateResponse(
        'I am feeling anxious',
        contextWithHistory,
        ResponseType.EMPATHETIC_SUPPORT
      );

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const requestBody = JSON.parse(lastCall[1]?.body as string);
      
      expect(requestBody.messages.length).toBeGreaterThan(1);
      expect(requestBody.messages.some((msg: any) => msg.content === 'Hello')).toBe(true);
    });

    it('should handle API errors gracefully', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        text: async () => 'Rate limit exceeded'
      } as Response);

      const response = await aiService.generateResponse(
        'I feel sad',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      // Should return fallback response
      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(10);
    });

    it('should handle network timeouts', async () => {
      mockFetch.mockImplementation(() => 
        new Promise((resolve) => {
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ choices: [{ message: { content: 'Response' } }] })
          } as Response), 6000); // Longer than timeout
        })
      );

      const response = await aiService.generateResponse(
        'I need help',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      // Should return fallback response due to timeout
      expect(response).toBeTruthy();
    }, 10000); // Increase test timeout

    it('should validate and clean responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'I recommend you take medication for your depression. You should start therapy immediately.'
            }
          }]
        })
      } as Response);

      const response = await aiService.generateResponse(
        'I feel depressed',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      // Should return fallback due to medical advice detection
      expect(response).not.toContain('medication');
      expect(response).not.toContain('I recommend');
    });

    it('should ensure crisis responses contain resources', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'I understand you\'re in pain right now.'
            }
          }]
        })
      } as Response);

      const response = await aiService.generateResponse(
        'I want to die',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      // Should add crisis resources if not present
      expect(response).toMatch(/\b(988|911|741741|crisis|emergency|hotline)\b/i);
    });
  });

  describe('Emotional Tone Analysis', () => {
    beforeEach(() => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                valence: -0.7,
                arousal: 0.8,
                dominant_emotion: 'sadness',
                confidence: 0.9
              })
            }
          }]
        })
      } as Response);
    });

    it('should analyze emotional tone using AI', async () => {
      const result = await aiService.analyzeEmotionalTone('I feel very sad and lonely');

      expect(result.valence).toBe(-0.7);
      expect(result.arousal).toBe(0.8);
      expect(result.dominant_emotion).toBe('sadness');
      expect(result.confidence).toBe(0.9);
    });

    it('should use specialized therapeutic prompts for analysis', async () => {
      await aiService.analyzeEmotionalTone('I feel overwhelmed');

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const requestBody = JSON.parse(lastCall[1]?.body as string);
      
      expect(requestBody.messages[0].content).toContain('therapeutic context');
      expect(requestBody.messages[0].content).toContain('Crisis indicators');
    });

    it('should handle malformed JSON responses', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'Invalid JSON response'
            }
          }]
        })
      } as Response);

      const result = await aiService.analyzeEmotionalTone('I feel confused');

      // Should fall back to enhanced sentiment analysis
      expect(result.valence).toBeDefined();
      expect(result.arousal).toBeDefined();
      expect(result.dominant_emotion).toBeDefined();
      expect(result.confidence).toBeDefined();
    });

    it('should fall back to enhanced analysis on API failure', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await aiService.analyzeEmotionalTone('I am very happy today');

      expect(result.valence).toBeGreaterThan(0);
      expect(result.dominant_emotion).toBe('joy');
    });

    it('should validate emotional state bounds', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                valence: 2.5, // Out of bounds
                arousal: -0.5, // Out of bounds
                dominant_emotion: 'happiness',
                confidence: 1.5 // Out of bounds
              })
            }
          }]
        })
      } as Response);

      const result = await aiService.analyzeEmotionalTone('I feel great');

      expect(result.valence).toBeLessThanOrEqual(1);
      expect(result.valence).toBeGreaterThanOrEqual(-1);
      expect(result.arousal).toBeLessThanOrEqual(1);
      expect(result.arousal).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.confidence).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Enhanced Sentiment Analysis', () => {
    it('should detect crisis situations', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      const result = await aiService.analyzeEmotionalTone('I want to kill myself');

      expect(result.valence).toBeLessThan(-0.8);
      expect(result.arousal).toBeGreaterThan(0.8);
      expect(result.dominant_emotion).toBe('crisis');
      expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should detect medical emergencies', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      const result = await aiService.analyzeEmotionalTone('I am having chest pain and cannot breathe');

      expect(result.valence).toBeLessThan(-0.7);
      expect(result.arousal).toBeGreaterThan(0.8);
      expect(result.dominant_emotion).toBe('crisis');
    });

    it('should detect positive emotions', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      const result = await aiService.analyzeEmotionalTone('I feel so happy and grateful today');

      expect(result.valence).toBeGreaterThan(0.5);
      expect(result.dominant_emotion).toBe('joy');
    });

    it('should detect anxiety and high arousal', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      const result = await aiService.analyzeEmotionalTone('I am so anxious and overwhelmed');

      expect(result.arousal).toBeGreaterThan(0.7);
      expect(result.dominant_emotion).toBe('anxiety');
    });

    it('should handle intensity modifiers', async () => {
      mockFetch.mockRejectedValue(new Error('API unavailable'));

      const result1 = await aiService.analyzeEmotionalTone('I feel sad');
      const result2 = await aiService.analyzeEmotionalTone('I feel very extremely sad');

      expect(Math.abs(result2.valence)).toBeGreaterThan(Math.abs(result1.valence));
      expect(result2.arousal).toBeGreaterThan(result1.arousal);
    });
  });

  describe('Therapeutic Boundaries', () => {
    it('should not provide medical advice', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'You should take antidepressants and see a psychiatrist for treatment.'
            }
          }]
        })
      } as Response);

      const response = await aiService.generateResponse(
        'I feel depressed',
        mockContext,
        ResponseType.EMPATHETIC_SUPPORT
      );

      expect(response).not.toContain('antidepressants');
      expect(response).not.toContain('psychiatrist');
      expect(response).not.toContain('treatment');
    });

    it('should maintain empathetic tone in all responses', async () => {
      const testMessages = [
        'I feel sad',
        'I am angry',
        'I feel confused',
        'I had a good day'
      ];

      for (const message of testMessages) {
        mockFetch.mockResolvedValue({
          ok: true,
          json: async () => ({
            choices: [{
              message: {
                content: 'I hear you and I\'m here to support you through this.'
              }
            }]
          })
        } as Response);

        const response = await aiService.generateResponse(
          message,
          mockContext,
          ResponseType.EMPATHETIC_SUPPORT
        );

        expect(response.toLowerCase()).toMatch(/(hear|understand|support|here|with you|listen)/);
      }
    });

    it('should provide appropriate crisis resources', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: 'I\'m very concerned about you. Please reach out for professional help.'
            }
          }]
        })
      } as Response);

      const response = await aiService.generateResponse(
        'I feel hopeless',
        mockContext,
        ResponseType.CRISIS_RESPONSE
      );

      expect(response).toMatch(/\b(988|911|741741)\b/);
      expect(response.toLowerCase()).toMatch(/(concerned|help|support|not alone)/);
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle empty responses from API', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [{
            message: {
              content: ''
            }
          }]
        })
      } as Response);

      const response = await aiService.generateResponse(
        'Hello',
        mockContext,
        ResponseType.GENERAL_CONVERSATION
      );

      expect(response).toBeTruthy();
      expect(response.length).toBeGreaterThan(0);
    });

    it('should handle missing choices in API response', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: []
        })
      } as Response);

      const response = await aiService.generateResponse(
        'Hello',
        mockContext,
        ResponseType.GENERAL_CONVERSATION
      );

      expect(response).toBeTruthy();
    });

    it('should limit conversation context to prevent token overflow', async () => {
      const longHistory = Array(20).fill(null).map((_, i) => ({
        message_id: `msg-${i}`,
        timestamp: new Date(),
        speaker: i % 2 === 0 ? Speaker.USER : Speaker.COMPANION,
        content: `Message ${i}`,
        confidence_score: 1.0
      }));

      const contextWithLongHistory = {
        ...mockContext,
        conversation_history: longHistory
      };

      await aiService.generateResponse(
        'Current message',
        contextWithLongHistory,
        ResponseType.GENERAL_CONVERSATION
      );

      const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
      const requestBody = JSON.parse(lastCall[1]?.body as string);
      
      // Should limit messages to prevent token overflow
      expect(requestBody.messages.length).toBeLessThanOrEqual(10);
    });
  });
});

describe('Factory Functions', () => {
  describe('createOpenAIService', () => {
    it('should create service with valid API key', () => {
      const service = createOpenAIService('sk-test-key-1234567890abcdef');
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should throw error for empty API key', () => {
      expect(() => createOpenAIService('')).toThrow('OpenAI API key is required');
      expect(() => createOpenAIService('   ')).toThrow('OpenAI API key is required');
    });

    it('should accept custom options', () => {
      const service = createOpenAIService('sk-test-key', {
        model: 'gpt-4',
        maxTokens: 200,
        temperature: 0.5,
        empathyLevel: 'very_high',
        emotionalAdaptation: false
      });
      
      expect(service).toBeInstanceOf(OpenAIService);
    });

    it('should use default values for missing options', () => {
      const service = createOpenAIService('sk-test-key');
      expect(service).toBeInstanceOf(OpenAIService);
    });
  });

  describe('validateOpenAIApiKey', () => {
    it('should validate correct API key format', () => {
      expect(validateOpenAIApiKey('sk-1234567890abcdef1234567890abcdef')).toBe(true);
      expect(validateOpenAIApiKey('sk-proj-1234567890abcdef')).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      expect(validateOpenAIApiKey('')).toBe(false);
      expect(validateOpenAIApiKey('invalid-key')).toBe(false);
      expect(validateOpenAIApiKey('sk-')).toBe(false);
      expect(validateOpenAIApiKey('sk-short')).toBe(false);
      expect(validateOpenAIApiKey(null as any)).toBe(false);
      expect(validateOpenAIApiKey(undefined as any)).toBe(false);
    });

    it('should handle whitespace in API keys', () => {
      expect(validateOpenAIApiKey('  sk-1234567890abcdef1234567890abcdef  ')).toBe(true);
    });
  });
});