import { ComponentMonitor, ComponentHealth } from './interfaces';
export declare class AudioComponentMonitor implements ComponentMonitor {
    name: string;
    check(): Promise<ComponentHealth>;
    private checkMicrophone;
    private checkSpeaker;
}
export declare class ConversationComponentMonitor implements ComponentMonitor {
    name: string;
    check(): Promise<ComponentHealth>;
    private checkConversationManager;
}
export declare class MemoryComponentMonitor implements ComponentMonitor {
    name: string;
    check(): Promise<ComponentHealth>;
    private checkDatabase;
}
export declare class CrisisComponentMonitor implements ComponentMonitor {
    name: string;
    check(): Promise<ComponentHealth>;
    private checkCrisisSystem;
}
//# sourceMappingURL=component-monitors.d.ts.map