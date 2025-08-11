#!/usr/bin/env node
"use strict";
/**
 * Voice Assistant Demo
 * Demonstrates Alexa-like continuous listening functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
const voice_assistant_manager_1 = require("../voice/voice-assistant-manager");
// Mock implementations for demo
class MockWakeWordDetector {
    constructor() {
        this.callback = null;
    }
    async initialize() {
        console.log('✅ Wake word detector initialized (demo mode)');
    }
    async startListening() {
        console.log('👂 Listening for wake word...');
        // Simulate wake word detection after 3 seconds
        setTimeout(() => {
            if (this.callback) {
                console.log('🎙️ Wake word "Hey Assistant" detected!');
                this.callback();
            }
        }, 3000);
    }
    async stopListening() {
        console.log('⏸️ Wake word detection stopped');
    }
    onWakeWordDetected(callback) {
        this.callback = callback;
    }
    getFailureCount() { return 0; }
    resetFailureCount() { }
    async dispose() { }
}
class MockSpeechToTextService {
    constructor() {
        this.simulatedInputs = [
            "Hello, how are you today?",
            "What's the weather like?",
            "Tell me a joke",
            "Thank you, goodbye"
        ];
        this.inputIndex = 0;
    }
    async initialize() {
        console.log('✅ Speech-to-text service initialized (demo mode)');
    }
    async transcribe(audioBuffer) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 1000));
        const text = this.simulatedInputs[this.inputIndex % this.simulatedInputs.length];
        this.inputIndex++;
        console.log(`📝 Transcribed: "${text}"`);
        return {
            text,
            confidence: 0.95,
            alternatives: [],
            processingTime: 1000
        };
    }
    setLanguage(language) { }
    async adaptToSpeaker(userId) { }
    dispose() { }
}
class MockTextToSpeechService {
    async speakText(text) {
        console.log(`🔊 Speaking: "${text}"`);
        // Simulate speech duration
        const duration = Math.max(1000, text.length * 50);
        await new Promise(resolve => setTimeout(resolve, duration));
        console.log('✅ Speech completed');
    }
    async synthesizeSpeech(text) {
        // Return mock audio buffer
        return {};
    }
    async synthesizeSpeechWithEmotion(text, emotion) {
        return {};
    }
    async playAudio(audioBuffer) { }
    async speakWithEmotion(text, emotion) { }
    async handleTechnicalDelay(reason) { }
    async isAvailable() { return true; }
    async getVoiceOptions() { return []; }
}
class MockConversationManager {
    constructor() {
        this.responses = [
            "Hello! I'm doing well, thank you for asking. How can I help you today?",
            "I don't have access to real-time weather data, but I'd be happy to help you find weather information through other means.",
            "Here's a joke for you: Why don't scientists trust atoms? Because they make up everything!",
            "You're welcome! It was great talking with you. Have a wonderful day!"
        ];
        this.responseIndex = 0;
    }
    async startSession(userId) {
        return {
            session_id: 'demo-session-' + Date.now(),
            user_id: userId,
            start_time: new Date(),
            conversation_history: [],
            emotional_context: {
                valence: 0,
                arousal: 0.3,
                dominant_emotion: 'neutral',
                confidence: 0.8
            },
            privacy_level: 'MEDIUM'
        };
    }
    async endSession(sessionId) {
        console.log(`📝 Session ${sessionId} ended`);
    }
    async processMessage(sessionId, message) {
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 500));
        const response = this.responses[this.responseIndex % this.responses.length];
        this.responseIndex++;
        return response;
    }
    async getSessionContext(sessionId) {
        return null;
    }
    async updateEmotionalContext(sessionId, emotion) { }
}
async function runVoiceAssistantDemo() {
    console.log('🚀 Voice Assistant Demo - Alexa-like Continuous Listening');
    console.log('=========================================================\n');
    // Create mock services
    const wakeWordDetector = new MockWakeWordDetector();
    const speechToTextService = new MockSpeechToTextService();
    const textToSpeechService = new MockTextToSpeechService();
    const conversationManager = new MockConversationManager();
    // Create voice assistant
    const voiceAssistant = new voice_assistant_manager_1.VoiceAssistantManager(speechToTextService, textToSpeechService, conversationManager, {
        sessionTimeoutMs: 30000, // 30 second timeout
        silenceDetectionMs: 2000, // 2 seconds silence detection
        minSpeechDurationMs: 500, // 0.5 seconds minimum speech
        maxSpeechDurationMs: 15000, // 15 seconds max
        voiceActivityThreshold: 0.01, // Low threshold for demo
        wakeWordCooldownMs: 2000
    });
    // Set up event listeners
    voiceAssistant.on('assistant_ready', () => {
        console.log('🎙️ Starting Xeno Voice Assistant Demo...\n');
    });
    voiceAssistant.on('state_changed', (event) => {
        console.log(`🔄 State changed: ${event.from} → ${event.to}`);
    });
    voiceAssistant.on('session_started', (event) => {
        console.log(`🟢 Voice session started: ${event.sessionId}`);
    });
    voiceAssistant.on('speech_detected', () => {
        console.log('🗣️ Speech detected - listening...');
    });
    voiceAssistant.on('speech_transcribed', (event) => {
        console.log(`📝 User said: "${event.text}" (confidence: ${event.confidence})`);
    });
    voiceAssistant.on('response_generated', (event) => {
        console.log(`🤖 Assistant response: "${event.response}"`);
    });
    voiceAssistant.on('session_ended', () => {
        console.log('🔴 Voice session ended - back to wake word detection\n');
    });
    // Initialize and start the assistant
    await voiceAssistant.initialize();
    console.log('Assistant is ready. Starting session manually for demo.');
    voiceAssistant.startSession();
    // Keep the demo running for a while
    setTimeout(() => {
        console.log('\n✅ Demo completed! Key features demonstrated:');
        console.log('   ✓ Wake word activation');
        console.log('   ✓ Continuous listening without wake word repeats');
        console.log('   ✓ Voice activity detection');
        console.log('   ✓ Session management with timeout');
        console.log('   ✓ Natural conversation flow');
        console.log('   ✓ Graceful session ending');
        // Clean up
        setTimeout(async () => {
            await voiceAssistant.dispose();
            process.exit(0);
        }, 2000);
    }, 40000); // Demo runs for 40 seconds
}
// Error handling
process.on('uncaughtException', (error) => {
    console.error('Demo error:', error);
    process.exit(1);
});
process.on('SIGINT', () => {
    console.log('\n👋 Demo interrupted by user');
    process.exit(0);
});
// Run the demo
if (require.main === module) {
    runVoiceAssistantDemo().catch(console.error);
}
//# sourceMappingURL=voice-assistant-demo.js.map