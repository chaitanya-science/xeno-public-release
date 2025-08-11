"use strict";
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
exports.OpenAITextToSpeechService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class OpenAITextToSpeechService {
    constructor(config) {
        this.isInitialized = false;
        this.defaultVoice = 'alloy'; // OpenAI TTS voices: alloy, echo, fable, onyx, nova, shimmer
        this.config = config;
        this.apiKey = config.apiKey || '';
    }
    async initialize() {
        if (!this.apiKey) {
            throw new Error('OpenAI TTS API key is required');
        }
        this.isInitialized = true;
    }
    async synthesizeSpeech(text, options) {
        if (!this.isInitialized) {
            throw new Error('OpenAI TTS service not initialized');
        }
        try {
            console.log(`🎵 OpenAI TTS: Synthesizing speech for text: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);
            console.log(`🔑 OpenAI TTS: API key length: ${this.apiKey?.length || 0}, starts with: ${this.apiKey?.substring(0, 10)}...`);
            const voice = options?.voice || this.defaultVoice;
            const speed = options?.speed || this.config.defaultSpeed;
            console.log(`🔊 OpenAI TTS: Using voice: ${voice}, speed: ${speed}`);
            const response = await fetch('https://api.openai.com/v1/audio/speech', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'tts-1',
                    input: text,
                    voice: voice,
                    speed: Math.max(0.25, Math.min(4.0, speed)), // OpenAI speed range: 0.25 to 4.0
                    response_format: 'mp3'
                })
            });
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI TTS API error: ${response.status} ${response.statusText} - ${errorText}`);
            }
            const audioData = await response.arrayBuffer();
            console.log(`✅ OpenAI TTS: Generated audio, size: ${audioData.byteLength} bytes`);
            // Convert ArrayBuffer to AudioBuffer
            const audioBuffer = await this.arrayBufferToAudioBuffer(audioData);
            return audioBuffer;
        }
        catch (error) {
            console.error(`❌ OpenAI TTS synthesis failed:`, error);
            throw error;
        }
    }
    async synthesizeSpeechWithEmotion(text, emotionalState, options) {
        // OpenAI TTS doesn't support emotional voice directly, but we can adjust speed and add pauses
        const adjustedOptions = this.adjustOptionsForEmotion(emotionalState, options);
        return this.synthesizeSpeech(text, adjustedOptions);
    }
    async synthesizeSpeechServerSide(text, options) {
        // For server-side synthesis, we just synthesize and don't play
        await this.synthesizeSpeech(text, options);
    }
    async playAudio(audioBuffer) {
        try {
            // Find the most recent audio file in the temp directory
            const tempDir = path.join(process.cwd(), 'temp-audio');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir)
                    .filter(file => file.startsWith('openai-tts-') && file.endsWith('.mp3'))
                    .map(file => ({ name: file, path: path.join(tempDir, file) }))
                    .sort((a, b) => {
                    const aTime = parseInt(a.name.replace('openai-tts-', '').replace('.mp3', ''));
                    const bTime = parseInt(b.name.replace('openai-tts-', '').replace('.mp3', ''));
                    return bTime - aTime; // Most recent first
                });
                if (files.length > 0) {
                    const latestFile = files[0];
                    console.log(`🎵 OpenAI TTS: Playing audio file: ${latestFile.name}`);
                    // Try to play the audio using system commands
                    const { exec } = require('child_process');
                    // Detect OS and use appropriate audio player
                    let playCommand;
                    if (process.platform === 'darwin') {
                        playCommand = `afplay "${latestFile.path}"`;
                    }
                    else if (process.platform === 'linux') {
                        playCommand = `aplay "${latestFile.path}" || paplay "${latestFile.path}" || ffplay -nodisp -autoexit "${latestFile.path}"`;
                    }
                    else if (process.platform === 'win32') {
                        playCommand = `start /min wmplayer "${latestFile.path}"`;
                    }
                    else {
                        playCommand = `echo "Audio file saved at: ${latestFile.path}"`;
                    }
                    exec(playCommand, (error, stdout, stderr) => {
                        if (error) {
                            console.warn(`⚠️ OpenAI TTS: Could not play audio automatically: ${error.message}`);
                            console.log(`💾 Audio file saved at: ${latestFile.path}`);
                        }
                        else {
                            console.log(`✅ OpenAI TTS: Audio playback completed`);
                        }
                    });
                }
                else {
                    console.log(`🎵 OpenAI TTS: No audio files found to play`);
                }
            }
            console.log(`🎵 OpenAI TTS: Audio ready to play, duration: ${audioBuffer.duration}s`);
        }
        catch (error) {
            console.error(`❌ OpenAI TTS: Audio playback failed:`, error);
            console.log(`🎵 OpenAI TTS: Audio ready to play, duration: ${audioBuffer.duration}s`);
        }
    }
    async speakText(text, options) {
        const audioBuffer = await this.synthesizeSpeech(text, options);
        await this.playAudio(audioBuffer);
    }
    async speakWithEmotion(text, emotionalState, options) {
        const audioBuffer = await this.synthesizeSpeechWithEmotion(text, emotionalState, options);
        await this.playAudio(audioBuffer);
    }
    async handleTechnicalDelay(delayReason) {
        const delayMessage = this.config.technicalDelayMessages[Math.floor(Math.random() * this.config.technicalDelayMessages.length)];
        await this.speakText(delayMessage);
    }
    async isAvailable() {
        return this.isInitialized && !!this.apiKey;
    }
    async getVoiceOptions() {
        return [
            {
                id: 'alloy',
                name: 'Alloy',
                language: 'en-US',
                gender: 'neutral',
                style: 'versatile',
                isNeural: true
            },
            {
                id: 'echo',
                name: 'Echo',
                language: 'en-US',
                gender: 'male',
                style: 'warm',
                isNeural: true
            },
            {
                id: 'fable',
                name: 'Fable',
                language: 'en-US',
                gender: 'male',
                style: 'narrator',
                isNeural: true
            },
            {
                id: 'onyx',
                name: 'Onyx',
                language: 'en-US',
                gender: 'male',
                style: 'deep',
                isNeural: true
            },
            {
                id: 'nova',
                name: 'Nova',
                language: 'en-US',
                gender: 'female',
                style: 'friendly',
                isNeural: true
            },
            {
                id: 'shimmer',
                name: 'Shimmer',
                language: 'en-US',
                gender: 'female',
                style: 'bright',
                isNeural: true
            }
        ];
    }
    adjustOptionsForEmotion(emotionalState, options) {
        const adjustedOptions = { ...options };
        // Adjust speed based on arousal (high arousal = faster speech)
        if (emotionalState.arousal > 0.7) {
            adjustedOptions.speed = (options?.speed || 1.0) * 1.2;
        }
        else if (emotionalState.arousal < 0.3) {
            adjustedOptions.speed = (options?.speed || 1.0) * 0.8;
        }
        // Add pauses for negative valence (sad/thoughtful speech)
        if (emotionalState.valence < -0.5) {
            // Add natural pauses by inserting commas and periods
            const pauseText = this.addEmotionalPauses(options?.pauseDuration || 200);
            // Note: This would need to be handled in the text processing
        }
        return adjustedOptions;
    }
    addEmotionalPauses(pauseDuration) {
        // Return adjusted pause duration based on emotional state
        return pauseDuration * 1.5;
    }
    async arrayBufferToAudioBuffer(arrayBuffer) {
        try {
            console.log(`🔄 OpenAI TTS: Processing audio data...`);
            // Save the MP3 data to a temporary file for debugging
            const tempDir = path.join(process.cwd(), 'temp-audio');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }
            const timestamp = Date.now();
            const tempFile = path.join(tempDir, `openai-tts-${timestamp}.mp3`);
            fs.writeFileSync(tempFile, Buffer.from(arrayBuffer));
            console.log(`💾 OpenAI TTS: Saved audio to ${tempFile}`);
            // Create a simple AudioBuffer that represents the audio data
            // This is a simplified approach - in a real implementation you'd decode the MP3
            const sampleRate = 44100;
            const estimatedDuration = arrayBuffer.byteLength / 16000; // Rough estimate for MP3
            const length = Math.floor(sampleRate * estimatedDuration);
            // Create a minimal AudioBuffer structure that satisfies the interface
            const audioBuffer = {
                duration: estimatedDuration,
                length: length,
                sampleRate: sampleRate,
                numberOfChannels: 1,
                getChannelData: (channel) => {
                    if (channel === 0) {
                        // Create a simple audio representation
                        const data = new Float32Array(length);
                        // Fill with a gentle tone to indicate audio is ready
                        for (let i = 0; i < length; i++) {
                            data[i] = Math.sin(2 * Math.PI * 440 * i / sampleRate) * 0.05; // Soft 440Hz tone
                        }
                        return data;
                    }
                    return new Float32Array(0);
                }
            };
            console.log(`🎵 OpenAI TTS: Created AudioBuffer - duration: ${estimatedDuration}s, file: ${tempFile}`);
            return audioBuffer;
        }
        catch (error) {
            console.error(`❌ OpenAI TTS: Audio processing failed:`, error);
            // Fallback: create a minimal working buffer
            const fallbackBuffer = {
                duration: 1,
                length: 44100,
                sampleRate: 44100,
                numberOfChannels: 1,
                getChannelData: (channel) => {
                    if (channel === 0) {
                        const data = new Float32Array(44100);
                        for (let i = 0; i < 44100; i++) {
                            data[i] = Math.sin(2 * Math.PI * 440 * i / 44100) * 0.1; // 440Hz tone
                        }
                        return data;
                    }
                    return new Float32Array(0);
                }
            };
            console.log(`⚠️ OpenAI TTS: Using fallback audio buffer`);
            return fallbackBuffer;
        }
    }
    dispose() {
        this.isInitialized = false;
        this.cleanupTempFiles();
    }
    cleanupTempFiles() {
        try {
            const tempDir = path.join(process.cwd(), 'temp-audio');
            if (fs.existsSync(tempDir)) {
                const files = fs.readdirSync(tempDir)
                    .filter(file => file.startsWith('openai-tts-') && file.endsWith('.mp3'));
                // Keep only the 5 most recent files, delete older ones
                if (files.length > 5) {
                    const filesToDelete = files
                        .map(file => ({ name: file, path: path.join(tempDir, file), time: parseInt(file.replace('openai-tts-', '').replace('.mp3', '')) }))
                        .sort((a, b) => b.time - a.time)
                        .slice(5);
                    filesToDelete.forEach(file => {
                        try {
                            fs.unlinkSync(file.path);
                            console.log(`🗑️ OpenAI TTS: Cleaned up old audio file: ${file.name}`);
                        }
                        catch (error) {
                            console.warn(`⚠️ OpenAI TTS: Could not delete old file ${file.name}:`, error);
                        }
                    });
                }
            }
        }
        catch (error) {
            console.warn(`⚠️ OpenAI TTS: Error during cleanup:`, error);
        }
    }
}
exports.OpenAITextToSpeechService = OpenAITextToSpeechService;
//# sourceMappingURL=openai-tts-service.js.map