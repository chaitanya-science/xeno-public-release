"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpeechToTextFactory = void 0;
const speech_to_text_service_1 = require("./speech-to-text-service");
const audio_processor_1 = require("./audio-processor");
/**
 * Factory for creating and configuring speech-to-text services
 */
class SpeechToTextFactory {
    /**
     * Create a Google Cloud Speech-to-Text service instance
     */
    static createGoogleSpeechService(config = {}) {
        const { projectId, keyFilename, language = 'en-US', audioProcessor = new audio_processor_1.BasicAudioProcessor() } = config;
        const service = new speech_to_text_service_1.GoogleSpeechToTextService(projectId, keyFilename, audioProcessor, config.googleCredentials);
        // Set language if specified
        if (language !== 'en-US') {
            service.setLanguage(language);
        }
        return service;
    }
    /**
     * Create a Google STT service instance (fallback for compatibility)
     */
    static createOpenAISpeechService(config = {}) {
        // Fallback to Google STT since OpenAI STT is removed
        return this.createGoogleSpeechService(config);
    }
    /**
     * Create a speech service with wellness-optimized configuration
     */
    static createWellnessOptimizedService(config = {}) {
        const enhancedProcessor = new audio_processor_1.BasicAudioProcessor();
        const cfg = { ...config, audioProcessor: enhancedProcessor, language: config.language || 'en-US' };
        // Always use Google STT for reliability
        return this.createGoogleSpeechService(cfg);
    }
    /**
     * Create a resilient STT that always uses Google for reliability
     */
    static createResilientService(primary, config = {}) {
        // Always use Google STT for reliability
        const primarySvc = this.createGoogleSpeechService(config);
        const secondarySvc = this.createGoogleSpeechService(config);
        // Wrap both services into a simple try/fallback implementation
        const wrapper = {
            async initialize() {
                try {
                    console.log(`🔧 Initializing primary STT service: ${primary}`);
                    await primarySvc.initialize();
                }
                catch (error) {
                    console.log(`⚠️ Primary STT service failed to initialize, trying secondary...`);
                    try {
                        await secondarySvc.initialize();
                    }
                    catch { /* best effort */ }
                }
            },
            async transcribe(audio) {
                try {
                    console.log(`🎯 Using primary STT service: ${primary}`);
                    const res = await primarySvc.transcribe(audio);
                    if (res.text && res.text.trim())
                        return res;
                    // If empty/low, try secondary
                    console.log(`⚠️ Primary STT returned empty result, trying secondary...`);
                    const res2 = await secondarySvc.transcribe(audio);
                    return res2;
                }
                catch (error) {
                    console.log(`❌ Primary STT failed, falling back to secondary:`, error);
                    try {
                        return await secondarySvc.transcribe(audio);
                    }
                    catch {
                        return { text: '', confidence: 0, alternatives: [], processingTime: 0 };
                    }
                }
            },
            setLanguage(lang) { try {
                primarySvc.setLanguage(lang);
            }
            catch { } try {
                secondarySvc.setLanguage(lang);
            }
            catch { } },
            async adaptToSpeaker(uid) { try {
                await primarySvc.adaptToSpeaker(uid);
            }
            catch { } try {
                await secondarySvc.adaptToSpeaker(uid);
            }
            catch { } },
            dispose() { try {
                primarySvc.dispose();
            }
            catch { } try {
                secondarySvc.dispose();
            }
            catch { } }
        };
        return wrapper;
    }
    /**
     * Create service from environment variables
     */
    static createFromEnvironment() {
        // Prefer config-driven; keep minimal env fallback
        const config = {
            language: 'en-US'
        };
        return this.createWellnessOptimizedService(config);
    }
}
exports.SpeechToTextFactory = SpeechToTextFactory;
//# sourceMappingURL=speech-to-text-factory.js.map