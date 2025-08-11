"use strict";
// Main application entry point for AI Wellness Companion
// This file initializes the system and starts all components
Object.defineProperty(exports, "__esModule", { value: true });
const config_manager_1 = require("./config/config-manager");
const logger_1 = require("./logging/logger");
const performance_manager_1 = require("./performance/performance-manager");
const optimized_pipeline_1 = require("./conversation/optimized-pipeline");
const continuous_voice_assistant_1 = require("./voice/continuous-voice-assistant");
const speech_to_text_factory_1 = require("./audio/speech-to-text-factory");
const tts_factory_1 = require("./audio/tts-factory");
const ai_service_1 = require("./conversation/ai-service");
async function main() {
    const configManager = new config_manager_1.DefaultConfigManager();
    const config = await configManager.loadConfig();
    const logger = (0, logger_1.createLogger)(logger_1.LogLevel[config.system.logLevel.toUpperCase()]);
    try {
        performance_manager_1.performanceManager.setLogger(logger);
        logger.info('Main', 'System starting up...');
        // Initialize services using factories
        const sttCfg = config.ai.speechServices;
        logger.info('Main', `Using STT provider: ${sttCfg.provider}`);
        const speechToTextService = speech_to_text_factory_1.SpeechToTextFactory.createResilientService('google', {
            provider: 'google',
            projectId: sttCfg.projectId,
            keyFilename: 'wro-ai-525138b8b188.json',
            googleCredentials: sttCfg.serviceAccount,
            language: sttCfg.language
        });
        // Initialize TTS service
        const ttsService = tts_factory_1.TTSFactory.createTTSService(config);
        await ttsService.initialize();
        logger.info('Main', `TTS service initialized with provider: ${config.ai.speechServices.provider}`);
        const aiService = new ai_service_1.OpenAIService(config.ai.openai);
        // Initialize the conversation manager
        const conversationManager = new optimized_pipeline_1.OptimizedConversationPipeline(speechToTextService, ttsService, aiService, logger);
        const audioManagerConfig = {
            ...config.audio,
            ...config.audio.speechToText,
        };
        // Initialize the continuous voice assistant
        const assistant = new continuous_voice_assistant_1.ContinuousVoiceAssistant(speechToTextService, ttsService, conversationManager, {}, audioManagerConfig, logger);
        await assistant.initialize();
        logger.info('Main', 'Voice assistant is ready and listening.');
        // Graceful shutdown
        process.on('SIGINT', async () => {
            logger.info('Main', 'Shutting down gracefully...');
            await assistant.stop();
            performance_manager_1.performanceManager.reportMetrics();
            process.exit(0);
        });
    }
    catch (error) {
        const err = error;
        logger.error('Main', `Failed to initialize the system: ${err.message}`, err);
        process.exit(1);
    }
}
main();
//# sourceMappingURL=main.js.map