import { randomBytes, createHash, createHmac, timingSafeEqual } from 'node:crypto';

const API_KEY_PREFIX = 'puc_live';
const SECRET_LENGTH = 32; // 32 bytes = 64 hex chars

/**
 * Generate a new API key with format: puc_live_<prefix8>_<secret>
 * Returns { raw, prefix } where raw is the full key and prefix is the lookup prefix.
 */
export function generateApiKey() {
  const secret = randomBytes(SECRET_LENGTH).toString('hex');
  const prefix = secret.substring(0, 8);
  const raw = `${API_KEY_PREFIX}_${prefix}_${secret.substring(8)}`;
  return { raw, prefix };
}

/**
 * Parse an API key string into its components.
 */
export function parseApiKey(raw) {
  const parts = raw.split('_');
  // Format: puc_live_<prefix8>_<rest>
  if (parts.length !== 4 || parts[0] !== 'puc' || parts[1] !== 'live') {
    return null;
  }
  return {
    prefix: parts[2],
    secret: parts[2] + parts[3], // reconstruct the full secret
  };
}

/**
 * Hash an API key using SHA-256. In production you'd use Argon2id.
 */
export function hashApiKey(raw) {
  const parsed = parseApiKey(raw);
  if (!parsed) return null;
  return createHash('sha256').update(parsed.secret).digest('hex');
}

/**
 * Verify an API key against a stored hash.
 */
export function verifyApiKey(raw, storedHash) {
  const hash = hashApiKey(raw);
  if (!hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Sign a payload using HMAC-SHA256 (for webhook callbacks).
 */
export function signPayload(payload, secret) {
  return createHmac('sha256', secret).update(JSON.stringify(payload)).digest('hex');
}
