/**
 * Voice Assistant Manager
 * Implements Alexa-like continuous listening functionality
 * Handles session-based voice interactions without repeated wake words
 */

import { EventEmitter } from 'events';
import { SpeechToTextService } from '../audio/interfaces';
import { TextToSpeechService } from '../audio/tts-interfaces';
import { ConversationManager } from '../conversation/interfaces';
import { performanceManager } from '../performance/performance-manager';

export interface VoiceSessionConfig {
  sessionTimeoutMs: number;        // Time before session auto-expires
  silenceDetectionMs: number;      // Silence duration to detect end of speech
  minSpeechDurationMs: number;     // Minimum speech duration to process
  maxSpeechDurationMs: number;     // Maximum speech duration (safety limit)
  voiceActivityThreshold: number;  // Volume threshold for voice activity
  wakeWordCooldownMs: number;      // Cooldown before wake word detection resumes
}

export enum VoiceSessionState {
  IDLE = 'IDLE',                    // Waiting for wake word
  LISTENING = 'LISTENING',          // Actively listening for user speech
  PROCESSING = 'PROCESSING',        // Processing user request
  RESPONDING = 'RESPONDING',        // Playing response
  SESSION_ACTIVE = 'SESSION_ACTIVE' // Session active, ready for next input
}

export interface VoiceActivityEvent {
  type: 'speech_start' | 'speech_end' | 'silence_detected' | 'volume_level';
  timestamp: number;
  data?: any;
}

export class VoiceAssistantManager extends EventEmitter {
  private state: VoiceSessionState = VoiceSessionState.IDLE;
  private currentSessionId: string | null = null;
  private currentUserId: string = 'default-user';
  
  // Audio processing
  private audioBuffer: Buffer[] = [];
  private isRecording = false;
  private silenceTimer: NodeJS.Timeout | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;
  private isProcessingAudio = false;
  
  // Configuration
  private config: VoiceSessionConfig;
  private speechToTextService: SpeechToTextService;
  private textToSpeechService: TextToSpeechService;
  private conversationManager: ConversationManager;
  
  // Audio analysis
  private lastVolumeLevel = 0;
  private speechStartTime: number | null = null;
  private silenceStartTime: number | null = null;

  constructor(
    speechToTextService: SpeechToTextService,
    textToSpeechService: TextToSpeechService,
    conversationManager: ConversationManager,
    config: VoiceSessionConfig
  ) {
    super();
    this.speechToTextService = speechToTextService;
    this.textToSpeechService = textToSpeechService;
    this.conversationManager = conversationManager;
    this.config = config;
  }

