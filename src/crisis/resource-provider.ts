import { ResourceProvider, CrisisResource, CrisisType } from './interfaces';
import { Contact } from '../types';

/**
 * Comprehensive crisis resource provider with database of hotlines,
 * emergency contacts, and mental health resources
 */
export class ComprehensiveCrisisResourceProvider implements ResourceProvider {
  private crisisResources: Map<CrisisType, CrisisResource[]> = new Map();
  private emergencyContacts: Contact[] = [];

  constructor() {
    this.initializeCrisisResources();
    this.initializeEmergencyContacts();
  }

  /**
   * Get crisis resources based on crisis type
   */
  async getCrisisResources(crisisType: CrisisType): Promise<CrisisResource[]> {
    const resources = this.crisisResources.get(crisisType) || [];
    
    // Always include general mental health resources for severe distress
    if (crisisType === CrisisType.SEVERE_DISTRESS) {
      const generalResources = this.crisisResources.get(CrisisType.NONE) || [];
      return [...resources, ...generalResources];
    }
    
    return resources;
  }

  /**
   * Get emergency contacts
   */
  async getEmergencyContacts(): Promise<Contact[]> {
    return [...this.emergencyContacts];
  }

  /**
   * Format resource message for user presentation
   */
  formatResourceMessage(resources: CrisisResource[]): string {
    if (resources.length === 0) {
      return "I want to help you find support. Let me connect you with some resources.";
    }

    let message = "I'm here to support you, and there are people who can help:\n\n";

    // Group resources by type for better organization
    const resourcesByType = this.groupResourcesByType(resources);

    // Format crisis hotlines first (highest priority)
    if (resourcesByType.has(CrisisType.SELF_HARM)) {
      message += "🆘 **Immediate Crisis Support:**\n";
      resourcesByType.get(CrisisType.SELF_HARM)!.forEach(resource => {
        message += this.formatSingleResource(resource);
      });
      message += "\n";
    }

    // Format medical emergency resources
    if (resourcesByType.has(CrisisType.MEDICAL_EMERGENCY)) {
      message += "🚨 **Emergency Medical Help:**\n";
      resourcesByType.get(CrisisType.MEDICAL_EMERGENCY)!.forEach(resource => {
        message += this.formatSingleResource(resource);
      });
      message += "\n";
    }

    // Format mental health resources
    if (resourcesByType.has(CrisisType.SEVERE_DISTRESS)) {
      message += "💙 **Mental Health Support:**\n";
      resourcesByType.get(CrisisType.SEVERE_DISTRESS)!.forEach(resource => {
        message += this.formatSingleResource(resource);
      });
      message += "\n";
    }

    // Add general support resources
    if (resourcesByType.has(CrisisType.NONE)) {
      message += "🤝 **Additional Support:**\n";
      resourcesByType.get(CrisisType.NONE)!.forEach(resource => {
        message += this.formatSingleResource(resource);
      });
    }

    message += "\nRemember: You don't have to face this alone. These people are trained to help and want to support you.";

    return message;
  }

  /**
   * Add custom crisis resource
   */
  addCrisisResource(resource: CrisisResource): void {
    const existing = this.crisisResources.get(resource.type) || [];
    existing.push(resource);
    this.crisisResources.set(resource.type, existing);
  }

  /**
   * Add custom emergency contact
   */
  addEmergencyContact(contact: Contact): void {
    this.emergencyContacts.push(contact);
  }

  /**
   * Get resources by availability (24/7, business hours, etc.)
   */
  async getResourcesByAvailability(availability: string): Promise<CrisisResource[]> {
    const allResources: CrisisResource[] = [];
    
    for (const resources of this.crisisResources.values()) {
      allResources.push(...resources.filter(r => r.availability === availability));
    }
    
    return allResources;
  }

  /**
   * Search resources by keyword
   */
  async searchResources(keyword: string): Promise<CrisisResource[]> {
    const allResources: CrisisResource[] = [];
    const searchTerm = keyword.toLowerCase();
    
    for (const resources of this.crisisResources.values()) {
      allResources.push(...resources.filter(r => 
        r.name.toLowerCase().includes(searchTerm) ||
        r.description.toLowerCase().includes(searchTerm)
      ));
    }
    
    return allResources;
  }

