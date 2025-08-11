/**
 * Continuous Voice Assistant Manager
 * Manages always-on voice interactions without wake word detection
 * Provides seamless conversation experience with voice activity detection
 */
import { EventEmitter } from 'events';
import { SpeechToTextService } from '../audio/interfaces';
import { TextToSpeechService } from '../audio/tts-interfaces';
import { ConversationManager } from '../conversation/interfaces';
export interface ContinuousVoiceConfig {
    sessionTimeoutMs: number;
    minConfidenceThreshold: number;
    maxRetries: number;
    responseDelayMs: number;
    enableSmallTalk: boolean;
    greetingEnabled: boolean;
    defaultUserId: string;
}
export declare enum VoiceState {
    IDLE = "IDLE",
    LISTENING = "LISTENING",
    PROCESSING = "PROCESSING",
    RESPONDING = "RESPONDING",
    ERROR = "ERROR"
}
export interface ConversationEvent {
    type: 'user_input' | 'assistant_response' | 'error' | 'timeout';
    text?: string;
    confidence?: number;
    timestamp: number;
    sessionId?: string;
}
export declare class ContinuousVoiceAssistant extends EventEmitter {
    private speechToTextService;
    private textToSpeechService;
    private conversationManager;
    private state;
    private audioManager;
    private currentSessionId;
    private config;
    private sessionTimer;
    private retryCount;
    private isInitialized;
    private logger;
    constructor(speechToTextService: SpeechToTextService, textToSpeechService: TextToSpeechService, conversationManager: ConversationManager, config: Partial<ContinuousVoiceConfig> | undefined, audioManagerConfig: Partial<import("../audio/continuous-audio-manager").ContinuousAudioConfig> | undefined, logger: any);
    /**
     * Initialize the continuous voice assistant
     */
    initialize(): Promise<void>;
    /**
     * Start continuous listening
     */
    startListening(): Promise<void>;
    /**
     * Stop continuous listening
     */
    stopListening(): Promise<void>;
    /**
     * Setup event handlers for audio manager
     */
    private setupEventHandlers;
    /**
     * Handle user input from speech
     */
    private handleUserInput;
    /**
     * Process user request and generate response
     */
    private processUserRequest;
    /**
     * Handle low confidence transcription
     */
    private handleLowConfidence;
    /**
     * Handle error situations
     */
    private handleError;
    /**
     * Check if input is an end command
     */
    private isEndCommand;
    /**
     * Handle end conversation command
     */
    private handleEndCommand;
    /**
     * Play greeting message
     */
    private playGreeting;
    /**
     * Start session timer
     */
    private startSessionTimer;
    /**
     * Refresh session timer
     */
    private refreshSessionTimer;
    /**
     * Clear session timer
     */
    private clearSessionTimer;
    /**
     * Set state and emit change
     */
    private setState;
    /**
     * Get current state
     */
    getState(): VoiceState;
    /**
     * Get session information
     */
    getSessionInfo(): {
        state: VoiceState;
        sessionId: string | null;
        isListening: boolean;
        isRecording: boolean;
        retryCount: number;
        config: ContinuousVoiceConfig;
    };
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<ContinuousVoiceConfig>): void;
    /**
     * Force end current session
     */
    endCurrentSession(): Promise<void>;
    /**
     * Stop the voice assistant
     */
    stop(): Promise<void>;
    /**
     * Cleanup and dispose
     */
    dispose(): Promise<void>;
    private processUserResponse;
}
//# sourceMappingURL=continuous-voice-assistant.d.ts.map