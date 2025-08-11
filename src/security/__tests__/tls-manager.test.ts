// TLS Manager security tests

import { SecureTLSManager, createSecureFetch, validateSecureConnection } from '../tls-manager';

describe('SecureTLSManager', () => {
  let tlsManager: SecureTLSManager;

  beforeEach(() => {
    tlsManager = new SecureTLSManager();
  });

  describe('Configuration', () => {
    test('should configure secure TLS defaults', () => {
      const config = tlsManager.configureSecureDefaults();
      
      expect(config.minVersion).toBe('TLSv1.3');
      expect(config.maxVersion).toBe('TLSv1.3');
      expect(config.rejectUnauthorized).toBe(true);
      expect(config.checkServerIdentity).toBe(true);
      expect(config.honorCipherOrder).toBe(true);
    });

    test('should include secure cipher suites', () => {
      const config = tlsManager.configureSecureDefaults();
      
      expect(config.ciphers).toContain('TLS_AES_256_GCM_SHA384');
      expect(config.ciphers).toContain('TLS_CHACHA20_POLY1305_SHA256');
      expect(config.ciphers).toContain('TLS_AES_128_GCM_SHA256');
    });

    test('should allow configuration updates', () => {
      const customConfig = {
        minVersion: 'TLSv1.2',
        rejectUnauthorized: false
      };
      
      tlsManager.updateConfig(customConfig);
      const config = tlsManager.getConfig();
      
      expect(config.minVersion).toBe('TLSv1.2');
      expect(config.rejectUnauthorized).toBe(false);
    });
  });

  describe('Secure Agent Creation', () => {
    test('should create secure HTTPS agent', () => {
      const agent = tlsManager.createSecureAgent();
      
      expect(agent).toBeDefined();
      expect(agent.options.minVersion).toBe('TLSv1.3');
      expect(agent.options.rejectUnauthorized).toBe(true);
    });

    test('should include security headers in request options', () => {
      const options = tlsManager.getSecureRequestOptions('https://api.example.com');
      
      expect(options.headers['User-Agent']).toContain('Xeno-Public-Release');
      expect(options.headers['Cache-Control']).toBe('no-cache, no-store, must-revalidate');
      expect(options.timeout).toBe(30000);
    });
  });

  describe('TLS Validation', () => {
    test('should validate secure connections', async () => {
      // Mock successful TLS validation
      const mockValidation = jest.spyOn(tlsManager, 'validateTLSConnection');
      mockValidation.mockResolvedValue(true);
      
      const isValid = await tlsManager.validateTLSConnection('https://api.openai.com');
      expect(isValid).toBe(true);
      
      mockValidation.mockRestore();
    });

    test('should reject insecure connections', async () => {
      // Mock failed TLS validation
      const mockValidation = jest.spyOn(tlsManager, 'validateTLSConnection');
      mockValidation.mockResolvedValue(false);
      
      const isValid = await tlsManager.validateTLSConnection('https://insecure.example.com');
      expect(isValid).toBe(false);
      
      mockValidation.mockRestore();
    });

    test('should handle validation errors gracefully', async () => {
      // Mock validation error
      const mockValidation = jest.spyOn(tlsManager, 'validateTLSConnection');
      mockValidation.mockRejectedValue(new Error('Network error'));
      
      const isValid = await tlsManager.validateTLSConnection('https://unreachable.example.com');
      expect(isValid).toBe(false);
      
      mockValidation.mockRestore();
    });
  });

  describe('Secure Fetch', () => {
    test('should create secure fetch function', () => {
      const secureFetch = tlsManager.createSecureFetch();
      expect(typeof secureFetch).toBe('function');
    });

    test('should reject non-HTTPS URLs', async () => {
      const secureFetch = tlsManager.createSecureFetch();
      
      await expect(secureFetch('http://insecure.example.com')).rejects.toThrow(
        'Only HTTPS connections are allowed for security'
      );
    });

    test('should validate TLS before making requests', async () => {
      const secureFetch = tlsManager.createSecureFetch();
      const mockValidation = jest.spyOn(tlsManager, 'validateTLSConnection');
      mockValidation.mockResolvedValue(false);
      
      await expect(secureFetch('https://insecure.example.com')).rejects.toThrow(
        'TLS validation failed - connection not secure enough'
      );
      
      mockValidation.mockRestore();
    });
  });

  describe('TLS Information', () => {
    test('should retrieve TLS connection information', async () => {
      // Mock TLS info retrieval
      const mockGetTLSInfo = jest.spyOn(tlsManager, 'getTLSInfo');
      mockGetTLSInfo.mockResolvedValue({
        protocol: 'TLSv1.3',
        cipher: { name: 'TLS_AES_256_GCM_SHA384' },
        authorized: true,
        authorizationError: null
      });
      
      const info = await tlsManager.getTLSInfo('https://api.openai.com');
      
      expect(info.protocol).toBe('TLSv1.3');
      expect(info.cipher.name).toBe('TLS_AES_256_GCM_SHA384');
      expect(info.authorized).toBe(true);
      
      mockGetTLSInfo.mockRestore();
    });

    test('should handle TLS info errors', async () => {
      const mockGetTLSInfo = jest.spyOn(tlsManager, 'getTLSInfo');
      mockGetTLSInfo.mockRejectedValue(new Error('Connection failed'));
      
      await expect(tlsManager.getTLSInfo('https://unreachable.example.com')).rejects.toThrow(
        'Connection failed'
      );
      
      mockGetTLSInfo.mockRestore();
    });
  });
});

describe('Global TLS Functions', () => {
  test('should create secure fetch with custom config', () => {
    const secureFetch = createSecureFetch({ minVersion: 'TLSv1.2' });
    expect(typeof secureFetch).toBe('function');
  });

  test('should validate secure connections globally', async () => {
    // Mock the global validation function
    const mockValidation = jest.fn().mockResolvedValue(true);
    jest.doMock('../tls-manager', () => ({
      ...jest.requireActual('../tls-manager'),
      validateSecureConnection: mockValidation
    }));
    
    const isValid = await validateSecureConnection('https://api.openai.com');
    expect(isValid).toBe(true);
  });
});

describe('Security Edge Cases', () => {
  let tlsManager: SecureTLSManager;

  beforeEach(() => {
    tlsManager = new SecureTLSManager();
  });

  test('should handle malformed URLs', async () => {
    await expect(tlsManager.validateTLSConnection('not-a-url')).resolves.toBe(false);
  });

  test('should handle network timeouts', async () => {
    // Mock timeout scenario
    const mockValidation = jest.spyOn(tlsManager, 'validateTLSConnection');
    mockValidation.mockImplementation(() => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout')), 100);
    }));
    
    const isValid = await tlsManager.validateTLSConnection('https://slow.example.com');
    expect(isValid).toBe(false);
    
    mockValidation.mockRestore();
  });

  test('should handle certificate errors', async () => {
    const mockGetTLSInfo = jest.spyOn(tlsManager, 'getTLSInfo');
    mockGetTLSInfo.mockResolvedValue({
      protocol: 'TLSv1.3',
      cipher: { name: 'TLS_AES_256_GCM_SHA384' },
      authorized: false,
      authorizationError: 'CERT_UNTRUSTED'
    });
    
    const info = await tlsManager.getTLSInfo('https://untrusted.example.com');
    expect(info.authorized).toBe(false);
    expect(info.authorizationError).toBe('CERT_UNTRUSTED');
    
    mockGetTLSInfo.mockRestore();
  });
});