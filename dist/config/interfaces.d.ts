export interface SpeechToTextConfig {
    silenceTimeout: number;
    maxRecordingTime: number;
    energyThreshold: number;
    pauseThreshold: number;
    autoStart: boolean;
    continuousListening: boolean;
}
export interface AudioSystemConfig {
    sampleRate: number;
    channels: number;
    bitDepth: number;
    bufferSize: number;
    noiseReductionEnabled: boolean;
    echoCancellationEnabled: boolean;
    autoGainControl: boolean;
    inputDevice: string;
    outputDevice: string;
    inputVolume: number;
    outputVolume: number;
    wakeWordEnabled: boolean;
    alwaysListening: boolean;
    voiceActivationEnabled: boolean;
    speechToText: SpeechToTextConfig;
    wakeWordSensitivity?: number;
    porcupine?: {
        accessKey: string;
        keyword: string;
        sensitivity: number;
    };
}
export interface OpenAIServiceConfig {
    apiKey: string;
    model: string;
    maxTokens: number;
    temperature: number;
    baseUrl: string;
    timeout: number;
    empathyLevel: string;
    emotionalAdaptation: boolean;
    systemPrompt: string;
}
export interface SpeechServicesConfig {
    provider: 'google' | 'openai' | 'aws' | 'local';
    projectId: string;
    region: string;
    language: string;
    voice: string;
    speed: number;
    pitch: number;
    volumeGainDb: number;
    serviceAccount: any;
    outputFormat: string;
    audioEncoding: string;
    sampleRate: number;
    serverSide: boolean;
    apiKey?: string;
}
export interface AISystemConfig {
    openai: OpenAIServiceConfig;
    speechServices: SpeechServicesConfig;
}
export interface PrivacyConfig {
    dataRetentionDays: number;
    autoDeleteAudio: boolean;
    encryptionEnabled: boolean;
    allowMemoryStorage: boolean;
    allowConversationHistory: boolean;
    localProcessingOnly: boolean;
    anonymizeData: boolean;
}
export interface SystemSettings {
    responseTimeoutMs: number;
    maxConversationLength: number;
    healthCheckIntervalMs: number;
    autoUpdateEnabled: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    performanceMode: string;
    lowLatencyMode: boolean;
    adaptiveThresholds: boolean;
    fallbackMode: string;
    interactionMode: string;
    wakeWordRequired: boolean;
    voiceActivated: boolean;
}
export interface HardwareConfig {
    platform: string;
    optimizeForPi: boolean;
    cpuThrottling: boolean;
    memoryLimit: string;
    audioLatency: string;
}
export interface SystemConfig {
    audio: AudioSystemConfig;
    ai: AISystemConfig;
    privacy: PrivacyConfig;
    system: SystemSettings;
    hardware: HardwareConfig;
}
export interface ConfigManager {
    loadConfig(): Promise<SystemConfig>;
    saveConfig(config: SystemConfig): Promise<void>;
    getConfig(): SystemConfig;
    updateConfig(updates: Partial<SystemConfig>): Promise<void>;
    validateConfig(config: SystemConfig): boolean;
    getDefaultConfig(): SystemConfig;
}
//# sourceMappingURL=interfaces.d.ts.map