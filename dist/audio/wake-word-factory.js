"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WakeWordDetectorFactory = void 0;
const porcupine_node_1 = require("@picovoice/porcupine-node");
const wake_word_detector_1 = require("./wake-word-detector");
const path_1 = __importDefault(require("path"));
class WakeWordDetectorFactory {
    static createPorcupineDetector(config, audioConfig) {
        if (!config.wakeWordEnabled || !config.porcupine) {
            return null;
        }
        // Map string keyword to BuiltinKeyword enum
        const keywordMap = {
            'computer': porcupine_node_1.BuiltinKeyword.COMPUTER,
            'hey google': porcupine_node_1.BuiltinKeyword.HEY_GOOGLE,
            'hey siri': porcupine_node_1.BuiltinKeyword.HEY_SIRI,
            'alexa': porcupine_node_1.BuiltinKeyword.ALEXA,
            'ok google': porcupine_node_1.BuiltinKeyword.OK_GOOGLE,
            'picovoice': porcupine_node_1.BuiltinKeyword.PICOVOICE,
            'porcupine': porcupine_node_1.BuiltinKeyword.PORCUPINE,
            'bumblebee': porcupine_node_1.BuiltinKeyword.BUMBLEBEE,
            'terminator': porcupine_node_1.BuiltinKeyword.TERMINATOR,
            'jarvis': porcupine_node_1.BuiltinKeyword.JARVIS
        };
        const keywordLower = config.porcupine.keyword.toLowerCase();
        // Check if it's the athena custom wake word
        if (keywordLower === 'athena') {
            const customModelPath = path_1.default.join(process.cwd(), 'athena_en_raspberry-pi_v3_0_0', 'athena_en_raspberry-pi_v3_0_0.ppn');
            return new wake_word_detector_1.PorcupineWakeWordDetector(config.porcupine.accessKey, 'athena', config.porcupine.sensitivity, {
                sampleRate: config.sampleRate,
                channels: config.channels,
                bitDepth: config.bitDepth,
                bufferSize: config.bufferSize,
                ...audioConfig
            }, customModelPath);
        }
        // Use built-in keyword
        const keyword = keywordMap[keywordLower] || porcupine_node_1.BuiltinKeyword.COMPUTER;
        return new wake_word_detector_1.PorcupineWakeWordDetector(config.porcupine.accessKey, keyword, config.porcupine.sensitivity, {
            sampleRate: config.sampleRate,
            channels: config.channels,
            bitDepth: config.bitDepth,
            bufferSize: config.bufferSize,
            ...audioConfig
        });
    }
    static getAvailableKeywords() {
        return [
            'athena', // Custom wake word - add at the top
            'computer',
            'hey google',
            'hey siri',
            'alexa',
            'ok google',
            'picovoice',
            'porcupine',
            'bumblebee',
            'terminator',
            'jarvis'
        ];
    }
}
exports.WakeWordDetectorFactory = WakeWordDetectorFactory;
//# sourceMappingURL=wake-word-factory.js.map