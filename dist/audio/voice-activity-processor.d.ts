/**
 * Enhanced Audio Processor with Voice Activity Detection
 * Adds voice activity detection capabilities for continuous listening
 */
import { AudioProcessor } from './interfaces';
export interface VoiceActivityResult {
    hasVoice: boolean;
    volumeLevel: number;
    speechProbability: number;
    timestamp: number;
}
export declare class VoiceActivityDetectingProcessor implements AudioProcessor {
    private volumeThreshold;
    private speechThreshold;
    private windowSize;
    private smoothingFactor;
    private lastVolumeLevel;
    constructor(config?: {
        volumeThreshold?: number;
        speechThreshold?: number;
        windowSize?: number;
        smoothingFactor?: number;
    });
    /**
     * Process audio and detect voice activity
     */
    processAudio(input: Buffer): Promise<Buffer>;
    /**
     * Detect voice activity in audio buffer
     */
    detectVoiceActivity(audioBuffer: Buffer): Promise<VoiceActivityResult>;
    /**
     * Apply noise reduction to audio
     */
    applyNoiseReduction(input: Buffer): Promise<Buffer>;
    /**
     * Normalize audio volume
     */
    normalizeVolume(input: Buffer): Promise<Buffer>;
    /**
     * Calculate volume level (RMS)
     */
    private calculateVolumeLevel;
    /**
     * Calculate speech probability using simple heuristics
     */
    private calculateSpeechProbability;
    /**
     * Calculate spectral centroid (simplified)
     */
    private calculateSpectralCentroid;
    /**
     * Calculate zero crossing rate
     */
    private calculateZeroCrossingRate;
    /**
     * Set detection thresholds
     */
    setThresholds(volumeThreshold: number, speechThreshold: number): void;
    /**
     * Get current detection settings
     */
    getSettings(): {
        volumeThreshold: number;
        speechThreshold: number;
        windowSize: number;
        smoothingFactor: number;
        lastVolumeLevel: number;
    };
}
//# sourceMappingURL=voice-activity-processor.d.ts.map