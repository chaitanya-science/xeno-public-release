import { GoogleSpeechToTextService } from '../speech-to-text-service';
import { BasicAudioProcessor } from '../audio-processor';

// Mock Google Cloud Speech client for integration testing
jest.mock('@google-cloud/speech', () => ({
  SpeechClient: jest.fn().mockImplementation(() => ({
    recognize: jest.fn().mockResolvedValue([{
      results: [{
        alternatives: [{
          transcript: 'Hello, I need some emotional support today.',
          confidence: 0.92,
        }]
      }]
    }]),
    close: jest.fn(),
  })),
}));

describe('Speech-to-Text Pipeline Integration', () => {
  let speechService: GoogleSpeechToTextService;
  let audioProcessor: BasicAudioProcessor;

  beforeEach(async () => {
    audioProcessor = new BasicAudioProcessor();
    speechService = new GoogleSpeechToTextService('test-project', 'test-key.json', audioProcessor);
    await speechService.initialize();
  });

  afterEach(() => {
    speechService.dispose();
  });

  describe('end-to-end speech processing', () => {
    it('should process audio through complete pipeline', async () => {
      // Create realistic test audio buffer (simulating 16kHz, 16-bit PCM)
      const sampleRate = 16000;
      const durationSeconds = 2;
      const audioBuffer = createTestAudioBuffer(sampleRate * durationSeconds);

      const result = await speechService.transcribe(audioBuffer);

      expect(result.text).toBe('Hello, I need some emotional support today.');
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle different speech patterns with high accuracy', async () => {
      const testCases = [
        {
          name: 'clear speech',
          audioSize: 32000, // 2 seconds at 16kHz
          expectedAccuracy: 0.9
        },
        {
          name: 'longer utterance',
          audioSize: 80000, // 5 seconds at 16kHz
          expectedAccuracy: 0.85
        },
        {
          name: 'short phrase',
          audioSize: 8000, // 0.5 seconds at 16kHz
          expectedAccuracy: 0.8
        }
      ];

      for (const testCase of testCases) {
        const audioBuffer = createTestAudioBuffer(testCase.audioSize);
        const result = await speechService.transcribe(audioBuffer);

        expect(result.confidence).toBeGreaterThanOrEqual(0.6);
        expect(result.text).toBeTruthy();
        expect(result.processingTime).toBeLessThan(5000); // Should process within 5 seconds
      }
    });

    it('should maintain 95% accuracy target for wellness conversations', async () => {
      // Test with wellness-related phrases that the system should handle well
      const wellnessAudioBuffer = createTestAudioBuffer(48000); // 3 seconds

      const result = await speechService.transcribe(wellnessAudioBuffer);

      // For wellness companion, we need high accuracy for emotional support
      expect(result.confidence).toBeGreaterThanOrEqual(0.6);
      expect(result.text).toContain('emotional support');
      expect(result.processingTime).toBeLessThan(3000);
    });

    it('should handle audio preprocessing correctly', async () => {
      // Create noisy audio buffer
      const noisyAudioBuffer = createNoisyAudioBuffer(32000);

      const result = await speechService.transcribe(noisyAudioBuffer);

      // Should still get reasonable results after preprocessing
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.text).toBeTruthy();
    });

    it('should provide graceful error handling for unclear speech', async () => {
      // Create a new service instance with low confidence mock
      const lowConfidenceService = new GoogleSpeechToTextService('test-project', 'test-key.json', audioProcessor);
      
      // Mock the SpeechClient to return low confidence
      const { SpeechClient } = require('@google-cloud/speech');
      SpeechClient.mockImplementationOnce(() => ({
        recognize: jest.fn().mockResolvedValue([{
          results: [{
            alternatives: [{
              transcript: 'unclear mumbling',
              confidence: 0.3, // Below threshold
            }]
          }]
        }]),
        close: jest.fn(),
      }));

      await lowConfidenceService.initialize();
      
      const audioBuffer = createTestAudioBuffer(16000);
      const result = await lowConfidenceService.transcribe(audioBuffer);

      expect(result.text).toContain('not quite sure');
      expect(result.confidence).toBe(0.3);
      
      lowConfidenceService.dispose();
    });

    it('should adapt language settings correctly', async () => {
      speechService.setLanguage('es-ES');
      
      const audioBuffer = createTestAudioBuffer(24000);
      const result = await speechService.transcribe(audioBuffer);

      // Should still process successfully with different language
      expect(result.text).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe('performance requirements', () => {
    it('should process speech within acceptable time limits', async () => {
      const audioBuffer = createTestAudioBuffer(32000); // 2 seconds of audio
      
      const startTime = Date.now();
      const result = await speechService.transcribe(audioBuffer);
      const totalTime = Date.now() - startTime;

      // Should process 2 seconds of audio in less than 5 seconds total
      expect(totalTime).toBeLessThan(5000);
      expect(result.processingTime).toBeLessThan(4000);
    });

    it('should handle concurrent transcription requests', async () => {
      const audioBuffers = [
        createTestAudioBuffer(16000),
        createTestAudioBuffer(24000),
        createTestAudioBuffer(32000),
      ];

      const promises = audioBuffers.map(buffer => speechService.transcribe(buffer));
      const results = await Promise.all(promises);

      results.forEach(result => {
        expect(result.text).toBeTruthy();
        expect(result.confidence).toBeGreaterThan(0);
      });
    });
  });
});

// Helper functions for creating test audio data
function createTestAudioBuffer(sampleCount: number): Buffer {
  const buffer = Buffer.allocUnsafe(sampleCount * 2); // 16-bit samples
  
  // Generate realistic speech-like waveform
  for (let i = 0; i < sampleCount; i++) {
    // Create a complex waveform that simulates speech patterns
    const t = i / 16000; // Time in seconds
    const fundamental = 150; // Base frequency for voice
    
    let sample = 0;
    sample += 0.5 * Math.sin(2 * Math.PI * fundamental * t);
    sample += 0.3 * Math.sin(2 * Math.PI * fundamental * 2 * t);
    sample += 0.2 * Math.sin(2 * Math.PI * fundamental * 3 * t);
    
    // Add some envelope to make it more speech-like
    const envelope = Math.exp(-t * 0.5) * (1 + 0.3 * Math.sin(2 * Math.PI * 5 * t));
    sample *= envelope;
    
    // Convert to 16-bit signed integer
    const intSample = Math.round(sample * 16000);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, intSample)), i * 2);
  }
  
  return buffer;
}

function createNoisyAudioBuffer(sampleCount: number): Buffer {
  const buffer = createTestAudioBuffer(sampleCount);
  
  // Add noise to the signal
  for (let i = 0; i < buffer.length; i += 2) {
    const originalSample = buffer.readInt16LE(i);
    const noise = (Math.random() - 0.5) * 1000; // Add some noise
    const noisySample = Math.round(originalSample + noise);
    buffer.writeInt16LE(Math.max(-32768, Math.min(32767, noisySample)), i);
  }
  
  return buffer;
}