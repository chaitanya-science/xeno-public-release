// TLS 1.3 encryption manager for external API communications

import * as https from 'https';
import * as tls from 'tls';
import { TLSConfig, TLSManager } from './interfaces';

export class SecureTLSManager implements TLSManager {
  private config: TLSConfig;

  constructor(config?: Partial<TLSConfig>) {
    this.config = {
      ...this.getSecureDefaults(),
      ...config
    };
  }

  /**
   * Configure secure TLS defaults with TLS 1.3 preference
   */
  configureSecureDefaults(): TLSConfig {
    return this.getSecureDefaults();
  }

  /**
   * Get secure TLS configuration defaults
   */
  private getSecureDefaults(): TLSConfig {
    return {
      minVersion: 'TLSv1.3',
      maxVersion: 'TLSv1.3',
      ciphers: [
        // TLS 1.3 cipher suites (preferred)
        'TLS_AES_256_GCM_SHA384',
        'TLS_CHACHA20_POLY1305_SHA256',
        'TLS_AES_128_GCM_SHA256',
        // TLS 1.2 fallback ciphers (if TLS 1.3 not available)
        'ECDHE-RSA-AES256-GCM-SHA384',
        'ECDHE-RSA-AES128-GCM-SHA256',
        'ECDHE-RSA-AES256-SHA384',
        'ECDHE-RSA-AES128-SHA256'
      ].join(':'),
      honorCipherOrder: true,
      rejectUnauthorized: true,
      checkServerIdentity: true
    };
  }

  /**
   * Validate TLS connection to a given URL
   */
  async validateTLSConnection(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          method: 'HEAD',
          timeout: 10000,
          ...this.getSecureRequestOptions(url)
        };

        const req = https.request(options, (res) => {
          const socket = res.socket as tls.TLSSocket;
          const protocol = socket.getProtocol();
          const cipher = socket.getCipher();
          
          // Validate TLS version and cipher
          const isSecure = protocol === 'TLSv1.3' || protocol === 'TLSv1.2';
          const hasSecureCipher = cipher && this.isSecureCipher(cipher.name);
          
          resolve(isSecure && hasSecureCipher);
        });

        req.on('error', () => resolve(false));
        req.on('timeout', () => {
          req.destroy();
          resolve(false);
        });

        req.end();
      } catch (error) {
        resolve(false);
      }
    });
  }

  /**
   * Create secure HTTPS agent with TLS 1.3 configuration
   */
  createSecureAgent(): https.Agent {
    const ciphers = Array.isArray(this.config.ciphers) 
      ? this.config.ciphers.join(':')
      : this.config.ciphers;
      
    return new https.Agent({
      minVersion: this.config.minVersion as any,
      maxVersion: this.config.maxVersion as any,
      ciphers,
      honorCipherOrder: this.config.honorCipherOrder,
      rejectUnauthorized: this.config.rejectUnauthorized,
      checkServerIdentity: this.config.checkServerIdentity ? tls.checkServerIdentity : undefined,
      keepAlive: false, // Disable keep-alive for better security
      timeout: 30000,
      // Additional security options
      secureProtocol: 'TLSv1_3_method'
    });
  }

  /**
   * Get secure request options for fetch or https requests
   */
  getSecureRequestOptions(url: string): any {
    const agent = this.createSecureAgent();
    
    return {
      agent,
      // Additional security headers
      headers: {
        'User-Agent': 'Xeno-Public-Release/1.0 (Secure)',
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'X-Requested-With': 'Xeno-Public-Release'
      },
      // Timeout settings
      timeout: 30000,
      // TLS options
      rejectUnauthorized: this.config.rejectUnauthorized,
      checkServerIdentity: this.config.checkServerIdentity
    };
  }

  /**
   * Create secure fetch wrapper with TLS 1.3 enforcement
   */
  createSecureFetch(): (input: string | URL | Request, init?: RequestInit) => Promise<Response> {
    const secureAgent = this.createSecureAgent();
    
    return async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const url = typeof input === 'string' ? input : 
                  input instanceof URL ? input.toString() : 
                  input instanceof Request ? input.url : 
                  String(input);
      
      // Validate HTTPS
      if (!url.startsWith('https://')) {
        throw new Error('Only HTTPS connections are allowed for security');
      }

      // Optionally validate TLS connection first (can cause issues with some CDNs/edge networks)
      if ((process.env.STRICT_TLS_PRECHECK || '').toLowerCase() === 'true') {
        const isTLSValid = await this.validateTLSConnection(url);
        if (!isTLSValid) {
          throw new Error('TLS validation failed - connection not secure enough');
        }
      }

      const secureInit: RequestInit = {
        ...init,
        // @ts-ignore - Node.js specific agent option
        agent: secureAgent,
        headers: {
          ...this.getSecureRequestOptions(url).headers,
          ...init?.headers
        }
      };

  return fetch(input, secureInit);
    };
  }

  /**
   * Validate if cipher is considered secure
   */
  private isSecureCipher(cipherName: string): boolean {
    const secureCiphers = [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
      'ECDHE-RSA-AES256-GCM-SHA384',
      'ECDHE-RSA-AES128-GCM-SHA256',
      'ECDHE-RSA-AES256-SHA384',
      'ECDHE-RSA-AES128-SHA256'
    ];

    return secureCiphers.some(secure => cipherName.includes(secure));
  }

  /**
   * Get TLS connection information for debugging
   */
  async getTLSInfo(url: string): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(url);
        const options = {
          hostname: urlObj.hostname,
          port: urlObj.port || 443,
          method: 'HEAD',
          timeout: 10000,
          ...this.getSecureRequestOptions(url)
        };

        const req = https.request(options, (res) => {
          const socket = res.socket as tls.TLSSocket;
          const info = {
            protocol: socket.getProtocol(),
            cipher: socket.getCipher(),
            peerCertificate: socket.getPeerCertificate(),
            authorized: socket.authorized,
            authorizationError: socket.authorizationError
          };
          resolve(info);
        });

        req.on('error', reject);
        req.on('timeout', () => {
          req.destroy();
          reject(new Error('TLS info request timeout'));
        });

        req.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<TLSConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): TLSConfig {
    return { ...this.config };
  }
}

/**
 * Global secure TLS manager instance
 */
export const secureTLSManager = new SecureTLSManager();

/**
 * Create secure fetch function with TLS 1.3 enforcement
 */
export function createSecureFetch(config?: Partial<TLSConfig>): typeof fetch {
  const tlsManager = new SecureTLSManager(config);
  return tlsManager.createSecureFetch();
}

/**
 * Validate if a URL connection is secure
 */
export async function validateSecureConnection(url: string): Promise<boolean> {
  return secureTLSManager.validateTLSConnection(url);
}