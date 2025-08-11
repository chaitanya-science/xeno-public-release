"use strict";
// Text-to-Speech interfaces
Object.defineProperty(exports, "__esModule", { value: true });
exports.TTSErrorCode = exports.EmphasisLevel = void 0;
var EmphasisLevel;
(function (EmphasisLevel) {
    EmphasisLevel["NONE"] = "none";
    EmphasisLevel["REDUCED"] = "reduced";
    EmphasisLevel["MODERATE"] = "moderate";
    EmphasisLevel["STRONG"] = "strong";
})(EmphasisLevel || (exports.EmphasisLevel = EmphasisLevel = {}));
var TTSErrorCode;
(function (TTSErrorCode) {
    TTSErrorCode["NETWORK_ERROR"] = "NETWORK_ERROR";
    TTSErrorCode["API_ERROR"] = "API_ERROR";
    TTSErrorCode["AUDIO_ERROR"] = "AUDIO_ERROR";
    TTSErrorCode["CONFIGURATION_ERROR"] = "CONFIGURATION_ERROR";
    TTSErrorCode["QUOTA_EXCEEDED"] = "QUOTA_EXCEEDED";
    TTSErrorCode["UNSUPPORTED_VOICE"] = "UNSUPPORTED_VOICE";
})(TTSErrorCode || (exports.TTSErrorCode = TTSErrorCode = {}));
//# sourceMappingURL=tts-interfaces.js.map