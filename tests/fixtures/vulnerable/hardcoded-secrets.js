/**
 * Hardcoded secrets for security testing
 * WARNING: These are intentionally exposed for testing purposes
 */

// Hardcoded API key
const API_KEY = 'sk_live_1234567890abcdefghijklmnop'; // VULNERABLE

// Hardcoded database credentials
export const DB_CONFIG = {
  host: 'localhost',
  user: 'admin',
  password: 'SuperSecret123!', // VULNERABLE: Hardcoded password
  database: 'production_db'
};

// Hardcoded JWT secret
export const JWT_SECRET = 'my-super-secret-jwt-key-12345'; // VULNERABLE

// Hardcoded AWS credentials
const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE'; // VULNERABLE
const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'; // VULNERABLE

// Hardcoded encryption key
export const ENCRYPTION_KEY = 'aes256-secret-key-that-should-not-be-here'; // VULNERABLE
