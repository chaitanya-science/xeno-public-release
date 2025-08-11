"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
// Audio processing and services
__exportStar(require("./audio-processor"), exports);
__exportStar(require("./continuous-audio-manager"), exports);
__exportStar(require("./speech-to-text-factory"), exports);
__exportStar(require("./speech-to-text-service"), exports);
__exportStar(require("./google-text-to-speech-service"), exports);
__exportStar(require("./tts-factory"), exports);
__exportStar(require("./tts-interfaces"), exports);
__exportStar(require("./voice-activity-processor"), exports);
__exportStar(require("./web-audio-types"), exports);
//# sourceMappingURL=index.js.map