// Offline mode manager tests

import { OfflineModeManagerImpl } from '../offline-mode-manager';

describe('OfflineModeManager', () => {
  let offlineModeManager: OfflineModeManagerImpl;

  beforeEach(() => {
    offlineModeManager = new OfflineModeManagerImpl();
  });

  describe('activation and deactivation', () => {
    it('should activate offline mode', async () => {
      expect(offlineModeManager.isActive()).toBe(false);

      await offlineModeManager.activate();

      expect(offlineModeManager.isActive()).toBe(true);
    });

    it('should deactivate offline mode', async () => {
      await offlineModeManager.activate();
      expect(offlineModeManager.isActive()).toBe(true);

      await offlineModeManager.deactivate();

      expect(offlineModeManager.isActive()).toBe(false);
    });
  });

  describe('cached responses', () => {
    beforeEach(async () => {
      await offlineModeManager.activate();
    });

    it('should return cached response for exact match', async () => {
      const response = await offlineModeManager.getCachedResponse('hello');

      expect(response).toContain('Hello!');
      expect(response).toContain('good to hear from you');
    });

    it('should return cached response for normalized input', async () => {
      const response = await offlineModeManager.getCachedResponse('HELLO!');

      expect(response).toContain('Hello!');
    });

    it('should find best match for partial input', async () => {
      const response = await offlineModeManager.getCachedResponse('feeling sad today');

      expect(response).toContain('sorry you\'re feeling sad');
    });

    it('should return default response for unknown input', async () => {
      const response = await offlineModeManager.getCachedResponse('completely unknown input that has no matches');

      // Should return a response (not null)
      expect(response).toBeTruthy();
      
      // Should be one of the default responses
      expect(typeof response).toBe('string');
      expect(response!.length).toBeGreaterThan(0);
    });

    it('should add and retrieve custom cached responses', async () => {
      await offlineModeManager.addCachedResponse('custom input', 'custom response');

      const response = await offlineModeManager.getCachedResponse('custom input');

      expect(response).toBe('custom response');
    });

    it('should handle emotional support queries', async () => {
      const responses = await Promise.all([
        offlineModeManager.getCachedResponse('I feel lonely'),
        offlineModeManager.getCachedResponse('I am worried'),
        offlineModeManager.getCachedResponse('feeling anxious')
      ]);

      // Check that responses are appropriate for emotional support
      expect(responses[0]).toBeTruthy();
      expect(responses[1]).toBeTruthy();
      expect(responses[2]).toBeTruthy();
      
      // At least one should contain relevant emotional support content
      const allResponses = responses.join(' ');
      const hasEmotionalSupport = allResponses.includes('lonely') || 
                                  allResponses.includes('concerns') || 
                                  allResponses.includes('anxiety') ||
                                  allResponses.includes('support') ||
                                  allResponses.includes('listen');
      expect(hasEmotionalSupport).toBe(true);
    });

    it('should handle crisis-related queries appropriately', async () => {
      const helpResponse = await offlineModeManager.getCachedResponse('help');
      const emergencyResponse = await offlineModeManager.getCachedResponse('emergency');

      // Check that crisis responses contain emergency information
      const combinedResponse = helpResponse + ' ' + emergencyResponse;
      const hasEmergencyInfo = combinedResponse.includes('911') || 
                              combinedResponse.includes('988') ||
                              combinedResponse.includes('emergency') ||
                              combinedResponse.includes('crisis');
      expect(hasEmergencyInfo).toBe(true);
    });
  });

  describe('offline capabilities', () => {
    it('should return correct offline capabilities', () => {
      const capabilities = offlineModeManager.getOfflineCapabilities();

      expect(capabilities.canProcessWakeWord).toBe(true);
      expect(capabilities.canProvideBasicResponses).toBe(true);
      expect(capabilities.canAccessMemories).toBe(true);
      expect(capabilities.canDetectCrisis).toBe(true);
      expect(capabilities.limitedFunctionality).toContain('AI-generated responses are not available');
    });

    it('should explain limited functionality clearly', () => {
      const explanation = offlineModeManager.explainLimitedFunctionality();

      expect(explanation).toContain('offline mode');
      expect(explanation).toContain('what I can still do');
      expect(explanation).toContain('Listen for wake words');
      expect(explanation).toContain('basic conversations');
      expect(explanation).toContain('unavailable');
      expect(explanation).toContain('AI-generated responses are not available');
    });
  });

  describe('response matching', () => {
    beforeEach(async () => {
      await offlineModeManager.activate();
    });

    it('should match greetings appropriately', async () => {
      const greetings = ['hello', 'hi', 'good morning', 'good evening'];
      
      for (const greeting of greetings) {
        const response = await offlineModeManager.getCachedResponse(greeting);
        expect(response).toBeTruthy();
        expect(response).not.toContain('offline mode'); // Should not fall back to default
      }
    });

    it('should match emotional states', async () => {
      const emotions = ['sad', 'lonely', 'worried', 'anxious', 'tired'];
      
      for (const emotion of emotions) {
        const response = await offlineModeManager.getCachedResponse(`I feel ${emotion}`);
        expect(response).toBeTruthy();
        expect(response).not.toContain('offline mode'); // Should not fall back to default
      }
    });

    it('should provide varied default responses', async () => {
      const unknownInputs = [
        'completely random text',
        'another unknown phrase',
        'yet another unmatched input'
      ];

      const responses = await Promise.all(
        unknownInputs.map(input => offlineModeManager.getCachedResponse(input))
      );

      // All should be default responses
      responses.forEach(response => {
        const isDefaultResponse = response?.includes('offline mode') ||
                                 response?.includes('internet connection') ||
                                 response?.includes('care about how you\'re doing') ||
                                 response?.includes('here for you');
        expect(isDefaultResponse).toBe(true);
      });
    });
  });

  describe('input normalization', () => {
    beforeEach(async () => {
      await offlineModeManager.activate();
    });

    it('should handle punctuation and capitalization', async () => {
      const variations = [
        'Hello!',
        'HELLO',
        'hello.',
        'Hello?',
        'hello!!!'
      ];

      for (const variation of variations) {
        const response = await offlineModeManager.getCachedResponse(variation);
        expect(response).toContain('Hello!');
      }
    });

    it('should handle extra whitespace', async () => {
      const response = await offlineModeManager.getCachedResponse('  hello   world  ');
      
      // Should still match 'hello' even with extra whitespace
      expect(response).toContain('Hello!');
    });
  });
});