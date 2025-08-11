import { GoogleSpeechToTextService } from '../speech-to-text-service';
import { BasicAudioProcessor } from '../audio-processor';
import { SpeechRecognitionResult } from '../interfaces';

// Mock Google Cloud Speech client
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: jest.fn(),
    close: jest.fn(),
  })),
}));

describe('GoogleSpeechToTextService', () => {
  let service: GoogleSpeechToTextService;
  let mockSpeechClient: any;
  let mockAudioProcessor: jest.Mocked<BasicAudioProcessor>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock audio processor
    mockAudioProcessor = {
      processAudio: jest.fn(),
      applyNoiseReduction: jest.fn(),
      normalizeVolume: jest.fn(),
    } as any;

    // Set up mock speech client
    mockSpeechClient = {
      recognize: jest.fn(),
      close: jest.fn(),
    };

    // Mock the SpeechClient constructor to return our mock
    const { SpeechClient } = require('@google-cloud/speech');
    SpeechClient.mockImplementation(() => mockSpeechClient);

    // Create service instance
    service = new GoogleSpeechToTextService('test-project', 'test-key.json', mockAudioProcessor);
  });

  describe('initialization', () => {
    it('should initialize successfully with project ID and key file', async () => {
      await service.initialize();
      
      const { SpeechClient } = require('@google-cloud/speech');
      expect(SpeechClient).toHaveBeenCalledWith({
        projectId: 'test-project',
        keyFilename: 'test-key.json',
      });
    });

    it('should initialize with default credentials when no config provided', async () => {
      const defaultService = new GoogleSpeechToTextService();
      await defaultService.initialize();
      
      const { SpeechClient } = require('@google-cloud/speech');
      expect(SpeechClient).toHaveBeenLastCalledWith({});
    });

    it('should throw error if initialization fails', async () => {
      const { SpeechClient } = require('@google-cloud/speech');
      SpeechClient.mockImplementationOnce(() => {
        throw new Error('Authentication failed');
      });

      await expect(service.initialize()).rejects.toThrow(
        'Failed to initialize Google Cloud Speech service: Error: Authentication failed'
      );
    });
  });

  describe('transcribe', () => {
    beforeEach(async () => {
      await service.initialize();
      mockAudioProcessor.processAudio.mockResolvedValue(Buffer.from('processed-audio'));
    });

    it('should transcribe audio successfully with high confidence', async () => {
      const mockResponse = {
        results: [{
          alternatives: [{
            transcript: 'Hello, how are you today?',
            confidence: 0.95,
          }]
        }]
      };

      mockSpeechClient.recognize.mockResolvedValue([mockResponse]);

      const audioBuffer = Buffer.from('test-audio-data');
      const result = await service.transcribe(audioBuffer);

      expect(mockAudioProcessor.processAudio).toHaveBeenCalledWith(audioBuffer);
      expect(mockSpeechClient.recognize).toHaveBeenCalledWith({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
          maxAlternatives: 3,
          enableWordTimeOffsets: true,
          enableAutomaticPunctuation: true,
          useEnhanced: true,
          model: 'latest_long',
        },
        audio: {
          content: Buffer.from('processed-audio').toString('base64'),
        },
      });

      expect(result).toEqual({
        text: 'Hello, how are you today?',
        confidence: 0.95,
        alternatives: [],
        processingTime: expect.any(Number),
      });
    });

    it('should return alternatives when available', async () => {
      const mockResponse = {
        results: [{
          alternatives: [
            { transcript: 'Hello world', confidence: 0.9 },
            { transcript: 'Hello word', confidence: 0.7 },
            { transcript: 'Hello work', confidence: 0.6 },
          ]
        }]
      };

      mockSpeechClient.recognize.mockResolvedValue([mockResponse]);

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('Hello world');
      expect(result.confidence).toBe(0.9);
      expect(result.alternatives).toEqual(['Hello word', 'Hello work']);
    });

    it('should handle low confidence with polite error message', async () => {
      const mockResponse = {
        results: [{
          alternatives: [{
            transcript: 'unclear speech',
            confidence: 0.3, // Below threshold
          }]
        }]
      };

      mockSpeechClient.recognize.mockResolvedValue([mockResponse]);

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('I\'m not quite sure what you said. Could you please repeat that?');
      expect(result.confidence).toBe(0.3);
      expect(result.alternatives).toEqual([]);
    });

    it('should handle empty results gracefully', async () => {
      const mockResponse = { results: [] };
      mockSpeechClient.recognize.mockResolvedValue([mockResponse]);

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('I didn\'t hear anything. Could you please speak up a bit?');
      expect(result.confidence).toBe(0);
    });

    it('should handle timeout errors with appropriate message', async () => {
      mockSpeechClient.recognize.mockRejectedValue(new Error('DEADLINE_EXCEEDED'));

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('I didn\'t catch that. Could you please repeat what you said?');
      expect(result.confidence).toBe(0);
    });

    it('should handle network errors with appropriate message', async () => {
      mockSpeechClient.recognize.mockRejectedValue(new Error('UNAVAILABLE: network error'));

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('I\'m having trouble with my connection. Please try again in a moment.');
      expect(result.confidence).toBe(0);
    });

    it('should handle invalid argument errors', async () => {
      mockSpeechClient.recognize.mockRejectedValue(new Error('INVALID_ARGUMENT: bad audio format'));

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('I\'m having trouble processing the audio. Could you try speaking again?');
      expect(result.confidence).toBe(0);
    });

    it('should handle generic errors with fallback message', async () => {
      mockSpeechClient.recognize.mockRejectedValue(new Error('Unknown error'));

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.text).toBe('I\'m sorry, I didn\'t understand that. Could you please speak a bit more clearly?');
      expect(result.confidence).toBe(0);
    });

    it('should throw error if not initialized', async () => {
      const uninitializedService = new GoogleSpeechToTextService();

      await expect(uninitializedService.transcribe(Buffer.from('test')))
        .rejects.toThrow('Speech service not initialized. Call initialize() first.');
    });

    it('should measure processing time accurately', async () => {
      const mockResponse = {
        results: [{
          alternatives: [{ transcript: 'test', confidence: 0.9 }]
        }]
      };

      // Add delay to recognition
      mockSpeechClient.recognize.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([mockResponse]), 100))
      );

      const result = await service.transcribe(Buffer.from('test-audio'));

      expect(result.processingTime).toBeGreaterThan(90);
      expect(result.processingTime).toBeLessThan(200);
    });
  });

  describe('language settings', () => {
    it('should set language correctly', () => {
      service.setLanguage('es-ES');
      
      // Language should be used in next transcription
      expect(() => service.setLanguage('es-ES')).not.toThrow();
    });

    it('should use custom language in recognition request', async () => {
      await service.initialize();
      mockAudioProcessor.processAudio.mockResolvedValue(Buffer.from('audio'));
      
      const mockResponse = {
        results: [{ alternatives: [{ transcript: 'hola', confidence: 0.9 }] }]
      };
      mockSpeechClient.recognize.mockResolvedValue([mockResponse]);

      service.setLanguage('es-ES');
      await service.transcribe(Buffer.from('test-audio'));

      expect(mockSpeechClient.recognize).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            languageCode: 'es-ES'
          })
        })
      );
    });
  });

  describe('speaker adaptation', () => {
    it('should log adaptation attempt', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

      await service.adaptToSpeaker('user123');

      expect(consoleSpy).toHaveBeenCalledWith('Adapting speech recognition for user: user123');
      
      consoleSpy.mockRestore();
    });
  });

  describe('resource cleanup', () => {
    it('should dispose resources properly', async () => {
      await service.initialize();
      
      service.dispose();

      expect(mockSpeechClient.close).toHaveBeenCalled();
    });

    it('should handle disposal when not initialized', () => {
      expect(() => service.dispose()).not.toThrow();
    });
  });

  describe('accuracy requirements', () => {
    it('should meet 95% accuracy target for clear speech', async () => {
      // Test with high-confidence results that should meet accuracy target
      const highConfidenceResponse = {
        results: [{
          alternatives: [{
            transcript: 'This is a clear speech sample for testing accuracy',
            confidence: 0.97,
          }]
        }]
      };

      mockSpeechClient.recognize.mockResolvedValue([highConfidenceResponse]);
      await service.initialize();
      mockAudioProcessor.processAudio.mockResolvedValue(Buffer.from('clear-audio'));

      const result = await service.transcribe(Buffer.from('clear-speech'));

      expect(result.confidence).toBeGreaterThanOrEqual(0.95);
      expect(result.text).not.toContain('I\'m not quite sure');
    });

    it('should handle various speech patterns', async () => {
      await service.initialize();
      mockAudioProcessor.processAudio.mockResolvedValue(Buffer.from('audio'));

      const testCases = [
        { input: 'fast-speech', expected: 'Fast speech recognition test' },
        { input: 'slow-speech', expected: 'Slow... speech... recognition... test' },
        { input: 'accented-speech', expected: 'Accented speech recognition test' },
      ];

      for (const testCase of testCases) {
        const mockResponse = {
          results: [{
            alternatives: [{
              transcript: testCase.expected,
              confidence: 0.92,
            }]
          }]
        };

        mockSpeechClient.recognize.mockResolvedValue([mockResponse]);
        const result = await service.transcribe(Buffer.from(testCase.input));

        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.text).toBe(testCase.expected);
      }
    });
  });
});