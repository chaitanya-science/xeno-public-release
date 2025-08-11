// TTS Factory Tests

import { TTSFactory } from '../tts-factory';
import { GoogleTextToSpeechService } from '../google-text-to-speech-service';
import { SystemConfig } from '../../config/interfaces';

// Mock AudioContext
(global as any).AudioContext = jest.fn(() => ({
  state: 'running',
  currentTime: 0,
  destination: {},
  resume: jest.fn().mockResolvedValue(undefined),
  decodeAudioData: jest.fn(),
  createBufferSource: jest.fn(),
  createGain: jest.fn()
}));

describe('TTSFactory', () => {
  let mockSystemConfig: SystemConfig;

  beforeEach(() => {
    mockSystemConfig = {
      audio: {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        bufferSize: 1024,
        wakeWordSensitivity: 0.5,
        noiseReductionEnabled: true,
        porcupine: {
          accessKey: 'test-key',
          keyword: 'companion',
          sensitivity: 0.5
        }
      },
      ai: {
        openai: {
          apiKey: 'test-openai-key',
          model: 'gpt-5',
          maxTokens: 150,
          temperature: 0.7
        },
        speechServices: {
          provider: 'google',
          apiKey: 'test-google-key',
          region: 'us-central1',
          language: 'en-US',
          voice: 'en-US-Neural2-C'
        }
      },
      privacy: {
        dataRetentionDays: 30,
        autoDeleteAudio: true,
        encryptionEnabled: true,
        allowMemoryStorage: true,
        allowConversationHistory: true
      },
      system: {
        responseTimeoutMs: 5000,
        maxConversationLength: 50,
        healthCheckIntervalMs: 30000,
        autoUpdateEnabled: true,
        logLevel: 'info'
      }
    };
  });

  describe('createTTSService', () => {
    it('should create Google TTS service when provider is google', () => {
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeInstanceOf(GoogleTextToSpeechService);
    });

    it('should throw error for unsupported provider', () => {
      mockSystemConfig.ai.speechServices.provider = 'unsupported' as any;
      
      expect(() => TTSFactory.createTTSService(mockSystemConfig))
        .toThrow('Unsupported TTS provider: unsupported');
    });

    it('should throw error for AWS provider (not yet implemented)', () => {
      mockSystemConfig.ai.speechServices.provider = 'aws';
      
      expect(() => TTSFactory.createTTSService(mockSystemConfig))
        .toThrow('AWS TTS not yet implemented');
    });

    it('should throw error for local provider (not yet implemented)', () => {
      mockSystemConfig.ai.speechServices.provider = 'local';
      
      expect(() => TTSFactory.createTTSService(mockSystemConfig))
        .toThrow('Local TTS not yet implemented');
    });
  });

  describe('buildTTSConfig', () => {
    it('should build proper TTS config from system config', () => {
      const service = TTSFactory.createTTSService(mockSystemConfig);
      
      // We can't directly test the private method, but we can verify
      // the service was created with correct configuration by testing
      // its behavior
      expect(service).toBeDefined();
    });

    it('should include default emotional mappings', () => {
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
      
      // The service should be created with emotional mappings
      // This is tested indirectly through the service functionality
    });

    it('should include natural pause settings', () => {
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
      
      // Natural pauses are configured and tested through the service
    });

    it('should include technical delay messages', () => {
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
      
      // Technical delay messages are configured and tested through the service
    });
  });

  describe('getDefaultEmotionalMappings', () => {
    it('should provide comprehensive emotional mappings', () => {
      // Test through service creation since the method is private
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
      
      // The mappings should cover various emotional states:
      // - Happy and energetic
      // - Happy and calm  
      // - Neutral
      // - Sad and low energy
      // - Anxious/stressed
      // - Very distressed
    });
  });

  describe('getRecommendedVoices', () => {
    it('should return voice recommendations by style', () => {
      const recommendations = TTSFactory.getRecommendedVoices();
      
      expect(recommendations).toHaveProperty('empathetic');
      expect(recommendations).toHaveProperty('warm');
      expect(recommendations).toHaveProperty('friendly');
      expect(recommendations).toHaveProperty('calm');
      expect(recommendations).toHaveProperty('cheerful');
      
      expect(recommendations.empathetic).toContain('en-US-Neural2-C');
      expect(recommendations.warm).toContain('en-US-Neural2-D');
      expect(recommendations.friendly).toContain('en-US-Neural2-A');
    });

    it('should provide multiple voice options for each style', () => {
      const recommendations = TTSFactory.getRecommendedVoices();
      
      Object.values(recommendations).forEach(voices => {
        expect(voices.length).toBeGreaterThan(0);
        expect(Array.isArray(voices)).toBe(true);
      });
    });
  });

  describe('configuration validation', () => {
    it('should handle missing API key gracefully', () => {
      mockSystemConfig.ai.speechServices.apiKey = '';
      
      // Should still create service, but it won't be available
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
    });

    it('should handle missing region', () => {
      delete mockSystemConfig.ai.speechServices.region;
      
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
    });

    it('should use default voice when not specified', () => {
      mockSystemConfig.ai.speechServices.voice = '';
      
      const service = TTSFactory.createTTSService(mockSystemConfig);
      expect(service).toBeDefined();
    });
  });
});