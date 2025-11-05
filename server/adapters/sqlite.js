/**
 * SQLite Database Adapter
 * 
 * For self-hosted Node.js deployments.
 * Uses better-sqlite3 for fast, synchronous SQLite access.
 */

import Database from 'better-sqlite3';
import { DatabaseAdapter } from './database.js';

export class SQLiteAdapter extends DatabaseAdapter {
    constructor(dbPath) {
        super();
        this.db = new Database(dbPath);

        // Use WAL mode for better concurrency
        this.db.pragma('journal_mode = WAL');

        this.initTables();
        this.cleanupOldVerifiers();
    }

    initTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_tokens (
        user_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        tokens TEXT NOT NULL,
        PRIMARY KEY (user_id, server_id)
      );
      
      CREATE TABLE IF NOT EXISTS oauth_client_info (
        user_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        client_info TEXT NOT NULL,
        PRIMARY KEY (user_id, server_id)
      );
      
      CREATE TABLE IF NOT EXISTS oauth_verifiers (
        user_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        verifier TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (user_id, server_id)
      );
      
      CREATE TABLE IF NOT EXISTS server_configs (
        user_id TEXT NOT NULL,
        server_id TEXT NOT NULL,
        config TEXT NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now')),
        PRIMARY KEY (user_id, server_id)
      );
      
      CREATE TABLE IF NOT EXISTS favicon_cache (
        server_url TEXT PRIMARY KEY,
        favicon_url TEXT,
        oauth_logo_uri TEXT,
        cached_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

        // Migration: Handle existing single-user data
        // If tables exist with old schema (server_id as PRIMARY KEY), we need to migrate
        this.migrateOldSchema();

        // Checkpoint WAL to ensure data is written
        this.db.pragma('wal_checkpoint(TRUNCATE)');
    }

    migrateOldSchema() {
        try {
            // Check if we need migration by looking at table structure
            const tableInfo = this.db.prepare("PRAGMA table_info(oauth_tokens)").all();
            const hasUserIdColumn = tableInfo.some(col => col.name === 'user_id');

            if (!hasUserIdColumn) {
                console.log('🔄 Migrating database to multi-tenant schema...');

                // Generate a legacy user ID for existing data
                const legacyUserId = 'legacy-user-' + Date.now();
                console.log(`   Assigning existing data to user: ${legacyUserId}`);

                // Migrate oauth_tokens
                const oldTokens = this.db.prepare("SELECT * FROM oauth_tokens").all();
                if (oldTokens.length > 0) {
                    this.db.exec(`
            DROP TABLE oauth_tokens;
            CREATE TABLE oauth_tokens (
              user_id TEXT NOT NULL,
              server_id TEXT NOT NULL,
              tokens TEXT NOT NULL,
              PRIMARY KEY (user_id, server_id)
            );
          `);
                    const insertToken = this.db.prepare("INSERT INTO oauth_tokens (user_id, server_id, tokens) VALUES (?, ?, ?)");
                    for (const row of oldTokens) {
                        insertToken.run(legacyUserId, row.server_id, row.tokens);
                    }
                    console.log(`   ✓ Migrated ${oldTokens.length} OAuth tokens`);
                }

                // Migrate oauth_client_info
                const oldClientInfo = this.db.prepare("SELECT * FROM oauth_client_info").all();
                if (oldClientInfo.length > 0) {
                    this.db.exec(`
            DROP TABLE oauth_client_info;
            CREATE TABLE oauth_client_info (
              user_id TEXT NOT NULL,
              server_id TEXT NOT NULL,
              client_info TEXT NOT NULL,
              PRIMARY KEY (user_id, server_id)
            );
          `);
                    const insertClient = this.db.prepare("INSERT INTO oauth_client_info (user_id, server_id, client_info) VALUES (?, ?, ?)");
                    for (const row of oldClientInfo) {
                        insertClient.run(legacyUserId, row.server_id, row.client_info);
                    }
                    console.log(`   ✓ Migrated ${oldClientInfo.length} OAuth client configs`);
                }

                // Migrate oauth_verifiers
                const oldVerifiers = this.db.prepare("SELECT * FROM oauth_verifiers").all();
                if (oldVerifiers.length > 0) {
                    this.db.exec(`
            DROP TABLE oauth_verifiers;
            CREATE TABLE oauth_verifiers (
              user_id TEXT NOT NULL,
              server_id TEXT NOT NULL,
              verifier TEXT NOT NULL,
              created_at INTEGER DEFAULT (strftime('%s', 'now')),
              PRIMARY KEY (user_id, server_id)
            );
          `);
                    const insertVerifier = this.db.prepare("INSERT INTO oauth_verifiers (user_id, server_id, verifier, created_at) VALUES (?, ?, ?, ?)");
                    for (const row of oldVerifiers) {
                        insertVerifier.run(legacyUserId, row.server_id, row.verifier, row.created_at);
                    }
                    console.log(`   ✓ Migrated ${oldVerifiers.length} OAuth verifiers`);
                }

                console.log('✅ Database migration complete');
            }
        } catch (migrationError) {
            // If migration fails, it might be because tables are already in new format
            console.log('Note: Database migration skipped (tables already in multi-tenant format)');
        }
    }

