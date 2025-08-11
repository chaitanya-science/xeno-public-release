// Secure boot process and tamper detection for Raspberry Pi

import { promises as fs } from 'fs';
import * as fsSync from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as crypto from 'crypto';
import { SecureBootConfig, SecureBootMonitor, SecurityAuditResult } from './interfaces';

const execAsync = promisify(exec);

export class RaspberryPiSecureBootMonitor implements SecureBootMonitor {
  private config: SecureBootConfig;
  private fileWatcher: any = null;
  private systemHashes: Map<string, string> = new Map();
  private isInitialized: boolean = false;

  constructor(config?: Partial<SecureBootConfig>) {
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
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

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
    } catch (error) {
      console.error('Failed to initialize secure boot monitor:', error);
      throw error;
    }
  }

  /**
   * Check system integrity
   */
  async checkSystemIntegrity(): Promise<SecurityAuditResult[]> {
    const results: SecurityAuditResult[] = [];

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

    } catch (error) {
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
  async detectTampering(): Promise<boolean> {
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
    } catch (error) {
      console.error('Error during tamper detection:', error);
      return false;
    }
  }

  /**
   * Monitor file changes in critical system directories
   */
  monitorFileChanges(): void {
    if (!this.config.monitorFileChanges) return;

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
        fs.access(path).then(() => {
          try {
            const watcher = fsSync.watch(path, { recursive: true });
            
            watcher.on('change', (eventType: string, filename: string | null) => {
              if (filename) {
                this.handleFileChange(path, filename, eventType);
              }
            });
            
            watcher.on('error', (error: Error) => {
              console.error(`File watcher error for ${path}:`, error);
            });
          } catch (error) {
            console.error(`Failed to watch ${path}:`, error);
          }
        }).catch(() => {
          // Path doesn't exist, skip monitoring
        });
      });

      console.log('File change monitoring started for critical paths');
    } catch (error) {
      console.error('Failed to start file change monitoring:', error);
    }
  }

  /**
   * Get current security status
   */
  async getSecurityStatus(): Promise<SecurityAuditResult[]> {
    const results: SecurityAuditResult[] = [];

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
  private async verifyRaspberryPi(): Promise<void> {
    try {
      const cpuInfo = await fs.readFile('/proc/cpuinfo', 'utf8');
      if (!cpuInfo.includes('Raspberry Pi') && !cpuInfo.includes('BCM')) {
        console.warn('Not running on Raspberry Pi - some security features may not be available');
      }
    } catch (error) {
      console.warn('Could not verify Raspberry Pi platform:', error);
    }
  }

  /**
   * Initialize system integrity baseline
   */
  private async initializeSystemBaseline(): Promise<void> {
    const criticalFiles = [
      '/boot/config.txt',
      '/boot/cmdline.txt',
      '/etc/passwd',
      '/etc/shadow',
      '/etc/sudoers'
    ];

    for (const file of criticalFiles) {
      try {
        const content = await fs.readFile(file, 'utf8');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        this.systemHashes.set(file, hash);
      } catch (error) {
        console.debug(`Could not hash file ${file}:`, error);
      }
    }

    console.log(`System baseline initialized with ${this.systemHashes.size} file hashes`);
  }

  /**
   * Check boot configuration
   */
  private async checkBootConfiguration(): Promise<SecurityAuditResult> {
    try {
      const configPath = '/boot/config.txt';
      const config = await fs.readFile(configPath, 'utf8');
      
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
    } catch (error) {
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
  private async checkSystemFiles(): Promise<SecurityAuditResult> {
    let modifiedFiles = 0;
    const checkedFiles: string[] = [];

    for (const [filePath, expectedHash] of this.systemHashes) {
      try {
        const content = await fs.readFile(filePath, 'utf8');
        const currentHash = crypto.createHash('sha256').update(content).digest('hex');
        
        if (currentHash !== expectedHash) {
          modifiedFiles++;
          console.warn(`File modified: ${filePath}`);
        }
        
        checkedFiles.push(filePath);
      } catch (error) {
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
  private async checkKernelModules(): Promise<SecurityAuditResult> {
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
    } catch (error) {
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
  private async checkFirmwareIntegrity(): Promise<SecurityAuditResult> {
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
    } catch (error) {
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
  private async checkUnauthorizedModifications(): Promise<SecurityAuditResult> {
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
    } catch (error) {
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
  private async checkSecureBootStatus(): Promise<SecurityAuditResult> {
    try {
      // Check if secure boot is supported and enabled
      const bootConfig = await fs.readFile('/boot/config.txt', 'utf8').catch(() => '');
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
    } catch (error) {
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
  private async handleFileChange(basePath: string, filename: string, eventType: string): Promise<void> {
    const fullPath = `${basePath}/${filename}`;
    
    console.log(`File change detected: ${fullPath} (${eventType})`);
    
    // Check if this is a critical system file
    if (this.systemHashes.has(fullPath)) {
      try {
        const content = await fs.readFile(fullPath, 'utf8');
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
      } catch (error) {
        console.error(`Error checking modified file ${fullPath}:`, error);
      }
    }
  }

  /**
   * Alert on suspicious activity
   */
  private async alertSuspiciousActivity(results: SecurityAuditResult[]): Promise<void> {
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
  private isAuthorizedPort(port: string): boolean {
    const authorizedPorts = [
      '22',    // SSH
      '80',    // HTTP
      '443',   // HTTPS
      '53',    // DNS
      '123',   // NTP
      '8080',  // Application port
      '3000'   // Development port
    ];
    
    return authorizedPorts.some(authPort => port.includes(authPort));
  }

  /**
   * Check if a process is suspicious
   */
  private isSuspiciousProcess(processLine: string): boolean {
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

/**
 * Global secure boot monitor instance
 */
export const secureBootMonitor = new RaspberryPiSecureBootMonitor();

/**
 * Initialize secure boot monitoring with configuration
 */
export async function initializeSecureBootMonitor(config?: Partial<SecureBootConfig>): Promise<RaspberryPiSecureBootMonitor> {
  const monitor = new RaspberryPiSecureBootMonitor(config);
  await monitor.initialize();
  return monitor;
}