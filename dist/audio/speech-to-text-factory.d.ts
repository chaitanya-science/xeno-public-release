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
export declare class SpeechToTextFactory {
    /**
     * Create a Google Cloud Speech-to-Text service instance
     */
    static createGoogleSpeechService(config?: SpeechToTextConfigService): SpeechToTextService;
    /**
     * Create a Google STT service instance (fallback for compatibility)
     */
    static createOpenAISpeechService(config?: SpeechToTextConfigService): SpeechToTextService;
    /**
     * Create a speech service with wellness-optimized configuration
     */
    static createWellnessOptimizedService(config?: SpeechToTextConfigService): SpeechToTextService;
    /**
     * Create a resilient STT that always uses Google for reliability
     */
    static createResilientService(primary: 'google' | 'openai', config?: SpeechToTextConfigService): SpeechToTextService;
    /**
     * Create service from environment variables
     */
    static createFromEnvironment(): SpeechToTextService;
}
//# sourceMappingURL=speech-to-text-factory.d.ts.map