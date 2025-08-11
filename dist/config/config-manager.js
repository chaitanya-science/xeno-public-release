"use strict";
// Configuration manager implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultConfigManager = void 0;
const fs_1 = require("fs");
const logger_1 = require("../logging/logger");
class DefaultConfigManager {
    constructor(configPath) {
        this.config = null;
        this.logger = null;
        // Use environment variable or default paths based on deployment context
        this.configPath = configPath ||
            process.env.CONFIG_PATH ||
            (process.env.NODE_ENV === 'production' ? '/etc/xeno-public-release/config.json' : './config.json');
        // Initialize logger if available
        try {
            this.logger = (0, logger_1.getLogger)();
        }
        catch {
            // Logger not initialized yet, will use console
            this.logger = null;
        }
    }
    async loadConfig() {
        try {
            this.log('info', `Loading configuration from ${this.configPath}`);
            const configData = await fs_1.promises.readFile(this.configPath, 'utf-8');
            this.config = JSON.parse(configData);
            if (!this.validateConfig(this.config)) {
                throw new Error('Invalid configuration format');
            }
            this.log('info', 'Configuration loaded successfully');
            return this.config;
        }
        catch (error) {
            this.log('warn', `Failed to load config from ${this.configPath}, using defaults`, { error: error instanceof Error ? error.message : String(error) });
            // Try to create default config
            this.config = this.getDefaultConfig();
            try {
                await this.saveConfig(this.config);
                this.log('info', 'Default configuration created');
            }
            catch (saveError) {
                this.log('error', 'Failed to save default configuration', { error: saveError instanceof Error ? saveError.message : String(saveError) });
            }
            return this.config;
        }
    }
    async saveConfig(config) {
        if (!this.validateConfig(config)) {
            const error = new Error('Invalid configuration');
            this.log('error', 'Attempted to save invalid configuration', { error: error.message });
            throw error;
        }
        try {
            // Ensure directory exists
            const configDir = this.configPath.substring(0, this.configPath.lastIndexOf('/'));
            if (configDir) {
                await fs_1.promises.mkdir(configDir, { recursive: true });
            }
            await fs_1.promises.writeFile(this.configPath, JSON.stringify(config, null, 2));
            this.config = config;
            this.log('info', `Configuration saved to ${this.configPath}`);
        }
        catch (error) {
            this.log('error', 'Failed to save configuration', { error: error instanceof Error ? error.message : String(error) });
            throw error;
        }
    }
    getConfig() {
        if (!this.config) {
            throw new Error('Configuration not loaded. Call loadConfig() first.');
        }
        return this.config;
    }
    async updateConfig(updates) {
        const currentConfig = this.getConfig();
        const newConfig = { ...currentConfig, ...updates };
        this.log('info', 'Updating configuration', { updates: Object.keys(updates) });
        await this.saveConfig(newConfig);
    }
    validateConfig(config) {
        try {
            const isValid = !!(config &&
                config.audio &&
                config.ai &&
                config.privacy &&
                config.system &&
                typeof config.audio.sampleRate === 'number' &&
                typeof config.ai.openai?.apiKey === 'string' &&
                typeof config.privacy.dataRetentionDays === 'number' &&
                typeof config.system.responseTimeoutMs === 'number');
            if (!isValid) {
                this.log('warn', 'Configuration validation failed - missing required fields');
            }
            // Additional validation for deployment
            if (isValid && process.env.NODE_ENV === 'production') {
                const hasApiKeys = !!(config.ai.openai.apiKey &&
                    config.ai.openai.apiKey !== 'YOUR_OPENAI_API_KEY_HERE' &&
                    config.audio.porcupine &&
                    config.audio.porcupine.accessKey &&
                    config.audio.porcupine.accessKey !== 'YOUR_PORCUPINE_ACCESS_KEY_HERE');
                if (!hasApiKeys) {
                    this.log('warn', 'Production deployment detected but API keys not configured');
                }
            }
            return isValid;
        }
        catch (error) {
            this.log('error', 'Error during configuration validation', { error: error instanceof Error ? error.message : String(error) });
            return false;
        }
    }
    getDefaultConfig() {
        return {
            audio: {
                sampleRate: 16000,
                channels: 1,
                bitDepth: 16,
                bufferSize: 1024,
                noiseReductionEnabled: true,
                echoCancellationEnabled: false,
                autoGainControl: false,
                inputDevice: 'default',
                outputDevice: 'default',
                inputVolume: 1.0,
                outputVolume: 1.0,
                wakeWordEnabled: true,
                alwaysListening: false,
                voiceActivationEnabled: true,
                speechToText: {
                    silenceTimeout: 2000,
                    maxRecordingTime: 10000,
                    energyThreshold: 0.1,
                    pauseThreshold: 800,
                    autoStart: false,
                    continuousListening: false,
                },
                porcupine: {
                    accessKey: process.env.PORCUPINE_ACCESS_KEY || 'YOUR_PORCUPINE_ACCESS_KEY_HERE',
                    keyword: 'porcupine',
                    sensitivity: 0.5
                }
            },
            ai: {
                openai: {
                    apiKey: process.env.OPENAI_API_KEY || 'YOUR_OPENAI_API_KEY_HERE',
                    model: 'gpt-4',
                    maxTokens: 150,
                    temperature: 0.7,
                    baseUrl: 'https://api.openai.com/v1',
                    timeout: 10000,
                    empathyLevel: 'medium',
                    emotionalAdaptation: true,
                    systemPrompt: 'You are a helpful AI wellness companion.'
                },
                speechServices: {
                    provider: 'google',
                    projectId: 'your-gcp-project-id',
                    region: 'global',
                    language: 'en-US',
                    voice: 'en-US-Wavenet-D',
                    speed: 1.0,
                    pitch: 0,
                    volumeGainDb: 0,
                    serviceAccount: {},
                    outputFormat: 'MP3',
                    audioEncoding: 'LINEAR16',
                    sampleRate: 24000,
                    serverSide: true,
                }
            },
            privacy: {
                dataRetentionDays: 30,
                autoDeleteAudio: true,
                encryptionEnabled: true,
                allowMemoryStorage: true,
                allowConversationHistory: true,
                localProcessingOnly: false,
                anonymizeData: false,
            },
            system: {
                responseTimeoutMs: 10000,
                maxConversationLength: 20,
                healthCheckIntervalMs: 60000,
                autoUpdateEnabled: true,
                logLevel: 'info',
                performanceMode: 'balanced',
                lowLatencyMode: false,
                adaptiveThresholds: true,
                fallbackMode: 'retry',
                interactionMode: 'voice',
                wakeWordRequired: true,
                voiceActivated: true,
            },
            hardware: {
                platform: 'default',
                optimizeForPi: false,
                cpuThrottling: true,
                memoryLimit: '512m',
                audioLatency: 'low',
            }
        };
    }
    log(level, message, metadata) {
        if (this.logger) {
            this.logger[level]('ConfigManager', message, metadata);
        }
        else {
            // Fallback to console if logger not available
            const timestamp = new Date().toISOString();
            console[level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log'](`${timestamp} [${level.toUpperCase()}] ConfigManager: ${message}`, metadata ? JSON.stringify(metadata) : '');
        }
    }
}
exports.DefaultConfigManager = DefaultConfigManager;
//# sourceMappingURL=config-manager.js.map