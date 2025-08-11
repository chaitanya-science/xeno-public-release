import { ComprehensiveCrisisResourceProvider } from '../resource-provider';
import { CrisisType, CrisisResource } from '../interfaces';
import { Contact } from '../../types';

describe('ComprehensiveCrisisResourceProvider', () => {
  let provider: ComprehensiveCrisisResourceProvider;

  beforeEach(() => {
    provider = new ComprehensiveCrisisResourceProvider();
  });

  describe('Crisis resource retrieval', () => {
    it('should return self-harm resources for self-harm crisis', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      
      expect(resources.length).toBeGreaterThan(0);
      expect(resources.every(r => r.type === CrisisType.SELF_HARM)).toBe(true);
      
      // Should include National Suicide Prevention Lifeline
      const suicidePrevention = resources.find(r => r.name.includes('Suicide Prevention'));
      expect(suicidePrevention).toBeDefined();
      expect(suicidePrevention?.phone).toBe('988');
    });

    it('should return medical emergency resources for medical emergencies', async () => {
      const resources = await provider.getCrisisResources(CrisisType.MEDICAL_EMERGENCY);
      
      expect(resources.length).toBeGreaterThan(0);
      expect(resources.every(r => r.type === CrisisType.MEDICAL_EMERGENCY)).toBe(true);
      
      // Should include 911
      const emergency = resources.find(r => r.phone === '911');
      expect(emergency).toBeDefined();
    });

    it('should return mental health resources for severe distress', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SEVERE_DISTRESS);
      
      expect(resources.length).toBeGreaterThan(0);
      
      // Should include both severe distress and general resources
      const hasDistressResources = resources.some(r => r.type === CrisisType.SEVERE_DISTRESS);
      const hasGeneralResources = resources.some(r => r.type === CrisisType.NONE);
      
      expect(hasDistressResources).toBe(true);
      expect(hasGeneralResources).toBe(true);
    });

    it('should return empty array for no crisis', async () => {
      const resources = await provider.getCrisisResources(CrisisType.NONE);
      expect(Array.isArray(resources)).toBe(true);
    });
  });

  describe('Emergency contacts', () => {
    it('should return comprehensive emergency contacts', async () => {
      const contacts = await provider.getEmergencyContacts();
      
      expect(contacts.length).toBeGreaterThan(0);
      
      // Should include different types of contacts
      const hasEmergency = contacts.some(c => c.type === 'emergency');
      const hasCrisis = contacts.some(c => c.type === 'crisis');
      const hasMentalHealth = contacts.some(c => c.type === 'mental_health');
      
      expect(hasEmergency).toBe(true);
      expect(hasCrisis).toBe(true);
      expect(hasMentalHealth).toBe(true);
      
      // Should include 911
      const emergency911 = contacts.find(c => c.phone === '911');
      expect(emergency911).toBeDefined();
      
      // Should include suicide prevention lifeline
      const suicidePrevention = contacts.find(c => c.phone === '988');
      expect(suicidePrevention).toBeDefined();
    });
  });

  describe('Resource formatting', () => {
    it('should format empty resources with helpful message', () => {
      const message = provider.formatResourceMessage([]);
      expect(message).toContain('help you find support');
    });

    it('should format self-harm resources with appropriate urgency', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      const message = provider.formatResourceMessage(resources);
      
      expect(message).toContain('🆘');
      expect(message).toContain('Immediate Crisis Support');
      expect(message).toContain('988');
      expect(message).toContain('don\'t have to face this alone');
    });

    it('should format medical emergency resources with high priority', async () => {
      const resources = await provider.getCrisisResources(CrisisType.MEDICAL_EMERGENCY);
      const message = provider.formatResourceMessage(resources);
      
      expect(message).toContain('🚨');
      expect(message).toContain('Emergency Medical Help');
      expect(message).toContain('911');
    });

    it('should format mental health resources appropriately', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SEVERE_DISTRESS);
      const message = provider.formatResourceMessage(resources);
      
      expect(message).toContain('💙');
      expect(message).toContain('Mental Health Support');
      expect(message).toContain('Additional Support');
    });

    it('should include resource details in formatted message', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      const message = provider.formatResourceMessage(resources);
      
      // Should include phone numbers
      expect(message).toContain('📞');
      
      // Should include websites
      expect(message).toContain('🌐');
      
      // Should include availability
      expect(message).toContain('⏰');
      expect(message).toContain('24/7');
      
      // Should include descriptions
      expect(message).toContain('24/7 free and confidential support');
    });
  });

  describe('Resource management', () => {
    it('should allow adding custom crisis resources', async () => {
      const customResource: CrisisResource = {
        name: 'Custom Crisis Line',
        phone: '555-0123',
        description: 'Custom crisis support',
        availability: '24/7',
        type: CrisisType.SELF_HARM
      };

      provider.addCrisisResource(customResource);
      
      const resources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      const addedResource = resources.find(r => r.name === 'Custom Crisis Line');
      
      expect(addedResource).toBeDefined();
      expect(addedResource?.phone).toBe('555-0123');
    });

    it('should allow adding custom emergency contacts', async () => {
      const customContact: Contact = {
        name: 'Custom Emergency Contact',
        phone: '555-0456',
        type: 'crisis'
      };

      provider.addEmergencyContact(customContact);
      
      const contacts = await provider.getEmergencyContacts();
      const addedContact = contacts.find(c => c.name === 'Custom Emergency Contact');
      
      expect(addedContact).toBeDefined();
      expect(addedContact?.phone).toBe('555-0456');
    });
  });

  describe('Resource search and filtering', () => {
    it('should filter resources by availability', async () => {
      const twentyFourSevenResources = await provider.getResourcesByAvailability('24/7');
      
      expect(twentyFourSevenResources.length).toBeGreaterThan(0);
      expect(twentyFourSevenResources.every(r => r.availability === '24/7')).toBe(true);
    });

    it('should search resources by keyword', async () => {
      const suicideResources = await provider.searchResources('suicide');
      
      expect(suicideResources.length).toBeGreaterThan(0);
      
      const hasRelevantResource = suicideResources.some(r => 
        r.name.toLowerCase().includes('suicide') || 
        r.description.toLowerCase().includes('suicide')
      );
      expect(hasRelevantResource).toBe(true);
    });

    it('should search resources case-insensitively', async () => {
      const upperCaseResults = await provider.searchResources('SUICIDE');
      const lowerCaseResults = await provider.searchResources('suicide');
      
      expect(upperCaseResults.length).toBe(lowerCaseResults.length);
    });

    it('should return empty array for non-matching search', async () => {
      const results = await provider.searchResources('nonexistent-keyword-xyz');
      expect(results).toEqual([]);
    });
  });

  describe('Resource quality and completeness', () => {
    it('should have complete resource information', async () => {
      const allResourceTypes = [
        CrisisType.SELF_HARM,
        CrisisType.MEDICAL_EMERGENCY,
        CrisisType.SEVERE_DISTRESS,
        CrisisType.NONE
      ];

      for (const type of allResourceTypes) {
        const resources = await provider.getCrisisResources(type);
        
        for (const resource of resources) {
          expect(resource.name).toBeTruthy();
          expect(resource.phone).toBeTruthy();
          expect(resource.description).toBeTruthy();
          expect(resource.availability).toBeTruthy();
          expect(resource.type).toBeDefined();
        }
      }
    });

    it('should include national crisis resources', async () => {
      const selfHarmResources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      
      // Should include key national resources
      const nationalSuicidePrevention = selfHarmResources.find(r => 
        r.name.includes('National Suicide Prevention')
      );
      const crisisTextLine = selfHarmResources.find(r => 
        r.name.includes('Crisis Text Line')
      );
      
      expect(nationalSuicidePrevention).toBeDefined();
      expect(crisisTextLine).toBeDefined();
    });

    it('should include specialized resources', async () => {
      const selfHarmResources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      
      // Should include specialized resources like Veterans Crisis Line
      const veteransResource = selfHarmResources.find(r => 
        r.name.includes('Veterans')
      );
      const lgbtqResource = selfHarmResources.find(r => 
        r.name.includes('LGBTQ')
      );
      
      expect(veteransResource).toBeDefined();
      expect(lgbtqResource).toBeDefined();
    });

    it('should have 24/7 availability for critical resources', async () => {
      const criticalResources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      
      // Critical resources should be available 24/7
      const suicidePrevention = criticalResources.find(r => r.phone === '988');
      const crisisText = criticalResources.find(r => r.phone.includes('741741'));
      
      expect(suicidePrevention?.availability).toBe('24/7');
      expect(crisisText?.availability).toBe('24/7');
    });
  });

  describe('Message formatting quality', () => {
    it('should create well-structured messages', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      const message = provider.formatResourceMessage(resources);
      
      // Should have clear sections
      expect(message).toContain('**');  // Bold formatting
      expect(message).toContain('📞');  // Phone icon
      expect(message).toContain('🌐');  // Website icon
      expect(message).toContain('⏰');  // Time icon
      
      // Should have encouraging language
      expect(message).toContain('support');
      expect(message).toContain('help');
      expect(message).toContain('don\'t have to face this alone');
    });

    it('should prioritize resources appropriately', async () => {
      const resources = await provider.getCrisisResources(CrisisType.SELF_HARM);
      const message = provider.formatResourceMessage(resources);
      
      // Crisis resources should appear before general resources
      const crisisIndex = message.indexOf('Immediate Crisis Support');
      const generalIndex = message.indexOf('Additional Support');
      
      if (crisisIndex !== -1 && generalIndex !== -1) {
        expect(crisisIndex).toBeLessThan(generalIndex);
      }
    });
  });
});