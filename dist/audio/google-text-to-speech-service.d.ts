import { TextToSpeechService, TTSOptions, VoiceOption, TTSConfig, AudioPlaybackOptions } from './tts-interfaces';
import { EmotionalState } from '../types';
import { AudioBuffer } from './web-audio-types';
export declare class GoogleTextToSpeechService implements TextToSpeechService {
    private speechClient;
    private config;
    private audioContext;
    private isInitialized;
    private secureFetch;
    private testSimulateFailure;
    constructor(config: TTSConfig);
    initialize(): Promise<void>;
    synthesizeSpeech(text: string, options?: TTSOptions): Promise<AudioBuffer>;
    synthesizeSpeechWithEmotion(text: string, emotionalState: EmotionalState, options?: TTSOptions): Promise<AudioBuffer>;
    playAudio(audioBuffer: AudioBuffer, playbackOptions?: AudioPlaybackOptions): Promise<void>;
    speakText(text: string, options?: TTSOptions): Promise<void>;
    speakWithEmotion(text: string, emotionalState: EmotionalState, options?: TTSOptions): Promise<void>;
    handleTechnicalDelay(delayReason: string): Promise<void>;
    isAvailable(): Promise<boolean>;
    getVoiceOptions(): Promise<VoiceOption[]>;
    private generateSSML;
    private makeTextHumanLike;
    private addNaturalPauses;
    private adaptOptionsForEmotion;
    private applyEmotionalContext;
    private addGentleTone;
    private addWarmTone;
    private addCalmingTone;
    private addEncouragingTone;
    private findEmotionalMapping;
    private selectVoiceForEmotion;
    private formatSpeed;
    private formatPitch;
    private getDelayExplanation;
    private callGoogleTTS;
    private getGenderFromVoice;
    private handleTTSError;
    dispose(): Promise<void>;
    /**
     * Server-side speech synthesis without AudioContext
     * Uses Google Cloud TTS API directly and plays audio via system commands
     */
    synthesizeSpeechServerSide(text: string, options?: TTSOptions): Promise<void>;
}
//# sourceMappingURL=google-text-to-speech-service.d.ts.map