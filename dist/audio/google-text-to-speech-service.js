"use strict";
// Google Text-to-Speech Service Implementation
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleTextToSpeechService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const tts_interfaces_1 = require("./tts-interfaces");
const tls_manager_1 = require("../security/tls-manager");
const performance_manager_1 = require("../performance/performance-manager");
class GoogleTextToSpeechService {
    constructor(config) {
        this.speechClient = null;
        this.audioContext = null;
        this.isInitialized = false;
        this.testSimulateFailure = false;
        this.config = { ...config };
        if (this.config.keyFilename) {
            try {
                const keyFilePath = path.resolve(process.cwd(), this.config.keyFilename);
                if (fs.existsSync(keyFilePath)) {
                    const keyFileContent = fs.readFileSync(keyFilePath, 'utf-8');
                    this.config.serviceAccount = JSON.parse(keyFileContent);
                }
                else {
                    console.warn(`Key file not found at ${keyFilePath}`);
                }
            }
            catch (error) {
                console.error('Error loading key file:', error);
            }
        }
        // Initialize secure fetch (after config assignment)
        if (process.env.NODE_ENV === 'test') {
            this.secureFetch = globalThis.fetch.bind(globalThis);
        }
        else {
            this.secureFetch = (0, tls_manager_1.createSecureFetch)();
        }
        // Initialize AudioContext only in browser environment or test environment
        if (typeof globalThis !== 'undefined' && ('AudioContext' in globalThis || process.env.NODE_ENV === 'test')) {
            try {
                this.audioContext = new (globalThis.AudioContext || globalThis.webkitAudioContext)();
            }
            catch (error) {
                // In test environment, AudioContext might not be available, that's ok
                if (process.env.NODE_ENV !== 'test') {
                    throw error;
                }
            }
        }
    }
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Resume audio context if suspended
            if (this.audioContext && this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            this.isInitialized = true;
        }
        catch (error) {
            throw new TTSError(`Failed to initialize TTS service: ${error}`, tts_interfaces_1.TTSErrorCode.CONFIGURATION_ERROR, false);
        }
    }
    async synthesizeSpeech(text, options) {
        await this.initialize();
        // Server-side mode: This method is for browser environments with AudioContext.
        if (!this.speechClient) {
            throw new TTSError('synthesizeSpeech is only available in a browser environment with AudioContext. Use speakText for server-side synthesis.', tts_interfaces_1.TTSErrorCode.CONFIGURATION_ERROR, false);
        }
        // Browser mode with AudioContext
        const startTime = Date.now();
        // Check cache first
        const voiceSettings = JSON.stringify(options || {});
        const cachedAudio = performance_manager_1.performanceManager.getCachedAudio(text, voiceSettings);
        if (cachedAudio) {
            const audioBuffer = await this.audioContext.decodeAudioData(cachedAudio.slice(0));
            performance_manager_1.performanceManager.recordMetrics({
                textToSpeechLatency: Date.now() - startTime
            });
            return audioBuffer;
        }
        const ssml = this.generateSSML(text, options);
        try {
            const response = await this.callGoogleTTS(ssml, options);
            const audioBuffer = await this.audioContext.decodeAudioData(response);
            // Cache the audio for future use
            performance_manager_1.performanceManager.cacheAudio(text, voiceSettings, response);
            // Record performance metrics
            performance_manager_1.performanceManager.recordMetrics({
                textToSpeechLatency: Date.now() - startTime
            });
            return audioBuffer;
        }
        catch (error) {
            throw this.handleTTSError(error);
        }
    }
    async synthesizeSpeechWithEmotion(text, emotionalState, options) {
        const emotionalOptions = this.adaptOptionsForEmotion(emotionalState, options);
        // Apply emotional context to text for human-like adaptation
        const emotionallyAdaptedText = this.applyEmotionalContext(text, emotionalState);
        return this.synthesizeSpeech(emotionallyAdaptedText, emotionalOptions);
    }
    async playAudio(audioBuffer, playbackOptions) {
        if (!this.audioContext) {
            throw new TTSError('AudioContext not available', tts_interfaces_1.TTSErrorCode.CONFIGURATION_ERROR, false);
        }
        return new Promise((resolve, reject) => {
            try {
                const source = this.audioContext.createBufferSource();
                const gainNode = this.audioContext.createGain();
                source.buffer = audioBuffer;
                source.connect(gainNode);
                gainNode.connect(this.audioContext.destination);
                // Set volume
                const volume = playbackOptions?.volume ?? 1.0;
                gainNode.gain.setValueAtTime(volume, this.audioContext.currentTime);
                // Handle fade effects
                if (playbackOptions?.fadeIn) {
                    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
                    gainNode.gain.linearRampToValueAtTime(volume, this.audioContext.currentTime + playbackOptions.fadeIn / 1000);
                }
                if (playbackOptions?.fadeOut) {
                    const fadeStartTime = this.audioContext.currentTime + audioBuffer.duration - (playbackOptions.fadeOut / 1000);
                    gainNode.gain.setValueAtTime(volume, fadeStartTime);
                    gainNode.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + audioBuffer.duration);
                }
                source.onended = () => resolve();
                source.onerror = (error) => reject(new TTSError(`Audio playback failed: ${error}`, tts_interfaces_1.TTSErrorCode.AUDIO_ERROR, true));
                source.start();
            }
            catch (error) {
                reject(this.handleTTSError(error));
            }
        });
    }
    async speakText(text, options) {
        if (!this.audioContext) {
            await this.synthesizeSpeechServerSide(text, options);
            return;
        }
        const audioBuffer = await this.synthesizeSpeech(text, options);
        await this.playAudio(audioBuffer);
    }
    async speakWithEmotion(text, emotionalState, options) {
        if (!this.audioContext) {
            const emotionalOptions = this.adaptOptionsForEmotion(emotionalState, options);
            const emotionallyAdaptedText = this.applyEmotionalContext(text, emotionalState);
            await this.synthesizeSpeechServerSide(emotionallyAdaptedText, emotionalOptions);
            return;
        }
        const audioBuffer = await this.synthesizeSpeechWithEmotion(text, emotionalState, options);
        await this.playAudio(audioBuffer);
    }
    async handleTechnicalDelay(delayReason) {
        const delayMessages = this.config.technicalDelayMessages;
        const randomMessage = delayMessages[Math.floor(Math.random() * delayMessages.length)];
        const contextualMessage = `${randomMessage} ${this.getDelayExplanation(delayReason)}`;
        // Use a calm, reassuring tone for technical delays
        const calmEmotionalState = {
            valence: 0.3, // slightly positive
            arousal: 0.2, // very calm
            dominant_emotion: 'reassuring',
            confidence: 0.9
        };
        await this.speakWithEmotion(contextualMessage, calmEmotionalState);
    }
    async isAvailable() {
        try {
            await this.initialize();
            return this.config.apiKey !== undefined && this.config.apiKey.length > 0;
        }
        catch {
            return false;
        }
    }
    async getVoiceOptions() {
        // Return soft female Google Cloud TTS neural voices optimized for Xeno
        return [
            {
                id: 'en-US-Neural2-F',
                name: 'Neural2-F (Female - Xeno Default)',
                language: 'en-US',
                gender: 'female',
                style: 'calm, warm, therapeutic',
                isNeural: true
            },
            {
                id: 'en-US-Neural2-H',
                name: 'Neural2-H (Female - Gentle)',
                language: 'en-US',
                gender: 'female',
                style: 'gentle, soothing',
                isNeural: true
            },
            {
                id: 'en-US-Neural2-C',
                name: 'Neural2-C (Female - Empathetic)',
                language: 'en-US',
                gender: 'female',
                style: 'empathetic, caring',
                isNeural: true
            },
            {
                id: 'en-US-Wavenet-F',
                name: 'Wavenet-F (Female - Soft)',
                language: 'en-US',
                gender: 'female',
                style: 'soft, maternal',
                isNeural: false
            },
            {
                id: 'en-US-Wavenet-G',
                name: 'Wavenet-G (Female - Warm)',
                language: 'en-US',
                gender: 'female',
                style: 'warm, friendly',
                isNeural: false
            }
        ];
    }
    generateSSML(text, options) {
        const voice = options?.voice || this.config.defaultVoice;
        const speed = options?.speed || 0.95;
        const pitch = options?.pitch || 0.9;
        // Apply advanced human-like processing
        const humanizedText = this.makeTextHumanLike(text);
        let ssml = `<speak>`;
        ssml += `<voice name="${voice}">`;
        // Use conversational style with natural breathing
        ssml += `<prosody rate="${this.formatSpeed(speed)}" pitch="${this.formatPitch(pitch)}" volume="soft">`;
        ssml += humanizedText;
        ssml += `</prosody></voice></speak>`;
        return ssml;
    }
    makeTextHumanLike(text) {
        let processedText = text;
        // 1. Add thoughtful pauses before important statements
        processedText = processedText.replace(/(I understand|I can hear|I want you to know|Let me|What I'm hearing|It sounds like)/gi, '<break time="400ms"/>$1');
        // 2. Add gentle pauses after empathetic phrases
        processedText = processedText.replace(/(that's really difficult|I'm here with you|you're not alone|that must be hard)/gi, '$1<break time="600ms"/>');
        // 3. Add natural breathing before questions
        processedText = processedText.replace(/(Would you like|How does that feel|What would help|Can you tell me)/gi, '<break time="300ms"/>$1');
        // 4. Emphasize key emotional words with slower pace and lower pitch
        processedText = processedText.replace(/(anxious|worried|scared|sad|lonely|overwhelmed|stressed|difficult|pain|hurt)/gi, '<prosody rate="85%" pitch="-1st">$1</prosody>');
        // 5. Warm emphasis on positive/supportive words
        processedText = processedText.replace(/(safe|supported|strong|capable|brave|proud|healing|better|hope|peace)/gi, '<prosody rate="90%" pitch="+0.5st" volume="medium"><emphasis level="moderate">$1</emphasis></prosody>');
        // 6. Softer tone for sensitive topics
        processedText = processedText.replace(/(death|dying|suicide|depression|trauma|abuse|loss|grief)/gi, '<prosody rate="80%" pitch="-2st" volume="soft">$1</prosody>');
        // 7. Natural sentence flow with varied pauses
        processedText = processedText.replace(/\. /g, '.<break time="500ms"/> ');
        processedText = processedText.replace(/, /g, ',<break time="200ms"/> ');
        processedText = processedText.replace(/\? /g, '?<break time="400ms"/> ');
        processedText = processedText.replace(/! /g, '!<break time="300ms"/> ');
        // 8. Add hesitation markers for more natural speech
        processedText = processedText.replace(/(Well,|So,|You know,|I think|Perhaps|Maybe)/gi, '$1<break time="250ms"/>');
        // 9. Breathing space around "and" for natural flow
        processedText = processedText.replace(/ and /gi, '<break time="150ms"/> and<break time="150ms"/> ');
        // 10. Special handling for Xeno's introductions
        processedText = processedText.replace(/Hello, I'm Xeno/gi, '<prosody rate="90%" pitch="-0.5st">Hello,<break time="400ms"/> I\'m <emphasis level="moderate">Xeno</emphasis></prosody>');
        // 11. Gentle tone for session endings
        processedText = processedText.replace(/(goodbye|take care|I'll be here|sleep now)/gi, '<prosody rate="85%" pitch="-1st" volume="soft">$1</prosody>');
        // 12. Add natural paragraph breaks for longer responses
        processedText = processedText.replace(/\n\n/g, '<break time="800ms"/>');
        processedText = processedText.replace(/\n/g, '<break time="400ms"/>');
        return processedText;
    }
    addNaturalPauses(text) {
        // This function is now replaced by makeTextHumanLike for more advanced processing
        // Keeping for backwards compatibility but using simpler processing
        const { naturalPauses } = this.config;
        return text
            .replace(/\./g, `.<break time="${naturalPauses.period}ms"/>`)
            .replace(/,/g, `,<break time="${naturalPauses.comma}ms"/>`)
            .replace(/\n\n/g, `<break time="${naturalPauses.paragraph}ms"/>`)
            .replace(/\n/g, `<break time="${naturalPauses.sentence}ms"/>`);
    }
    adaptOptionsForEmotion(emotionalState, baseOptions) {
        const mapping = this.findEmotionalMapping(emotionalState);
        return {
            ...baseOptions,
            speed: (baseOptions?.speed || 1.0) * mapping.speedModifier,
            pitch: (baseOptions?.pitch || 1.0) * mapping.pitchModifier,
            pauseDuration: (baseOptions?.pauseDuration || 0) + mapping.pauseModifier,
            voice: this.selectVoiceForEmotion(emotionalState, baseOptions?.voice)
        };
    }
    // Enhanced emotional speech synthesis with context-aware prosody
    applyEmotionalContext(text, emotionalState) {
        let adaptedText = text;
        // Apply emotional tone adjustments based on user's state
        if (emotionalState.valence < -0.5) {
            // User is very negative - use extra gentle, supportive tone
            adaptedText = this.addGentleTone(adaptedText);
        }
        else if (emotionalState.valence > 0.5) {
            // User is positive - match with warm, encouraging tone
            adaptedText = this.addWarmTone(adaptedText);
        }
        if (emotionalState.arousal > 0.7) {
            // User is highly aroused/agitated - use calming prosody
            adaptedText = this.addCalmingTone(adaptedText);
        }
        else if (emotionalState.arousal < 0.3) {
            // User is low energy - use gentle encouragement
            adaptedText = this.addEncouragingTone(adaptedText);
        }
        return adaptedText;
    }
    addGentleTone(text) {
        // Wrap entire response in extra gentle prosody for sensitive moments
        return `<prosody rate="85%" pitch="-1.5st" volume="soft"><break time="200ms"/>${text}</prosody>`;
    }
    addWarmTone(text) {
        // Add warmth and slight energy to positive interactions
        return `<prosody rate="95%" pitch="+0.5st" volume="medium">${text}</prosody>`;
    }
    addCalmingTone(text) {
        // Extra slow and low for calming effect with breathing space
        return `<prosody rate="80%" pitch="-2st" volume="soft"><break time="300ms"/>${text}<break time="400ms"/></prosody>`;
    }
    addEncouragingTone(text) {
        // Gentle encouragement with slight emphasis and warmth
        return `<prosody rate="90%" pitch="+0.5st"><emphasis level="moderate">${text}</emphasis></prosody>`;
    }
    findEmotionalMapping(emotionalState) {
        // Find the closest emotional mapping based on valence and arousal
        let closestMapping = this.config.emotionalMappings[0];
        let minDistance = Infinity;
        for (const mapping of this.config.emotionalMappings) {
            const distance = Math.sqrt(Math.pow(mapping.valence - emotionalState.valence, 2) +
                Math.pow(mapping.arousal - emotionalState.arousal, 2));
            if (distance < minDistance) {
                minDistance = distance;
                closestMapping = mapping;
            }
        }
        return closestMapping;
    }
    selectVoiceForEmotion(emotionalState, preferredVoice) {
        if (preferredVoice)
            return preferredVoice;
        // Select soft female voices based on emotional state for Xeno
        if (emotionalState.valence > 0.5 && emotionalState.arousal > 0.5) {
            return 'en-US-Neural2-H'; // Gentle voice for positive energy
        }
        else if (emotionalState.valence < -0.3) {
            return 'en-US-Neural2-C'; // Empathetic voice for negative emotions
        }
        else if (emotionalState.arousal < 0.3) {
            return 'en-US-Neural2-F'; // Calm, therapeutic voice for low arousal
        }
        else {
            return 'en-US-Wavenet-F'; // Soft, maternal voice as fallback
        }
    }
    formatSpeed(speed) {
        // Google TTS accepts speed as percentage or multiplier
        if (speed === 1.0)
            return 'medium';
        if (speed < 0.7)
            return 'x-slow';
        if (speed < 0.9)
            return 'slow';
        if (speed > 1.3)
            return 'x-fast';
        if (speed > 1.1)
            return 'fast';
        return 'medium';
    }
    formatPitch(pitch) {
        // Google TTS accepts pitch in Hz or relative values
        const percentage = Math.round((pitch - 1.0) * 100);
        if (percentage === 0)
            return 'medium';
        return percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
    }
    getDelayExplanation(delayReason) {
        const explanations = {
            'network': 'I\'m having a bit of trouble with my connection, but I\'m working on it.',
            'api': 'I\'m processing your request - just give me a moment.',
            'processing': 'I\'m thinking about the best way to respond to you.',
            'audio': 'I\'m preparing my voice for you.',
            'default': 'Please bear with me for just a moment.'
        };
        return explanations[delayReason] || explanations['default'];
    }
    async callGoogleTTS(ssml, options) {
        const endpoint = 'https://texttospeech.googleapis.com/v1/text:synthesize';
        // Configure soft, therapeutic voice settings for Xeno
        const requestBody = {
            input: {
                ssml: ssml
            },
            voice: {
                languageCode: this.config.defaultLanguage,
                name: options?.voice || this.config.defaultVoice,
                ssmlGender: this.getGenderFromVoice(options?.voice || this.config.defaultVoice)
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: options?.speed || 0.95, // Slightly slower for calm, therapeutic feel
                pitch: options?.pitch ? (options.pitch - 1.0) * 20 : -2.0, // Slightly lower pitch for warmth
                volumeGainDb: options?.volume ? 20 * Math.log10(options.volume) : -2.0, // Slightly softer volume
                effectsProfileId: ['telephony-class-application'], // Optimize for voice applications
                sampleRateHertz: 24000 // Higher quality audio
            }
        };
        const response = await this.secureFetch(endpoint, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Google TTS API error: ${response.status} ${response.statusText} - ${errorData.error?.message || 'Unknown error'}`);
        }
        const data = await response.json();
        if (!data.audioContent) {
            throw new Error('No audio content received from Google TTS API');
        }
        // Convert base64 audio content to ArrayBuffer
        const audioBytes = atob(data.audioContent);
        const audioArray = new Uint8Array(audioBytes.length);
        for (let i = 0; i < audioBytes.length; i++) {
            audioArray[i] = audioBytes.charCodeAt(i);
        }
        return audioArray.buffer;
    }
    getGenderFromVoice(voiceName) {
        // Determine gender from voice name for Google TTS
        const voiceOptions = [
            { id: 'en-US-Neural2-A', gender: 'FEMALE' },
            { id: 'en-US-Neural2-C', gender: 'FEMALE' },
            { id: 'en-US-Neural2-D', gender: 'MALE' },
            { id: 'en-US-Neural2-F', gender: 'FEMALE' }
        ];
        const voice = voiceOptions.find(v => v.id === voiceName);
        return voice?.gender || 'FEMALE';
    }
    handleTTSError(error) {
        if (error instanceof TTSError) {
            return error;
        }
        const msg = error?.message || '';
        // Specific classifications first
        if (msg.toLowerCase().includes('quota') || msg.toLowerCase().includes('limit') || msg.includes('QUOTA_EXCEEDED')) {
            return new TTSError('API quota exceeded', tts_interfaces_1.TTSErrorCode.QUOTA_EXCEEDED, false);
        }
        if (msg.includes('INVALID_ARGUMENT') || msg.toLowerCase().includes('invalid voice') || msg.toLowerCase().includes('voice name')) {
            return new TTSError('Unsupported voice or invalid configuration', tts_interfaces_1.TTSErrorCode.UNSUPPORTED_VOICE, false);
        }
        // Preserve specific Google API error message (tests expect exact substring without extra prefix)
        if (msg.startsWith('Google TTS API error:')) {
            return new TTSError(msg, tts_interfaces_1.TTSErrorCode.API_ERROR, msg.includes('401') ? false : true);
        }
        if (msg === 'No audio content received from Google TTS API') {
            return new TTSError(msg, tts_interfaces_1.TTSErrorCode.API_ERROR, true);
        }
        if (error.name === 'NetworkError' || error.code === 'NETWORK_ERROR' || msg === 'Network error') {
            return new TTSError('TTS service error: Network error', tts_interfaces_1.TTSErrorCode.API_ERROR, true);
        }
        return new TTSError(`TTS service error: ${msg}`, tts_interfaces_1.TTSErrorCode.API_ERROR, true);
    }
    async dispose() {
        try {
            if (this.audioContext && this.audioContext.close) {
                await this.audioContext.close();
            }
        }
        catch { /* ignore */ }
    }
    /**
     * Server-side speech synthesis without AudioContext
     * Uses Google Cloud TTS API directly and plays audio via system commands
     */
    async synthesizeSpeechServerSide(text, options) {
        const startTime = Date.now();
        try {
            // Use Google Cloud Text-to-Speech API
            const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
            // Create client with service account from config
            const client = new TextToSpeechClient({
                credentials: this.config.serviceAccount,
                projectId: this.config.serviceAccount?.project_id
            });
            // Construct the request: request LINEAR16 (WAV) for reliable playback on Raspberry Pi
            const request = {
                input: { text: text },
                voice: {
                    languageCode: this.config.defaultLanguage || 'en-US',
                    name: options?.voice || this.config.defaultVoice || 'en-US-Neural2-F',
                    ssmlGender: 'FEMALE'
                },
                audioConfig: {
                    audioEncoding: 'LINEAR16',
                    sampleRateHertz: 16000,
                    speakingRate: options?.speed || this.config.defaultSpeed || 1.0,
                    pitch: options?.pitch || 0.0,
                    volumeGainDb: options?.volume || 0.0
                }
            };
            // Call Google TTS API
            const [response] = await client.synthesizeSpeech(request);
            if (!response.audioContent) {
                throw new TTSError('No audio content received from Google TTS', tts_interfaces_1.TTSErrorCode.AUDIO_ERROR, true);
            }
            // Save audio to temporary file and play it
            const fs = require('fs').promises;
            const path = require('path');
            const { exec } = require('child_process');
            const { promisify } = require('util');
            const execAsync = promisify(exec);
            // Normalize audio content to a Buffer and detect if it contains a WAV header
            const audioBuf = Buffer.isBuffer(response.audioContent)
                ? response.audioContent
                : Buffer.from(response.audioContent);
            const isWav = audioBuf.length >= 12 &&
                audioBuf.toString('ascii', 0, 4) === 'RIFF' &&
                audioBuf.toString('ascii', 8, 12) === 'WAVE';
            const tempFile = path.join('/tmp', `xeno_tts_${Date.now()}.${isWav ? 'wav' : 'pcm'}`);
            // Write audio content to file (if raw PCM, no header; if WAV, contains RIFF header)
            await fs.writeFile(tempFile, audioBuf);
            // Play audio using system command
            try {
                // Try different audio players in order of preference
                const players = ['aplay', 'paplay', 'play', 'ffplay'];
                let played = false;
                for (const player of players) {
                    try {
                        if (player === 'aplay') {
                            if (isWav) {
                                await execAsync(`${player} -q ${tempFile}`);
                            }
                            else {
                                // raw PCM: specify format, rate, and channels explicitly
                                await execAsync(`${player} -q -t raw -f S16_LE -r 16000 -c 1 ${tempFile}`);
                            }
                        }
                        else if (player === 'play') {
                            if (isWav) {
                                await execAsync(`${player} -q ${tempFile}`);
                            }
                            else {
                                await execAsync(`${player} -q -t raw -r 16000 -e signed -b 16 -c 1 ${tempFile}`);
                            }
                        }
                        else if (player === 'ffplay') {
                            if (isWav) {
                                await execAsync(`${player} -v quiet -autoexit -nodisp ${tempFile}`);
                            }
                            else {
                                await execAsync(`${player} -v quiet -autoexit -nodisp -f s16le -ar 16000 -ac 1 ${tempFile}`);
                            }
                        }
                        else {
                            await execAsync(`${player} ${tempFile}`);
                        }
                        played = true;
                        break;
                    }
                    catch (e) {
                        // Player not found or failed, try next one
                    }
                }
                if (!played) {
                    throw new TTSError('No compatible audio player found on the system. Install alsa-utils (aplay) or sox.', tts_interfaces_1.TTSErrorCode.AUDIO_ERROR, false);
                }
            }
            finally {
                // Clean up temporary file
                await fs.unlink(tempFile).catch(() => { }); // Ignore errors on cleanup
            }
            performance_manager_1.performanceManager.recordMetrics({
                textToSpeechLatency: Date.now() - startTime
            });
        }
        catch (error) {
            throw this.handleTTSError(error);
        }
    }
}
exports.GoogleTextToSpeechService = GoogleTextToSpeechService;
class TTSError extends Error {
    constructor(message, code, retryable, details) {
        super(message);
        this.name = 'TTSError';
        this.code = code;
        this.retryable = retryable;
        this.details = details;
    }
}
//# sourceMappingURL=google-text-to-speech-service.js.map