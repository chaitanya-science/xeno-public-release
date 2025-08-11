
import { performanceManager } from '../../performance/performance-manager';
import { GoogleTextToSpeechService } from '../../audio/google-text-to-speech-service';
import { TTSConfig } from '../../audio/tts-interfaces';

describe('Performance', () => {
  let ttsService: GoogleTextToSpeechService;
  let mockConfig: TTSConfig;

  beforeEach(() => {
    mockConfig = {
        provider: 'google',
        apiKey: 'test-api-key',
        region: 'us-central1',
        defaultVoice: 'en-US-Neural2-C',
        defaultLanguage: 'en-US',
        defaultSpeed: 1.0,
        emotionalMappings: [],
        naturalPauses: { sentence: 100, paragraph: 200, comma: 50, period: 100 },
        technicalDelayMessages: ['Please wait.'],
    };
    ttsService = new GoogleTextToSpeechService(mockConfig);
  });

  it('should synthesize speech within an acceptable time frame', async () => {
    const startTime = Date.now();
    await ttsService.synthesizeSpeech('This is a performance test.');
    const endTime = Date.now();
    const duration = endTime - startTime;
    performanceManager.recordMetrics({ textToSpeechLatency: duration });
    expect(duration).toBeLessThan(2000); // 2 seconds
  });
});
