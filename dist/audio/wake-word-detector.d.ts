import { BuiltinKeyword } from '@picovoice/porcupine-node';
import { WakeWordDetector, AudioConfig } from './interfaces';
export declare class PorcupineWakeWordDetector implements WakeWordDetector {
    private porcupine;
    private recorder;
    private isListening;
    private failureCount;
    private maxFailures;
    private wakeWordCallback;
    private audioConfig;
    private accessKey;
    private keyword;
    private sensitivity;
    private processingFrame;
    private abortController;
    private customModelPath?;
    constructor(accessKey: string, keyword?: BuiltinKeyword | string, sensitivity?: number, audioConfig?: Partial<AudioConfig>, customModelPath?: string);
    initialize(): Promise<void>;
    startListening(): Promise<void>;
    stopListening(): Promise<void>;
    onWakeWordDetected(callback: () => void): void;
    getFailureCount(): number;
    resetFailureCount(): void;
    detectWakeWord(testPcm?: Int16Array): Promise<void>;
    private processAudioFrame;
    private handleFailure;
    private provideTroubleshootingGuidance;
    dispose(): Promise<void>;
}
//# sourceMappingURL=wake-word-detector.d.ts.map