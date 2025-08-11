// Crisis detection and response interfaces

import { Contact } from '../types';

export enum CrisisType {
  SELF_HARM = 'SELF_HARM',
  MEDICAL_EMERGENCY = 'MEDICAL_EMERGENCY',
  SEVERE_DISTRESS = 'SEVERE_DISTRESS',
  NONE = 'NONE'
}

export interface CrisisDetector {
  analyzeCrisis(text: string, conversationHistory?: string[]): Promise<CrisisAnalysis>;
  updateKeywords(keywords: CrisisKeywords): void;
  setSensitivity(level: number): void;
}

export interface CrisisAnalysis {
  crisisType: CrisisType;
  confidence: number;
  urgency: number; // 0-10 scale
  keywords: string[];
  recommendedAction: string;
}

export interface CrisisKeywords {
  selfHarm: string[];
  medicalEmergency: string[];
  severeDistress: string[];
}

export interface ResourceProvider {
  getCrisisResources(crisisType: CrisisType): Promise<CrisisResource[]>;
  getEmergencyContacts(): Promise<Contact[]>;
  formatResourceMessage(resources: CrisisResource[]): string;
}

export interface CrisisResource {
  name: string;
  phone: string;
  website?: string;
  description: string;
  availability: string; // "24/7", "Business hours", etc.
  type: CrisisType;
}