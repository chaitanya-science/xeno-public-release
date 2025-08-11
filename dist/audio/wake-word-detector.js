"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PorcupineWakeWordDetector = void 0;
const porcupine_node_1 = require("@picovoice/porcupine-node");
const pvrecorder_node_1 = require("@picovoice/pvrecorder-node");
class PorcupineWakeWordDetector {
    constructor(accessKey, keyword = porcupine_node_1.BuiltinKeyword.COMPUTER, sensitivity = 0.5, audioConfig, customModelPath) {
        this.porcupine = null;
        this.recorder = null;
        this.isListening = false;
        this.failureCount = 0;
        this.maxFailures = 3;
        this.wakeWordCallback = null;
        this.processingFrame = false; // Add flag to prevent race conditions
        this.abortController = null; // Add abort controller for cleanup
        this.accessKey = accessKey;
        this.keyword = keyword;
        this.sensitivity = sensitivity;
        this.customModelPath = customModelPath;
        this.audioConfig = {
            sampleRate: 16000,
            channels: 1,
            bitDepth: 16,
            bufferSize: 512,
            ...audioConfig
        };
    }
    async initialize() {
        try {
            // Initialize Porcupine with either built-in keyword or custom model
            if (this.customModelPath) {
                // Use custom model file
                this.porcupine = new porcupine_node_1.Porcupine(this.accessKey, [this.customModelPath], [this.sensitivity]);
                console.log(`Wake word detector initialized with custom model: ${this.customModelPath}`);
            }
            else {
                // Use built-in keyword
                this.porcupine = new porcupine_node_1.Porcupine(this.accessKey, [this.keyword], [this.sensitivity]);
                console.log(`Wake word detector initialized with built-in keyword: ${this.keyword}`);
            }
            // Initialize PvRecorder for audio capture
            this.recorder = new pvrecorder_node_1.PvRecorder(this.porcupine.frameLength, -1 // Use default audio device
            );
            console.log('Wake word detector initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize wake word detector:', error);
            throw new Error(`Wake word detector initialization failed: ${error}`);
        }
    }
    async startListening() {
        if (!this.porcupine || !this.recorder) {
            throw new Error('Wake word detector not initialized');
        }
        if (this.isListening) {
            console.warn('Wake word detector is already listening');
            return;
        }
        try {
            this.abortController = new AbortController();
            this.recorder.start();
            this.isListening = true;
            console.log('Started listening for wake word');
            // Start the detection loop with proper error handling
            this.detectWakeWord().catch(error => {
                console.error('Detection loop error:', error);
                this.handleFailure();
            });
        }
        catch (error) {
            console.error('Failed to start wake word detection:', error);
            this.handleFailure();
            throw error;
        }
    }
    async stopListening() {
        if (!this.isListening) {
            return;
        }
        try {
            // Signal abort to stop processing
            if (this.abortController) {
                this.abortController.abort();
            }
            if (this.recorder) {
                this.recorder.stop();
            }
            this.isListening = false;
            this.processingFrame = false;
            console.log('Stopped listening for wake word');
        }
        catch (error) {
            console.error('Error stopping wake word detection:', error);
        }
    }
    onWakeWordDetected(callback) {
        this.wakeWordCallback = callback;
    }
    getFailureCount() {
        return this.failureCount;
    }
    resetFailureCount() {
        this.failureCount = 0;
    }
    // Expose detection for tests with optional audio buffer
    async detectWakeWord(testPcm) {
        if (testPcm) {
            // Simulate single-frame processing for test buffer
            if (!this.porcupine)
                return;
            const keywordIndex = this.porcupine.process(testPcm);
            if (keywordIndex >= 0 && this.wakeWordCallback)
                this.wakeWordCallback();
            return;
        }
        if (!this.porcupine || !this.recorder || !this.isListening) {
            return;
        }
        try {
            let startTime = Date.now();
            // Use a proper event loop with abort handling
            while (this.isListening && !this.abortController?.signal.aborted) {
                if (this.processingFrame) {
                    // Wait a bit if already processing to prevent race conditions
                    await new Promise(resolve => setTimeout(resolve, 5));
                    continue;
                }
                await this.processAudioFrame(startTime);
                // Small delay to prevent excessive CPU usage and allow other operations
                await new Promise(resolve => setTimeout(resolve, 10));
            }
        }
        catch (error) {
            console.error('Error during wake word detection:', error);
            this.handleFailure();
        }
    }
    async processAudioFrame(startTime) {
        if (!this.porcupine || !this.recorder || !this.isListening || this.processingFrame) {
            return;
        }
        this.processingFrame = true;
        try {
            // Check for abort signal
            if (this.abortController?.signal.aborted) {
                return;
            }
            // Read audio frame - handle both sync and async cases
            const pcm = await Promise.resolve(this.recorder.read());
            // Process the frame with Porcupine
            const keywordIndex = this.porcupine.process(pcm);
            if (keywordIndex >= 0) {
                const responseTime = Date.now() - startTime;
                console.log(`Wake word detected! Response time: ${responseTime}ms`);
                // Check if response time meets the 2-second requirement
                if (responseTime <= 2000) {
                    this.resetFailureCount();
                    if (this.wakeWordCallback) {
                        this.wakeWordCallback();
                    }
                }
                else {
                    console.warn(`Wake word response time exceeded 2 seconds: ${responseTime}ms`);
                    this.handleFailure();
                }
                // Reset start time for next detection
                startTime = Date.now();
            }
        }
        catch (readError) {
            console.error('Error reading audio frame:', readError);
            this.handleFailure();
        }
        finally {
            this.processingFrame = false;
        }
    }
    handleFailure() {
        this.failureCount++;
        console.warn(`Wake word detection failure ${this.failureCount}/${this.maxFailures}`);
        if (this.failureCount >= this.maxFailures) {
            console.error('Maximum wake word detection failures reached');
            this.provideTroubleshootingGuidance();
        }
    }
    provideTroubleshootingGuidance() {
        const guidance = [
            "Wake word detection has failed multiple times. Here's what you can try:",
            "1. Check that your microphone is properly connected and working",
            "2. Ensure you're speaking clearly and at normal volume",
            "3. Try moving closer to the microphone",
            "4. Check for background noise that might interfere with detection",
            "5. Restart the system if problems persist"
        ];
        console.log(guidance.join('\n'));
        // In a real implementation, this would also trigger audio feedback
        // or visual indicators for the user
    }
    // Cleanup method to properly dispose of resources
    async dispose() {
        await this.stopListening();
        if (this.porcupine) {
            this.porcupine.release();
            this.porcupine = null;
        }
        if (this.recorder) {
            this.recorder.release();
            this.recorder = null;
        }
        this.abortController = null;
    }
}
exports.PorcupineWakeWordDetector = PorcupineWakeWordDetector;
//# sourceMappingURL=wake-word-detector.js.map