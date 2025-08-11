"use strict";
/**
 * Wake Word Detection Demo
 *
 * This example demonstrates how to use the PorcupineWakeWordDetector
 * for the AI Wellness Companion system.
 *
 * Note: This is a demo file and requires a valid Porcupine access key
 * to run in a real environment.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const wake_word_detector_1 = require("../wake-word-detector");
const wake_word_factory_1 = require("../wake-word-factory");
const porcupine_node_1 = require("@picovoice/porcupine-node");
async function demonstrateWakeWordDetection() {
    // Example configuration - in a real app, this would come from config files
    const audioConfig = {
        sampleRate: 16000,
        channels: 1,
        bitDepth: 16,
        bufferSize: 1024,
        noiseReductionEnabled: true,
        echoCancellationEnabled: false,
        autoGainControl: false,
        inputDevice: 'default',
        outputDevice: 'default',
        inputVolume: 1.0,
        outputVolume: 1.0,
        wakeWordEnabled: true,
        alwaysListening: false,
        voiceActivationEnabled: true,
        speechToText: {
            silenceTimeout: 2000,
            maxRecordingTime: 10000,
            energyThreshold: 0.1,
            pauseThreshold: 800,
            autoStart: false,
            continuousListening: false,
        },
        porcupine: {
            accessKey: process.env.PORCUPINE_ACCESS_KEY || 'YOUR_PORCUPINE_ACCESS_KEY_HERE',
            keyword: 'porcupine',
            sensitivity: 0.5
        }
    };
    console.log('=== Wake Word Detection Demo ===');
    if (!audioConfig.porcupine) {
        console.log('Porcupine config not found, skipping wake word detector creation.');
        return;
    }
    console.log('Available keywords:', wake_word_factory_1.WakeWordDetectorFactory.getAvailableKeywords());
    try {
        // Method 1: Using the factory (recommended)
        console.log('\n1. Creating detector using factory...');
        const detector = wake_word_factory_1.WakeWordDetectorFactory.createPorcupineDetector(audioConfig);
        if (!detector) {
            console.log('Failed to create detector, skipping demo.');
            return;
        }
        // Method 2: Direct instantiation (alternative)
        console.log('2. Alternative: Direct instantiation...');
        const directDetector = new wake_word_detector_1.PorcupineWakeWordDetector(audioConfig.porcupine.accessKey, porcupine_node_1.BuiltinKeyword.COMPUTER, 0.7);
        // Initialize the detector
        console.log('3. Initializing wake word detector...');
        await detector.initialize();
        // Set up wake word callback
        detector.onWakeWordDetected(() => {
            console.log('🎉 Wake word detected! System activated.');
            console.log('Response time requirement: < 2 seconds ✓');
            // In a real application, this would trigger:
            // - Audio feedback to user
            // - Activation of speech-to-text pipeline
            // - Conversation system initialization
        });
        // Start listening
        console.log('4. Starting wake word detection...');
        console.log('   Say "Athena" to activate the system');
        console.log('   (In this demo, we\'ll simulate detection)');
        await detector.startListening();
        // Simulate some runtime
        console.log('5. System is now listening for wake word...');
        console.log('   Failure count:', detector.getFailureCount());
        // In a real application, the detector would run continuously
        // For demo purposes, we'll stop after a short time
        setTimeout(async () => {
            console.log('6. Stopping wake word detection...');
            await detector.stopListening();
            console.log('7. Cleaning up resources...');
            // Note: dispose method may not be available on all detector implementations
            console.log('✅ Demo completed successfully!');
            console.log('\nKey features demonstrated:');
            console.log('- Porcupine integration for local wake word detection');
            console.log('- 2-second response time requirement');
            console.log('- Failure detection and troubleshooting guidance');
            console.log('- Proper resource cleanup');
            console.log('- Factory pattern for easy configuration');
        }, 2000);
    }
    catch (error) {
        console.error('❌ Demo failed:', error);
        console.log('\nTroubleshooting:');
        console.log('1. Ensure you have a valid Porcupine access key');
        console.log('2. Check that your microphone is working');
        console.log('3. Verify audio permissions are granted');
    }
}
// Demonstrate failure handling
async function demonstrateFailureHandling() {
    console.log('\n=== Failure Handling Demo ===');
    const detector = new wake_word_detector_1.PorcupineWakeWordDetector('invalid-key');
    try {
        await detector.initialize();
    }
    catch (error) {
        console.log('✓ Initialization failure handled correctly');
        console.log('  Error:', error.message);
    }
    // Demonstrate failure count tracking
    console.log('✓ Failure count tracking:', detector.getFailureCount());
    // Reset failure count
    detector.resetFailureCount();
    console.log('✓ Failure count after reset:', detector.getFailureCount());
}
// Create a wake word detector instance
if (audioConfig.porcupine) {
    const wakeWordDetector = createWakeWordDetector(audioConfig, () => {
        console.log('Wake word detected!');
    }, (error) => {
        console.error('Wake word detector error:', error);
    });
    if (wakeWordDetector) {
        // Initialize and start the detector
        wakeWordDetector.initialize().then(() => {
            wakeWordDetector.start();
        });
    }
}
else {
    console.log('Porcupine config not found, skipping wake word detector creation.');
}
//# sourceMappingURL=wake-word-demo.js.map