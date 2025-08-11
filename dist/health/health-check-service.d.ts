import { HealthCheckService, SystemHealth, ComponentHealth, NetworkHealth, HardwareHealth, ComponentMonitor } from './interfaces';
export declare class DefaultHealthCheckService implements HealthCheckService {
    private monitors;
    private healthCheckInterval;
    private healthChangeCallbacks;
    private startupTime;
    private systemReady;
    private readyCallbacks;
    constructor(monitors?: ComponentMonitor[]);
    startMonitoring(): Promise<void>;
    stopMonitoring(): void;
    getCurrentHealth(): Promise<SystemHealth>;
    checkComponent(componentName: string): Promise<ComponentHealth>;
    checkNetworkConnectivity(): Promise<NetworkHealth>;
    checkHardwareStatus(): Promise<HardwareHealth>;
    getStartupTime(): number;
    isSystemReady(): boolean;
    onHealthChange(callback: (health: SystemHealth) => void): void;
    performHealthCheck(): Promise<any>;
    runHealthCheck(): Promise<any>;
    private performHealthCheckInternal;
    private checkInternetConnectivity;
    private checkApiEndpoint;
    private getCpuInfo;
    private getMemoryInfo;
    private getStorageInfo;
    private parseStorageSize;
    private getAudioInfo;
    private determineOverallStatus;
    private determineHardwareStatus;
    private getNetworkStatusMessage;
    private getHardwareStatusMessage;
}
export declare class HealthCheckServiceImpl extends DefaultHealthCheckService {
}
//# sourceMappingURL=health-check-service.d.ts.map