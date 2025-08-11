
import { GoogleTextToSpeechService } from '../../audio/google-text-to-speech-service';
import { TTSConfig } from '../../audio/tts-interfaces';

describe('Network Resilience', () => {
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

  it('should handle network errors gracefully', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
    await expect(ttsService.synthesizeSpeech('test')).rejects.toThrow('Network error');
  });
});
