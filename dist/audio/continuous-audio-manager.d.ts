/**
 * Continuous Audio Manager
 * Handles always-on voice detection without wake word requirements
 * Implements voice activity detection for seamless conversation
 */
import { EventEmitter } from 'events';
import { SpeechToTextService } from './interfaces';
import { TextToSpeechService } from './tts-interfaces';
export interface ContinuousAudioConfig {
    sampleRate: number;
    channels: number;
    bitDepth: number;
    bufferSize: number;
    silenceTimeout: number;
    maxRecordingTime: number;
    energyThreshold: number;
    pauseThreshold: number;
    voiceActivationEnabled: boolean;
    continuousListening: boolean;
    autoStart: boolean;
    dynamicThresholdMultiplier: number;
    vadActivationFrames: number;
    minSpeechMs: number;
    postSpeechCooldownMs: number;
    continueThresholdRatio?: number;
}
export interface AudioChunk {
    data: Buffer;
    timestamp: number;
    volumeLevel: number;
}
export interface AudioVoiceActivityEvent {
    type: 'voice_start' | 'voice_end' | 'silence_detected' | 'speech_ready';
    timestamp: number;
    data?: any;
}
export declare class ContinuousAudioManager extends EventEmitter {
    private speechToTextService;
    private textToSpeechService;
    private config;
    private isListening;
    private isRecording;
    private isPaused;
    private audioBuffer;
    private speechStartTime;
    private silenceStartTime;
    private lastVolumeLevel;
    private noiseFloor;
    private activeFramesCount;
    private lastFinalizeTime;
    private silenceTimer;
    private recordingTimer;
    private recorder;
    constructor(speechToTextService: SpeechToTextService, textToSpeechService: TextToSpeechService, config?: Partial<ContinuousAudioConfig>);
    /**
     * Initialize the continuous audio manager
     */
    initialize(): Promise<void>;
    /**
     * Start continuous listening for voice input
     */
    startListening(): Promise<void>;
    /**
     * Stop continuous listening
     */
    stopListening(): Promise<void>;
    /**
     * Pause listening (e.g., while TTS is speaking)
     */
    pauseListening(): Promise<void>;
    /**
     * Resume listening after being paused
     */
    resumeListening(): Promise<void>;
    /**
     * Main audio capture loop with voice activity detection
     */
    private startAudioCapture;
    private processPcmData;
    private processAudioChunk;
    private startRecording;
    private handleSpeechDetected;
    private handleSilenceDetected;
    private finalizeSpeech;
    speakResponse(text: string): Promise<void>;
    private resetRecording;
    private playAudioBuffer;
    private downsampleTo16k;
    private resampleTo16k;
    private getBufferedDurationMs;
}
//# sourceMappingURL=continuous-audio-manager.d.ts.map