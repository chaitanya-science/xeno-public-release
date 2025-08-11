// Security audit service comprehensive tests

import { ComprehensiveSecurityAuditService, createSecurityAuditService } from '../security-audit-service';
import { SecureTLSManager } from '../tls-manager';
import { AutoAudioCleanupService } from '../audio-cleanup-service';
import { GranularPrivacySettingsManager } from '../privacy-settings-manager';
import { RaspberryPiSecureBootMonitor } from '../secure-boot-monitor';
import { StorageService } from '../../memory/interfaces';
import { SecurityAuditResult } from '../interfaces';

// Mock all dependencies
const mockTLSManager: jest.Mocked<SecureTLSManager> = {
  configureSecureDefaults: jest.fn(),
  validateTLSConnection: jest.fn(),
  createSecureAgent: jest.fn(),
  getSecureRequestOptions: jest.fn(),
  createSecureFetch: jest.fn(),
  getTLSInfo: jest.fn(),
  updateConfig: jest.fn(),
  getConfig: jest.fn()
} as any;

const mockAudioCleanupService: jest.Mocked<AutoAudioCleanupService> = {
  initialize: jest.fn(),
  startCleanupScheduler: jest.fn(),
  stopCleanupScheduler: jest.fn(),
  cleanupTempFiles: jest.fn(),
  deleteAudioFile: jest.fn(),
  scheduleFileDeletion: jest.fn(),
  getCleanupStats: jest.fn(),
  forceCleanupAll: jest.fn(),
  updateConfig: jest.fn(),
  getConfig: jest.fn()
} as any;

const mockPrivacySettingsManager: jest.Mocked<GranularPrivacySettingsManager> = {
  getPrivacySettings: jest.fn(),
  updatePrivacySettings: jest.fn(),
  validatePrivacySettings: jest.fn(),
  applyPrivacyFilters: jest.fn(),
  exportUserData: jest.fn(),
  deleteUserData: jest.fn(),
  getPrivacyComplianceReport: jest.fn(),
  bulkUpdatePrivacySettings: jest.fn()
} as any;

const mockSecureBootMonitor: jest.Mocked<RaspberryPiSecureBootMonitor> = {
  initialize: jest.fn(),
  checkSystemIntegrity: jest.fn(),
  detectTampering: jest.fn(),
  monitorFileChanges: jest.fn(),
  getSecurityStatus: jest.fn()
} as any;

const mockStorageService: jest.Mocked<StorageService> = {
  initialize: jest.fn(),
  saveUserProfile: jest.fn(),
  getUserProfile: jest.fn(),
  saveConversationSession: jest.fn(),
  getConversationSession: jest.fn(),
  deleteUserData: jest.fn(),
  encryptData: jest.fn(),
  decryptData: jest.fn()
} as any;

