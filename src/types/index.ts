// Core data models and types

export enum Speaker {
  USER = 'USER',
  COMPANION = 'COMPANION'
}

export enum MemoryType {
  PERSONAL = 'PERSONAL',
  PREFERENCE = 'PREFERENCE', 
  CONVERSATION = 'CONVERSATION'
}

export enum PrivacyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH'
}

export interface Message {
  message_id: string;
  timestamp: Date;
  speaker: Speaker;
  content: string;
  emotional_tone?: string;
  confidence_score: number;
}

export interface Memory {
  memory_id: string;
  content: string;
  importance_score: number;
  created_date: Date;
  last_referenced: Date;
  memory_type: MemoryType;
}

export interface Contact {
  name: string;
  phone: string;
  type: 'crisis' | 'emergency' | 'mental_health';
}

export interface PrivacySettings {
  dataRetentionDays: number;
  autoDeleteAudio: boolean;
  allowMemoryStorage: boolean;
  allowConversationHistory: boolean;
  allowAnalytics: boolean;
  allowCrashReporting: boolean;
  encryptionEnabled: boolean;
  anonymizeData: boolean;
  allowDataExport: boolean;
  allowDataDeletion: boolean;
}

export interface EmotionalState {
  valence: number; // -1 to 1 (negative to positive)
  arousal: number; // 0 to 1 (calm to excited)
  dominant_emotion?: string;
  confidence: number;
}

export interface ConversationSession {
  session_id: string;
  user_id: string;
  start_time: Date;
  end_time?: Date;
  conversation_history: Message[];
  emotional_context: EmotionalState;
  privacy_level: PrivacyLevel;
}

export interface UserProfile {
  user_id: string;
  preferences: Record<string, any>;
  conversation_memories: Memory[];
  crisis_contacts: Contact[];
  privacy_settings: PrivacySettings;
  last_interaction: Date;
}