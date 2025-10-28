import fs from 'fs/promises';
import os from 'os';

/**
 * Secure credential storage
 */
export class CredentialStore {
  private encryption: CredentialEncryption;
  private storePath: string;
  private masterPassword: string;
  private cache: Map<string, string> = new Map();

  constructor(
    storePath?: string,
    masterPassword?: string
  ) {
    this.encryption = new CredentialEncryption();
    this.storePath = storePath || path.join(os.homedir(), '.ollama-code', 'credentials.enc');
    this.masterPassword = masterPassword || this.getMasterPassword();
  }

  /**
   * Get master password from environment or keychain
   */
  private getMasterPassword(): string {
    // Try environment variable first
    const envPassword = process.env.OLLAMA_CODE_MASTER_PASSWORD;
    if (envPassword) {
      return envPassword;
    }

    // TODO: Integrate with OS keychain
    // - macOS: Keychain Access
    // - Windows: Credential Manager
    // - Linux: Secret Service API

    throw new Error(
      'Master password not set. Set OLLAMA_CODE_MASTER_PASSWORD environment variable.'
    );
  }

  /**
   * Store credential
   */
  async set(key: string, value: string): Promise<void> {
    // Encrypt credential
    const encrypted = await this.encryption.encrypt(value, this.masterPassword);

    // Load existing store
    const store = await this.load();

    // Add encrypted credential
    store[key] = encrypted;

    // Save store
    await this.save(store);

    // Update cache
    this.cache.set(key, value);
  }

  /**
   * Get credential
   */
  async get(key: string): Promise<string | null> {
    // Check cache
    if (this.cache.has(key)) {
      return this.cache.get(key)!;
    }

    // Load store
    const store = await this.load();

    // Get encrypted credential
    const encrypted = store[key];

    if (!encrypted) {
      return null;
    }

    // Decrypt
    const decrypted = await this.encryption.decrypt(encrypted, this.masterPassword);

    // Cache
    this.cache.set(key, decrypted);

    return decrypted;
  }

  /**
   * Delete credential
   */
  async delete(key: string): Promise<void> {
    // Load store
    const store = await this.load();

    // Remove credential
    delete store[key];

    // Save
    await this.save(store);

    // Clear cache
    this.cache.delete(key);
  }

  /**
   * List credential keys (not values)
   */
  async list(): Promise<string[]> {
    const store = await this.load();
    return Object.keys(store);
  }

  /**
   * Load credential store from disk
   */
  private async load(): Promise<Record<string, EncryptedCredential>> {
    try {
      const data = await fs.readFile(this.storePath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      // Store doesn't exist yet
      return {};
    }
  }

  /**
   * Save credential store to disk
   */
  private async save(store: Record<string, EncryptedCredential>): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.storePath);
    await fs.mkdir(dir, { recursive: true });

    // Write with restrictive permissions
    await fs.writeFile(
      this.storePath,
      JSON.stringify(store, null, 2),
      { mode: 0o600 } // Owner read/write only
    );
  }

  /**
   * Clear cache (for security)
   */
  clearCache(): void {
    this.cache.clear();
  }
}