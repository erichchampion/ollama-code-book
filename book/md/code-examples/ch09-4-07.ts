import crypto from 'crypto';

/**
 * Encrypts and decrypts credentials using AES-256-GCM
 */
export class CredentialEncryption {
  private algorithm = 'aes-256-gcm';
  private keyLength = 32; // 256 bits

  /**
   * Derive encryption key from password using PBKDF2
   */
  private async deriveKey(password: string, salt: Buffer): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      crypto.pbkdf2(
        password,
        salt,
        100000, // iterations
        this.keyLength,
        'sha256',
        (err, key) => {
          if (err) reject(err);
          else resolve(key);
        }
      );
    });
  }

  /**
   * Encrypt credential
   */
  async encrypt(
    credential: string,
    password: string
  ): Promise<EncryptedCredential> {
    // Generate random salt and IV
    const salt = crypto.randomBytes(16);
    const iv = crypto.randomBytes(16);

    // Derive key from password
    const key = await this.deriveKey(password, salt);

    // Create cipher
    const cipher = crypto.createCipheriv(this.algorithm, key, iv);

    // Encrypt
    let encrypted = cipher.update(credential, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get auth tag
    const authTag = cipher.getAuthTag();

    return {
      encrypted,
      salt: salt.toString('hex'),
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      algorithm: this.algorithm
    };
  }

  /**
   * Decrypt credential
   */
  async decrypt(
    encryptedCredential: EncryptedCredential,
    password: string
  ): Promise<string> {
    // Convert from hex
    const salt = Buffer.from(encryptedCredential.salt, 'hex');
    const iv = Buffer.from(encryptedCredential.iv, 'hex');
    const authTag = Buffer.from(encryptedCredential.authTag, 'hex');

    // Derive key
    const key = await this.deriveKey(password, salt);

    // Create decipher
    const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
    decipher.setAuthTag(authTag);

    // Decrypt
    let decrypted = decipher.update(encryptedCredential.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}

export interface EncryptedCredential {
  encrypted: string;
  salt: string;
  iv: string;
  authTag: string;
  algorithm: string;
}