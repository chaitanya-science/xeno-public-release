/**
 * Voice Assistant Manager
 * Implements Alexa-like continuous listening functionality
 * Handles session-based voice interactions without repeated wake words
 */
import { EventEmitter } from 'events';
import { SpeechToTextService } from '../audio/interfaces';
import { TextToSpeechService } from '../audio/tts-interfaces';
import { ConversationManager } from '../conversation/interfaces';
export interface VoiceSessionConfig {
    sessionTimeoutMs: number;
    silenceDetectionMs: number;
    minSpeechDurationMs: number;
    maxSpeechDurationMs: number;
    voiceActivityThreshold: number;
    wakeWordCooldownMs: number;
}
export declare enum VoiceSessionState {
    IDLE = "IDLE",// Waiting for wake word
    LISTENING = "LISTENING",// Actively listening for user speech
    PROCESSING = "PROCESSING",// Processing user request
    RESPONDING = "RESPONDING",// Playing response
    SESSION_ACTIVE = "SESSION_ACTIVE"
}
export interface VoiceActivityEvent {
    type: 'speech_start' | 'speech_end' | 'silence_detected' | 'volume_level';
    timestamp: number;
    data?: any;
}
export declare class VoiceAssistantManager extends EventEmitter {
    private state;
    private currentSessionId;
    private currentUserId;
    private audioBuffer;
    private isRecording;
    private silenceTimer;
    private sessionTimer;
    private isProcessingAudio;
    private config;
    private speechToTextService;
    private textToSpeechService;
    private conversationManager;
    private lastVolumeLevel;
    private speechStartTime;
    private silenceStartTime;
    constructor(speechToTextService: SpeechToTextService, textToSpeechService: TextToSpeechService, conversationManager: ConversationManager, config: VoiceSessionConfig);
    /**
     * Initializes the voice assistant and its components
     */
    initialize(): Promise<void>;
    /**
     * Start listening for continuous speech
     */
    startSession(trigger?: 'manual' | 'wake_word'): Promise<void>;
    /**
     * Start listening for continuous speech
     */
    private startSpeechListening;
    /**
     * Capture and analyze audio for voice activity detection
     */
    private startAudioCapture;
    /**
     * Process voice activity detection
     */
    private processVoiceActivity;
    /**
     * Finalize speech input and process the request
     */
    private finalizeSpeechInput;
    /**
     * Process user request and generate response
     */
    private processUserRequest;
    /**
     * Convert response to speech and play it
     */
    private speakResponse;
    /**
     * Continue session - listen for next input without wake word
     */
    private continueSession;
    /**
     * End the current session and return to wake word detection
     */
    private endSession;
    /**
     * Reset to idle state and resume wake word detection
     */
    private resetToIdle;
    /**
     * Start wake word listening
     */
    private startWakeWordListening;
    /**
     * Handle session timeout
     */
    private handleSessionTimeout;
    /**
     * Handle low confidence transcription
     */
    private handleLowConfidenceTranscription;
    /**
     * Handle speech processing errors
     */
    private handleSpeechError;
    /**
     * Handle request processing errors
     */
    private handleRequestError;
    /**
     * Check if input is a session end command
     */
    private isSessionEndCommand;
    /**
     * Set the current state and emit state change
     */
    private setState;
    private captureAudioChunk;
    private analyzeVolumeLevel;
    private playAudio;
    private playAcknowledgment;
    private playSessionEndSound;
    private playTimeoutMessage;
    /**
     * Get current assistant state
     */
    getState(): VoiceSessionState;
    /**
     * Get current session information
     */
    getSessionInfo(): {
        state: VoiceSessionState;
        sessionId: string | null;
        userId: string;
        isRecording: boolean;
        lastVolumeLevel: number;
    };
    /**
     * Manual session end (for testing or UI controls)
     */
    forceEndSession(): Promise<void>;
    /**
     * Cleanup resources
     */
    dispose(): Promise<void>;
}
//# sourceMappingURL=voice-assistant-manager.d.ts.map