describe('ComprehensiveSecurityAuditService', () => {
  let auditService: ComprehensiveSecurityAuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    auditService = new ComprehensiveSecurityAuditService(
      mockTLSManager,
      mockAudioCleanupService,
      mockPrivacySettingsManager,
      mockSecureBootMonitor,
      mockStorageService
    );
  });

  describe('Full Security Audit', () => {
    test('should run comprehensive security audit', async () => {
      // Mock successful audit results
      const mockDataProtectionResults: SecurityAuditResult[] = [
        {
          timestamp: new Date(),
          component: 'Encryption',
          status: 'PASS',
          message: 'Data encryption is working correctly',
          severity: 'LOW'
        }
      ];

      const mockAccessControlResults: SecurityAuditResult[] = [
        {
          timestamp: new Date(),
          component: 'DatabaseAccess',
          status: 'PASS',
          message: 'Database access controls are properly configured',
          severity: 'LOW'
        }
      ];

      const mockNetworkSecurityResults: SecurityAuditResult[] = [
        {
          timestamp: new Date(),
          component: 'TLSConfiguration',
          status: 'PASS',
          message: 'TLS 1.3 is properly configured',
          severity: 'LOW'
        }
      ];

      const mockSystemIntegrityResults: SecurityAuditResult[] = [
        {
          timestamp: new Date(),
          component: 'SystemIntegrity',
          status: 'PASS',
          message: 'System integrity checks passed',
          severity: 'LOW'
        }
      ];

      // Mock audit methods
      jest.spyOn(auditService, 'auditDataProtection').mockResolvedValue(mockDataProtectionResults);
      jest.spyOn(auditService, 'auditAccessControl').mockResolvedValue(mockAccessControlResults);
      jest.spyOn(auditService, 'auditNetworkSecurity').mockResolvedValue(mockNetworkSecurityResults);
      jest.spyOn(auditService, 'auditSystemIntegrity').mockResolvedValue(mockSystemIntegrityResults);

      const results = await auditService.runFullSecurityAudit();

      expect(results).toHaveLength(4);
      expect(results.every(r => r.status === 'PASS')).toBe(true);
      expect(auditService.auditDataProtection).toHaveBeenCalled();
      expect(auditService.auditAccessControl).toHaveBeenCalled();
      expect(auditService.auditNetworkSecurity).toHaveBeenCalled();
      expect(auditService.auditSystemIntegrity).toHaveBeenCalled();
    });

    test('should handle audit failures gracefully', async () => {
      // Mock audit method failure
      jest.spyOn(auditService, 'auditDataProtection').mockRejectedValue(new Error('Audit failed'));
      jest.spyOn(auditService, 'auditAccessControl').mockResolvedValue([]);
      jest.spyOn(auditService, 'auditNetworkSecurity').mockResolvedValue([]);
      jest.spyOn(auditService, 'auditSystemIntegrity').mockResolvedValue([]);

      const results = await auditService.runFullSecurityAudit();

      expect(results.some(r => r.status === 'FAIL' && r.message.includes('Security audit failed'))).toBe(true);
    });
  });

  describe('Data Protection Audit', () => {
    test('should audit encryption status', async () => {
      mockStorageService.encryptData.mockResolvedValue('encrypted-data');
      mockStorageService.decryptData.mockResolvedValue('test encryption data');

      const results = await auditService.auditDataProtection();

      const encryptionResult = results.find(r => r.component === 'Encryption');
      expect(encryptionResult).toBeDefined();
      expect(encryptionResult?.status).toBe('PASS');
      expect(mockStorageService.encryptData).toHaveBeenCalled();
      expect(mockStorageService.decryptData).toHaveBeenCalled();
    });

    test('should detect encryption failures', async () => {
      mockStorageService.encryptData.mockRejectedValue(new Error('Encryption failed'));

      const results = await auditService.auditDataProtection();

      const encryptionResult = results.find(r => r.component === 'Encryption');
      expect(encryptionResult?.status).toBe('FAIL');
      expect(encryptionResult?.severity).toBe('CRITICAL');
    });

    test('should audit audio cleanup status', async () => {
      mockAudioCleanupService.getCleanupStats.mockResolvedValue({
        totalTempFiles: 5,
        totalSizeBytes: 1024,
        oldestFileAge: 2 * 60 * 1000, // 2 minutes
        scheduledDeletions: 2
      });

      mockAudioCleanupService.getConfig.mockReturnValue({
        autoDeleteEnabled: true,
        maxRetentionMs: 5 * 60 * 1000,
        cleanupIntervalMs: 60 * 1000,
        tempDirectories: ['./temp'],
        filePatterns: ['*.wav']
      });

      const results = await auditService.auditDataProtection();

      const audioCleanupResult = results.find(r => r.component === 'AudioCleanup');
      expect(audioCleanupResult?.status).toBe('PASS');
    });

    test('should detect audio cleanup issues', async () => {
      mockAudioCleanupService.getCleanupStats.mockResolvedValue({
        totalTempFiles: 150, // Too many files
        totalSizeBytes: 1024 * 1024,
        oldestFileAge: 10 * 60 * 1000, // 10 minutes (older than retention)
        scheduledDeletions: 0
      });

      mockAudioCleanupService.getConfig.mockReturnValue({
        autoDeleteEnabled: true,
        maxRetentionMs: 5 * 60 * 1000,
        cleanupIntervalMs: 60 * 1000,
        tempDirectories: ['./temp'],
        filePatterns: ['*.wav']
      });

      const results = await auditService.auditDataProtection();

      const audioCleanupResult = results.find(r => r.component === 'AudioCleanup');
      expect(audioCleanupResult?.status).toBe('WARNING');
      expect(audioCleanupResult?.severity).toBe('MEDIUM');
    });
  });

  describe('Network Security Audit', () => {
    test('should audit TLS configuration', async () => {
      mockTLSManager.getConfig.mockReturnValue({
        minVersion: 'TLSv1.3',
        maxVersion: 'TLSv1.3',
        ciphers: ['TLS_AES_256_GCM_SHA384'],
        honorCipherOrder: true,
        rejectUnauthorized: true,
        checkServerIdentity: true
      });

      const results = await auditService.auditNetworkSecurity();

      const tlsResult = results.find(r => r.component === 'TLSConfiguration');
      expect(tlsResult?.status).toBe('PASS');
      expect(tlsResult?.severity).toBe('LOW');
    });

    test('should detect suboptimal TLS configuration', async () => {
      mockTLSManager.getConfig.mockReturnValue({
        minVersion: 'TLSv1.2', // Not TLS 1.3
        maxVersion: 'TLSv1.2',
        ciphers: ['TLS_AES_256_GCM_SHA384'],
        honorCipherOrder: true,
        rejectUnauthorized: true,
        checkServerIdentity: true
      });

      const results = await auditService.auditNetworkSecurity();

      const tlsResult = results.find(r => r.component === 'TLSConfiguration');
      expect(tlsResult?.status).toBe('WARNING');
      expect(tlsResult?.severity).toBe('MEDIUM');
    });

    test('should audit external API connections', async () => {
      mockTLSManager.validateTLSConnection
        .mockResolvedValueOnce(true)  // OpenAI API
        .mockResolvedValueOnce(true); // Google TTS API

      const results = await auditService.auditNetworkSecurity();

      const apiConnectionsResult = results.find(r => r.component === 'ExternalAPIConnections');
      expect(apiConnectionsResult?.status).toBe('PASS');
      expect(mockTLSManager.validateTLSConnection).toHaveBeenCalledTimes(2);
    });

    test('should detect insecure API connections', async () => {
      mockTLSManager.validateTLSConnection
        .mockResolvedValueOnce(true)   // OpenAI API secure
        .mockResolvedValueOnce(false); // Google TTS API insecure

      const results = await auditService.auditNetworkSecurity();

      const apiConnectionsResult = results.find(r => r.component === 'ExternalAPIConnections');
      expect(apiConnectionsResult?.status).toBe('WARNING');
      expect(apiConnectionsResult?.severity).toBe('MEDIUM');
    });
  });

  describe('System Integrity Audit', () => {
    test('should use secure boot monitor for system checks', async () => {
      const mockIntegrityResults: SecurityAuditResult[] = [
        {
          timestamp: new Date(),
          component: 'BootConfiguration',
          status: 'PASS',
          message: 'Boot configuration is secure',
          severity: 'LOW'
        },
        {
          timestamp: new Date(),
          component: 'SystemFiles',
          status: 'PASS',
          message: '0 of 5 system files modified',
          severity: 'LOW'
        }
      ];

      mockSecureBootMonitor.checkSystemIntegrity.mockResolvedValue(mockIntegrityResults);
      mockSecureBootMonitor.detectTampering.mockResolvedValue(false);

      const results = await auditService.auditSystemIntegrity();

      expect(results).toHaveLength(3); // 2 from integrity check + 1 tampering check
      expect(mockSecureBootMonitor.checkSystemIntegrity).toHaveBeenCalled();
      expect(mockSecureBootMonitor.detectTampering).toHaveBeenCalled();
    });

    test('should detect system tampering', async () => {
      mockSecureBootMonitor.checkSystemIntegrity.mockResolvedValue([]);
      mockSecureBootMonitor.detectTampering.mockResolvedValue(true);

      const results = await auditService.auditSystemIntegrity();

      const tamperingResult = results.find(r => r.component === 'TamperDetection');
      expect(tamperingResult?.status).toBe('FAIL');
      expect(tamperingResult?.severity).toBe('CRITICAL');
    });
  });

  describe('Security Report Generation', () => {
    test('should generate comprehensive security report', async () => {
      // Mock audit results
      jest.spyOn(auditService, 'runFullSecurityAudit').mockResolvedValue([
        {
          timestamp: new Date(),
          component: 'Encryption',
          status: 'PASS',
          message: 'Encryption working',
          severity: 'LOW'
        },
        {
          timestamp: new Date(),
          component: 'TLS',
          status: 'FAIL',
          message: 'TLS issue',
          severity: 'HIGH'
        }
      ]);

      const report = await auditService.generateSecurityReport();
      const reportData = JSON.parse(report);

      expect(reportData).toHaveProperty('timestamp');
      expect(reportData).toHaveProperty('summary');
      expect(reportData.summary.totalChecks).toBe(2);
      expect(reportData.summary.passedChecks).toBe(1);
      expect(reportData.summary.failedChecks).toBe(1);
      expect(reportData.summary.highSeverityIssues).toBe(1);
      expect(reportData).toHaveProperty('auditResults');
      expect(reportData).toHaveProperty('recommendations');
      expect(reportData).toHaveProperty('complianceStatus');
    });

    test('should provide appropriate recommendations', async () => {
      jest.spyOn(auditService, 'runFullSecurityAudit').mockResolvedValue([
        {
          timestamp: new Date(),
          component: 'Test',
          status: 'FAIL',
          message: 'Critical failure',
          severity: 'CRITICAL'
        }
      ]);

      const report = await auditService.generateSecurityReport();
      const reportData = JSON.parse(report);

      expect(reportData.recommendations).toContain('URGENT: Resolve 1 critical security issues');
      expect(reportData.recommendations).toContain('Address 1 failed security checks immediately');
    });

    test('should assess compliance status correctly', async () => {
      // Test fully compliant scenario
      jest.spyOn(auditService, 'runFullSecurityAudit').mockResolvedValue([
        {
          timestamp: new Date(),
          component: 'Test1',
          status: 'PASS',
          message: 'Pass',
          severity: 'LOW'
        },
        {
          timestamp: new Date(),
          component: 'Test2',
          status: 'PASS',
          message: 'Pass',
          severity: 'LOW'
        }
      ]);

      const report = await auditService.generateSecurityReport();
      const reportData = JSON.parse(report);

      expect(reportData.complianceStatus).toBe('FULLY_COMPLIANT');
    });

    test('should detect non-compliance with critical failures', async () => {
      jest.spyOn(auditService, 'runFullSecurityAudit').mockResolvedValue([
        {
          timestamp: new Date(),
          component: 'Test',
          status: 'FAIL',
          message: 'Critical failure',
          severity: 'CRITICAL'
        }
      ]);

      const report = await auditService.generateSecurityReport();
      const reportData = JSON.parse(report);

      expect(reportData.complianceStatus).toBe('NON_COMPLIANT');
    });
  });

  describe('Security Metrics', () => {
    test('should calculate security metrics', async () => {
      jest.spyOn(auditService, 'runFullSecurityAudit').mockResolvedValue([
        {
          timestamp: new Date(),
          component: 'Test1',
          status: 'PASS',
          message: 'Pass',
          severity: 'LOW'
        },
        {
          timestamp: new Date(),
          component: 'Test2',
          status: 'FAIL',
          message: 'Fail',
          severity: 'HIGH'
        }
      ]);

      const metrics = await auditService.getSecurityMetrics();

      expect(metrics).toHaveProperty('totalEvents');
      expect(metrics).toHaveProperty('criticalEvents');
      expect(metrics).toHaveProperty('highSeverityEvents');
      expect(metrics).toHaveProperty('lastAuditTime');
      expect(metrics).toHaveProperty('systemIntegrityScore');
      expect(metrics).toHaveProperty('dataProtectionScore');
      expect(metrics).toHaveProperty('networkSecurityScore');
      expect(metrics.systemIntegrityScore).toBe(50); // 1 pass out of 2 total
    });
  });

  describe('Error Handling', () => {
    test('should handle storage service errors in encryption check', async () => {
      mockStorageService.encryptData.mockRejectedValue(new Error('Storage error'));

      const results = await auditService.auditDataProtection();

      const encryptionResult = results.find(r => r.component === 'Encryption');
      expect(encryptionResult?.status).toBe('FAIL');
      expect(encryptionResult?.message).toContain('Encryption check failed');
    });

    test('should handle audio cleanup service errors', async () => {
      mockAudioCleanupService.getCleanupStats.mockRejectedValue(new Error('Cleanup error'));

      const results = await auditService.auditDataProtection();

      const audioResult = results.find(r => r.component === 'AudioCleanup');
      expect(audioResult?.status).toBe('FAIL');
      expect(audioResult?.message).toContain('Audio cleanup check failed');
    });

    test('should handle TLS manager errors', async () => {
      mockTLSManager.getConfig.mockImplementation(() => {
        throw new Error('TLS config error');
      });

      const results = await auditService.auditNetworkSecurity();

      const tlsResult = results.find(r => r.component === 'TLSConfiguration');
      expect(tlsResult?.status).toBe('FAIL');
      expect(tlsResult?.message).toContain('TLS configuration check failed');
    });

    test('should handle secure boot monitor errors', async () => {
      mockSecureBootMonitor.checkSystemIntegrity.mockRejectedValue(new Error('Boot monitor error'));
      mockSecureBootMonitor.detectTampering.mockResolvedValue(false);

      const results = await auditService.auditSystemIntegrity();

      expect(results.some(r => r.status === 'FAIL' && r.message.includes('System integrity audit failed'))).toBe(true);
    });
  });
});

