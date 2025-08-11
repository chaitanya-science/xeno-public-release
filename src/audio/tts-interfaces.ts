// Text-to-Speech interfaces

import { EmotionalState } from '../types';
import { AudioBuffer } from './web-audio-types';

export interface TextToSpeechService {
  initialize(): Promise<void>;
  synthesizeSpeech(text: string, options?: TTSOptions): Promise<AudioBuffer>;
  synthesizeSpeechWithEmotion(
    text: string, 
    emotionalState: EmotionalState, 
    options?: TTSOptions
  ): Promise<AudioBuffer>;
  synthesizeSpeechServerSide(text: string, options?: TTSOptions): Promise<void>;
  playAudio(audioBuffer: AudioBuffer): Promise<void>;
  speakText(text: string, options?: TTSOptions): Promise<void>;
  speakWithEmotion(text: string, emotionalState: EmotionalState, options?: TTSOptions): Promise<void>;
  handleTechnicalDelay(delayReason: string): Promise<void>;
  isAvailable(): Promise<boolean>;
  getVoiceOptions(): Promise<VoiceOption[]>;
}

export interface TTSOptions {
  voice?: string;
  speed?: number; // 0.5 to 2.0
  pitch?: number; // 0.5 to 2.0
  volume?: number; // 0.0 to 1.0
  pauseDuration?: number; // milliseconds for natural pauses
  emphasis?: EmphasisLevel;
  language?: string;
}

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
  style?: string;
  isNeural: boolean;
}

export interface EmotionalVoiceMapping {
  valence: number; // -1 to 1
  arousal: number; // 0 to 1
  voiceStyle: string;
  speedModifier: number;
  pitchModifier: number;
  pauseModifier: number;
}

export interface TTSConfig {
  provider: 'google' | 'openai' | 'aws' | 'local';
  apiKey?: string;
  region?: string;
  defaultVoice: string;
  defaultLanguage: string;
  defaultSpeed: number; // Default speech speed (0.5 to 2.0)
  emotionalMappings: EmotionalVoiceMapping[];
  naturalPauses: {
    sentence: number; // milliseconds
    paragraph: number;
    comma: number;
    period: number;
  };
  technicalDelayMessages: string[];
  projectId?: string; // added for integration test expectations
  keyFilename?: string; // optional legacy credential path
  serviceAccount?: any; // Google Cloud service account credentials
}

export enum EmphasisLevel {
  NONE = 'none',
  REDUCED = 'reduced', 
  MODERATE = 'moderate',
  STRONG = 'strong'
}

export interface AudioPlaybackOptions {
  volume: number;
  fadeIn?: number; // milliseconds
  fadeOut?: number; // milliseconds
}

export interface TTSErrorInterface extends Error {
  code: TTSErrorCode;
  retryable: boolean;
  details?: any;
}

export enum TTSErrorCode {
  NETWORK_ERROR = 'NETWORK_ERROR',
  API_ERROR = 'API_ERROR',
  AUDIO_ERROR = 'AUDIO_ERROR',
  CONFIGURATION_ERROR = 'CONFIGURATION_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  UNSUPPORTED_VOICE = 'UNSUPPORTED_VOICE'
}