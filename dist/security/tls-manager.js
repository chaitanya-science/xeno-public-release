"use strict";
// TLS 1.3 encryption manager for external API communications
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
exports.secureTLSManager = exports.SecureTLSManager = void 0;
exports.createSecureFetch = createSecureFetch;
exports.validateSecureConnection = validateSecureConnection;
const https = __importStar(require("https"));
const tls = __importStar(require("tls"));
class SecureTLSManager {
    constructor(config) {
        this.config = {
            ...this.getSecureDefaults(),
            ...config
        };
    }
    /**
     * Configure secure TLS defaults with TLS 1.3 preference
     */
    configureSecureDefaults() {
        return this.getSecureDefaults();
    }
    /**
     * Get secure TLS configuration defaults
     */
    getSecureDefaults() {
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
    async validateTLSConnection(url) {
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
                    const socket = res.socket;
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
            }
            catch (error) {
                resolve(false);
            }
        });
    }
    /**
     * Create secure HTTPS agent with TLS 1.3 configuration
     */
    createSecureAgent() {
        const ciphers = Array.isArray(this.config.ciphers)
            ? this.config.ciphers.join(':')
            : this.config.ciphers;
        return new https.Agent({
            minVersion: this.config.minVersion,
            maxVersion: this.config.maxVersion,
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
    getSecureRequestOptions(url) {
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
    createSecureFetch() {
        const secureAgent = this.createSecureAgent();
        return async (input, init) => {
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
            const secureInit = {
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
    isSecureCipher(cipherName) {
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
    async getTLSInfo(url) {
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
                    const socket = res.socket;
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
            }
            catch (error) {
                reject(error);
            }
        });
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
}
exports.SecureTLSManager = SecureTLSManager;
/**
 * Global secure TLS manager instance
 */
exports.secureTLSManager = new SecureTLSManager();
/**
 * Create secure fetch function with TLS 1.3 enforcement
 */
function createSecureFetch(config) {
    const tlsManager = new SecureTLSManager(config);
    return tlsManager.createSecureFetch();
}
/**
 * Validate if a URL connection is secure
 */
async function validateSecureConnection(url) {
    return exports.secureTLSManager.validateTLSConnection(url);
}
//# sourceMappingURL=tls-manager.js.map