describe('Security Audit Service Factory', () => {
  test('should create security audit service with all dependencies', () => {
    const service = createSecurityAuditService(
      mockTLSManager,
      mockAudioCleanupService,
      mockPrivacySettingsManager,
      mockSecureBootMonitor,
      mockStorageService
    );

    expect(service).toBeInstanceOf(ComprehensiveSecurityAuditService);
  });
});

describe('Security Edge Cases', () => {
  let auditService: ComprehensiveSecurityAuditService;

  beforeEach(() => {
    auditService = new ComprehensiveSecurityAuditService(
      mockTLSManager,
      mockAudioCleanupService,
      mockPrivacySettingsManager,
      mockSecureBootMonitor,
      mockStorageService
    );
  });

  test('should handle concurrent audit requests', async () => {
    jest.spyOn(auditService, 'auditDataProtection').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditAccessControl').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditNetworkSecurity').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditSystemIntegrity').mockResolvedValue([]);

    const promises = [
      auditService.runFullSecurityAudit(),
      auditService.runFullSecurityAudit(),
      auditService.runFullSecurityAudit()
    ];

    const results = await Promise.all(promises);

    expect(results).toHaveLength(3);
    results.forEach(result => {
      expect(Array.isArray(result)).toBe(true);
    });
  });

  test('should handle partial audit failures', async () => {
    jest.spyOn(auditService, 'auditDataProtection').mockResolvedValue([
      {
        timestamp: new Date(),
        component: 'DataProtection',
        status: 'PASS',
        message: 'OK',
        severity: 'LOW'
      }
    ]);
    jest.spyOn(auditService, 'auditAccessControl').mockRejectedValue(new Error('Access control failed'));
    jest.spyOn(auditService, 'auditNetworkSecurity').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditSystemIntegrity').mockResolvedValue([]);

    const results = await auditService.runFullSecurityAudit();

    expect(results.some(r => r.status === 'PASS')).toBe(true);
    expect(results.some(r => r.status === 'FAIL')).toBe(true);
  });

  test('should handle empty audit results', async () => {
    jest.spyOn(auditService, 'auditDataProtection').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditAccessControl').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditNetworkSecurity').mockResolvedValue([]);
    jest.spyOn(auditService, 'auditSystemIntegrity').mockResolvedValue([]);

    const results = await auditService.runFullSecurityAudit();

    expect(results).toHaveLength(0); // Empty results when all audits return empty
  });
});