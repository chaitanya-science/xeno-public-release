import { WakeWordDetector, AudioConfig } from './interfaces';
import { AudioSystemConfig } from '../config/interfaces';
export declare class WakeWordDetectorFactory {
    static createPorcupineDetector(config: AudioSystemConfig, audioConfig?: Partial<AudioConfig>): WakeWordDetector | null;
    static getAvailableKeywords(): string[];
}
//# sourceMappingURL=wake-word-factory.d.ts.map