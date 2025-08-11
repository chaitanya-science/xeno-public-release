"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleSpeechToTextService = void 0;
const speech_1 = require("@google-cloud/speech");
const audio_processor_1 = require("./audio-processor");
/**
 * Google Cloud Speech-to-Text implementation for speech recognition
 * Provides high-accuracy speech recognition with adaptation capabilities
 */
class GoogleSpeechToTextService {
    constructor(projectId, keyFilename, audioProcessor, credentials) {
        this.projectId = projectId;
        this.keyFilename = keyFilename;
        this.credentials = credentials;
        this.speechClient = null;
        this.currentLanguage = 'en-US';
        this.isInitialized = false;
        // Configuration for speech recognition optimization
        this.RECOGNITION_TIMEOUT_MS = 20000; // 20 second timeout to accommodate full capture
        this.MIN_CONFIDENCE_THRESHOLD = 0.2; // Minimum confidence for acceptance (not strictly enforced)
        this.MAX_ALTERNATIVES = 3; // Number of alternative transcriptions to request
        this.audioProcessor = audioProcessor || new audio_processor_1.BasicAudioProcessor();
    }
    /**
     * Initialize the Google Cloud Speech service
     */
    async initialize() {
        try {
            // Create speech client with optional configuration
            const clientConfig = {};
            if (this.projectId) {
                clientConfig.projectId = this.projectId;
            }
            if (this.keyFilename) {
                clientConfig.keyFilename = this.keyFilename;
            }
            // Prefer direct credentials when provided in config
            if (this.credentials && this.credentials.client_email && this.credentials.private_key) {
                clientConfig.credentials = {
                    client_email: this.credentials.client_email,
                    private_key: this.credentials.private_key
                };
            }
            this.speechClient = new speech_1.SpeechClient(clientConfig);
            this.isInitialized = true;
        }
        catch (error) {
            throw new Error(`Failed to initialize Google Cloud Speech service: ${error}`);
        }
    }
    /**
     * Transcribe audio buffer to text with preprocessing
     */
    async transcribe(audioBuffer) {
        if (!this.isInitialized || !this.speechClient) {
            throw new Error('Speech service not initialized. Call initialize() first.');
        }
        const startTime = Date.now();
        console.log(`🎤 Starting transcription of ${audioBuffer.length} bytes...`);
        try {
            // Light preprocessing: noise reduction and normalization can improve recognition
            const processedAudio = await this.audioProcessor.processAudio(audioBuffer);
            console.log(`🔧 Audio processed: ${processedAudio.length} bytes`);
            // Configure the recognition request
            const request = {
                config: {
                    encoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    audioChannelCount: 1,
                    languageCode: this.currentLanguage,
                    maxAlternatives: this.MAX_ALTERNATIVES,
                    enableWordTimeOffsets: true,
                    enableAutomaticPunctuation: true,
                    useEnhanced: true,
                    model: 'latest_short', // Better for brief utterances
                },
                audio: {
                    content: processedAudio.toString('base64'),
                },
            };
            // One-time debug: log request config
            if (process.env.STT_DEBUG === '1') {
                console.log('[STT] Request config', request.config);
            }
            console.log(`📡 Sending request to Google STT...`);
            // Perform recognition with timeout
            let response;
            try {
                [response] = await Promise.race([
                    this.speechClient.recognize(request),
                    this.createTimeoutPromise()
                ]);
            }
            catch (error) {
                console.error(`❌ Google STT recognize call failed:`, error);
                console.error(`❌ Error details:`, error instanceof Error ? error.stack : error);
                return this.createErrorResult(`Google STT API error: ${error instanceof Error ? error.message : String(error)}`, 0, Date.now() - startTime);
            }
            console.log(`✅ Received response from Google STT`);
            console.log(`📊 Raw response:`, JSON.stringify(response, null, 2));
            // Check if response is empty or has errors
            if (!response || !response.results || response.results.length === 0) {
                console.log(`⚠️ Google STT returned empty response or no results`);
                return this.createErrorResult('No transcription results from Google STT', 0, Date.now() - startTime);
            }
            // Check for errors in the response
            if (response.results && response.results.length > 0) {
                const firstResult = response.results[0];
                // Check if the result has any error indicators
                if (!firstResult.alternatives || firstResult.alternatives.length === 0) {
                    console.log(`⚠️ Google STT result has no alternatives`);
                    return this.createErrorResult('No transcription alternatives from Google STT', 0, Date.now() - startTime);
                }
            }
            const processingTime = Date.now() - startTime;
            const result = this.processGoogleRecognitionResult(response, processingTime);
            console.log(`🎯 Processed result:`, JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            const processingTime = Date.now() - startTime;
            // Handle specific error types with appropriate user-friendly messages
            if (error instanceof Error) {
                if (error.message.includes('timeout') || error.message.includes('DEADLINE_EXCEEDED')) {
                    return this.createErrorResult('I didn\'t catch that. Could you please repeat what you said?', 0, processingTime);
                }
                else if (error.message.includes('network') || error.message.includes('connection') || error.message.includes('UNAVAILABLE')) {
                    return this.createErrorResult('I\'m having trouble with my connection. Please try again in a moment.', 0, processingTime);
                }
                else if (error.message.includes('INVALID_ARGUMENT')) {
                    return this.createErrorResult('I\'m having trouble processing the audio. Could you try speaking again?', 0, processingTime);
                }
            }
            // Generic error handling
            return this.createErrorResult('I\'m sorry, I didn\'t understand that. Could you please speak a bit more clearly?', 0, processingTime);
        }
    }
    /**
     * Set the recognition language
     */
    setLanguage(language) {
        this.currentLanguage = language;
    }
    /**
     * Adapt recognition to specific speaker patterns
     * This is a placeholder for future speaker adaptation features
     */
    async adaptToSpeaker(userId) {
        // In a full implementation, this would:
        // 1. Load user-specific acoustic models
        // 2. Apply custom vocabulary
        // 3. Adjust recognition parameters based on user history
        console.log(`Adapting speech recognition for user: ${userId}`);
        // Google Cloud Speech supports speaker adaptation through:
        // - Custom vocabulary (speechContexts)
        // - Speaker diarization
        // - Adaptation models (for enterprise customers)
        // For now, this is a placeholder for future implementation
    }
    /**
     * Create timeout promise for recognition requests
     */
    createTimeoutPromise() {
        return new Promise((_, reject) => {
            setTimeout(() => {
                reject(new Error('Recognition timeout'));
            }, this.RECOGNITION_TIMEOUT_MS);
        });
    }
    /**
     * Process and validate Google Cloud recognition result
     */
    processGoogleRecognitionResult(response, processingTime) {
        // Debug: log what we're processing
        if (process.env.STT_DEBUG === '1') {
            console.log('[STT] Processing response:', {
                hasResults: !!response.results,
                resultsLength: response.results?.length || 0,
                firstResult: response.results?.[0] || 'none',
                firstResultAlternatives: response.results?.[0]?.alternatives || 'none'
            });
        }
        // Check if we have results
        if (!response.results || response.results.length === 0) {
            if (process.env.STT_DEBUG === '1') {
                console.log('[STT] No results in response');
            }
            return { text: '', confidence: 0, alternatives: [], processingTime };
        }
        // Get the best result
        const result = response.results[0];
        if (!result.alternatives || result.alternatives.length === 0) {
            if (process.env.STT_DEBUG === '1') {
                console.log('[STT] No alternatives in first result');
            }
            return { text: '', confidence: 0, alternatives: [], processingTime };
        }
        const bestAlternative = result.alternatives[0];
        // Google may omit confidence; default to a reasonable mid value so upstream doesn’t discard useful text
        const confidence = (typeof bestAlternative.confidence === 'number') ? bestAlternative.confidence : 0.75;
        // Debug: log the best alternative
        if (process.env.STT_DEBUG === '1') {
            console.log('[STT] Best alternative:', {
                transcript: bestAlternative.transcript,
                confidence: bestAlternative.confidence,
                finalConfidence: confidence
            });
        }
        // Extract alternative transcriptions
        const alternatives = result.alternatives
            .slice(1, this.MAX_ALTERNATIVES + 1)
            .map((alt) => alt.transcript)
            .filter((text) => text && text.length > 0);
        return {
            text: bestAlternative.transcript || '',
            confidence,
            alternatives,
            processingTime
        };
    }
    /**
     * Create error result with user-friendly message
     */
    createErrorResult(message, confidence, processingTime) {
        // Do not surface error message as transcript to avoid polluting conversation
        return {
            text: '',
            confidence,
            alternatives: [],
            processingTime
        };
    }
    /**
     * Clean up resources
     */
    dispose() {
        if (this.speechClient) {
            this.speechClient.close();
            this.speechClient = null;
        }
        this.isInitialized = false;
    }
}
exports.GoogleSpeechToTextService = GoogleSpeechToTextService;
//# sourceMappingURL=speech-to-text-service.js.map