"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteStorageService = void 0;
const sqlite3_1 = __importDefault(require("sqlite3"));
const crypto = __importStar(require("crypto-js"));
class SQLiteStorageService {
    constructor(dbPath = './data/wellness_companion.db', encryptionKey) {
        this.dbPath = dbPath;
        this.db = null;
        this.encryptionKey = encryptionKey || this.generateEncryptionKey();
    }
    generateEncryptionKey() {
        return crypto.lib.WordArray.random(256 / 8).toString();
    }
    async initialize() {
        if (this.db)
            return; // idempotent
        return new Promise((resolve, reject) => {
            this.db = new sqlite3_1.default.Database(this.dbPath, (err) => {
                if (err) {
                    reject(new Error(`Failed to initialize database: ${err.message}`));
                    return;
                }
                this.createTables()
                    .then(() => resolve())
                    .catch(reject);
            });
        });
    }
    async createTables() {
        if (!this.db)
            throw new Error('Database not initialized');
        const createTablesSQL = `
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id TEXT PRIMARY KEY,
        encrypted_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversation_sessions (
        session_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        encrypted_data TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
      );

      CREATE TABLE IF NOT EXISTS memories (
        memory_id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        encrypted_content TEXT NOT NULL,
        importance_score REAL NOT NULL,
        memory_type TEXT NOT NULL,
        created_date DATETIME NOT NULL,
        last_referenced DATETIME NOT NULL,
        FOREIGN KEY (user_id) REFERENCES user_profiles (user_id)
      );

      CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories (user_id);
      CREATE INDEX IF NOT EXISTS idx_memories_importance ON memories (importance_score DESC);
      CREATE INDEX IF NOT EXISTS idx_memories_last_referenced ON memories (last_referenced DESC);
      CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON conversation_sessions (user_id);
    `;
        return new Promise((resolve, reject) => {
            this.db.exec(createTablesSQL, (err) => {
                if (err) {
                    reject(new Error(`Failed to create tables: ${err.message}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
    async encryptData(data) {
        try {
            return crypto.AES.encrypt(data, this.encryptionKey).toString();
        }
        catch (error) {
            throw new Error(`Encryption failed: ${error}`);
        }
    }
    async decryptData(encryptedData) {
        try {
            const bytes = crypto.AES.decrypt(encryptedData, this.encryptionKey);
            return bytes.toString(crypto.enc.Utf8);
        }
        catch (error) {
            throw new Error(`Decryption failed: ${error}`);
        }
    }
    async saveUserProfile(profile) {
        if (!this.db)
            throw new Error('Database not initialized');
        const encryptedData = await this.encryptData(JSON.stringify(profile));
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO user_profiles (user_id, encrypted_data, updated_at)
        VALUES (?, ?, CURRENT_TIMESTAMP)
      `);
            stmt.run([profile.user_id, encryptedData], (err) => {
                if (err) {
                    reject(new Error(`Failed to save user profile: ${err.message}`));
                }
                else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }
    async getUserProfile(userId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            this.db.get('SELECT encrypted_data FROM user_profiles WHERE user_id = ?', [userId], async (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get user profile: ${err.message}`));
                    return;
                }
                if (!row) {
                    resolve(null);
                    return;
                }
                try {
                    const decryptedData = await this.decryptData(row.encrypted_data);
                    const profile = JSON.parse(decryptedData);
                    resolve(profile);
                }
                catch (error) {
                    reject(new Error(`Failed to decrypt user profile: ${error}`));
                }
            });
        });
    }
    async saveConversationSession(session) {
        if (!this.db)
            throw new Error('Database not initialized');
        const encryptedData = await this.encryptData(JSON.stringify(session));
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO conversation_sessions (session_id, user_id, encrypted_data, updated_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
      `);
            stmt.run([session.session_id, session.user_id, encryptedData], (err) => {
                if (err) {
                    reject(new Error(`Failed to save conversation session: ${err.message}`));
                }
                else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }
    async getConversationSession(sessionId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            this.db.get('SELECT encrypted_data FROM conversation_sessions WHERE session_id = ?', [sessionId], async (err, row) => {
                if (err) {
                    reject(new Error(`Failed to get conversation session: ${err.message}`));
                    return;
                }
                if (!row) {
                    resolve(null);
                    return;
                }
                try {
                    const decryptedData = await this.decryptData(row.encrypted_data);
                    const session = JSON.parse(decryptedData);
                    resolve(session);
                }
                catch (error) {
                    reject(new Error(`Failed to decrypt conversation session: ${error}`));
                }
            });
        });
    }
    async saveMemory(memory, userId) {
        if (!this.db)
            throw new Error('Database not initialized');
        const encryptedContent = await this.encryptData(memory.content);
        return new Promise((resolve, reject) => {
            const stmt = this.db.prepare(`
        INSERT OR REPLACE INTO memories 
        (memory_id, user_id, encrypted_content, importance_score, memory_type, created_date, last_referenced)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
            stmt.run([
                memory.memory_id,
                userId,
                encryptedContent,
                memory.importance_score,
                memory.memory_type,
                memory.created_date.toISOString(),
                memory.last_referenced.toISOString()
            ], (err) => {
                if (err) {
                    reject(new Error(`Failed to save memory: ${err.message}`));
                }
                else {
                    resolve();
                }
            });
            stmt.finalize();
        });
    }
    async getMemories(userId, limit) {
        if (!this.db)
            throw new Error('Database not initialized');
        const sql = `
      SELECT memory_id, encrypted_content, importance_score, memory_type, created_date, last_referenced
      FROM memories 
      WHERE user_id = ?
      ORDER BY importance_score DESC, last_referenced DESC
      ${limit ? `LIMIT ${limit}` : ''}
    `;
        return new Promise((resolve, reject) => {
            this.db.all(sql, [userId], async (err, rows) => {
                if (err) {
                    reject(new Error(`Failed to get memories: ${err.message}`));
                    return;
                }
                try {
                    const memories = [];
                    for (const row of rows) {
                        const decryptedContent = await this.decryptData(row.encrypted_content);
                        memories.push({
                            memory_id: row.memory_id,
                            content: decryptedContent,
                            importance_score: row.importance_score,
                            memory_type: row.memory_type,
                            created_date: new Date(row.created_date),
                            last_referenced: new Date(row.last_referenced)
                        });
                    }
                    resolve(memories);
                }
                catch (error) {
                    reject(new Error(`Failed to decrypt memories: ${error}`));
                }
            });
        });
    }
    async deleteMemory(memoryId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            this.db.run('DELETE FROM memories WHERE memory_id = ?', [memoryId], (err) => {
                if (err) {
                    reject(new Error(`Failed to delete memory: ${err.message}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
    async deleteUserData(userId) {
        if (!this.db)
            throw new Error('Database not initialized');
        return new Promise((resolve, reject) => {
            this.db.serialize(() => {
                this.db.run('DELETE FROM memories WHERE user_id = ?', [userId]);
                this.db.run('DELETE FROM conversation_sessions WHERE user_id = ?', [userId]);
                this.db.run('DELETE FROM user_profiles WHERE user_id = ?', [userId], (err) => {
                    if (err) {
                        reject(new Error(`Failed to delete user data: ${err.message}`));
                    }
                    else {
                        resolve();
                    }
                });
            });
        });
    }
    async close() {
        if (!this.db)
            return;
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(new Error(`Failed to close database: ${err.message}`));
                }
                else {
                    this.db = null;
                    resolve();
                }
            });
        });
    }
    /**
     * Test-friendly alias expected by some integration tests.
     */
    async dispose() {
        return this.close();
    }
    /**
     * Force close database connection without waiting for operations to complete
     */
    forceClose() {
        if (this.db) {
            try {
                this.db.close();
            }
            catch (error) {
                console.error('Error force closing database:', error);
            }
            finally {
                this.db = null;
            }
        }
    }
}
exports.SQLiteStorageService = SQLiteStorageService;
//# sourceMappingURL=storage-service.js.map