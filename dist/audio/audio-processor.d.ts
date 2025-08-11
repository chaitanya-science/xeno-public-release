import { AudioProcessor } from './interfaces';
/**
 * Audio preprocessing implementation for noise reduction and voice focus
 * Implements basic audio processing techniques suitable for speech recognition
 */
export declare class BasicAudioProcessor implements AudioProcessor {
    private readonly NOISE_GATE_THRESHOLD;
    private readonly NORMALIZATION_TARGET;
    /**
     * Process audio buffer with noise reduction and normalization
     */
    processAudio(input: Buffer): Promise<Buffer>;
    /**
     * Apply noise reduction using simple noise gating
     * More sophisticated algorithms could be implemented here
     */
    applyNoiseReduction(input: Buffer): Promise<Buffer>;
    /**
     * Normalize audio volume to consistent level
     */
    normalizeVolume(input: Buffer): Promise<Buffer>;
    /**
     * Convert buffer to array of 16-bit signed integers
     */
    private bufferToSamples;
    /**
     * Convert array of samples back to buffer
     */
    private samplesToBuffer;
    /**
     * Apply simple low-pass filter to reduce high-frequency noise
     */
    private applyLowPassFilter;
}
//# sourceMappingURL=audio-processor.d.ts.map