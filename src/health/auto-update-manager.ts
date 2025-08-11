// Auto-update manager implementation

import { promises as fs } from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import { join } from 'path';

const execAsync = promisify(exec);

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
  progress: number; // 0-100
  message: string;
  estimatedTimeRemaining?: number;
}

export enum UpdateStage {
  CHECKING = 'checking',
  DOWNLOADING = 'downloading',
  INSTALLING = 'installing',
  VERIFYING = 'verifying',
  COMPLETE = 'complete',
  FAILED = 'failed',
  ROLLING_BACK = 'rolling_back'
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

export class DefaultAutoUpdateManager implements AutoUpdateManager {
  private currentProgress: UpdateProgress | null = null;
  private updateInProgress: boolean = false;
  private autoUpdatesEnabled: boolean = true;
  private progressCallbacks: ((progress: UpdateProgress) => void)[] = [];
  private completeCallbacks: ((success: boolean, error?: string) => void)[] = [];
  private backupPath: string = './backup';
  private updateCheckInterval: NodeJS.Timeout | null = null;

  constructor(private configPath: string = './package.json') {
    this.startPeriodicUpdateCheck();
  }

  async checkForUpdates(): Promise<UpdateInfo> {
    try {
      this.updateProgress(UpdateStage.CHECKING, 0, 'Checking for updates...');

      const currentVersion = await this.getCurrentVersion();
      const availableVersion = await this.getLatestVersion();
      
      const updateAvailable = this.isNewerVersion(availableVersion, currentVersion);
      
      this.updateProgress(UpdateStage.CHECKING, 100, 
        updateAvailable ? 'Update available' : 'System is up to date');

      return {
        currentVersion,
        availableVersion,
        updateAvailable,
        releaseNotes: updateAvailable ? await this.getReleaseNotes(availableVersion) : '',
        updateSize: updateAvailable ? await this.getUpdateSize(availableVersion) : 0,
        isSecurityUpdate: updateAvailable ? await this.isSecurityUpdate(availableVersion) : false
      };
    } catch (error) {
      this.updateProgress(UpdateStage.FAILED, 0, 
        'Unable to check for updates. Please check your internet connection.');
      throw error;
    }
  }

  async startUpdate(): Promise<void> {
    if (this.updateInProgress) {
      throw new Error('Update already in progress');
    }

    try {
      this.updateInProgress = true;
      
      // Check for updates first
      const updateInfo = await this.checkForUpdates();
      if (!updateInfo.updateAvailable) {
        this.updateProgress(UpdateStage.COMPLETE, 100, 'System is already up to date');
        return;
      }

      // Create backup
      await this.createBackup();
      
      // Download update
      this.updateProgress(UpdateStage.DOWNLOADING, 0, 'Downloading update...');
      await this.downloadUpdate(updateInfo.availableVersion);
      
      // Install update
      this.updateProgress(UpdateStage.INSTALLING, 0, 'Installing update...');
      await this.installUpdate(updateInfo.availableVersion);
      
      // Verify installation
      this.updateProgress(UpdateStage.VERIFYING, 0, 'Verifying installation...');
      const verificationSuccess = await this.verifyInstallation(updateInfo.availableVersion);
      
      if (!verificationSuccess) {
        throw new Error('Update verification failed');
      }
      
      this.updateProgress(UpdateStage.COMPLETE, 100, 
        'Update completed successfully. Your companion is now up to date.');
      
      this.notifyUpdateComplete(true);
      
    } catch (error) {
      console.error('Update failed:', error);
      this.updateProgress(UpdateStage.FAILED, 0, 
        'Update failed. Attempting to restore previous version...');
      
      try {
        await this.rollbackUpdate();
      } catch (rollbackError) {
        console.error('Rollback failed:', rollbackError);
        this.updateProgress(UpdateStage.FAILED, 0, 
          'Update failed and automatic recovery was unsuccessful. Please contact support.');
      }
      
      this.notifyUpdateComplete(false, error instanceof Error ? error.message : 'Unknown error');
    } finally {
      this.updateInProgress = false;
    }
  }

