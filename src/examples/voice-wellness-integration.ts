/**
 * Voice Assistant Integration Example
 * Shows how to integrate the voice assistant into the main application
 */

import { VoiceAssistantManager } from '../voice/voice-assistant-manager';
import { GoogleSpeechToTextService } from '../audio/speech-to-text-service';
import { GoogleTextToSpeechService } from '../audio/google-text-to-speech-service';
import { CoreConversationManager } from '../conversation/conversation-manager';
import { ConversationFlowController } from '../conversation/conversation-flow';
import { ResponseRouter } from '../conversation/response-router';
import { DefaultConfigManager } from '../config/config-manager';
import { PrivacyLevel } from '../types';

export class VoiceEnabledWellnessCompanion {
  private voiceAssistant: VoiceAssistantManager | null = null;
  private configManager: DefaultConfigManager;

  constructor() {
    this.configManager = new DefaultConfigManager();
  }

  async initialize(): Promise<void> {
    // Load configuration
    await this.configManager.loadConfig();
    const config = this.configManager.getConfig();

    // Initialize audio services
    const speechToTextService = new GoogleSpeechToTextService(
      config.ai.speechServices.projectId || 'default-project',
      config.ai.speechServices.apiKey
    );

    const textToSpeechService = new GoogleTextToSpeechService({
      provider: 'google',
      apiKey: config.ai.speechServices.apiKey,
      defaultVoice: 'en-US-Neural2-D', // Xeno's calm, therapeutic male voice
      defaultLanguage: config.ai.speechServices.language,
      defaultSpeed: 1.0,
      emotionalMappings: [],
      naturalPauses: {
        sentence: 300,
        paragraph: 600,
        comma: 150,
        period: 250
      },
      technicalDelayMessages: [
        "I'm thinking about that...",
        "Let me consider your question...",
        "Give me a moment to process that..."
      ]
    });

    // Initialize conversation services
    const conversationFlow = new ConversationFlowController();
    const responseRouter = new ResponseRouter(conversationFlow);
    const conversationManager = new CoreConversationManager(
      conversationFlow,
      responseRouter,
      {
        maxSessionDuration: 120, // 2 hours
        responseTimeoutMs: 4500,
        privacyLevel: config.privacy.allowConversationHistory ? PrivacyLevel.HIGH : PrivacyLevel.LOW
      }
    );

    // Create voice assistant with optimal settings
    this.voiceAssistant = new VoiceAssistantManager(
      speechToTextService,
      textToSpeechService,
      conversationManager,
      {
        sessionTimeoutMs: 90000,        // 1.5 minutes for elderly users
        silenceDetectionMs: 2500,       // 2.5 seconds for deliberate speakers
        minSpeechDurationMs: 800,       // 0.8 seconds minimum
        maxSpeechDurationMs: 45000,     // 45 seconds maximum
        voiceActivityThreshold: 0.008,  // Sensitive for quiet speakers
        wakeWordCooldownMs: 1500        // 1.5 second cooldown
      }
    );

    // Set up event handlers for wellness companion features
    this.setupVoiceEventHandlers();

    // Initialize the voice assistant
    if (this.voiceAssistant) {
      await this.voiceAssistant.initialize();
    }
  }

  private setupVoiceEventHandlers(): void {
    if (!this.voiceAssistant) return;

    // Wellness-specific event handling
    this.voiceAssistant.on('session_started', (event) => {
      console.log(`🌟 Wellness session started: ${event.sessionId}`);
      // Could trigger wellness check-in, mood assessment, etc.
    });

    this.voiceAssistant.on('speech_transcribed', (event) => {
      console.log(`💭 User expression: "${event.text}"`);
      // Could analyze for emotional indicators, crisis keywords, etc.
    });

    this.voiceAssistant.on('response_generated', (event) => {
      console.log(`🤗 Companion response: "${event.response}"`);
      // Could log therapeutic interactions, track mood improvements
    });

    this.voiceAssistant.on('session_ended', () => {
      console.log('🌅 Wellness session completed');
      // Could save session summary, schedule follow-up reminders
    });

    // Performance monitoring for healthcare requirements
    this.voiceAssistant.on('state_changed', (event) => {
      // Ensure response times meet accessibility requirements
      if (event.to === 'PROCESSING') {
        setTimeout(() => {
          if (this.voiceAssistant?.getState() === 'PROCESSING') {
            console.warn('⚠️ Processing taking longer than expected');
          }
        }, 5000);
      }
    });
  }

