export interface AudioContext {
    state: 'suspended' | 'running' | 'closed';
    currentTime: number;
    destination: AudioDestinationNode;
    resume(): Promise<void>;
    decodeAudioData(audioData: ArrayBuffer): Promise<AudioBuffer>;
    createBufferSource(): AudioBufferSourceNode;
    createGain(): GainNode;
    close?(): Promise<void>;
}
export interface AudioBuffer extends ArrayLike<number> {
    duration: number;
    length: number;
    numberOfChannels: number;
    sampleRate: number;
    [index: number]: number;
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
export interface AudioDestinationNode extends AudioNode {
}
declare global {
    interface Window {
        AudioContext: new () => AudioContext;
        webkitAudioContext: new () => AudioContext;
    }
}
//# sourceMappingURL=web-audio-types.d.ts.map