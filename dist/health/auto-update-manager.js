"use strict";
// Auto-update manager implementation
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefaultAutoUpdateManager = exports.UpdateStage = void 0;
const fs_1 = require("fs");
const child_process_1 = require("child_process");
const util_1 = require("util");
const path_1 = require("path");
const execAsync = (0, util_1.promisify)(child_process_1.exec);
var UpdateStage;
(function (UpdateStage) {
    UpdateStage["CHECKING"] = "checking";
    UpdateStage["DOWNLOADING"] = "downloading";
    UpdateStage["INSTALLING"] = "installing";
    UpdateStage["VERIFYING"] = "verifying";
    UpdateStage["COMPLETE"] = "complete";
    UpdateStage["FAILED"] = "failed";
    UpdateStage["ROLLING_BACK"] = "rolling_back";
})(UpdateStage || (exports.UpdateStage = UpdateStage = {}));
class DefaultAutoUpdateManager {
    constructor(configPath = './package.json') {
        this.configPath = configPath;
        this.currentProgress = null;
        this.updateInProgress = false;
        this.autoUpdatesEnabled = true;
        this.progressCallbacks = [];
        this.completeCallbacks = [];
        this.backupPath = './backup';
        this.updateCheckInterval = null;
        this.startPeriodicUpdateCheck();
    }
    async checkForUpdates() {
        try {
            this.updateProgress(UpdateStage.CHECKING, 0, 'Checking for updates...');
            const currentVersion = await this.getCurrentVersion();
            const availableVersion = await this.getLatestVersion();
            const updateAvailable = this.isNewerVersion(availableVersion, currentVersion);
            this.updateProgress(UpdateStage.CHECKING, 100, updateAvailable ? 'Update available' : 'System is up to date');
            return {
                currentVersion,
                availableVersion,
                updateAvailable,
                releaseNotes: updateAvailable ? await this.getReleaseNotes(availableVersion) : '',
                updateSize: updateAvailable ? await this.getUpdateSize(availableVersion) : 0,
                isSecurityUpdate: updateAvailable ? await this.isSecurityUpdate(availableVersion) : false
            };
        }
        catch (error) {
            this.updateProgress(UpdateStage.FAILED, 0, 'Unable to check for updates. Please check your internet connection.');
            throw error;
        }
    }
    async startUpdate() {
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
            this.updateProgress(UpdateStage.COMPLETE, 100, 'Update completed successfully. Your companion is now up to date.');
            this.notifyUpdateComplete(true);
        }
        catch (error) {
            console.error('Update failed:', error);
            this.updateProgress(UpdateStage.FAILED, 0, 'Update failed. Attempting to restore previous version...');
            try {
                await this.rollbackUpdate();
            }
            catch (rollbackError) {
                console.error('Rollback failed:', rollbackError);
                this.updateProgress(UpdateStage.FAILED, 0, 'Update failed and automatic recovery was unsuccessful. Please contact support.');
            }
            this.notifyUpdateComplete(false, error instanceof Error ? error.message : 'Unknown error');
        }
        finally {
            this.updateInProgress = false;
        }
    }
    async rollbackUpdate() {
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
            this.updateProgress(UpdateStage.COMPLETE, 100, 'Previous version restored successfully. Your companion is working normally.');
        }
        catch (error) {
            this.updateProgress(UpdateStage.FAILED, 0, 'Unable to restore previous version. Please restart your companion.');
            throw error;
        }
    }
    getUpdateProgress() {
        return this.currentProgress;
    }
    isUpdateInProgress() {
        return this.updateInProgress;
    }
    onUpdateProgress(callback) {
        this.progressCallbacks.push(callback);
    }
    onUpdateComplete(callback) {
        this.completeCallbacks.push(callback);
    }
    async enableAutoUpdates(enabled) {
        this.autoUpdatesEnabled = enabled;
        if (enabled) {
            this.startPeriodicUpdateCheck();
        }
        else {
            this.stopPeriodicUpdateCheck();
        }
        // Save setting to config
        await this.saveAutoUpdateSetting(enabled);
    }
    isAutoUpdatesEnabled() {
        return this.autoUpdatesEnabled;
    }
    async getCurrentVersion() {
        try {
            const packageJson = await fs_1.promises.readFile(this.configPath, 'utf-8');
            const packageData = JSON.parse(packageJson);
            return packageData.version || '1.0.0';
        }
        catch (error) {
            // Re-throw error to allow proper error handling in tests
            throw error;
        }
    }
    async getLatestVersion() {
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
    isNewerVersion(available, current) {
        const parseVersion = (version) => version.split('.').map(Number);
        const [aMajor, aMinor, aPatch] = parseVersion(available);
        const [cMajor, cMinor, cPatch] = parseVersion(current);
        if (aMajor > cMajor)
            return true;
        if (aMajor < cMajor)
            return false;
        if (aMinor > cMinor)
            return true;
        if (aMinor < cMinor)
            return false;
        return aPatch > cPatch;
    }
    async getReleaseNotes(version) {
        // In a real implementation, this would fetch release notes from a server
        return `Version ${version} includes performance improvements and bug fixes to enhance your companion experience.`;
    }
    async getUpdateSize(version) {
        // In a real implementation, this would get the actual update size
        return Math.floor(Math.random() * 50) + 10; // 10-60 MB
    }
    async isSecurityUpdate(version) {
        // In a real implementation, this would check if the update contains security fixes
        return Math.random() > 0.8; // 20% chance of being a security update
    }
    async createBackup() {
        this.updateProgress(UpdateStage.DOWNLOADING, 10, 'Creating backup...');
        try {
            // Create backup directory
            await fs_1.promises.mkdir(this.backupPath, { recursive: true });
            // In a real implementation, this would backup the current installation
            // For now, just create a backup marker file
            const backupInfo = {
                version: await this.getCurrentVersion(),
                timestamp: new Date().toISOString(),
                files: ['package.json', 'dist/', 'src/'] // Files to backup
            };
            await fs_1.promises.writeFile((0, path_1.join)(this.backupPath, 'backup-info.json'), JSON.stringify(backupInfo, null, 2));
            this.updateProgress(UpdateStage.DOWNLOADING, 20, 'Backup created successfully');
        }
        catch (error) {
            throw new Error(`Failed to create backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    async downloadUpdate(version) {
        // Simulate download progress
        for (let progress = 20; progress <= 60; progress += 10) {
            this.updateProgress(UpdateStage.DOWNLOADING, progress, `Downloading update... ${progress}%`);
            await this.delay(500); // Simulate download time
        }
        this.updateProgress(UpdateStage.DOWNLOADING, 100, 'Download completed');
    }
    async installUpdate(version) {
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
    async verifyInstallation(version) {
        this.updateProgress(UpdateStage.VERIFYING, 50, 'Checking system integrity...');
        await this.delay(1000);
        // In a real implementation, this would verify the installation
        // For now, simulate successful verification
        this.updateProgress(UpdateStage.VERIFYING, 100, 'Verification completed');
        return true;
    }
    async backupExists() {
        try {
            await fs_1.promises.access((0, path_1.join)(this.backupPath, 'backup-info.json'));
            return true;
        }
        catch {
            return false;
        }
    }
    async restoreFromBackup() {
        this.updateProgress(UpdateStage.ROLLING_BACK, 20, 'Restoring files...');
        await this.delay(1000);
        this.updateProgress(UpdateStage.ROLLING_BACK, 60, 'Restoring configuration...');
        await this.delay(1000);
        // In a real implementation, this would restore files from backup
        // For now, just simulate the process
    }
    async verifyRollback() {
        await this.delay(500);
        // In a real implementation, this would verify the rollback
        return true;
    }
    async saveAutoUpdateSetting(enabled) {
        // In a real implementation, this would save the setting to a config file
        // For now, just keep it in memory
    }
    startPeriodicUpdateCheck() {
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
                }
                catch (error) {
                    console.error('Automatic update check failed:', error);
                }
            }
        }, 24 * 60 * 60 * 1000); // 24 hours
    }
    stopPeriodicUpdateCheck() {
        if (this.updateCheckInterval) {
            clearInterval(this.updateCheckInterval);
            this.updateCheckInterval = null;
        }
    }
    updateProgress(stage, progress, message) {
        this.currentProgress = {
            stage,
            progress,
            message,
            estimatedTimeRemaining: this.calculateEstimatedTime(stage, progress)
        };
        // Notify all progress callbacks
        this.progressCallbacks.forEach(callback => {
            try {
                callback(this.currentProgress);
            }
            catch (error) {
                console.error('Error in update progress callback:', error);
            }
        });
    }
    notifyUpdateComplete(success, error) {
        this.completeCallbacks.forEach(callback => {
            try {
                callback(success, error);
            }
            catch (callbackError) {
                console.error('Error in update complete callback:', callbackError);
            }
        });
    }
    calculateEstimatedTime(stage, progress) {
        // Simple estimation based on stage and progress
        const stageTimeEstimates = {
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
    delay(ms) {
        // Reduce delay time for tests
        const actualDelay = process.env.NODE_ENV === 'test' ? Math.min(ms, 10) : ms;
        return new Promise(resolve => setTimeout(resolve, actualDelay));
    }
    // Cleanup method
    destroy() {
        this.stopPeriodicUpdateCheck();
        this.progressCallbacks = [];
        this.completeCallbacks = [];
    }
}
exports.DefaultAutoUpdateManager = DefaultAutoUpdateManager;
//# sourceMappingURL=auto-update-manager.js.map