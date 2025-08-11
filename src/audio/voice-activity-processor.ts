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

export class VoiceActivityDetectingProcessor implements AudioProcessor {
  private volumeThreshold: number = 0.01;
  private speechThreshold: number = 0.7;
  private windowSize: number = 1024;
  private smoothingFactor: number = 0.8;
  private lastVolumeLevel: number = 0;

  constructor(config?: {
    volumeThreshold?: number;
    speechThreshold?: number;
    windowSize?: number;
    smoothingFactor?: number;
  }) {
    if (config) {
      this.volumeThreshold = config.volumeThreshold ?? this.volumeThreshold;
      this.speechThreshold = config.speechThreshold ?? this.speechThreshold;
      this.windowSize = config.windowSize ?? this.windowSize;
      this.smoothingFactor = config.smoothingFactor ?? this.smoothingFactor;
    }
  }

  /**
   * Process audio and detect voice activity
   */
  async processAudio(input: Buffer): Promise<Buffer> {
    // Apply noise reduction first
    const denoised = await this.applyNoiseReduction(input);
    
    // Normalize volume
    const normalized = await this.normalizeVolume(denoised);
    
    return normalized;
  }

  /**
   * Detect voice activity in audio buffer
   */
  async detectVoiceActivity(audioBuffer: Buffer): Promise<VoiceActivityResult> {
    const volumeLevel = this.calculateVolumeLevel(audioBuffer);
    const speechProbability = this.calculateSpeechProbability(audioBuffer, volumeLevel);
    
    // Smooth volume level
    this.lastVolumeLevel = (this.smoothingFactor * this.lastVolumeLevel) + 
                          ((1 - this.smoothingFactor) * volumeLevel);
    
    const hasVoice = this.lastVolumeLevel > this.volumeThreshold && 
                     speechProbability > this.speechThreshold;
    
    return {
      hasVoice,
      volumeLevel: this.lastVolumeLevel,
      speechProbability,
      timestamp: Date.now()
    };
  }

  /**
   * Apply noise reduction to audio
   */
  async applyNoiseReduction(input: Buffer): Promise<Buffer> {
    // Simple noise gate implementation
    const output = Buffer.alloc(input.length);
    
    for (let i = 0; i < input.length; i += 2) {
      // Read 16-bit sample
      const sample = input.readInt16LE(i);
      const normalizedSample = sample / 32768.0;
      
      // Apply noise gate
      const processedSample = Math.abs(normalizedSample) > this.volumeThreshold ? 
                             normalizedSample : 0;
      
      // Write back
      output.writeInt16LE(Math.round(processedSample * 32767), i);
    }
    
    return output;
  }

  /**
   * Normalize audio volume
   */
  async normalizeVolume(input: Buffer): Promise<Buffer> {
    // Find peak amplitude
    let peak = 0;
    for (let i = 0; i < input.length; i += 2) {
      const sample = Math.abs(input.readInt16LE(i));
      if (sample > peak) peak = sample;
    }
    
    if (peak === 0) return input;
    
    // Calculate normalization factor
    const targetPeak = 16384; // 50% of max amplitude
    const normalizationFactor = targetPeak / peak;
    
    // Apply normalization if needed
    if (normalizationFactor > 1.0 && normalizationFactor < 4.0) {
      const output = Buffer.alloc(input.length);
      for (let i = 0; i < input.length; i += 2) {
        const sample = input.readInt16LE(i);
        const normalizedSample = Math.round(sample * normalizationFactor);
        const clampedSample = Math.max(-32768, Math.min(32767, normalizedSample));
        output.writeInt16LE(clampedSample, i);
      }
      return output;
    }
    
    return input;
  }

  /**
   * Calculate volume level (RMS)
   */
  private calculateVolumeLevel(audioBuffer: Buffer): number {
    let sum = 0;
    let count = 0;
    
    for (let i = 0; i < audioBuffer.length; i += 2) {
      const sample = audioBuffer.readInt16LE(i) / 32768.0; // Normalize to -1 to 1
      sum += sample * sample;
      count++;
    }
    
    if (count === 0) return 0;
    
    const rms = Math.sqrt(sum / count);
    return rms;
  }

  /**
   * Calculate speech probability using simple heuristics
   */
  private calculateSpeechProbability(audioBuffer: Buffer, volumeLevel: number): number {
    if (volumeLevel < this.volumeThreshold) return 0;
    
    // Analyze frequency characteristics (simplified)
    const spectralCentroid = this.calculateSpectralCentroid(audioBuffer);
    const zeroCrossingRate = this.calculateZeroCrossingRate(audioBuffer);
    
    // Speech typically has:
    // - Spectral centroid in speech range (300-3400 Hz)
    // - Moderate zero crossing rate
    // - Sufficient volume
    
    let speechScore = 0;
    
    // Volume component (0-0.3)
    speechScore += Math.min(volumeLevel * 3, 0.3);
    
    // Spectral centroid component (0-0.4)
    if (spectralCentroid > 300 && spectralCentroid < 3400) {
      speechScore += 0.4;
    } else if (spectralCentroid > 100 && spectralCentroid < 5000) {
      speechScore += 0.2;
    }
    
    // Zero crossing rate component (0-0.3)
    if (zeroCrossingRate > 0.02 && zeroCrossingRate < 0.2) {
      speechScore += 0.3;
    } else if (zeroCrossingRate > 0.01 && zeroCrossingRate < 0.3) {
      speechScore += 0.15;
    }
    
    return Math.min(speechScore, 1.0);
  }

  /**
   * Calculate spectral centroid (simplified)
   */
  private calculateSpectralCentroid(audioBuffer: Buffer): number {
    // This is a very simplified implementation
    // In a real implementation, you'd use FFT
    
    let weightedSum = 0;
    let magnitudeSum = 0;
    const sampleRate = 16000; // Assume 16kHz sample rate
    
    for (let i = 0; i < audioBuffer.length; i += 2) {
      const sample = Math.abs(audioBuffer.readInt16LE(i) / 32768.0);
      const frequency = (i / 2) * (sampleRate / audioBuffer.length);
      
      weightedSum += frequency * sample;
      magnitudeSum += sample;
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Calculate zero crossing rate
   */
  private calculateZeroCrossingRate(audioBuffer: Buffer): number {
    let zeroCrossings = 0;
    let previousSample = 0;
    
    for (let i = 0; i < audioBuffer.length; i += 2) {
      const sample = audioBuffer.readInt16LE(i);
      
      if (i > 0 && ((previousSample >= 0 && sample < 0) || (previousSample < 0 && sample >= 0))) {
        zeroCrossings++;
      }
      
      previousSample = sample;
    }
    
    const totalSamples = audioBuffer.length / 2;
    return totalSamples > 0 ? zeroCrossings / totalSamples : 0;
  }

  /**
   * Set detection thresholds
   */
  setThresholds(volumeThreshold: number, speechThreshold: number): void {
    this.volumeThreshold = volumeThreshold;
    this.speechThreshold = speechThreshold;
  }

  /**
   * Get current detection settings
   */
  getSettings() {
    return {
      volumeThreshold: this.volumeThreshold,
      speechThreshold: this.speechThreshold,
      windowSize: this.windowSize,
      smoothingFactor: this.smoothingFactor,
      lastVolumeLevel: this.lastVolumeLevel
    };
  }
}
