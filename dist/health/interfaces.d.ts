export interface ComponentHealth {
    name: string;
    status: HealthStatus;
    lastCheck: Date;
    message: string;
    responseTime?: number;
    details?: Record<string, any>;
}
export interface SystemHealth {
    overall: HealthStatus;
    components: ComponentHealth[];
    networkConnectivity: NetworkHealth;
    hardwareStatus: HardwareHealth;
    startupTime: number;
    lastHealthCheck: Date;
}
export interface NetworkHealth {
    status: HealthStatus;
    internetConnectivity: boolean;
    apiEndpoints: {
        openai: boolean;
        speechServices: boolean;
    };
    latency?: number;
    message: string;
}
export interface HardwareHealth {
    status: HealthStatus;
    cpu: {
        usage: number;
        temperature?: number;
    };
    memory: {
        used: number;
        total: number;
        percentage: number;
    };
    storage: {
        used: number;
        total: number;
        percentage: number;
    };
    audio: {
        microphone: boolean;
        speaker: boolean;
    };
    message: string;
}
export declare enum HealthStatus {
    HEALTHY = "healthy",
    WARNING = "warning",
    CRITICAL = "critical",
    UNKNOWN = "unknown"
}
export interface HealthCheckService {
    startMonitoring(): Promise<void>;
    stopMonitoring(): void;
    getCurrentHealth(): Promise<SystemHealth>;
    checkComponent(componentName: string): Promise<ComponentHealth>;
    checkNetworkConnectivity(): Promise<NetworkHealth>;
    checkHardwareStatus(): Promise<HardwareHealth>;
    getStartupTime(): number;
    isSystemReady(): boolean;
    onHealthChange(callback: (health: SystemHealth) => void): void;
}
export interface ComponentMonitor {
    name: string;
    check(): Promise<ComponentHealth | any>;
}
export interface StartupManager {
    initialize(): Promise<void>;
    getStartupTime(): number;
    isReady(): boolean;
    onReady(callback: () => void): void;
}
//# sourceMappingURL=interfaces.d.ts.map