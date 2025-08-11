import { GoogleSpeechToTextService } from './speech-to-text-service';
import { BasicAudioProcessor } from './audio-processor';
import { SpeechToTextService, AudioProcessor } from './interfaces';

/**
 * Configuration interface for speech-to-text service
 */
export interface SpeechToTextConfigService {
  projectId?: string;
  keyFilename?: string;
  language?: string;
  audioProcessor?: AudioProcessor;
  provider?: 'google' | 'openai';
  openaiApiKey?: string;
  openaiModel?: string;
  googleCredentials?: any;
}

/**
 * Factory for creating and configuring speech-to-text services
 */
export class SpeechToTextFactory {
  /**
   * Create a Google Cloud Speech-to-Text service instance
   */
  static createGoogleSpeechService(config: SpeechToTextConfigService = {}): SpeechToTextService {
    const {
      projectId,
      keyFilename,
      language = 'en-US',
      audioProcessor = new BasicAudioProcessor()
    } = config;

  const service = new GoogleSpeechToTextService(projectId, keyFilename, audioProcessor, config.googleCredentials);
    
    // Set language if specified
    if (language !== 'en-US') {
      service.setLanguage(language);
    }

    return service;
  }

  /**
   * Create a Google STT service instance (fallback for compatibility)
   */
  static createOpenAISpeechService(config: SpeechToTextConfigService = {}): SpeechToTextService {
    // Fallback to Google STT since OpenAI STT is removed
    return this.createGoogleSpeechService(config);
  }

  /**
   * Create a speech service with wellness-optimized configuration
   */
  static createWellnessOptimizedService(config: SpeechToTextConfigService = {}): SpeechToTextService {
  const enhancedProcessor = new BasicAudioProcessor();
  const cfg = { ...config, audioProcessor: enhancedProcessor, language: config.language || 'en-US' };
  // Always use Google STT for reliability
  return this.createGoogleSpeechService(cfg);
  }

  /**
   * Create a resilient STT that always uses Google for reliability
   */
  static createResilientService(primary: 'google' | 'openai', config: SpeechToTextConfigService = {}): SpeechToTextService {
    // Always use Google STT for reliability
    const primarySvc = this.createGoogleSpeechService(config);
    const secondarySvc = this.createGoogleSpeechService(config);

    // Wrap both services into a simple try/fallback implementation
    const wrapper: SpeechToTextService = {
      async initialize() {
        try { 
          console.log(`🔧 Initializing primary STT service: ${primary}`);
          await primarySvc.initialize(); 
        } catch (error) { 
          console.log(`⚠️ Primary STT service failed to initialize, trying secondary...`);
          try { await secondarySvc.initialize(); } catch { /* best effort */ }
        }
      },
      async transcribe(audio: Buffer) {
        try {
          console.log(`🎯 Using primary STT service: ${primary}`);
          const res = await primarySvc.transcribe(audio);
          if (res.text && res.text.trim()) return res;
          // If empty/low, try secondary
          console.log(`⚠️ Primary STT returned empty result, trying secondary...`);
          const res2 = await secondarySvc.transcribe(audio);
          return res2;
        } catch (error) {
          console.log(`❌ Primary STT failed, falling back to secondary:`, error);
          try { return await secondarySvc.transcribe(audio); } catch { return { text: '', confidence: 0, alternatives: [], processingTime: 0 }; }
        }
      },
      setLanguage(lang: string) { try { primarySvc.setLanguage(lang); } catch {} try { secondarySvc.setLanguage(lang); } catch {} },
      async adaptToSpeaker(uid: string) { try { await primarySvc.adaptToSpeaker(uid); } catch {} try { await secondarySvc.adaptToSpeaker(uid); } catch {} },
      dispose() { try { primarySvc.dispose(); } catch {} try { secondarySvc.dispose(); } catch {} }
    } as SpeechToTextService;

    return wrapper;
  }

  /**
   * Create service from environment variables
   */
  static createFromEnvironment(): SpeechToTextService {
    // Prefer config-driven; keep minimal env fallback
    const config: SpeechToTextConfigService = {
      language: 'en-US'
    };

    return this.createWellnessOptimizedService(config);
  }
}