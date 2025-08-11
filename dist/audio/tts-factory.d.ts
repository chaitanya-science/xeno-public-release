import { TextToSpeechService } from './tts-interfaces';
import { SystemConfig } from '../config/interfaces';
export declare class TTSFactory {
    static createTTSService(config: SystemConfig): TextToSpeechService;
    private static buildTTSConfig;
    private static getDefaultEmotionalMappings;
    static getRecommendedVoices(): Record<string, string[]>;
}
//# sourceMappingURL=tts-factory.d.ts.map