// Audio processing interfaces

export interface AudioConfig {
  sampleRate: number;
  channels: number;
  bitDepth: number;
  bufferSize: number;
}

export interface WakeWordDetector {
  initialize(): Promise<void>;
  startListening(): Promise<void>;
  stopListening(): Promise<void>;
  onWakeWordDetected(callback: () => void): void;
  getFailureCount(): number;
  resetFailureCount(): void;
  dispose(): Promise<void>;
}

export interface SpeechToTextService {
  initialize(): Promise<void>;
  transcribe(audioBuffer: Buffer): Promise<SpeechRecognitionResult>;
  setLanguage(language: string): void;
  adaptToSpeaker(userId: string): Promise<void>;
  dispose(): void;
}

export interface SpeechRecognitionResult {
  text: string;
  confidence: number;
  alternatives?: string[];
  processingTime: number;
}

export interface TextToSpeechService {
  initialize(): Promise<void>;
  synthesize(text: string, emotionalContext?: string): Promise<Buffer>;
  setVoice(voiceId: string): void;
  setEmotionalTone(tone: string): void;
  dispose(): Promise<void>;
}

export interface AudioProcessor {
  processAudio(input: Buffer): Promise<Buffer>;
  applyNoiseReduction(input: Buffer): Promise<Buffer>;
  normalizeVolume(input: Buffer): Promise<Buffer>;
}