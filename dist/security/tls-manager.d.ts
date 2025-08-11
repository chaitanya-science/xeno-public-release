import * as https from 'https';
import { TLSConfig, TLSManager } from './interfaces';
export declare class SecureTLSManager implements TLSManager {
    private config;
    constructor(config?: Partial<TLSConfig>);
    /**
     * Configure secure TLS defaults with TLS 1.3 preference
     */
    configureSecureDefaults(): TLSConfig;
    /**
     * Get secure TLS configuration defaults
     */
    private getSecureDefaults;
    /**
     * Validate TLS connection to a given URL
     */
    validateTLSConnection(url: string): Promise<boolean>;
    /**
     * Create secure HTTPS agent with TLS 1.3 configuration
     */
    createSecureAgent(): https.Agent;
    /**
     * Get secure request options for fetch or https requests
     */
    getSecureRequestOptions(url: string): any;
    /**
     * Create secure fetch wrapper with TLS 1.3 enforcement
     */
    createSecureFetch(): (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
    /**
     * Validate if cipher is considered secure
     */
    private isSecureCipher;
    /**
     * Get TLS connection information for debugging
     */
    getTLSInfo(url: string): Promise<any>;
    /**
     * Update configuration
     */
    updateConfig(newConfig: Partial<TLSConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): TLSConfig;
}
/**
 * Global secure TLS manager instance
 */
export declare const secureTLSManager: SecureTLSManager;
/**
 * Create secure fetch function with TLS 1.3 enforcement
 */
export declare function createSecureFetch(config?: Partial<TLSConfig>): typeof fetch;
/**
 * Validate if a URL connection is secure
 */
export declare function validateSecureConnection(url: string): Promise<boolean>;
//# sourceMappingURL=tls-manager.d.ts.map