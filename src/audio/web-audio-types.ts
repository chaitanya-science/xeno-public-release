// Web Audio API type definitions for Node.js environment

export interface AudioContext {
  state: 'suspended' | 'running' | 'closed';
  currentTime: number;
  destination: AudioDestinationNode;
  resume(): Promise<void>;
  decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
  createBufferSource(): AudioBufferSourceNode;
  createGain(): GainNode;
  close?(): Promise<void>; // added optional close method
}

export interface AudioBuffer extends ArrayLike<number> {
  duration: number;
  length: number;
  numberOfChannels: number;
  sampleRate: number;
  [index: number]: number; // index signature to satisfy ArrayLike
}

export interface AudioBufferSourceNode {
  buffer: AudioBuffer | null;
  connect(destination: AudioNode): void;
  start(): void;
  onended: (() => void) | null;
  onerror: ((error: any) => void) | null;
}

export interface GainNode {
  gain: AudioParam;
  connect(destination: AudioNode): void;
}

export interface AudioParam {
  setValueAtTime(value: number, startTime: number): void;
  linearRampToValueAtTime(value: number, endTime: number): void;
}

export interface AudioNode {
  connect(destination: AudioNode): void;
}

export interface AudioDestinationNode extends AudioNode {}

// Global declarations for browser environment
declare global {
  interface Window {
    AudioContext: new () => AudioContext;
    webkitAudioContext: new () => AudioContext;
  }
}