// Main application entry point for AI Wellness Companion
// This file initializes the system and starts all components

import { DefaultConfigManager } from './config/config-manager';
import { createLogger, LogLevel } from './logging/logger';
import { performanceManager } from './performance/performance-manager';
import { OptimizedConversationPipeline } from './conversation/optimized-pipeline';
import { ContinuousVoiceAssistant } from './voice/continuous-voice-assistant';
import { SpeechToTextFactory } from './audio/speech-to-text-factory';
import { TTSFactory } from './audio/tts-factory';
import { OpenAIService } from './conversation/ai-service';
import { ConversationManager } from './conversation/interfaces';
import { SpeechToTextService } from './audio/interfaces';
import { TextToSpeechService } from './audio/tts-interfaces';

async function main() {
  const configManager = new DefaultConfigManager();
  const config = await configManager.loadConfig();
  const logger = createLogger(LogLevel[config.system.logLevel.toUpperCase() as keyof typeof LogLevel]);
  
  try {
    performanceManager.setLogger(logger);
    logger.info('Main', 'System starting up...');

    // Initialize services using factories
    const sttCfg = config.ai.speechServices;
    logger.info('Main', `Using STT provider: ${sttCfg.provider}`);
    const speechToTextService: SpeechToTextService = SpeechToTextFactory.createResilientService(
      'google',
      {
        provider: 'google',
        projectId: sttCfg.projectId,
        keyFilename: 'wro-ai-525138b8b188.json',
        googleCredentials: sttCfg.serviceAccount,
        language: sttCfg.language
      }
    );

    // Initialize TTS service
    const ttsService = TTSFactory.createTTSService(config);
    await ttsService.initialize();
    logger.info('Main', `TTS service initialized with provider: ${config.ai.speechServices.provider}`);
    const aiService = new OpenAIService(config.ai.openai);

    // Initialize the conversation manager
    const conversationManager: ConversationManager = new OptimizedConversationPipeline(
      speechToTextService,
      ttsService,
      aiService,
      logger
    );

    const audioManagerConfig = {
      ...config.audio,
      ...config.audio.speechToText,
    };

    // Initialize the continuous voice assistant
    const assistant = new ContinuousVoiceAssistant(
      speechToTextService,
      ttsService,
      conversationManager,
      {},
      audioManagerConfig,
      logger
    );

    await assistant.initialize();
    logger.info('Main', 'Voice assistant is ready and listening.');

    // Graceful shutdown
    process.on('SIGINT', async () => {
      logger.info('Main', 'Shutting down gracefully...');
      await assistant.stop();
      performanceManager.reportMetrics();
      process.exit(0);
    });

  } catch (error) {
    const err = error as Error;
    logger.error('Main', `Failed to initialize the system: ${err.message}`, err);
    process.exit(1);
  }
}

main();
