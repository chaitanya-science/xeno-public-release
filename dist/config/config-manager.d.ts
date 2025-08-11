import { SystemConfig, ConfigManager } from './interfaces';
export declare class DefaultConfigManager implements ConfigManager {
    private config;
    private readonly configPath;
    private logger;
    constructor(configPath?: string);
    loadConfig(): Promise<SystemConfig>;
    saveConfig(config: SystemConfig): Promise<void>;
    getConfig(): SystemConfig;
    updateConfig(updates: Partial<SystemConfig>): Promise<void>;
    validateConfig(config: SystemConfig): boolean;
    getDefaultConfig(): SystemConfig;
    private log;
}
//# sourceMappingURL=config-manager.d.ts.map