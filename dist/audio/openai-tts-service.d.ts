import { TextToSpeechService, TTSOptions, TTSConfig, VoiceOption } from './tts-interfaces';
import { EmotionalState } from '../types';
import { AudioBuffer } from './web-audio-types';
export declare class OpenAITextToSpeechService implements TextToSpeechService {
    private apiKey;
    private config;
    private isInitialized;
    private defaultVoice;
    constructor(config: TTSConfig);
    initialize(): Promise<void>;
    synthesizeSpeech(text: string, options?: TTSOptions): Promise<AudioBuffer>;
    synthesizeSpeechWithEmotion(text: string, emotionalState: EmotionalState, options?: TTSOptions): Promise<AudioBuffer>;
    synthesizeSpeechServerSide(text: string, options?: TTSOptions): Promise<void>;
    playAudio(audioBuffer: AudioBuffer): Promise<void>;
    speakText(text: string, options?: TTSOptions): Promise<void>;
    speakWithEmotion(text: string, emotionalState: EmotionalState, options?: TTSOptions): Promise<void>;
    handleTechnicalDelay(delayReason: string): Promise<void>;
    isAvailable(): Promise<boolean>;
    getVoiceOptions(): Promise<VoiceOption[]>;
    private adjustOptionsForEmotion;
    private addEmotionalPauses;
    private arrayBufferToAudioBuffer;
    dispose(): void;
    private cleanupTempFiles;
}
//# sourceMappingURL=openai-tts-service.d.ts.map