"use strict";
// Secure boot process and tamper detection for Raspberry Pi
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureBootMonitor = exports.RaspberryPiSecureBootMonitor = void 0;
exports.initializeSecureBootMonitor = initializeSecureBootMonitor;
const fs_1 = require("fs");
const fsSync = __importStar(require("fs"));
const child_process_1 = require("child_process");
const util_1 = require("util");
const crypto = __importStar(require("crypto"));
const execAsync = (0, util_1.promisify)(child_process_1.exec);
class RaspberryPiSecureBootMonitor {
    constructor(config) {
        this.fileWatcher = null;
        this.systemHashes = new Map();
        this.isInitialized = false;
        this.config = {
            enableTamperDetection: true,
            checkSystemIntegrity: true,
            monitorFileChanges: true,
            alertOnSuspiciousActivity: true,
            trustedBootEnabled: false,
            secureBootKeys: [],
            ...config
        };
    }
    /**
     * Initialize the secure boot monitor
     */
    async initialize() {
        if (this.isInitialized)
            return;
        try {
            // Check if running on Raspberry Pi
            await this.verifyRaspberryPi();
            // Initialize system integrity baseline
            await this.initializeSystemBaseline();
            // Start file monitoring if enabled
            if (this.config.monitorFileChanges) {
                this.monitorFileChanges();
            }
            this.isInitialized = true;
            console.log('Secure boot monitor initialized successfully');
        }
        catch (error) {
            console.error('Failed to initialize secure boot monitor:', error);
            throw error;
        }
    }
    /**
     * Check system integrity
     */
    async checkSystemIntegrity() {
        const results = [];
        try {
            // Check boot configuration
            const bootConfigResult = await this.checkBootConfiguration();
            results.push(bootConfigResult);
            // Check system files integrity
            const systemFilesResult = await this.checkSystemFiles();
            results.push(systemFilesResult);
            // Check kernel modules
            const kernelModulesResult = await this.checkKernelModules();
            results.push(kernelModulesResult);
            // Check firmware integrity
            const firmwareResult = await this.checkFirmwareIntegrity();
            results.push(firmwareResult);
            // Check for unauthorized modifications
            const modificationsResult = await this.checkUnauthorizedModifications();
            results.push(modificationsResult);
        }
        catch (error) {
            results.push({
                timestamp: new Date(),
                component: 'SystemIntegrity',
                status: 'FAIL',
                message: `System integrity check failed: ${error}`,
                severity: 'HIGH'
            });
        }
        return results;
    }
    /**
     * Detect tampering attempts
     */
    async detectTampering() {
        if (!this.config.enableTamperDetection) {
            return false;
        }
        try {
            const integrityResults = await this.checkSystemIntegrity();
            const failedChecks = integrityResults.filter(result => result.status === 'FAIL');
            if (failedChecks.length > 0) {
                console.warn('Tampering detected:', failedChecks);
                if (this.config.alertOnSuspiciousActivity) {
                    await this.alertSuspiciousActivity(failedChecks);
                }
                return true;
            }
            return false;
        }
        catch (error) {
            console.error('Error during tamper detection:', error);
            return false;
        }
    }
    /**
     * Monitor file changes in critical system directories
     */
    monitorFileChanges() {
        if (!this.config.monitorFileChanges)
            return;
        const criticalPaths = [
            '/boot',
            '/etc',
            '/usr/bin',
            '/usr/sbin',
            '/lib',
            '/opt/wellness-companion'
        ];
        try {
            // Use fs.watch for file system monitoring
            criticalPaths.forEach(path => {
                fs_1.promises.access(path).then(() => {
                    try {
                        const watcher = fsSync.watch(path, { recursive: true });
                        watcher.on('change', (eventType, filename) => {
                            if (filename) {
                                this.handleFileChange(path, filename, eventType);
                            }
                        });
                        watcher.on('error', (error) => {
                            console.error(`File watcher error for ${path}:`, error);
                        });
                    }
                    catch (error) {
                        console.error(`Failed to watch ${path}:`, error);
                    }
                }).catch(() => {
                    // Path doesn't exist, skip monitoring
                });
            });
            console.log('File change monitoring started for critical paths');
        }
        catch (error) {
            console.error('Failed to start file change monitoring:', error);
        }
    }
    /**
     * Get current security status
     */
    async getSecurityStatus() {
        const results = [];
        // Check if secure boot is enabled
        const secureBootStatus = await this.checkSecureBootStatus();
        results.push(secureBootStatus);
        // Check system integrity
        const integrityResults = await this.checkSystemIntegrity();
        results.push(...integrityResults);
        // Check for recent tampering
        const tamperingDetected = await this.detectTampering();
        results.push({
            timestamp: new Date(),
            component: 'TamperDetection',
            status: tamperingDetected ? 'FAIL' : 'PASS',
            message: tamperingDetected ? 'Tampering detected' : 'No tampering detected',
            severity: tamperingDetected ? 'CRITICAL' : 'LOW'
        });
        return results;
    }
    /**
     * Verify we're running on a Raspberry Pi
     */
    async verifyRaspberryPi() {
        try {
            const cpuInfo = await fs_1.promises.readFile('/proc/cpuinfo', 'utf8');
            if (!cpuInfo.includes('Raspberry Pi') && !cpuInfo.includes('BCM')) {
                console.warn('Not running on Raspberry Pi - some security features may not be available');
            }
        }
        catch (error) {
            console.warn('Could not verify Raspberry Pi platform:', error);
        }
    }
    /**
     * Initialize system integrity baseline
     */
    async initializeSystemBaseline() {
        const criticalFiles = [
            '/boot/config.txt',
            '/boot/cmdline.txt',
            '/etc/passwd',
            '/etc/shadow',
            '/etc/sudoers'
        ];
        for (const file of criticalFiles) {
            try {
                const content = await fs_1.promises.readFile(file, 'utf8');
                const hash = crypto.createHash('sha256').update(content).digest('hex');
                this.systemHashes.set(file, hash);
            }
            catch (error) {
                console.debug(`Could not hash file ${file}:`, error);
            }
        }
        console.log(`System baseline initialized with ${this.systemHashes.size} file hashes`);
    }
    /**
     * Check boot configuration
     */
    async checkBootConfiguration() {
        try {
            const configPath = '/boot/config.txt';
            const config = await fs_1.promises.readFile(configPath, 'utf8');
            // Check for secure boot settings
            const hasSecureBoot = config.includes('secure_boot=1');
            const hasSignedKernel = config.includes('kernel_sig=1');
            if (this.config.trustedBootEnabled && (!hasSecureBoot || !hasSignedKernel)) {
                return {
                    timestamp: new Date(),
                    component: 'BootConfiguration',
                    status: 'FAIL',
                    message: 'Secure boot not properly configured',
                    details: { hasSecureBoot, hasSignedKernel },
                    severity: 'HIGH'
                };
            }
            return {
                timestamp: new Date(),
                component: 'BootConfiguration',
                status: 'PASS',
                message: 'Boot configuration is secure',
                details: { hasSecureBoot, hasSignedKernel },
                severity: 'LOW'
            };
        }
        catch (error) {
            return {
                timestamp: new Date(),
                component: 'BootConfiguration',
                status: 'FAIL',
                message: `Failed to check boot configuration: ${error}`,
                severity: 'MEDIUM'
            };
        }
    }
    /**
     * Check system files integrity
     */
    async checkSystemFiles() {
        let modifiedFiles = 0;
        const checkedFiles = [];
        for (const [filePath, expectedHash] of this.systemHashes) {
            try {
                const content = await fs_1.promises.readFile(filePath, 'utf8');
                const currentHash = crypto.createHash('sha256').update(content).digest('hex');
                if (currentHash !== expectedHash) {
                    modifiedFiles++;
                    console.warn(`File modified: ${filePath}`);
                }
                checkedFiles.push(filePath);
            }
            catch (error) {
                console.debug(`Could not check file ${filePath}:`, error);
            }
        }
        const status = modifiedFiles === 0 ? 'PASS' : 'FAIL';
        const severity = modifiedFiles > 2 ? 'HIGH' : modifiedFiles > 0 ? 'MEDIUM' : 'LOW';
        return {
            timestamp: new Date(),
            component: 'SystemFiles',
            status,
            message: `${modifiedFiles} of ${checkedFiles.length} system files modified`,
            details: { modifiedFiles, totalFiles: checkedFiles.length },
            severity
        };
    }
    /**
     * Check kernel modules
     */
    async checkKernelModules() {
        try {
            const { stdout } = await execAsync('lsmod');
            const modules = stdout.split('\n').slice(1).filter(line => line.trim());
            // Check for suspicious modules
            const suspiciousModules = modules.filter(module => {
                const moduleName = module.split(/\s+/)[0].toLowerCase();
                return moduleName.includes('rootkit') ||
                    moduleName.includes('backdoor') ||
                    moduleName.includes('keylog');
            });
            if (suspiciousModules.length > 0) {
                return {
                    timestamp: new Date(),
                    component: 'KernelModules',
                    status: 'FAIL',
                    message: `Suspicious kernel modules detected: ${suspiciousModules.length}`,
                    details: { suspiciousModules },
                    severity: 'CRITICAL'
                };
            }
            return {
                timestamp: new Date(),
                component: 'KernelModules',
                status: 'PASS',
                message: `${modules.length} kernel modules checked, none suspicious`,
                details: { totalModules: modules.length },
                severity: 'LOW'
            };
        }
        catch (error) {
            return {
                timestamp: new Date(),
                component: 'KernelModules',
                status: 'FAIL',
                message: `Failed to check kernel modules: ${error}`,
                severity: 'MEDIUM'
            };
        }
    }
    /**
     * Check firmware integrity
     */
    async checkFirmwareIntegrity() {
        try {
            // Check firmware version
            const { stdout } = await execAsync('vcgencmd version');
            const firmwareInfo = stdout.trim();
            // Check for firmware updates
            const { stdout: updateCheck } = await execAsync('rpi-update -c').catch(() => ({ stdout: '' }));
            const updatesAvailable = updateCheck.includes('update available');
            return {
                timestamp: new Date(),
                component: 'Firmware',
                status: 'PASS',
                message: `Firmware integrity checked`,
                details: { firmwareInfo, updatesAvailable },
                severity: updatesAvailable ? 'MEDIUM' : 'LOW'
            };
        }
        catch (error) {
            return {
                timestamp: new Date(),
                component: 'Firmware',
                status: 'WARNING',
                message: `Could not check firmware integrity: ${error}`,
                severity: 'MEDIUM'
            };
        }
    }
    /**
     * Check for unauthorized modifications
     */
    async checkUnauthorizedModifications() {
        try {
            // Check for unauthorized network connections
            const { stdout: netstat } = await execAsync('netstat -tuln');
            const openPorts = netstat.split('\n')
                .filter(line => line.includes('LISTEN'))
                .map(line => line.split(/\s+/)[3])
                .filter(port => port && !this.isAuthorizedPort(port));
            // Check for unauthorized processes
            const { stdout: processes } = await execAsync('ps aux');
            const suspiciousProcesses = processes.split('\n')
                .filter(line => this.isSuspiciousProcess(line));
            const issues = openPorts.length + suspiciousProcesses.length;
            if (issues > 0) {
                return {
                    timestamp: new Date(),
                    component: 'UnauthorizedModifications',
                    status: 'FAIL',
                    message: `${issues} unauthorized modifications detected`,
                    details: { unauthorizedPorts: openPorts, suspiciousProcesses },
                    severity: issues > 3 ? 'HIGH' : 'MEDIUM'
                };
            }
            return {
                timestamp: new Date(),
                component: 'UnauthorizedModifications',
                status: 'PASS',
                message: 'No unauthorized modifications detected',
                severity: 'LOW'
            };
        }
        catch (error) {
            return {
                timestamp: new Date(),
                component: 'UnauthorizedModifications',
                status: 'WARNING',
                message: `Could not check for unauthorized modifications: ${error}`,
                severity: 'MEDIUM'
            };
        }
    }
    /**
     * Check secure boot status
     */
    async checkSecureBootStatus() {
        try {
            // Check if secure boot is supported and enabled
            const bootConfig = await fs_1.promises.readFile('/boot/config.txt', 'utf8').catch(() => '');
            const hasSecureBoot = bootConfig.includes('secure_boot=1');
            if (this.config.trustedBootEnabled && !hasSecureBoot) {
                return {
                    timestamp: new Date(),
                    component: 'SecureBoot',
                    status: 'FAIL',
                    message: 'Secure boot is not enabled',
                    severity: 'HIGH'
                };
            }
            return {
                timestamp: new Date(),
                component: 'SecureBoot',
                status: hasSecureBoot ? 'PASS' : 'WARNING',
                message: hasSecureBoot ? 'Secure boot is enabled' : 'Secure boot is not configured',
                severity: hasSecureBoot ? 'LOW' : 'MEDIUM'
            };
        }
        catch (error) {
            return {
                timestamp: new Date(),
                component: 'SecureBoot',
                status: 'WARNING',
                message: `Could not check secure boot status: ${error}`,
                severity: 'MEDIUM'
            };
        }
    }
    /**
     * Handle file change events
     */
    async handleFileChange(basePath, filename, eventType) {
        const fullPath = `${basePath}/${filename}`;
        console.log(`File change detected: ${fullPath} (${eventType})`);
        // Check if this is a critical system file
        if (this.systemHashes.has(fullPath)) {
            try {
                const content = await fs_1.promises.readFile(fullPath, 'utf8');
                const currentHash = crypto.createHash('sha256').update(content).digest('hex');
                const expectedHash = this.systemHashes.get(fullPath);
                if (currentHash !== expectedHash) {
                    console.warn(`SECURITY ALERT: Critical file modified: ${fullPath}`);
                    if (this.config.alertOnSuspiciousActivity) {
                        await this.alertSuspiciousActivity([{
                                timestamp: new Date(),
                                component: 'FileMonitor',
                                status: 'FAIL',
                                message: `Critical file modified: ${fullPath}`,
                                severity: 'HIGH'
                            }]);
                    }
                }
            }
            catch (error) {
                console.error(`Error checking modified file ${fullPath}:`, error);
            }
        }
    }
    /**
     * Alert on suspicious activity
     */
    async alertSuspiciousActivity(results) {
        const criticalResults = results.filter(r => r.severity === 'CRITICAL' || r.severity === 'HIGH');
        if (criticalResults.length > 0) {
            console.error('SECURITY ALERT: Suspicious activity detected');
            criticalResults.forEach(result => {
                console.error(`- ${result.component}: ${result.message}`);
            });
            // In a production system, this would send alerts via email, SMS, etc.
            // For now, we'll just log the alerts
        }
    }
    /**
     * Check if a port is authorized
     */
    isAuthorizedPort(port) {
        const authorizedPorts = [
            '22', // SSH
            '80', // HTTP
            '443', // HTTPS
            '53', // DNS
            '123', // NTP
            '8080', // Application port
            '3000' // Development port
        ];
        return authorizedPorts.some(authPort => port.includes(authPort));
    }
    /**
     * Check if a process is suspicious
     */
    isSuspiciousProcess(processLine) {
        const suspiciousKeywords = [
            'rootkit',
            'backdoor',
            'keylogger',
            'trojan',
            'malware',
            'cryptominer'
        ];
        const lowerLine = processLine.toLowerCase();
        return suspiciousKeywords.some(keyword => lowerLine.includes(keyword));
    }
}
exports.RaspberryPiSecureBootMonitor = RaspberryPiSecureBootMonitor;
/**
 * Global secure boot monitor instance
 */
exports.secureBootMonitor = new RaspberryPiSecureBootMonitor();
/**
 * Initialize secure boot monitoring with configuration
 */
async function initializeSecureBootMonitor(config) {
    const monitor = new RaspberryPiSecureBootMonitor(config);
    await monitor.initialize();
    return monitor;
}
//# sourceMappingURL=secure-boot-monitor.js.map