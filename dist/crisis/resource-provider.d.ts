import { ResourceProvider, CrisisResource, CrisisType } from './interfaces';
import { Contact } from '../types';
/**
 * Comprehensive crisis resource provider with database of hotlines,
 * emergency contacts, and mental health resources
 */
export declare class ComprehensiveCrisisResourceProvider implements ResourceProvider {
    private crisisResources;
    private emergencyContacts;
    constructor();
    /**
     * Get crisis resources based on crisis type
     */
    getCrisisResources(crisisType: CrisisType): Promise<CrisisResource[]>;
    /**
     * Get emergency contacts
     */
    getEmergencyContacts(): Promise<Contact[]>;
    /**
     * Format resource message for user presentation
     */
    formatResourceMessage(resources: CrisisResource[]): string;
    /**
     * Add custom crisis resource
     */
    addCrisisResource(resource: CrisisResource): void;
    /**
     * Add custom emergency contact
     */
    addEmergencyContact(contact: Contact): void;
    /**
     * Get resources by availability (24/7, business hours, etc.)
     */
    getResourcesByAvailability(availability: string): Promise<CrisisResource[]>;
    /**
     * Search resources by keyword
     */
    searchResources(keyword: string): Promise<CrisisResource[]>;
    /**
     * Initialize comprehensive crisis resources database
     */
    private initializeCrisisResources;
    /**
     * Initialize emergency contacts
     */
    private initializeEmergencyContacts;
    /**
     * Group resources by type for organized presentation
     */
    private groupResourcesByType;
    /**
     * Format a single resource for display
     */
    private formatSingleResource;
}
//# sourceMappingURL=resource-provider.d.ts.map