  async rollbackUpdate(): Promise<void> {
    try {
      this.updateProgress(UpdateStage.ROLLING_BACK, 0, 'Restoring previous version...');
      
      // Check if backup exists
      const backupExists = await this.backupExists();
      if (!backupExists) {
        throw new Error('No backup available for rollback');
      }
      
      // Restore from backup
      await this.restoreFromBackup();
      
      // Verify rollback
      this.updateProgress(UpdateStage.ROLLING_BACK, 80, 'Verifying restoration...');
      const verificationSuccess = await this.verifyRollback();
      
      if (!verificationSuccess) {
        throw new Error('Rollback verification failed');
      }
      
      this.updateProgress(UpdateStage.COMPLETE, 100, 
        'Previous version restored successfully. Your companion is working normally.');
      
    } catch (error) {
      this.updateProgress(UpdateStage.FAILED, 0, 
        'Unable to restore previous version. Please restart your companion.');
      throw error;
    }
  }

  getUpdateProgress(): UpdateProgress | null {
    return this.currentProgress;
  }

  isUpdateInProgress(): boolean {
    return this.updateInProgress;
  }

  onUpdateProgress(callback: (progress: UpdateProgress) => void): void {
    this.progressCallbacks.push(callback);
  }

  onUpdateComplete(callback: (success: boolean, error?: string) => void): void {
    this.completeCallbacks.push(callback);
  }

  async enableAutoUpdates(enabled: boolean): Promise<void> {
    this.autoUpdatesEnabled = enabled;
    
    if (enabled) {
      this.startPeriodicUpdateCheck();
    } else {
      this.stopPeriodicUpdateCheck();
    }
    
    // Save setting to config
    await this.saveAutoUpdateSetting(enabled);
  }

  isAutoUpdatesEnabled(): boolean {
    return this.autoUpdatesEnabled;
  }

  private async getCurrentVersion(): Promise<string> {
    try {
      const packageJson = await fs.readFile(this.configPath, 'utf-8');
      const packageData = JSON.parse(packageJson);
      return packageData.version || '1.0.0';
    } catch (error) {
      // Re-throw error to allow proper error handling in tests
      throw error;
    }
  }

  private async getLatestVersion(): Promise<string> {
    // In a real implementation, this would check a remote repository or update server
    // For now, simulate checking for updates
    const currentVersion = await this.getCurrentVersion();
    const [major, minor, patch] = currentVersion.split('.').map(Number);
    
    // Simulate a newer version being available occasionally
    const hasUpdate = Math.random() < 0.3; // 30% chance of update (changed from > 0.7)
    if (hasUpdate) {
      return `${major}.${minor}.${patch + 1}`;
    }
    
    return currentVersion;
  }

  private isNewerVersion(available: string, current: string): boolean {
    const parseVersion = (version: string) => version.split('.').map(Number);
    const [aMajor, aMinor, aPatch] = parseVersion(available);
    const [cMajor, cMinor, cPatch] = parseVersion(current);
    
    if (aMajor > cMajor) return true;
    if (aMajor < cMajor) return false;
    if (aMinor > cMinor) return true;
    if (aMinor < cMinor) return false;
    return aPatch > cPatch;
  }

  private async getReleaseNotes(version: string): Promise<string> {
    // In a real implementation, this would fetch release notes from a server
    return `Version ${version} includes performance improvements and bug fixes to enhance your companion experience.`;
  }

  private async getUpdateSize(version: string): Promise<number> {
    // In a real implementation, this would get the actual update size
    return Math.floor(Math.random() * 50) + 10; // 10-60 MB
  }

  private async isSecurityUpdate(version: string): Promise<boolean> {
    // In a real implementation, this would check if the update contains security fixes
    return Math.random() > 0.8; // 20% chance of being a security update
  }

