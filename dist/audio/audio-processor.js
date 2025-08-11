"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasicAudioProcessor = void 0;
/**
 * Audio preprocessing implementation for noise reduction and voice focus
 * Implements basic audio processing techniques suitable for speech recognition
 */
class BasicAudioProcessor {
    constructor() {
        this.NOISE_GATE_THRESHOLD = 0.01; // Threshold for noise gating
        this.NORMALIZATION_TARGET = 0.7; // Target volume level for normalization
    }
    /**
     * Process audio buffer with noise reduction and normalization
     */
    async processAudio(input) {
        let processed = await this.applyNoiseReduction(input);
        processed = await this.normalizeVolume(processed);
        return processed;
    }
    /**
     * Apply noise reduction using simple noise gating
     * More sophisticated algorithms could be implemented here
     */
    async applyNoiseReduction(input) {
        // Convert buffer to 16-bit PCM samples
        const samples = this.bufferToSamples(input);
        // Apply noise gate - zero out samples below threshold
        for (let i = 0; i < samples.length; i++) {
            const normalizedSample = Math.abs(samples[i]) / 32768; // Normalize to 0-1 range
            if (normalizedSample < this.NOISE_GATE_THRESHOLD) {
                samples[i] = 0;
            }
        }
        // Apply simple low-pass filter to reduce high-frequency noise
        this.applyLowPassFilter(samples);
        return this.samplesToBuffer(samples);
    }
    /**
     * Normalize audio volume to consistent level
     */
    async normalizeVolume(input) {
        const samples = this.bufferToSamples(input);
        // Find peak amplitude
        let peak = 0;
        for (const sample of samples) {
            const amplitude = Math.abs(sample);
            if (amplitude > peak) {
                peak = amplitude;
            }
        }
        // Avoid division by zero and over-amplification
        if (peak === 0 || peak > 32767) {
            return input;
        }
        // Calculate normalization factor
        const targetPeak = 32767 * this.NORMALIZATION_TARGET;
        const normalizationFactor = targetPeak / peak;
        // Apply normalization
        for (let i = 0; i < samples.length; i++) {
            samples[i] = Math.round(samples[i] * normalizationFactor);
            // Ensure we don't exceed 16-bit range
            samples[i] = Math.max(-32768, Math.min(32767, samples[i]));
        }
        return this.samplesToBuffer(samples);
    }
    /**
     * Convert buffer to array of 16-bit signed integers
     */
    bufferToSamples(buffer) {
        const samples = [];
        for (let i = 0; i < buffer.length; i += 2) {
            // Read 16-bit little-endian signed integer
            const sample = buffer.readInt16LE(i);
            samples.push(sample);
        }
        return samples;
    }
    /**
     * Convert array of samples back to buffer
     */
    samplesToBuffer(samples) {
        const buffer = Buffer.allocUnsafe(samples.length * 2);
        for (let i = 0; i < samples.length; i++) {
            buffer.writeInt16LE(samples[i], i * 2);
        }
        return buffer;
    }
    /**
     * Apply simple low-pass filter to reduce high-frequency noise
     */
    applyLowPassFilter(samples) {
        // Simple moving average filter
        const filterSize = 3;
        const filtered = [...samples];
        for (let i = filterSize; i < samples.length - filterSize; i++) {
            let sum = 0;
            for (let j = -filterSize; j <= filterSize; j++) {
                sum += samples[i + j];
            }
            filtered[i] = Math.round(sum / (2 * filterSize + 1));
        }
        // Copy filtered values back
        for (let i = 0; i < samples.length; i++) {
            samples[i] = filtered[i];
        }
    }
}
exports.BasicAudioProcessor = BasicAudioProcessor;
//# sourceMappingURL=audio-processor.js.map