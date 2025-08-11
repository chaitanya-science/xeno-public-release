import { SpeechToTextService, SpeechRecognitionResult, AudioProcessor } from './interfaces';
/**
 * Google Cloud Speech-to-Text implementation for speech recognition
 * Provides high-accuracy speech recognition with adaptation capabilities
 */
export declare class GoogleSpeechToTextService implements SpeechToTextService {
    private projectId?;
    private keyFilename?;
    private credentials?;
    private speechClient;
    private audioProcessor;
    private currentLanguage;
    private isInitialized;
    private readonly RECOGNITION_TIMEOUT_MS;
    private readonly MIN_CONFIDENCE_THRESHOLD;
    private readonly MAX_ALTERNATIVES;
    constructor(projectId?: string | undefined, keyFilename?: string | undefined, audioProcessor?: AudioProcessor, credentials?: any | undefined);
    /**
     * Initialize the Google Cloud Speech service
     */
    initialize(): Promise<void>;
    /**
     * Transcribe audio buffer to text with preprocessing
     */
    transcribe(audioBuffer: Buffer): Promise<SpeechRecognitionResult>;
    /**
     * Set the recognition language
     */
    setLanguage(language: string): void;
    /**
     * Adapt recognition to specific speaker patterns
     * This is a placeholder for future speaker adaptation features
     */
    adaptToSpeaker(userId: string): Promise<void>;
    /**
     * Create timeout promise for recognition requests
     */
    private createTimeoutPromise;
    /**
     * Process and validate Google Cloud recognition result
     */
    private processGoogleRecognitionResult;
    /**
     * Create error result with user-friendly message
     */
    private createErrorResult;
    /**
     * Clean up resources
     */
    dispose(): void;
}
//# sourceMappingURL=speech-to-text-service.d.ts.map