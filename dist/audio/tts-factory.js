"use strict";
// Text-to-Speech Service Factory
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTSFactory = void 0;
const google_text_to_speech_service_1 = require("./google-text-to-speech-service");
class TTSFactory {
    static createTTSService(config) {
        const ttsConfig = TTSFactory.buildTTSConfig(config);
        // Always use Google TTS for reliability
        return new google_text_to_speech_service_1.GoogleTextToSpeechService(ttsConfig);
    }
    static buildTTSConfig(config) {
        return {
            provider: config.ai.speechServices.provider,
            apiKey: config.ai.speechServices.apiKey,
            projectId: config.ai.speechServices.projectId,
            keyFilename: 'wro-ai-525138b8b188.json', // Load credentials from the workspace file
            region: config.ai.speechServices.region,
            defaultVoice: config.ai.speechServices.voice || 'en-US-Neural2-F', // Default to calm, soft female voice
            defaultLanguage: config.ai.speechServices.language || 'en-US',
            defaultSpeed: 1.0,
            emotionalMappings: [],
            naturalPauses: {
                sentence: 300,
                paragraph: 600,
                comma: 150,
                period: 250
            },
            technicalDelayMessages: [
                "Just a moment while I prepare my response...",
                "I'm thinking about that...",
                "Let me consider what you've shared..."
            ]
        };
    }
    static getDefaultEmotionalMappings() {
        return [
            // Happy and energetic
            {
                valence: 0.8,
                arousal: 0.7,
                voiceStyle: 'cheerful',
                speedModifier: 1.1,
                pitchModifier: 1.05,
                pauseModifier: -50
            },
            // Happy and calm
            {
                valence: 0.6,
                arousal: 0.3,
                voiceStyle: 'friendly',
                speedModifier: 1.0,
                pitchModifier: 1.02,
                pauseModifier: 0
            },
            // Neutral
            {
                valence: 0.0,
                arousal: 0.4,
                voiceStyle: 'neutral',
                speedModifier: 1.0,
                pitchModifier: 1.0,
                pauseModifier: 0
            },
            // Sad and low energy
            {
                valence: -0.6,
                arousal: 0.2,
                voiceStyle: 'empathetic',
                speedModifier: 0.9,
                pitchModifier: 0.95,
                pauseModifier: 100
            },
            // Anxious/stressed
            {
                valence: -0.3,
                arousal: 0.8,
                voiceStyle: 'calm',
                speedModifier: 0.85,
                pitchModifier: 0.98,
                pauseModifier: 150
            },
            // Very distressed
            {
                valence: -0.8,
                arousal: 0.6,
                voiceStyle: 'gentle',
                speedModifier: 0.8,
                pitchModifier: 0.92,
                pauseModifier: 200
            }
        ];
    }
    static getRecommendedVoices() {
        return {
            'empathetic': ['en-US-Neural2-C', 'en-US-Neural2-F'],
            'warm': ['en-US-Neural2-D', 'en-US-Neural2-A'],
            'friendly': ['en-US-Neural2-A', 'en-US-Neural2-C'],
            'calm': ['en-US-Neural2-F', 'en-US-Neural2-C'],
            'cheerful': ['en-US-Neural2-A', 'en-US-Neural2-C']
        };
    }
}
exports.TTSFactory = TTSFactory;
//# sourceMappingURL=tts-factory.js.map