  // Wellness-specific voice commands
  async handleWellnessCommands(): Promise<void> {
    // Examples of wellness-specific voice interactions
    const wellnessExamples = [
      {
        user: "I'm feeling anxious today",
        expected: "Empathetic response with breathing exercises or coping strategies"
      },
      {
        user: "Can you remind me to take my medication?",
        expected: "Acknowledgment and medication reminder setup"
      },
      {
        user: "I feel lonely",
        expected: "Supportive conversation with social connection suggestions"
      }
    ];

    console.log('🏥 Wellness Voice Commands Examples:');
    wellnessExamples.forEach((example, index) => {
      console.log(`${index + 1}. User: "${example.user}"`);
      console.log(`   Expected: ${example.expected}\n`);
    });
  }

  // Integration with health monitoring
  async integrateHealthMonitoring(): Promise<void> {
    // Voice-triggered health checks
    console.log('🔍 Health Monitoring Integration:');
    console.log('• Voice-triggered mood assessments');
    console.log('• Medication reminder confirmations');
    console.log('• Emergency contact activation');
    console.log('• Sleep quality discussions');
    console.log('• Activity level check-ins');
  }

  // Crisis detection through voice
  async setupCrisisDetection(): Promise<void> {
    if (!this.voiceAssistant) return;

    this.voiceAssistant.on('response_generated', async (event) => {
      // In a real implementation, this would integrate with crisis detection
      const crisisKeywords = ['hurt myself', 'end it all', 'no point', 'emergency'];
      const lowerInput = event.input?.toLowerCase() || '';
      
      if (crisisKeywords.some(keyword => lowerInput.includes(keyword))) {
        console.log('🚨 Crisis indicators detected in voice input');
        // Trigger crisis response protocol
        await this.handleCrisisResponse();
      }
    });
  }

  private async handleCrisisResponse(): Promise<void> {
    console.log('🆘 Activating crisis response protocol');
    // In real implementation:
    // - Provide immediate crisis resources
    // - Offer to contact emergency services
    // - Maintain supportive tone
    // - Log incident for follow-up
  }

  async getVoiceAssistantStatus(): Promise<object> {
    if (!this.voiceAssistant) {
      return { status: 'not_initialized' };
    }

    return {
      status: 'active',
      currentState: this.voiceAssistant.getState(),
      sessionInfo: this.voiceAssistant.getSessionInfo(),
      features: {
        wakeWordActivation: true,
        continuousListening: true,
        speechBoundaryDetection: true,
        sessionManagement: true,
        contextPreservation: true,
        crisisDetection: true,
        wellnessIntegration: true
      }
    };
  }

  async dispose(): Promise<void> {
    if (this.voiceAssistant) {
      await this.voiceAssistant.dispose();
      this.voiceAssistant = null;
    }
  }
}

// Usage example
async function createVoiceEnabledCompanion() {
  const companion = new VoiceEnabledWellnessCompanion();
  
  try {
    await companion.initialize();
    console.log('🎙️ Voice-enabled wellness companion ready!');
    
    // Show wellness command examples
    await companion.handleWellnessCommands();
    
    // Setup health monitoring
    await companion.integrateHealthMonitoring();
    
    // Setup crisis detection
    await companion.setupCrisisDetection();
    
    // Get status
    const status = await companion.getVoiceAssistantStatus();
    console.log('📊 Voice Assistant Status:', status);
    
  } catch (error) {
    console.error('❌ Failed to initialize voice assistant:', error);
  }
}

export { createVoiceEnabledCompanion };