  /**
   * Initialize comprehensive crisis resources database
   */
  private initializeCrisisResources(): void {
    // Self-harm and suicide prevention resources
    this.crisisResources.set(CrisisType.SELF_HARM, [
      {
        name: "National Suicide Prevention Lifeline",
        phone: "988",
        website: "https://suicidepreventionlifeline.org",
        description: "24/7 free and confidential support for people in distress and prevention resources",
        availability: "24/7",
        type: CrisisType.SELF_HARM
      },
      {
        name: "Crisis Text Line",
        phone: "Text HOME to 741741",
        website: "https://crisistextline.org",
        description: "Free, 24/7 crisis support via text message",
        availability: "24/7",
        type: CrisisType.SELF_HARM
      },
      {
        name: "National Suicide Prevention Lifeline Chat",
        phone: "Online chat available",
        website: "https://suicidepreventionlifeline.org/chat",
        description: "Online chat support for suicide prevention",
        availability: "24/7",
        type: CrisisType.SELF_HARM
      },
      {
        name: "Veterans Crisis Line",
        phone: "1-800-273-8255 (Press 1)",
        website: "https://veteranscrisisline.net",
        description: "24/7 crisis support specifically for veterans",
        availability: "24/7",
        type: CrisisType.SELF_HARM
      },
      {
        name: "LGBTQ National Hotline",
        phone: "1-888-843-4564",
        website: "https://lgbtqnationalhotline.org",
        description: "Confidential support for LGBTQ individuals in crisis",
        availability: "24/7",
        type: CrisisType.SELF_HARM
      }
    ]);

    // Medical emergency resources
    this.crisisResources.set(CrisisType.MEDICAL_EMERGENCY, [
      {
        name: "Emergency Services",
        phone: "911",
        description: "Immediate emergency medical response",
        availability: "24/7",
        type: CrisisType.MEDICAL_EMERGENCY
      },
      {
        name: "Poison Control Center",
        phone: "1-800-222-1222",
        website: "https://poison.org",
        description: "24/7 poison emergency helpline",
        availability: "24/7",
        type: CrisisType.MEDICAL_EMERGENCY
      },
      {
        name: "American Red Cross",
        phone: "1-800-733-2767",
        website: "https://redcross.org",
        description: "Emergency assistance and disaster relief",
        availability: "24/7",
        type: CrisisType.MEDICAL_EMERGENCY
      }
    ]);

    // Severe distress and mental health resources
    this.crisisResources.set(CrisisType.SEVERE_DISTRESS, [
      {
        name: "NAMI National Helpline",
        phone: "1-800-950-6264",
        website: "https://nami.org",
        description: "Mental health support, information, and referrals",
        availability: "Monday-Friday 10am-10pm ET",
        type: CrisisType.SEVERE_DISTRESS
      },
      {
        name: "SAMHSA National Helpline",
        phone: "1-800-662-4357",
        website: "https://samhsa.gov",
        description: "Treatment referral and information service for mental health and substance abuse",
        availability: "24/7",
        type: CrisisType.SEVERE_DISTRESS
      },
      {
        name: "Mental Health America",
        phone: "Visit website for local resources",
        website: "https://mhanational.org",
        description: "Mental health resources and screening tools",
        availability: "Online resources available 24/7",
        type: CrisisType.SEVERE_DISTRESS
      },
      {
        name: "Psychology Today Therapist Finder",
        phone: "Visit website",
        website: "https://psychologytoday.com",
        description: "Find mental health professionals in your area",
        availability: "Online directory available 24/7",
        type: CrisisType.SEVERE_DISTRESS
      },
      {
        name: "National Alliance on Mental Illness",
        phone: "1-800-950-6264",
        website: "https://nami.org",
        description: "Support groups and educational resources for mental health",
        availability: "Monday-Friday 10am-10pm ET",
        type: CrisisType.SEVERE_DISTRESS
      }
    ]);

    // General support resources
    this.crisisResources.set(CrisisType.NONE, [
      {
        name: "211 Helpline",
        phone: "211",
        website: "https://211.org",
        description: "Information and referrals to local health and human services",
        availability: "24/7",
        type: CrisisType.NONE
      },
      {
        name: "National Domestic Violence Hotline",
        phone: "1-800-799-7233",
        website: "https://thehotline.org",
        description: "24/7 confidential support for domestic violence survivors",
        availability: "24/7",
        type: CrisisType.NONE
      },
      {
        name: "National Sexual Assault Hotline",
        phone: "1-800-656-4673",
        website: "https://rainn.org",
        description: "24/7 confidential support for sexual assault survivors",
        availability: "24/7",
        type: CrisisType.NONE
      },
      {
        name: "National Child Abuse Hotline",
        phone: "1-800-4-A-CHILD (1-800-422-4453)",
        website: "https://childhelp.org",
        description: "24/7 crisis counseling and professional counselor support",
        availability: "24/7",
        type: CrisisType.NONE
      },
      {
        name: "National Eating Disorders Association",
        phone: "1-800-931-2237",
        website: "https://nationaleatingdisorders.org",
        description: "Support and resources for eating disorders",
        availability: "Monday-Thursday 11am-9pm ET, Friday 11am-5pm ET",
        type: CrisisType.NONE
      },
      {
        name: "National Runaway Safeline",
        phone: "1-800-786-2929",
        website: "https://1800runaway.org",
        description: "24/7 crisis support for runaway and homeless youth",
        availability: "24/7",
        type: CrisisType.NONE
      }
    ]);
  }

  /**
   * Initialize emergency contacts
   */
  private initializeEmergencyContacts(): void {
    this.emergencyContacts = [
      {
        name: "Emergency Services",
        phone: "911",
        type: "emergency"
      },
      {
        name: "National Suicide Prevention Lifeline",
        phone: "988",
        type: "crisis"
      },
      {
        name: "Crisis Text Line",
        phone: "741741",
        type: "crisis"
      },
      {
        name: "SAMHSA National Helpline",
        phone: "1-800-662-4357",
        type: "mental_health"
      },
      {
        name: "NAMI National Helpline",
        phone: "1-800-950-6264",
        type: "mental_health"
      }
    ];
  }

  /**
   * Group resources by type for organized presentation
   */
  private groupResourcesByType(resources: CrisisResource[]): Map<CrisisType, CrisisResource[]> {
    const grouped = new Map<CrisisType, CrisisResource[]>();
    
    for (const resource of resources) {
      const existing = grouped.get(resource.type) || [];
      existing.push(resource);
      grouped.set(resource.type, existing);
    }
    
    return grouped;
  }

  /**
   * Format a single resource for display
   */
  private formatSingleResource(resource: CrisisResource): string {
    let formatted = `• **${resource.name}**\n`;
    formatted += `  📞 ${resource.phone}\n`;
    
    if (resource.website) {
      formatted += `  🌐 ${resource.website}\n`;
    }
    
    formatted += `  ${resource.description}\n`;
    formatted += `  ⏰ Available: ${resource.availability}\n\n`;
    
    return formatted;
  }
}