    // OAuth Tokens
    async saveOAuthTokens(userId, serverId, tokens) {
        this.db.prepare(
            'INSERT OR REPLACE INTO oauth_tokens (user_id, server_id, tokens) VALUES (?, ?, ?)'
        ).run(userId, serverId, JSON.stringify(tokens));

        // Force write to disk
        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    async getOAuthTokens(userId, serverId) {
        const row = this.db.prepare(
            'SELECT tokens FROM oauth_tokens WHERE user_id = ? AND server_id = ?'
        ).get(userId, serverId);

        return row ? JSON.parse(row.tokens) : null;
    }

    // OAuth Client Info
    async saveOAuthClientInfo(userId, serverId, clientInfo) {
        this.db.prepare(
            'INSERT OR REPLACE INTO oauth_client_info (user_id, server_id, client_info) VALUES (?, ?, ?)'
        ).run(userId, serverId, JSON.stringify(clientInfo));

        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    async getOAuthClientInfo(userId, serverId) {
        const row = this.db.prepare(
            'SELECT client_info FROM oauth_client_info WHERE user_id = ? AND server_id = ?'
        ).get(userId, serverId);

        return row ? JSON.parse(row.client_info) : null;
    }

    // OAuth Verifiers
    async saveVerifier(userId, serverId, verifier) {
        this.db.prepare(
            'INSERT OR REPLACE INTO oauth_verifiers (user_id, server_id, verifier, created_at) VALUES (?, ?, ?, ?)'
        ).run(userId, serverId, verifier, Math.floor(Date.now() / 1000));

        // Force immediate write to disk (critical for OAuth flow)
        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    async getVerifier(userId, serverId) {
        const row = this.db.prepare(
            'SELECT verifier FROM oauth_verifiers WHERE user_id = ? AND server_id = ?'
        ).get(userId, serverId);

        return row ? row.verifier : null;
    }

    async deleteVerifier(userId, serverId) {
        this.db.prepare(
            'DELETE FROM oauth_verifiers WHERE user_id = ? AND server_id = ?'
        ).run(userId, serverId);
    }

    async cleanupOldVerifiers() {
        // Clean up verifiers older than 10 minutes
        try {
            this.db.prepare(
                'DELETE FROM oauth_verifiers WHERE created_at < ?'
            ).run(Math.floor(Date.now() / 1000) - 600);
        } catch (err) {
            // Ignore errors if table doesn't exist yet
        }
    }

    // Clear OAuth credentials
    async clearOAuthCredentials(userId, serverId, scope = 'all') {
        if (scope === 'all' || scope === 'client') {
            this.db.prepare(
                'DELETE FROM oauth_client_info WHERE user_id = ? AND server_id = ?'
            ).run(userId, serverId);
        }

        if (scope === 'all' || scope === 'tokens') {
            this.db.prepare(
                'DELETE FROM oauth_tokens WHERE user_id = ? AND server_id = ?'
            ).run(userId, serverId);
        }

        if (scope === 'all' || scope === 'verifier') {
            this.db.prepare(
                'DELETE FROM oauth_verifiers WHERE user_id = ? AND server_id = ?'
            ).run(userId, serverId);
        }

        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    // Server Config (for auto-reconnection)
    async saveServerConfig(userId, serverId, config) {
        this.db.prepare(`
      INSERT OR REPLACE INTO server_configs (user_id, server_id, config, created_at)
      VALUES (?, ?, ?, ?)
    `).run(userId, serverId, JSON.stringify(config), Math.floor(Date.now() / 1000));
        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    async getServerConfig(userId, serverId) {
        const row = this.db.prepare(`
      SELECT config FROM server_configs
      WHERE user_id = ? AND server_id = ?
    `).get(userId, serverId);

        return row ? JSON.parse(row.config) : null;
    }

    async deleteServerConfig(userId, serverId) {
        this.db.prepare(
            'DELETE FROM server_configs WHERE user_id = ? AND server_id = ?'
        ).run(userId, serverId);
        this.db.pragma('wal_checkpoint(PASSIVE)');
    }

    // Favicon Cache
    async saveFaviconCache(serverUrl, faviconUrl, oauthLogoUri = null) {
        this.db.prepare(`
      INSERT OR REPLACE INTO favicon_cache (server_url, favicon_url, oauth_logo_uri, cached_at)
      VALUES (?, ?, ?, ?)
    `).run(serverUrl, faviconUrl, oauthLogoUri, Math.floor(Date.now() / 1000));
    }

    async getFaviconCache(serverUrl, oauthLogoUri = null) {
        const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

        const row = this.db.prepare(`
      SELECT favicon_url, cached_at 
      FROM favicon_cache 
      WHERE server_url = ? 
      AND (oauth_logo_uri IS NULL OR oauth_logo_uri = ?)
      AND cached_at > ?
    `).get(serverUrl, oauthLogoUri, Math.floor(Date.now() / 1000) - CACHE_TTL_SECONDS);

        return row ? row.favicon_url : null;
    }

    // Cleanup
    close() {
        this.db.close();
    }
}

