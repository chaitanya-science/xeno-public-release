"use strict";
// Core data models and types
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrivacyLevel = exports.MemoryType = exports.Speaker = void 0;
var Speaker;
(function (Speaker) {
    Speaker["USER"] = "USER";
    Speaker["COMPANION"] = "COMPANION";
})(Speaker || (exports.Speaker = Speaker = {}));
var MemoryType;
(function (MemoryType) {
    MemoryType["PERSONAL"] = "PERSONAL";
    MemoryType["PREFERENCE"] = "PREFERENCE";
    MemoryType["CONVERSATION"] = "CONVERSATION";
})(MemoryType || (exports.MemoryType = MemoryType = {}));
var PrivacyLevel;
(function (PrivacyLevel) {
    PrivacyLevel["LOW"] = "LOW";
    PrivacyLevel["MEDIUM"] = "MEDIUM";
    PrivacyLevel["HIGH"] = "HIGH";
})(PrivacyLevel || (exports.PrivacyLevel = PrivacyLevel = {}));
//# sourceMappingURL=index.js.map