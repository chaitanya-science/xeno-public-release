/**
 * Voice Assistant Integration Example
 * Shows how to integrate the voice assistant into the main application
 */
export declare class VoiceEnabledWellnessCompanion {
    private voiceAssistant;
    private configManager;
    constructor();
    initialize(): Promise<void>;
    private setupVoiceEventHandlers;
    handleWellnessCommands(): Promise<void>;
    integrateHealthMonitoring(): Promise<void>;
    setupCrisisDetection(): Promise<void>;
    private handleCrisisResponse;
    getVoiceAssistantStatus(): Promise<object>;
    dispose(): Promise<void>;
}
declare function createVoiceEnabledCompanion(): Promise<void>;
export { createVoiceEnabledCompanion };
//# sourceMappingURL=voice-wellness-integration.d.ts.map