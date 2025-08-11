import { HardwareMonitor, HardwareStatus, SystemResourceStatus, HardwareFailure } from './interfaces';
export declare class HardwareMonitorImpl implements HardwareMonitor {
    private lastMicrophoneCheck;
    private lastSpeakerCheck;
    private microphoneStatus;
    private speakerStatus;
    checkMicrophone(): Promise<HardwareStatus>;
    checkSpeaker(): Promise<HardwareStatus>;
    checkSystemResources(): Promise<SystemResourceStatus & {
        cpu_usage?: number;
        memory_usage?: number;
        disk_usage?: number;
    }>;
    detectHardwareFailures(): Promise<HardwareFailure[]>;
    generateUserFriendlyReport(failures: HardwareFailure[]): string;
    checkMicrophoneStatus(): Promise<any>;
    checkSpeakerStatus(): Promise<any>;
    getDiagnosticInfo(): Promise<any>;
    checkTemperature(): Promise<any>;
    checkPowerStatus(): Promise<any>;
    getUSBAudioDevices(): Promise<any[]>;
    getHardwareCapabilities(): Promise<any>;
    private checkAudioDevice;
    private testMicrophoneAccess;
    private testSpeakerAccess;
    private getCPUUsage;
    private getStorageInfo;
    private parseSize;
}
//# sourceMappingURL=hardware-monitor.d.ts.map