  private async createBackup(): Promise<void> {
    this.updateProgress(UpdateStage.DOWNLOADING, 10, 'Creating backup...');
    
    try {
      // Create backup directory
      await fs.mkdir(this.backupPath, { recursive: true });
      
      // In a real implementation, this would backup the current installation
      // For now, just create a backup marker file
      const backupInfo = {
        version: await this.getCurrentVersion(),
        timestamp: new Date().toISOString(),
        files: ['package.json', 'dist/', 'src/'] // Files to backup
      };
      
      await fs.writeFile(
        join(this.backupPath, 'backup-info.json'),
        JSON.stringify(backupInfo, null, 2)
      );
      
      this.updateProgress(UpdateStage.DOWNLOADING, 20, 'Backup created successfully');
    } catch (error) {
      throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async downloadUpdate(version: string): Promise<void> {
    // Simulate download progress
    for (let progress = 20; progress <= 60; progress += 10) {
      this.updateProgress(UpdateStage.DOWNLOADING, progress, 
        `Downloading update... ${progress}%`);
      await this.delay(500); // Simulate download time
    }
    
    this.updateProgress(UpdateStage.DOWNLOADING, 100, 'Download completed');
  }

  private async installUpdate(version: string): Promise<void> {
    // Simulate installation progress
    const steps = [
      'Preparing installation...',
      'Updating system files...',
      'Installing dependencies...',
      'Configuring services...',
      'Finalizing installation...'
    ];
    
    for (let i = 0; i < steps.length; i++) {
      const progress = Math.floor((i / steps.length) * 100);
      this.updateProgress(UpdateStage.INSTALLING, progress, steps[i]);
      await this.delay(1000); // Simulate installation time
    }
    
    this.updateProgress(UpdateStage.INSTALLING, 100, 'Installation completed');
  }

  private async verifyInstallation(version: string): Promise<boolean> {
    this.updateProgress(UpdateStage.VERIFYING, 50, 'Checking system integrity...');
    await this.delay(1000);
    
    // In a real implementation, this would verify the installation
    // For now, simulate successful verification
    this.updateProgress(UpdateStage.VERIFYING, 100, 'Verification completed');
    return true;
  }

  private async backupExists(): Promise<boolean> {
    try {
      await fs.access(join(this.backupPath, 'backup-info.json'));
      return true;
    } catch {
      return false;
    }
  }

  private async restoreFromBackup(): Promise<void> {
    this.updateProgress(UpdateStage.ROLLING_BACK, 20, 'Restoring files...');
    await this.delay(1000);
    
    this.updateProgress(UpdateStage.ROLLING_BACK, 60, 'Restoring configuration...');
    await this.delay(1000);
    
    // In a real implementation, this would restore files from backup
    // For now, just simulate the process
  }

  private async verifyRollback(): Promise<boolean> {
    await this.delay(500);
    // In a real implementation, this would verify the rollback
    return true;
  }

  private async saveAutoUpdateSetting(enabled: boolean): Promise<void> {
    // In a real implementation, this would save the setting to a config file
    // For now, just keep it in memory
  }

  private startPeriodicUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
    
    // Check for updates every 24 hours
    this.updateCheckInterval = setInterval(async () => {
      if (this.autoUpdatesEnabled && !this.updateInProgress) {
        try {
          const updateInfo = await this.checkForUpdates();
          if (updateInfo.updateAvailable) {
            // Auto-start update if enabled
            await this.startUpdate();
          }
        } catch (error) {
          console.error('Automatic update check failed:', error);
        }
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  private stopPeriodicUpdateCheck(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }

  private updateProgress(stage: UpdateStage, progress: number, message: string): void {
    this.currentProgress = {
      stage,
      progress,
      message,
      estimatedTimeRemaining: this.calculateEstimatedTime(stage, progress)
    };
    
    // Notify all progress callbacks
    this.progressCallbacks.forEach(callback => {
      try {
        callback(this.currentProgress!);
      } catch (error) {
        console.error('Error in update progress callback:', error);
      }
    });
  }

  private notifyUpdateComplete(success: boolean, error?: string): void {
    this.completeCallbacks.forEach(callback => {
      try {
        callback(success, error);
      } catch (callbackError) {
        console.error('Error in update complete callback:', callbackError);
      }
    });
  }

  private calculateEstimatedTime(stage: UpdateStage, progress: number): number | undefined {
    // Simple estimation based on stage and progress
    const stageTimeEstimates: Record<UpdateStage, number> = {
      [UpdateStage.CHECKING]: 30,
      [UpdateStage.DOWNLOADING]: 300,
      [UpdateStage.INSTALLING]: 180,
      [UpdateStage.VERIFYING]: 60,
      [UpdateStage.ROLLING_BACK]: 120,
      [UpdateStage.COMPLETE]: 0,
      [UpdateStage.FAILED]: 0
    };
    
    const totalTime = stageTimeEstimates[stage] || 60;
    const remainingProgress = 100 - progress;
    return Math.floor((remainingProgress / 100) * totalTime);
  }

  private delay(ms: number): Promise<void> {
    // Reduce delay time for tests
    const actualDelay = process.env.NODE_ENV === 'test' ? Math.min(ms, 10) : ms;
    return new Promise(resolve => setTimeout(resolve, actualDelay));
  }

  // Cleanup method
  destroy(): void {
    this.stopPeriodicUpdateCheck();
    this.progressCallbacks = [];
    this.completeCallbacks = [];
  }
}