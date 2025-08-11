export interface UpdateInfo {
    currentVersion: string;
    availableVersion: string;
    updateAvailable: boolean;
    releaseNotes: string;
    updateSize: number;
    isSecurityUpdate: boolean;
}
export interface UpdateProgress {
    stage: UpdateStage;
    progress: number;
    message: string;
    estimatedTimeRemaining?: number;
}
export declare enum UpdateStage {
    CHECKING = "checking",
    DOWNLOADING = "downloading",
    INSTALLING = "installing",
    VERIFYING = "verifying",
    COMPLETE = "complete",
    FAILED = "failed",
    ROLLING_BACK = "rolling_back"
}
export interface AutoUpdateManager {
    checkForUpdates(): Promise<UpdateInfo>;
    startUpdate(): Promise<void>;
    rollbackUpdate(): Promise<void>;
    getUpdateProgress(): UpdateProgress | null;
    isUpdateInProgress(): boolean;
    onUpdateProgress(callback: (progress: UpdateProgress) => void): void;
    onUpdateComplete(callback: (success: boolean, error?: string) => void): void;
    enableAutoUpdates(enabled: boolean): Promise<void>;
    isAutoUpdatesEnabled(): boolean;
}
export declare class DefaultAutoUpdateManager implements AutoUpdateManager {
    private configPath;
    private currentProgress;
    private updateInProgress;
    private autoUpdatesEnabled;
    private progressCallbacks;
    private completeCallbacks;
    private backupPath;
    private updateCheckInterval;
    constructor(configPath?: string);
    checkForUpdates(): Promise<UpdateInfo>;
    startUpdate(): Promise<void>;
    rollbackUpdate(): Promise<void>;
    getUpdateProgress(): UpdateProgress | null;
    isUpdateInProgress(): boolean;
    onUpdateProgress(callback: (progress: UpdateProgress) => void): void;
    onUpdateComplete(callback: (success: boolean, error?: string) => void): void;
    enableAutoUpdates(enabled: boolean): Promise<void>;
    isAutoUpdatesEnabled(): boolean;
    private getCurrentVersion;
    private getLatestVersion;
    private isNewerVersion;
    private getReleaseNotes;
    private getUpdateSize;
    private isSecurityUpdate;
    private createBackup;
    private downloadUpdate;
    private installUpdate;
    private verifyInstallation;
    private backupExists;
    private restoreFromBackup;
    private verifyRollback;
    private saveAutoUpdateSetting;
    private startPeriodicUpdateCheck;
    private stopPeriodicUpdateCheck;
    private updateProgress;
    private notifyUpdateComplete;
    private calculateEstimatedTime;
    private delay;
    destroy(): void;
}
//# sourceMappingURL=auto-update-manager.d.ts.map