  /**
   * Initializes the voice assistant and its components
   */
  async initialize(): Promise<void> {
    try {
      await this.speechToTextService.initialize();
      // Note: TTS service initializes internally when first used
      
      this.setState(VoiceSessionState.IDLE);
      this.emit('assistant_ready');
      console.log('🎙️ Xeno Voice Assistant initialized - Ready for voice input');
    } catch (error) {
      this.emit('assistant_error', { 
        phase: 'initialization', 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  /**
   * Start listening for continuous speech
   */
  public async startSession(trigger: 'manual' | 'wake_word' = 'manual'): Promise<void> {
    if (this.state !== VoiceSessionState.IDLE) {
      console.log(`Cannot start session in state: ${this.state}`);
      return;
    }
    
    this.currentSessionId = `session-${Date.now()}`;
    console.log(`🚀 Starting new voice session: ${this.currentSessionId} (Trigger: ${trigger})`);
    
    await this.playAcknowledgment();
    await this.startSpeechListening();
    
    this.emit('session_started', { sessionId: this.currentSessionId, trigger });
  }

  /**
   * Start listening for continuous speech
   */
  private async startSpeechListening(): Promise<void> {
    this.setState(VoiceSessionState.LISTENING);
    this.audioBuffer = [];
    this.isRecording = true;
    this.speechStartTime = null;
    this.silenceStartTime = null;
    
    console.log('👂 Listening for speech...');
    
    // Start session timeout
    this.sessionTimer = setTimeout(() => {
      this.handleSessionTimeout();
    }, this.config.sessionTimeoutMs);
    
    // Start audio capture and analysis
    this.startAudioCapture();
    
    this.emit('listening_started');
  }

  /**
   * Capture and analyze audio for voice activity detection
   */
  private async startAudioCapture(): Promise<void> {
    const captureAudio = async () => {
      if (!this.isRecording) return;
      
      try {
        // In a real implementation, this would capture from microphone
        // For now, we'll simulate audio capture
        const audioChunk = await this.captureAudioChunk();
        
        if (audioChunk) {
          const volumeLevel = this.analyzeVolumeLevel(audioChunk);
          await this.processVoiceActivity(audioChunk, volumeLevel);
        }
        
        // Continue capturing
        setImmediate(captureAudio);
        
      } catch (error) {
        console.error('Error capturing audio:', error);
        await this.handleSpeechError(error);
      }
    };
    
    captureAudio();
  }

  /**
   * Process voice activity detection
   */
  private async processVoiceActivity(audioChunk: Buffer, volumeLevel: number): Promise<void> {
    this.lastVolumeLevel = volumeLevel;
    
    const isSpeechDetected = volumeLevel > this.config.voiceActivityThreshold;
    
    if (isSpeechDetected) {
      // Speech detected
      if (!this.speechStartTime) {
        this.speechStartTime = Date.now();
        this.silenceStartTime = null;
        console.log('🗣️ Speech detected - Recording...');
        this.emit('speech_detected');
      }
      
      // Add to buffer
      this.audioBuffer.push(audioChunk);
      
      // Check for maximum speech duration
      if (this.speechStartTime && (Date.now() - this.speechStartTime) > this.config.maxSpeechDurationMs) {
        console.log('⏰ Maximum speech duration reached - Processing...');
        await this.finalizeSpeechInput();
      }
      
    } else {
      // Silence detected
      if (this.speechStartTime && !this.silenceStartTime) {
        this.silenceStartTime = Date.now();
        console.log('🤫 Silence detected - Waiting for speech end...');
      }
      
      // Check if silence duration indicates end of speech
      if (this.silenceStartTime && this.speechStartTime) {
        const silenceDuration = Date.now() - this.silenceStartTime;
        const speechDuration = this.silenceStartTime - this.speechStartTime;
        
        if (silenceDuration >= this.config.silenceDetectionMs && 
            speechDuration >= this.config.minSpeechDurationMs) {
          console.log('✅ End of speech detected - Processing...');
          await this.finalizeSpeechInput();
        }
      }
    }
    
    // Emit volume level for monitoring
    this.emit('voice_activity', {
      type: 'volume_level',
      timestamp: Date.now(),
      data: { volumeLevel, isSpeechDetected }
    });
  }

  /**
   * Finalize speech input and process the request
   */
  private async finalizeSpeechInput(): Promise<void> {
    if (!this.isRecording || this.audioBuffer.length === 0) return;
    
    this.isRecording = false;
    this.setState(VoiceSessionState.PROCESSING);
    
    try {
      console.log('🔄 Processing speech input...');
      
      // Clear timers
      if (this.silenceTimer) {
        clearTimeout(this.silenceTimer);
        this.silenceTimer = null;
      }
      
      // Combine audio buffer
      const completeAudioBuffer = Buffer.concat(this.audioBuffer);
      this.audioBuffer = [];
      
      // Process speech to text
      const transcriptionResult = await this.speechToTextService.transcribe(completeAudioBuffer);
      
      if (!transcriptionResult.text || transcriptionResult.confidence < 0.7) {
        await this.handleLowConfidenceTranscription();
        return;
      }
      
      console.log(`📝 Transcribed: "${transcriptionResult.text}"`);
      this.emit('speech_transcribed', { text: transcriptionResult.text, confidence: transcriptionResult.confidence });
      
      // Check for session end commands
      if (this.isSessionEndCommand(transcriptionResult.text)) {
        await this.endSession();
        return;
      }
      
      // Process the request
      await this.processUserRequest(transcriptionResult.text);
      
    } catch (error) {
      console.error('Error processing speech:', error);
      await this.handleSpeechError(error);
    }
  }

  /**
   * Process user request and generate response
   */
  private async processUserRequest(userInput: string): Promise<void> {
    if (!this.currentSessionId) {
      throw new Error('No active session');
    }
    
    try {
      // Process message through conversation manager
      const response = await this.conversationManager.processMessage(
        this.currentSessionId, 
        userInput
      );
      
      console.log(`🤖 Response: "${response}"`);
      this.emit('response_generated', { input: userInput, response });
      
      // Convert response to speech and play
      await this.speakResponse(response);
      
      // Continue listening for next input (session remains active)
      await this.continueSession();
      
    } catch (error) {
      console.error('Error processing request:', error);
      await this.handleRequestError(error);
    }
  }

  /**
   * Convert response to speech and play it
   */
  private async speakResponse(response: string): Promise<void> {
    this.setState(VoiceSessionState.RESPONDING);
    
    try {
      // Use the correct method from TTS interface
      await this.textToSpeechService.speakText(response);
      
      console.log('🔊 Response played');
      this.emit('response_played', { response });
      
    } catch (error) {
      console.error('Error speaking response:', error);
      // Fallback to text display
      console.log(`🤖 [Text Response]: ${response}`);
      this.emit('response_error', { response, error });
    }
  }

  /**
   * Continue session - listen for next input without wake word
   */
  private async continueSession(): Promise<void> {
    if (!this.currentSessionId) {
      await this.resetToIdle();
      return;
    }
    
    console.log('👂 Session continues - Listening for next input...');
    this.setState(VoiceSessionState.SESSION_ACTIVE);
    
    // Brief pause before starting to listen again
    setTimeout(async () => {
      if (this.state === VoiceSessionState.SESSION_ACTIVE) {
        await this.startSpeechListening();
      }
    }, 1000); // 1 second pause
  }

  /**
   * End the current session and return to wake word detection
   */
  private async endSession(): Promise<void> {
    console.log('🛑 Ending voice session');
    
    if (this.currentSessionId) {
      await this.conversationManager.endSession(this.currentSessionId);
      this.currentSessionId = null;
    }
    
    await this.playSessionEndSound();
    await this.resetToIdle();
    
    this.emit('session_ended');
  }

  /**
   * Reset to idle state and resume wake word detection
   */
  private async resetToIdle(): Promise<void> {
    // Clean up timers
    if (this.sessionTimer) {
      clearTimeout(this.sessionTimer);
      this.sessionTimer = null;
    }
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
    
    // Reset state
    this.isRecording = false;
    this.audioBuffer = [];
    this.speechStartTime = null;
    this.silenceStartTime = null;
    
    this.setState(VoiceSessionState.IDLE);
    
    // Brief cooldown before resuming wake word detection
    setTimeout(async () => {
      await this.startWakeWordListening();
      console.log('🎙️ Ready for wake word');
    }, this.config.wakeWordCooldownMs);
  }

  /**
   * Start wake word listening
   */
  private async startWakeWordListening(): Promise<void> {
    try {
      // No wake word detector to start
    } catch (error) {
      console.error('Error starting wake word detection:', error);
      this.emit('wake_word_error', error);
    }
  }

  /**
   * Handle session timeout
   */
  private async handleSessionTimeout(): Promise<void> {
    console.log('⏰ Session timeout - Ending session');
    await this.playTimeoutMessage();
    await this.endSession();
  }

  /**
   * Handle low confidence transcription
   */
  private async handleLowConfidenceTranscription(): Promise<void> {
    const clarificationMessage = "I didn't catch that. Could you please repeat what you said?";
    await this.speakResponse(clarificationMessage);
    await this.continueSession();
  }

  /**
   * Handle speech processing errors
   */
  private async handleSpeechError(error: any): Promise<void> {
    console.error('Speech processing error:', error);
    const errorMessage = "Sorry, I had trouble understanding. Please try again.";
    await this.speakResponse(errorMessage);
    await this.continueSession();
  }

  /**
   * Handle request processing errors
   */
  private async handleRequestError(error: any): Promise<void> {
    console.error('Request processing error:', error);
    const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
    await this.speakResponse(errorMessage);
    await this.continueSession();
  }

  /**
   * Check if input is a session end command
   */
  private isSessionEndCommand(text: string): boolean {
    const endCommands = [
      'stop', 'exit', 'quit', 'goodbye', 'bye', 'end session',
      'that\'s all', 'thank you', 'no more questions'
    ];
    
    const lowerText = text.toLowerCase().trim();
    return endCommands.some(cmd => lowerText.includes(cmd));
  }

  /**
   * Set the current state and emit state change
   */
  private setState(newState: VoiceSessionState): void {
    const oldState = this.state;
    this.state = newState;
    
    this.emit('state_changed', { 
      from: oldState, 
      to: newState, 
      timestamp: Date.now() 
    });
  }

  // Helper methods for audio operations (to be implemented with actual audio libraries)
  
  private async captureAudioChunk(): Promise<Buffer> {
    // Placeholder - implement with actual microphone capture
    return Buffer.alloc(1024);
  }
  
  private analyzeVolumeLevel(audioChunk: Buffer): number {
    // Placeholder - implement actual volume analysis
    return Math.random() * 0.1; // Simulate volume levels
  }
  
  private async playAudio(audioBuffer: any): Promise<void> {
    // Placeholder - implement with actual audio playback
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  private async playAcknowledgment(): Promise<void> {
    console.log('🎵 Xeno: Speaking with soft, therapeutic voice');
    // Brief tone or "Hello, I'm Xeno" to indicate listening
    await this.speakResponse("Hello, I'm Xeno. How can I help you?");
  }
  
  private async playSessionEndSound(): Promise<void> {
    console.log('🔊 Xeno: Session ending');
    // Brief tone to indicate session ended
  }
  
  private async playTimeoutMessage(): Promise<void> {
    const timeoutMessage = "This is Xeno. I'm going to sleep now. Say 'Xeno' to wake me up again.";
    await this.speakResponse(timeoutMessage);
  }

  /**
   * Get current assistant state
   */
  getState(): VoiceSessionState {
    return this.state;
  }

  /**
   * Get current session information
   */
  getSessionInfo() {
    return {
      state: this.state,
      sessionId: this.currentSessionId,
      userId: this.currentUserId,
      isRecording: this.isRecording,
      lastVolumeLevel: this.lastVolumeLevel
    };
  }

  /**
   * Manual session end (for testing or UI controls)
   */
  async forceEndSession(): Promise<void> {
    await this.endSession();
  }

  /**
   * Cleanup resources
   */
  async dispose(): Promise<void> {
    await this.endSession();
    this.removeAllListeners();
  }
}
