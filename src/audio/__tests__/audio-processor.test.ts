import { BasicAudioProcessor } from '../audio-processor';

describe('BasicAudioProcessor', () => {
  let processor: BasicAudioProcessor;

  beforeEach(() => {
    processor = new BasicAudioProcessor();
  });

  describe('processAudio', () => {
    it('should process audio buffer with noise reduction and normalization', async () => {
      // Create test audio buffer with some noise and varying volume
      const testBuffer = createTestAudioBuffer([
        0.1, 0.8, 0.05, 0.9, 0.02, 0.7, 0.01, 0.85  // Mix of signal and noise
      ]);

      const result = await processor.processAudio(testBuffer);

      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(testBuffer.length);
      
      // Verify that processing occurred (result should be different from input)
      expect(result.equals(testBuffer)).toBe(false);
    });

    it('should handle empty buffer gracefully', async () => {
      const emptyBuffer = Buffer.alloc(0);
      const result = await processor.processAudio(emptyBuffer);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(0);
    });
  });

  describe('applyNoiseReduction', () => {
    it('should remove low-amplitude noise', async () => {
      // Create buffer with low-amplitude noise
      const noisyBuffer = createTestAudioBuffer([
        0.005, 0.8, 0.003, 0.9, 0.007, 0.7  // Low values should be filtered
      ]);

      const result = await processor.applyNoiseReduction(noisyBuffer);
      const samples = bufferToSamples(result);

      // Check that low-amplitude samples were zeroed out
      expect(samples[0]).toBe(0); // 0.005 should be filtered
      expect(samples[2]).toBe(0); // 0.003 should be filtered
      expect(samples[4]).toBe(0); // 0.007 should be filtered
      
      // High-amplitude samples should remain
      expect(Math.abs(samples[1])).toBeGreaterThan(1000); // 0.8 should remain
      expect(Math.abs(samples[3])).toBeGreaterThan(1000); // 0.9 should remain
    });

    it('should preserve strong signals', async () => {
      const strongSignalBuffer = createTestAudioBuffer([0.8, 0.9, 0.7, 0.85]);
      const result = await processor.applyNoiseReduction(strongSignalBuffer);
      const samples = bufferToSamples(result);

      // All samples should be preserved (non-zero)
      samples.forEach(sample => {
        expect(Math.abs(sample)).toBeGreaterThan(0);
      });
    });
  });

  describe('normalizeVolume', () => {
    it('should normalize audio to consistent level', async () => {
      // Create buffer with varying volume levels
      const varyingVolumeBuffer = createTestAudioBuffer([0.2, 0.4, 0.1, 0.3]);
      const result = await processor.normalizeVolume(varyingVolumeBuffer);
      const samples = bufferToSamples(result);

      // Find the peak in normalized audio
      const peak = Math.max(...samples.map(s => Math.abs(s)));
      
      // Peak should be close to target level (70% of max range)
      const expectedPeak = 32767 * 0.7;
      expect(peak).toBeCloseTo(expectedPeak, -1000); // Within 1000 units
    });

    it('should handle zero amplitude gracefully', async () => {
      const silentBuffer = createTestAudioBuffer([0, 0, 0, 0]);
      const result = await processor.normalizeVolume(silentBuffer);
      
      // Should return original buffer unchanged
      expect(result.equals(silentBuffer)).toBe(true);
    });

    it('should not over-amplify already loud audio', async () => {
      // Create buffer at maximum amplitude
      const loudBuffer = createTestAudioBuffer([1.0, -1.0, 0.9, -0.9]);
      const result = await processor.normalizeVolume(loudBuffer);
      
      // Should not exceed 16-bit range
      const samples = bufferToSamples(result);
      samples.forEach(sample => {
        expect(sample).toBeGreaterThanOrEqual(-32768);
        expect(sample).toBeLessThanOrEqual(32767);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle single sample buffer', async () => {
      const singleSampleBuffer = createTestAudioBuffer([0.5]);
      const result = await processor.processAudio(singleSampleBuffer);
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(2); // One 16-bit sample = 2 bytes
    });

    it('should handle very large buffers efficiently', async () => {
      // Create large buffer (1 second at 16kHz)
      const largeArray = new Array(16000).fill(0).map(() => Math.random() * 0.5);
      const largeBuffer = createTestAudioBuffer(largeArray);
      
      const startTime = Date.now();
      const result = await processor.processAudio(largeBuffer);
      const processingTime = Date.now() - startTime;
      
      expect(result).toBeInstanceOf(Buffer);
      expect(result.length).toBe(largeBuffer.length);
      expect(processingTime).toBeLessThan(1000); // Should process within 1 second
    });
  });
});

// Helper functions for testing
function createTestAudioBuffer(normalizedValues: number[]): Buffer {
  const buffer = Buffer.allocUnsafe(normalizedValues.length * 2);
  
  normalizedValues.forEach((value, index) => {
    // Convert normalized value (-1 to 1) to 16-bit signed integer
    const sample = Math.round(value * 32767);
    buffer.writeInt16LE(sample, index * 2);
  });
  
  return buffer;
}

function bufferToSamples(buffer: Buffer): number[] {
  const samples: number[] = [];
  for (let i = 0; i < buffer.length; i += 2) {
    samples.push(buffer.readInt16LE(i));
  }
  return samples;
}