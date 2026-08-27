import crypto from 'node:crypto';
import { getAiProviderApiKeyEncryptionKey } from '@api/constants';
import type { AppContext } from '@api/types/hono';

/**
 * AES-256-GCM encryption for stored AI provider API keys.
 *
 * Extracted from the Supabase connector so every storage backend produces and
 * reads the same ciphertext: a key written by one backend has to stay readable
 * after a migration to the other.
 *
 * `node:crypto` resolves on Workers through `nodejs_compat_v2`.
 */

const ALGORITHM = 'aes-256-gcm';
const AAD = 'api-key';

const derivedKey = (c: AppContext): Buffer =>
  crypto
    .createHash('sha256')
    .update(getAiProviderApiKeyEncryptionKey(c))
    .digest();

/** Returns `iv:authTag:ciphertext`, all hex. */
export const encryptAPIKey = (c: AppContext, plaintext: string): string => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, derivedKey(c), iv);
  cipher.setAAD(Buffer.from(AAD));

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  return `${iv.toString('hex')}:${cipher.getAuthTag().toString('hex')}:${encrypted}`;
};

export const decryptAPIKey = (c: AppContext, encryptedData: string): string => {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    derivedKey(c),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAAD(Buffer.from(AAD));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};
