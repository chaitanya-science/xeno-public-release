"use strict";
/**
 * Continuous Voice Assistant Manager
 * Manages always-on voice interactions without wake word detection
 * Provides seamless conversation experience with voice activity detection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinuousVoiceAssistant = exports.VoiceState = void 0;
const events_1 = require("events");
const continuous_audio_manager_1 = require("../audio/continuous-audio-manager");
var VoiceState;
(function (VoiceState) {
    VoiceState["IDLE"] = "IDLE";
    VoiceState["LISTENING"] = "LISTENING";
    VoiceState["PROCESSING"] = "PROCESSING";
    VoiceState["RESPONDING"] = "RESPONDING";
    VoiceState["ERROR"] = "ERROR";
})(VoiceState || (exports.VoiceState = VoiceState = {}));
class ContinuousVoiceAssistant extends events_1.EventEmitter {
    constructor(speechToTextService, textToSpeechService, conversationManager, config = {}, audioManagerConfig = {}, logger) {
        super();
        this.speechToTextService = speechToTextService;
        this.textToSpeechService = textToSpeechService;
        this.conversationManager = conversationManager;
        this.state = VoiceState.IDLE;
        this.currentSessionId = null;
        this.sessionTimer = null;
        this.retryCount = 0;
        this.isInitialized = false;
        this.logger = logger;
        this.config = {
            sessionTimeoutMs: 300000, // 5 minutes
            minConfidenceThreshold: 0.6,
            maxRetries: 3,
            responseDelayMs: 500,
            enableSmallTalk: true,
            greetingEnabled: true,
            defaultUserId: 'default-user',
            ...config
        };
        this.audioManager = new continuous_audio_manager_1.ContinuousAudioManager(speechToTextService, textToSpeechService, audioManagerConfig);
        this.setupEventHandlers();
    }
    /**
     * Initialize the continuous voice assistant
     */
    async initialize() {
        try {
            console.log('🤖 Initializing Continuous Voice Assistant...');
            // Initialize services
            await this.audioManager.initialize();
            await this.speechToTextService.initialize();
            this.setState(VoiceState.IDLE);
            this.isInitialized = true;
            console.log('✅ Continuous Voice Assistant initialized and ready!');
            console.log('🎙️ Speak anytime - no wake word needed!');
            if (this.config.greetingEnabled) {
                await this.playGreeting();
            }
            await this.startListening();
            this.emit('assistant_ready');
        }
        catch (error) {
            console.error('❌ Failed to initialize Continuous Voice Assistant:', error);
            this.setState(VoiceState.ERROR);
            this.emit('initialization_error', error);
            throw error;
        }
    }
    /**
     * Start continuous listening
     */
    async startListening() {
        if (!this.isInitialized) {
            throw new Error('Assistant not initialized');
        }
        try {
            await this.audioManager.startListening();
            this.setState(VoiceState.LISTENING);
            this.startSessionTimer();
            console.log('👂 Voice Assistant is now listening continuously...');
            this.emit('listening_started');
        }
        catch (error) {
            console.error('Failed to start listening:', error);
            this.setState(VoiceState.ERROR);
            this.emit('error', error);
        }
    }
    /**
     * Stop continuous listening
     */
    async stopListening() {
        try {
            await this.audioManager.stopListening();
            this.setState(VoiceState.IDLE);
            this.clearSessionTimer();
            console.log('🔇 Voice Assistant stopped listening');
            this.emit('listening_stopped');
        }
        catch (error) {
            console.error('Error stopping listening:', error);
        }
    }
    /**
     * Setup event handlers for audio manager
     */
    setupEventHandlers() {
        // Handle speech transcription
        this.audioManager.on('speech_transcribed', async (event) => {
            await this.handleUserInput(event.text, event.confidence);
        });
        // Handle low confidence transcription
        this.audioManager.on('low_confidence', async (event) => {
            await this.handleLowConfidence(event.text, event.confidence);
        });
        // Handle audio manager errors
        this.audioManager.on('error', (error) => {
            console.error('Audio Manager error:', error);
            this.emit('error', error);
        });
        // Pass through voice activity events
        this.audioManager.on('voice_activity', (event) => {
            this.emit('voice_activity', event);
        });
        // Handle speaking events
        this.audioManager.on('speaking_started', (event) => {
            this.setState(VoiceState.RESPONDING);
            this.emit('speaking_started', event);
        });
        this.audioManager.on('speaking_finished', (event) => {
            this.setState(VoiceState.LISTENING);
            this.emit('speaking_finished', event);
        });
    }
    /**
     * Handle user input from speech
     */
    async handleUserInput(text, confidence) {
        try {
            this.setState(VoiceState.PROCESSING);
            this.retryCount = 0;
            console.log(`📝 User said: "${text}" (confidence: ${confidence.toFixed(2)})`);
            this.emit('user_input', {
                type: 'user_input',
                text,
                confidence,
                timestamp: Date.now(),
                sessionId: this.currentSessionId
            });
            // Check if user wants to end conversation
            if (this.isEndCommand(text)) {
                await this.handleEndCommand(text);
                return;
            }
            // Start or continue conversation session
            if (!this.currentSessionId) {
                const session = await this.conversationManager.startSession(this.config.defaultUserId);
                this.currentSessionId = session.session_id;
                console.log(`🟢 Started new conversation session: ${this.currentSessionId}`);
            }
            // Process the message through the conversation manager
            const responseText = await this.conversationManager.processMessage(this.currentSessionId, text);
            // Respond to the user
            await this.processUserResponse(responseText);
            this.emit('assistant_response', {
                type: 'assistant_response',
                text: responseText,
                timestamp: Date.now(),
                sessionId: this.currentSessionId
            });
            // Refresh session timer
            this.refreshSessionTimer();
        }
        catch (error) {
            console.error('Error handling user input:', error);
            await this.handleError(error);
        }
    }
    /**
     * Process user request and generate response
     */
    async processUserRequest(userInput) {
        try {
            // Add small delay for natural conversation flow
            await new Promise(resolve => setTimeout(resolve, this.config.responseDelayMs));
            // Generate AI response
            const response = await this.conversationManager.processMessage(this.currentSessionId, userInput);
            console.log(`🤖 Assistant response: "${response}"`);
            this.emit('assistant_response', {
                type: 'assistant_response',
                text: response,
                timestamp: Date.now(),
                sessionId: this.currentSessionId
            });
            // Speak the response
            await this.audioManager.speakResponse(response);
            // Refresh session timer
            this.refreshSessionTimer();
        }
        catch (error) {
            console.error('Error processing user request:', error);
            await this.handleError(error);
        }
    }
    /**
     * Handle low confidence transcription
     */
    async handleLowConfidence(text, confidence) {
        this.retryCount++;
        if (this.retryCount >= this.config.maxRetries) {
            console.log('🤷 Multiple low confidence attempts, moving on...');
            this.retryCount = 0;
            return;
        }
        const clarificationMessages = [
            "I didn't catch that clearly. Could you please repeat?",
            "Sorry, could you say that again?",
            "I'm having trouble hearing you. Please try again.",
        ];
        const message = clarificationMessages[Math.min(this.retryCount - 1, clarificationMessages.length - 1)];
        console.log(`🤔 Low confidence (${confidence.toFixed(2)}), asking for clarification...`);
        await this.audioManager.speakResponse(message);
    }
    /**
     * Handle error situations
     */
    async handleError(error) {
        this.setState(VoiceState.ERROR);
        const errorMessage = "I'm having some technical difficulties. Please try again.";
        await this.audioManager.speakResponse(errorMessage);
        // Reset to listening state
        setTimeout(() => {
            this.setState(VoiceState.LISTENING);
        }, 2000);
        this.emit('error', error);
    }
    /**
     * Check if input is an end command
     */
    isEndCommand(text) {
        const endCommands = [
            'goodbye', 'bye', 'stop listening', 'end conversation',
            'that\'s all', 'thanks', 'thank you', 'see you later'
        ];
        const lowerText = text.toLowerCase().trim();
        return endCommands.some(cmd => lowerText.includes(cmd));
    }
    /**
     * Handle end conversation command
     */
    async handleEndCommand(text) {
        const farewellMessages = [
            "Goodbye! I'm here whenever you need to talk.",
            "Take care! I'll be listening when you're ready to chat again.",
            "See you later! Remember, I'm always here to help.",
            "Goodbye for now! Feel free to start talking anytime."
        ];
        const message = farewellMessages[Math.floor(Math.random() * farewellMessages.length)];
        await this.audioManager.speakResponse(message);
        if (this.currentSessionId) {
            await this.conversationManager.endSession(this.currentSessionId);
            this.currentSessionId = null;
            console.log('🔴 Conversation session ended');
        }
        this.emit('conversation_ended', { reason: 'user_command', text });
    }
    /**
     * Play greeting message
     */
    async playGreeting() {
        const greetings = [
            "Hello! I'm Xeno, your wellness companion. I'm here to listen and help anytime you want to talk.",
            "Hi there! I'm Xeno. I'm ready to chat with you about wellness, feelings, or anything else on your mind.",
            "Welcome! I'm Xeno, and I'm here to support your wellbeing. Just start talking whenever you're ready."
        ];
        const greeting = greetings[Math.floor(Math.random() * greetings.length)];
        // Small delay before greeting
        await new Promise(resolve => setTimeout(resolve, 1000));
        await this.audioManager.speakResponse(greeting);
    }
    /**
     * Start session timer
     */
    startSessionTimer() {
        this.clearSessionTimer();
        this.sessionTimer = setTimeout(async () => {
            console.log('⏰ Session timeout - Providing gentle reminder');
            const reminderMessage = "I'm still here if you'd like to talk about anything. Just start speaking anytime.";
            await this.audioManager.speakResponse(reminderMessage);
            // Reset session but keep listening
            if (this.currentSessionId) {
                await this.conversationManager.endSession(this.currentSessionId);
                this.currentSessionId = null;
            }
            this.emit('session_timeout');
            this.startSessionTimer(); // Restart timer
        }, this.config.sessionTimeoutMs);
    }
    /**
     * Refresh session timer
     */
    refreshSessionTimer() {
        this.startSessionTimer();
    }
    /**
     * Clear session timer
     */
    clearSessionTimer() {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
            this.sessionTimer = null;
        }
    }
    /**
     * Set state and emit change
     */
    setState(newState) {
        const oldState = this.state;
        this.state = newState;
        if (oldState !== newState) {
            console.log(`🔄 State: ${oldState} → ${newState}`);
            this.emit('state_changed', { from: oldState, to: newState });
        }
    }
    /**
     * Get current state
     */
    getState() {
        return this.state;
    }
    /**
     * Get session information
     */
    getSessionInfo() {
        return {
            state: this.state,
            sessionId: this.currentSessionId,
            isListening: true,
            isRecording: false,
            retryCount: this.retryCount,
            config: this.config
        };
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        console.log('🔧 Voice Assistant configuration updated');
        this.emit('config_updated', this.config);
    }
    /**
     * Force end current session
     */
    async endCurrentSession() {
        if (this.currentSessionId) {
            await this.conversationManager.endSession(this.currentSessionId);
            this.currentSessionId = null;
            console.log('🔴 Manually ended conversation session');
            this.emit('session_ended', { reason: 'manual' });
        }
    }
    /**
     * Stop the voice assistant
     */
    async stop() {
        this.logger.info('ContinuousVoiceAssistant', 'Stopping voice assistant.');
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer);
        }
        await this.audioManager.stopListening();
        this.setState(VoiceState.IDLE);
    }
    /**
     * Cleanup and dispose
     */
    async dispose() {
        try {
            await this.stopListening();
            this.clearSessionTimer();
            if (this.currentSessionId) {
                await this.conversationManager.endSession(this.currentSessionId);
            }
            this.removeAllListeners();
            console.log('🗑️ Continuous Voice Assistant disposed');
        }
        catch (error) {
            console.error('Error disposing voice assistant:', error);
        }
    }
    async processUserResponse(text) {
        this.setState(VoiceState.RESPONDING);
        this.emit('speaking_started', { text });
        await this.audioManager.pauseListening();
        try {
            await this.textToSpeechService.speakText(text);
        }
        catch (error) {
            this.logger.error('Error speaking response:', { error });
            this.emit('error', error);
        }
        finally {
            await this.audioManager.resumeListening();
            this.setState(VoiceState.LISTENING);
            this.emit('speaking_finished', { text });
            this.startSessionTimer(); // Restart session timer after speaking
        }
    }
}
exports.ContinuousVoiceAssistant = ContinuousVoiceAssistant;
//# sourceMappingURL=continuous-voice-assistant.js.map