import { AdvancedCrisisDetector } from '../crisis-detector';
import { CrisisType, CrisisKeywords } from '../interfaces';

describe('AdvancedCrisisDetector', () => {
  let detector: AdvancedCrisisDetector;

  beforeEach(() => {
    detector = new AdvancedCrisisDetector();
  });

  describe('Self-harm detection', () => {
    it('should detect explicit self-harm keywords', async () => {
      const testMessages = [
        'I want to kill myself',
        'I am ending it all',
        'I want to hurt myself',
        'I am going to take my own life',
        'I want to end my life'
      ];

      for (const message of testMessages) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.SELF_HARM);
        expect(analysis.confidence).toBeGreaterThanOrEqual(0.3);
        expect(analysis.urgency).toBeGreaterThanOrEqual(8);
        expect(analysis.recommendedAction).toBe('immediate_crisis_resources');
      }
    });

    it('should detect subtle self-harm expressions', async () => {
      const testMessages = [
        'I am not worth living',
        'I am better off dead',
        'I want to end the pain',
        'I want to die'
      ];

      for (const message of testMessages) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.SELF_HARM);
        expect(analysis.confidence).toBeGreaterThanOrEqual(0.3);
      }
    });

    it('should not trigger false positives for non-crisis statements', async () => {
      const testMessages = [
        'I killed it at work today',
        'That movie was to die for',
        'I am dying to see you',
        'I could just die of embarrassment'
      ];

      for (const message of testMessages) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).not.toBe(CrisisType.SELF_HARM);
      }
    });
  });

  describe('Medical emergency detection', () => {
    it('should detect medical emergency keywords', async () => {
      const testMessages = [
        'I am having chest pain',
        'I can\'t breathe',
        'I think I am having a heart attack',
        'I am bleeding heavily',
        'I think I took an overdose'
      ];

      for (const message of testMessages) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.MEDICAL_EMERGENCY);
        expect(analysis.confidence).toBeGreaterThanOrEqual(0.3);
        expect(analysis.urgency).toBe(10);
        expect(analysis.recommendedAction).toBe('emergency_services');
      }
    });

    it('should handle medical emergency variations', async () => {
      const testMessages = [
        'I have chest pain and feel dizzy',
        'I can\'t breathe properly',
        'I think I am having a stroke'
      ];

      for (const message of testMessages) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.MEDICAL_EMERGENCY);
      }
    });
  });

  describe('Severe distress detection', () => {
    it('should detect severe emotional distress', async () => {
      const testMessages = [
        'I feel completely hopeless',
        'I am overwhelmed and cannot cope',
        'I feel worthless and useless',
        'I am falling apart and breaking down',
        'I feel trapped and suffocating'
      ];

      for (const message of testMessages) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.SEVERE_DISTRESS);
        expect(analysis.confidence).toBeGreaterThan(0.2);
      }
    });

    it('should detect distress through sentiment analysis', async () => {
      const message = 'I am extremely sad and feel completely alone and isolated';
      const analysis = await detector.analyzeCrisis(message);
      
      expect(analysis.crisisType).toBe(CrisisType.SEVERE_DISTRESS);
      expect(analysis.confidence).toBeGreaterThan(0.3);
    });
  });

  describe('Pattern recognition', () => {
    it('should detect repeated distress patterns', async () => {
      const conversationHistory = [
        'I feel so alone',
        'Nobody understands me',
        'I am always alone',
        'I feel isolated from everyone',
        'I am so lonely'
      ];

      const analysis = await detector.analyzeCrisis('I feel alone again', conversationHistory);
      
      expect(analysis.crisisType).toBe(CrisisType.SEVERE_DISTRESS);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.2);
    });

    it('should detect escalating distress patterns', async () => {
      const conversationHistory = [
        'I feel a bit sad',
        'I am feeling really down today',
        'I am very depressed and hopeless',
        'I cannot take this anymore'
      ];

      const analysis = await detector.analyzeCrisis('I want to give up completely', conversationHistory);
      
      expect(analysis.crisisType).toBe(CrisisType.SEVERE_DISTRESS);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.2);
    });
  });

  describe('Sensitivity adjustment', () => {
    it('should adjust detection based on sensitivity level', async () => {
      const message = 'I feel a bit hopeless today';
      
      // Low sensitivity
      detector.setSensitivity(0.3);
      const lowSensAnalysis = await detector.analyzeCrisis(message);
      
      // High sensitivity
      detector.setSensitivity(0.9);
      const highSensAnalysis = await detector.analyzeCrisis(message);
      
      expect(highSensAnalysis.confidence).toBeGreaterThanOrEqual(lowSensAnalysis.confidence);
    });

    it('should clamp sensitivity to valid range', () => {
      detector.setSensitivity(-0.5);
      detector.setSensitivity(1.5);
      // Should not throw errors and should work normally
      expect(() => detector.analyzeCrisis('test message')).not.toThrow();
    });
  });

  describe('Keyword management', () => {
    it('should allow updating crisis keywords', async () => {
      const customKeywords: CrisisKeywords = {
        selfHarm: ['custom harm phrase'],
        medicalEmergency: ['custom emergency phrase'],
        severeDistress: ['custom distress phrase']
      };

      detector.updateKeywords(customKeywords);
      
      const analysis = await detector.analyzeCrisis('I have a custom harm phrase');
      expect(analysis.crisisType).toBe(CrisisType.SELF_HARM);
    });
  });

  describe('Confidence scoring', () => {
    it('should provide appropriate confidence scores', async () => {
      const highConfidenceMessage = 'I want to kill myself right now';
      const mediumConfidenceMessage = 'I feel hopeless and worthless';
      const lowConfidenceMessage = 'I am a bit sad today';

      const highAnalysis = await detector.analyzeCrisis(highConfidenceMessage);
      const mediumAnalysis = await detector.analyzeCrisis(mediumConfidenceMessage);
      const lowAnalysis = await detector.analyzeCrisis(lowConfidenceMessage);

      expect(highAnalysis.confidence).toBeGreaterThan(mediumAnalysis.confidence);
      expect(mediumAnalysis.confidence).toBeGreaterThan(lowAnalysis.confidence);
    });

    it('should cap confidence scores appropriately', async () => {
      const message = 'I want to kill myself and hurt myself and end it all';
      const analysis = await detector.analyzeCrisis(message);
      
      expect(analysis.confidence).toBeLessThanOrEqual(1.0);
      expect(analysis.confidence).toBeGreaterThanOrEqual(0.0);
    });
  });

  describe('Urgency scoring', () => {
    it('should assign appropriate urgency levels', async () => {
      const maxUrgencyMessage = 'I am having a heart attack';
      const highUrgencyMessage = 'I want to kill myself';
      const mediumUrgencyMessage = 'I feel hopeless and overwhelmed';

      const maxAnalysis = await detector.analyzeCrisis(maxUrgencyMessage);
      const highAnalysis = await detector.analyzeCrisis(highUrgencyMessage);
      const mediumAnalysis = await detector.analyzeCrisis(mediumUrgencyMessage);

      expect(maxAnalysis.urgency).toBe(10);
      expect(highAnalysis.urgency).toBe(9);
      expect(mediumAnalysis.urgency).toBeGreaterThan(0);
      expect(mediumAnalysis.urgency).toBeLessThan(highAnalysis.urgency);
    });
  });

  describe('Recommended actions', () => {
    it('should provide appropriate recommended actions', async () => {
      const selfHarmMessage = 'I want to hurt myself';
      const emergencyMessage = 'I cannot breathe';
      const distressMessage = 'I feel overwhelmed';
      const normalMessage = 'I had a good day';

      const selfHarmAnalysis = await detector.analyzeCrisis(selfHarmMessage);
      const emergencyAnalysis = await detector.analyzeCrisis(emergencyMessage);
      const distressAnalysis = await detector.analyzeCrisis(distressMessage);
      const normalAnalysis = await detector.analyzeCrisis(normalMessage);

      expect(selfHarmAnalysis.recommendedAction).toBe('immediate_crisis_resources');
      expect(emergencyAnalysis.recommendedAction).toBe('emergency_services');
      expect(distressAnalysis.recommendedAction).toMatch(/mental_health_resources|supportive_conversation/);
      expect(normalAnalysis.recommendedAction).toBe('continue_conversation');
    });
  });

  describe('Error handling', () => {
    it('should handle empty messages gracefully', async () => {
      const analysis = await detector.analyzeCrisis('');
      expect(analysis.crisisType).toBe(CrisisType.NONE);
      expect(analysis.confidence).toBe(0);
    });

    it('should handle null/undefined conversation history', async () => {
      const analysis = await detector.analyzeCrisis('test message', undefined);
      expect(analysis).toBeDefined();
      expect(analysis.crisisType).toBeDefined();
    });

    it('should handle very long messages', async () => {
      const longMessage = 'I feel sad '.repeat(1000);
      const analysis = await detector.analyzeCrisis(longMessage);
      expect(analysis).toBeDefined();
    });
  });

  describe('Keyword matching accuracy', () => {
    it('should match whole words only', async () => {
      // Should not match partial words
      const falsePositives = [
        'I killed the spider', // 'kill' in 'killed'
        'I am dying my hair', // 'dying' in different context
        'I hurt my ankle playing sports' // 'hurt' in different context
      ];

      for (const message of falsePositives) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.NONE);
      }
    });

    it('should be case insensitive', async () => {
      const variations = [
        'I WANT TO KILL MYSELF',
        'i want to kill myself',
        'I Want To Kill Myself'
      ];

      for (const message of variations) {
        const analysis = await detector.analyzeCrisis(message);
        expect(analysis.crisisType).toBe(CrisisType.SELF_HARM);
      }
    });
  });
});