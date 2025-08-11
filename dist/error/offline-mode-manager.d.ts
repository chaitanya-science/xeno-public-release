import { OfflineModeManager, OfflineCapabilities } from './interfaces';
export declare class OfflineModeManagerImpl implements OfflineModeManager {
    private isOffline;
    private cachedResponses;
    private offlineCapabilities;
    private operationQueue;
    constructor();
    activate(): Promise<void>;
    deactivate(): Promise<void>;
    isActive(): boolean;
    getCachedResponse(input: string): Promise<string | null>;
    addCachedResponse(input: string, response: string): Promise<void>;
    getOfflineCapabilities(): OfflineCapabilities;
    explainLimitedFunctionality(): string;
    private initializeBasicResponses;
    private normalizeInput;
    private findBestMatch;
    private calculateMatchScore;
    activateOfflineMode(): Promise<void>;
    deactivateOfflineMode(): Promise<void>;
    isOfflineMode(): boolean;
    queueOperation(operation: any): Promise<void>;
    getQueueSize(): number;
    processQueuedOperations(processor?: (op: any) => Promise<void>): Promise<number>;
    getOfflineNotification(): string;
    private getDefaultOfflineResponse;
    private loadCachedResponses;
    private prepareOfflineServices;
    private cleanupOfflineServices;
    private persistCachedResponse;
}
//# sourceMappingURL=offline-mode-manager.d.ts.map