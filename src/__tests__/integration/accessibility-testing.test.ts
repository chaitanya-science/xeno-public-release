
import { TextToSpeechService } from '../../audio/tts-interfaces';
import { TTSFactory } from '../../audio/tts-factory';
import { DefaultConfigManager } from '../../config/config-manager';

describe('Accessibility', () => {
  let ttsService: TextToSpeechService;

  beforeAll(async () => {
    const configManager = new DefaultConfigManager();
    await configManager.loadConfig();
    const config = configManager.getConfig();
    ttsService = TTSFactory.createTTSService(config);
  });

  it('should generate clear and understandable speech', async () => {
    const audioBuffer = await ttsService.synthesizeSpeech('This is a test of the text-to-speech engine.');
    expect(audioBuffer).toBeDefined();
    expect(audioBuffer.duration).toBeGreaterThan(0);
  });
});
