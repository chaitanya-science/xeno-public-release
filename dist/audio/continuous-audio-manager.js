"use strict";
/**
 * Continuous Audio Manager
 * Handles always-on voice detection without wake word requirements
 * Implements voice activity detection for seamless conversation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContinuousAudioManager = void 0;
const events_1 = require("events");
const pvrecorder_node_1 = require("@picovoice/pvrecorder-node");
class ContinuousAudioManager extends events_1.EventEmitter {
    constructor(speechToTextService, textToSpeechService, config = {}) {
        super();
        this.speechToTextService = speechToTextService;
        this.textToSpeechService = textToSpeechService;
        this.isListening = false;
        this.isRecording = false;
        this.isPaused = false;
        this.audioBuffer = [];
        this.speechStartTime = null;
        this.silenceStartTime = null;
        this.lastVolumeLevel = 0;
        this.noiseFloor = 0.005; // EMA of ambient noise level
        this.activeFramesCount = 0; // consecutive frames above threshold
        this.lastFinalizeTime = 0; // timestamp of last finalize to apply cooldown
        this.silenceTimer = null;
        this.recordingTimer = null;
        this.recorder = null;
        this.config = {
            sampleRate: 16000,
            channels: 1,
            bitDepth: 16,
            bufferSize: 512,
            silenceTimeout: 1800,
            maxRecordingTime: 15000,
            energyThreshold: 0.015, // Base threshold; dynamic threshold will refine
            pauseThreshold: 0.8,
            voiceActivationEnabled: true,
            continuousListening: true,
            autoStart: true,
            dynamicThresholdMultiplier: 2.2,
            vadActivationFrames: 2, // ~60-70ms at 16kHz with 512-sample frames
            minSpeechMs: 350,
            postSpeechCooldownMs: 500,
            continueThresholdRatio: 0.7,
            ...config
        };
    }
    /**
     * Initialize the continuous audio manager
     */
    async initialize() {
        try {
            await this.speechToTextService.initialize();
            this.recorder = new pvrecorder_node_1.PvRecorder(this.config.bufferSize, -1);
            // Use the actual device sample rate
            try {
                const deviceRate = this.recorder.sampleRate ?? this.recorder.sample_rate ?? undefined;
                if (typeof deviceRate === 'number' && deviceRate > 0) {
                    this.config.sampleRate = deviceRate;
                }
            }
            catch { }
            console.log(`🎤 Continuous Audio Manager initialized (device: ${this.recorder.getSelectedDevice?.() || 'default'}, sampleRate: ${this.config.sampleRate} Hz)`);
            if (this.config.autoStart) {
                await this.startListening();
            }
            this.emit('initialized');
        }
        catch (error) {
            console.error('Failed to initialize Continuous Audio Manager:', error);
            throw error;
        }
    }
    /**
     * Start continuous listening for voice input
     */
    async startListening() {
        if (this.isListening) {
            console.warn('Already listening for voice input');
            return;
        }
        try {
            this.isListening = true;
            // Reset state safely
            this.audioBuffer = [];
            this.speechStartTime = null;
            this.silenceStartTime = null;
            this.lastVolumeLevel = 0;
            this.isRecording = false;
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
                this.recordingTimer = null;
            }
            if (this.recorder) {
                await this.recorder.start();
                console.log('👂 Started continuous voice listening - speak anytime!');
                this.emit('listening_started');
                this.startAudioCapture();
            }
            else {
                throw new Error('Recorder not initialized');
            }
        }
        catch (error) {
            console.error('Failed to start continuous listening:', error);
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * Stop continuous listening
     */
    async stopListening() {
        if (!this.isListening)
            return;
        try {
            if (this.recorder) {
                await this.recorder.stop();
            }
            this.isListening = false;
            this.isRecording = false;
            if (this.silenceTimer) {
                clearTimeout(this.silenceTimer);
                this.silenceTimer = null;
            }
            if (this.recordingTimer) {
                clearTimeout(this.recordingTimer);
                this.recordingTimer = null;
            }
            this.audioBuffer = [];
            this.speechStartTime = null;
            this.silenceStartTime = null;
            this.lastVolumeLevel = 0;
            console.log('🔇 Stopped continuous voice listening');
            this.emit('listening_stopped');
        }
        catch (error) {
            console.error('Error stopping continuous listening:', error);
        }
    }
    /**
     * Pause listening (e.g., while TTS is speaking)
     */
    async pauseListening() {
        if (this.isListening && this.recorder) {
            this.isPaused = true;
            try {
                await this.recorder.stop();
            }
            catch (e) {
                // ignore stop errors if already stopped
            }
            console.log('⏸️ Paused listening during speech output');
        }
    }
    /**
     * Resume listening after being paused
     */
    async resumeListening() {
        if (this.isListening && this.recorder) {
            try {
                await this.recorder.start();
            }
            catch (e) {
                // If already started, ignore
            }
            this.isPaused = false;
            console.log('▶️ Resumed listening');
        }
    }
    /**
     * Main audio capture loop with voice activity detection
     */
    async startAudioCapture() {
        const captureLoop = async () => {
            if (!this.isListening || !this.recorder)
                return;
            try {
                if (!this.isPaused && this.recorder.isRecording) {
                    const pcm = await this.recorder.read();
                    const audioChunk = this.processPcmData(pcm);
                    if (audioChunk) {
                        await this.processAudioChunk(audioChunk);
                    }
                }
                setImmediate(captureLoop);
            }
            catch (error) {
                const msg = String(error?.message || error);
                if (this.isPaused || !this.isListening || msg.includes('PvRecorder failed to read')) {
                    setImmediate(captureLoop);
                    return;
                }
                console.error('Error in audio capture loop:', error);
                this.emit('audio_capture_error', error);
                setImmediate(captureLoop);
            }
        };
        setImmediate(captureLoop);
    }
    // Convert raw PCM to an AudioChunk and compute volume
    processPcmData(pcm) {
        // Create a stable copy of the bytes; do NOT reference the underlying ArrayBuffer directly
        // as it may be reused/mutated by the recorder between reads.
        const byteView = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
        const buffer = Buffer.from(byteView); // copies bytes
        let sum = 0;
        for (let i = 0; i < pcm.length; i++)
            sum += Math.abs(pcm[i] / 32767.0);
        const volumeLevel = pcm.length > 0 ? sum / pcm.length : 0;
        return { data: buffer, timestamp: Date.now(), volumeLevel };
    }
    // Voice Activity Detection using energy threshold
    async processAudioChunk(audioChunk) {
        // Post-speech cooldown to avoid retriggering on trailing noise
        if (!this.isRecording && this.lastFinalizeTime && (Date.now() - this.lastFinalizeTime) < this.config.postSpeechCooldownMs) {
            return;
        }
        // Update ambient noise floor when not recording
        if (!this.isRecording) {
            this.noiseFloor = this.noiseFloor * 0.95 + audioChunk.volumeLevel * 0.05;
        }
        const dynamicThreshold = Math.max(this.config.energyThreshold, this.noiseFloor * this.config.dynamicThresholdMultiplier + 0.003);
        const continueThreshold = dynamicThreshold * (this.config.continueThresholdRatio ?? 0.7);
        // Debug volume to help tune thresholds (throttled)
        const now = Date.now();
        if (!(this._lastAudioDbg) || now - this._lastAudioDbg > 250) {
            console.log(`[Audio] Vol: ${audioChunk.volumeLevel.toFixed(4)} | Thr: ${dynamicThreshold.toFixed(4)} / Cont: ${continueThreshold.toFixed(4)} (base ${this.config.energyThreshold}, noise ${this.noiseFloor.toFixed(4)})`);
            this._lastAudioDbg = now;
        }
        const overStart = audioChunk.volumeLevel > dynamicThreshold;
        const overContinue = audioChunk.volumeLevel > continueThreshold;
        const isSpeechDetected = this.isRecording ? overContinue : overStart;
        // While recording, always buffer frames (including quiet parts) to preserve continuity for STT
        if (this.isRecording) {
            this.audioBuffer.push(audioChunk.data);
        }
        if (isSpeechDetected) {
            // Only count towards activation if exceeding the start threshold
            if (overStart) {
                this.activeFramesCount++;
            }
            else {
                // gentle decay during recording if only above continue threshold
                this.activeFramesCount = Math.max(0, this.activeFramesCount - 1);
            }
            if (!this.isRecording && this.activeFramesCount >= this.config.vadActivationFrames) {
                this.startRecording();
            }
            await this.handleSpeechDetected(audioChunk);
        }
        else {
            this.activeFramesCount = 0;
            await this.handleSilenceDetected();
        }
    }
    // Start recording window and hard cap via maxRecordingTime (e.g., 10s)
    startRecording() {
        this.isRecording = true;
        this.speechStartTime = Date.now();
        this.silenceStartTime = null;
        this.audioBuffer = [];
        // Hard cap recording window
        if (this.recordingTimer)
            clearTimeout(this.recordingTimer);
        this.recordingTimer = setTimeout(() => {
            console.log('⏰ Max recording window reached - finalizing');
            this.finalizeSpeech().catch(err => this.emit('error', err));
        }, this.config.maxRecordingTime);
        console.log('🎙️ Started recording speech...');
        this.emit('voice_activity', { type: 'voice_start', timestamp: Date.now() });
    }
    async handleSpeechDetected(audioChunk) {
        if (!this.isRecording)
            this.startRecording();
        // Reset silence timer
        this.silenceStartTime = null;
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        // Accumulation now handled in processAudioChunk to include silence frames too
    }
    async handleSilenceDetected() {
        if (!this.isRecording)
            return;
        if (!this.silenceStartTime) {
            this.silenceStartTime = Date.now();
            this.silenceTimer = setTimeout(async () => {
                // Ensure we had at least some speech of minimum duration
                const speechDuration = (this.silenceStartTime - (this.speechStartTime || this.silenceStartTime));
                const bufferedMs = this.getBufferedDurationMs();
                if (speechDuration >= this.config.minSpeechMs || bufferedMs >= 250) {
                    console.log(`✅ End of speech - finalizing (dur ~${speechDuration}ms, buffered ~${Math.round(bufferedMs)}ms)`);
                    await this.finalizeSpeech();
                }
                else {
                    console.log(`🔇 Speech too short, ignoring (dur ~${speechDuration}ms, buffered ~${Math.round(bufferedMs)}ms)`);
                    this.resetRecording();
                }
            }, this.config.silenceTimeout);
        }
    }
    async finalizeSpeech() {
        if (!this.isRecording || this.audioBuffer.length === 0) {
            this.resetRecording();
            return;
        }
        try {
            console.log('🔄 Processing speech input...');
            const audioData = Buffer.concat(this.audioBuffer);
            // Debug: basic audio stats (samples and approx duration at 16kHz)
            const sampleCount = Math.floor(audioData.length / 2);
            const approxDurationSec = (sampleCount / this.config.sampleRate).toFixed(2);
            console.log(`🎧 Audio captured: ${sampleCount} samples (~${approxDurationSec}s @ ${this.config.sampleRate} Hz)`);
            // Ensure audio matches Google STT expectation (16kHz mono LINEAR16)
            const srcRate = this.config.sampleRate || 16000;
            const audioForStt = srcRate === 16000 ? audioData : this.downsampleTo16k(audioData, srcRate);
            if (srcRate !== 16000) {
                const newSamples = Math.floor(audioForStt.length / 2);
                const newDur = (newSamples / 16000).toFixed(2);
                console.log(`🔁 Resampled ${sampleCount} @ ${srcRate}Hz → ${newSamples} @ 16000Hz (~${newDur}s)`);
            }
            this.resetRecording();
            this.lastFinalizeTime = Date.now();
            this.emit('voice_activity', { type: 'speech_ready', timestamp: Date.now(), data: { audioLength: audioData.length } });
            console.log('🎯 Attempting transcription with STT service...');
            const transcription = await this.speechToTextService.transcribe(audioForStt);
            console.log('📊 Transcription result:', JSON.stringify(transcription, null, 2));
            if (transcription.text && transcription.text.trim().length > 0) {
                console.log(`📝 Transcribed: "${transcription.text}" (${transcription.confidence.toFixed(2)})`);
                this.emit('speech_transcribed', { text: transcription.text, confidence: transcription.confidence, timestamp: Date.now() });
            }
            else {
                if (!transcription.text || transcription.text.trim().length === 0) {
                    console.log('🔈 No clear speech detected in capture window.');
                    console.log('🔍 Debug info - transcription object:', transcription);
                    // Do not speak apology here to avoid user frustration; just wait for next input
                }
                else {
                    console.log('🤔 Low confidence, suppressing prompt');
                    // Suppress nagging; do not emit low_confidence to avoid repeated prompts
                }
            }
        }
        catch (error) {
            console.error('❌ Error processing speech:', error);
            console.error('❌ Error details:', error instanceof Error ? error.stack : error);
            this.emit('error', error);
            this.resetRecording();
        }
    }
    // Pause recorder while speaking and resume afterwards
    async speakResponse(text) {
        try {
            const wasListening = this.isListening;
            if (wasListening)
                await this.pauseListening();
            this.emit('speaking_started', { text });
            // Prefer server-side TTS on headless
            if (typeof this.textToSpeechService.synthesizeSpeechServerSide === 'function') {
                await this.textToSpeechService.synthesizeSpeechServerSide(text);
            }
            else if (typeof this.textToSpeechService.synthesizeSpeech === 'function') {
                const audioBuffer = await this.textToSpeechService.synthesizeSpeech(text);
                await this.playAudioBuffer(audioBuffer);
            }
            else if (typeof this.textToSpeechService.speakText === 'function') {
                await this.textToSpeechService.speakText(text);
            }
            this.emit('speaking_finished', { text });
            if (wasListening)
                await this.resumeListening();
        }
        catch (error) {
            console.error('Error speaking response:', error);
            this.emit('error', error);
        }
    }
    resetRecording() {
        this.isRecording = false;
        this.speechStartTime = null;
        this.silenceStartTime = null;
        this.audioBuffer = [];
        if (this.silenceTimer) {
            clearTimeout(this.silenceTimer);
            this.silenceTimer = null;
        }
        if (this.recordingTimer) {
            clearTimeout(this.recordingTimer);
            this.recordingTimer = null;
        }
    }
    async playAudioBuffer(_audioBuffer) {
        // Minimal stub for now; browser/headless specific playback can be added
        await new Promise(res => setTimeout(res, 500));
    }
    // Downsample 16-bit mono PCM from srcSampleRate to 16kHz using linear interpolation
    downsampleTo16k(input, srcSampleRate) {
        // Replaced by resampleTo16k
        return this.resampleTo16k(input, srcSampleRate);
    }
    // Resample 16-bit mono PCM to 16kHz (up or down) using linear interpolation
    resampleTo16k(input, srcSampleRate) {
        if (srcSampleRate === 16000)
            return input;
        const srcSamples = Math.floor(input.length / 2);
        const ratio = 16000 / srcSampleRate;
        const dstSamples = Math.max(1, Math.floor(srcSamples * ratio));
        const out = new Int16Array(dstSamples);
        const inView = new DataView(input.buffer, input.byteOffset, input.byteLength);
        for (let i = 0; i < dstSamples; i++) {
            const interpIndex = i / ratio;
            const i0 = Math.floor(interpIndex);
            const i1 = Math.min(i0 + 1, srcSamples - 1);
            const frac = interpIndex - i0;
            const s0 = inView.getInt16(i0 * 2, true);
            const s1 = inView.getInt16(i1 * 2, true);
            const v = s0 + (s1 - s0) * frac;
            out[i] = Math.max(-32768, Math.min(32767, Math.round(v)));
        }
        return Buffer.from(out.buffer, out.byteOffset, out.byteLength);
    }
    // Compute buffered audio duration in milliseconds
    getBufferedDurationMs() {
        if (!this.audioBuffer || this.audioBuffer.length === 0)
            return 0;
        const totalBytes = this.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
        const samples = Math.floor(totalBytes / 2); // 16-bit mono
        const sr = this.config.sampleRate || 16000;
        return (samples / sr) * 1000;
    }
}
exports.ContinuousAudioManager = ContinuousAudioManager;
//# sourceMappingURL=continuous-audio-manager.js.map