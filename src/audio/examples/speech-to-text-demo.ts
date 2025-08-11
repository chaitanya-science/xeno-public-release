#!/usr/bin/env ts-node

/**
 * Demo script showing how to use the Google Cloud Speech-to-Text pipeline
 * 
 * Prerequisites:
 * 1. Set up Google Cloud project with Speech-to-Text API enabled
 * 2. Create service account key and download JSON file
 * 3. Set environment variables:
 *    - GOOGLE_CLOUD_PROJECT_ID=your-project-id
 *    - GOOGLE_CLOUD_KEY_FILE=path/to/service-account-key.json
 * 
 * Usage:
 *   npx ts-node src/audio/examples/speech-to-text-demo.ts
 */

import { SpeechToTextFactory } from '../speech-to-text-factory';
import { BasicAudioProcessor } from '../audio-processor';

async function demonstrateSpeechToText() {
  console.log('🎤 Speech-to-Text Pipeline Demo');
  console.log('================================\n');

  try {
    // Method 1: Create service with explicit configuration
    console.log('1. Creating speech service with explicit config...');
    const speechService = SpeechToTextFactory.createGoogleSpeechService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
      language: 'en-US'
    });

    // Initialize the service
    console.log('2. Initializing Google Cloud Speech service...');
    await speechService.initialize();
    console.log('✅ Service initialized successfully\n');

    // Method 2: Create wellness-optimized service
    console.log('3. Creating wellness-optimized service...');
    const wellnessService = SpeechToTextFactory.createWellnessOptimizedService({
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
      keyFilename: process.env.GOOGLE_CLOUD_KEY_FILE,
    });
    await wellnessService.initialize();
    console.log('✅ Wellness service initialized\n');

    // Demonstrate audio processing
    console.log('4. Testing audio preprocessing...');
    const audioProcessor = new BasicAudioProcessor();
    const testAudio = createSampleAudioBuffer();
    
    console.log(`   Original audio size: ${testAudio.length} bytes`);
    const processedAudio = await audioProcessor.processAudio(testAudio);
    console.log(`   Processed audio size: ${processedAudio.length} bytes`);
    console.log('✅ Audio preprocessing completed\n');

    // Simulate speech recognition (would use real audio in production)
    console.log('5. Simulating speech recognition...');
    console.log('   Note: This demo uses mock audio. In production, you would:');
    console.log('   - Capture audio from microphone');
    console.log('   - Process it through the pipeline');
    console.log('   - Get transcription results\n');

    // Example of what the transcription would look like:
    console.log('📝 Example transcription result:');
    console.log('   Text: "Hello, I\'m feeling anxious today and need some support"');
    console.log('   Confidence: 0.94');
    console.log('   Processing time: 1.2s');
    console.log('   Alternatives: ["Hello, I\'m feeling anxious today", "Hello, I feel anxious today"]\n');

    // Demonstrate language switching
    console.log('6. Testing language adaptation...');
    speechService.setLanguage('es-ES');
    console.log('✅ Language set to Spanish (es-ES)');
    
    speechService.setLanguage('en-US');
    console.log('✅ Language reset to English (en-US)\n');

    // Demonstrate speaker adaptation
    console.log('7. Testing speaker adaptation...');
    await speechService.adaptToSpeaker('user-123');
    console.log('✅ Speaker adaptation configured\n');

    // Clean up resources
    console.log('8. Cleaning up resources...');
    speechService.dispose();
    wellnessService.dispose();
    console.log('✅ Resources cleaned up\n');

    console.log('🎉 Demo completed successfully!');
    console.log('\nNext steps:');
    console.log('- Integrate with wake word detection');
    console.log('- Connect to conversation management system');
    console.log('- Add real-time audio capture');
    console.log('- Implement user-specific adaptations');

  } catch (error) {
    console.error('❌ Demo failed:', error);
    console.log('\nTroubleshooting:');
    console.log('1. Ensure Google Cloud credentials are set up correctly');
    console.log('2. Check that Speech-to-Text API is enabled in your project');
    console.log('3. Verify environment variables are set:');
    console.log('   - GOOGLE_CLOUD_PROJECT_ID');
    console.log('   - GOOGLE_CLOUD_KEY_FILE');
    console.log('4. Make sure the service account has Speech Client role');
  }
}

/**
 * Create a sample audio buffer for testing
 */
function createSampleAudioBuffer(): Buffer {
  // Create 1 second of 16kHz, 16-bit PCM audio
  const sampleRate = 16000;
  const duration = 1; // seconds
  const samples = sampleRate * duration;
  const buffer = Buffer.allocUnsafe(samples * 2);

  // Generate a simple sine wave (simulating speech)
  for (let i = 0; i < samples; i++) {
    const t = i / sampleRate;
    const frequency = 200 + 100 * Math.sin(2 * Math.PI * 5 * t); // Varying frequency
    const amplitude = 0.3 * Math.sin(2 * Math.PI * frequency * t);
    const sample = Math.round(amplitude * 32767);
    buffer.writeInt16LE(sample, i * 2);
  }

  return buffer;
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateSpeechToText().catch(console.error);
}

export { demonstrateSpeechToText };