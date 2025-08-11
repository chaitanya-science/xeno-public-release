"use strict";
// Main entry point for AI Wellness Companion
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
// Core types and data models
__exportStar(require("./types"), exports);
// Component modules
__exportStar(require("./audio"), exports);
__exportStar(require("./conversation"), exports);
__exportStar(require("./memory"), exports);
__exportStar(require("./crisis"), exports);
__exportStar(require("./error"), exports);
__exportStar(require("./health"), exports);
__exportStar(require("./logging/logger"), exports);
__exportStar(require("./performance"), exports);
__exportStar(require("./voice"), exports);
__exportStar(require("./config"), exports);
//# sourceMappingURL=index.js.map