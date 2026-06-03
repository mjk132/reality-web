import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret, 'utf8').digest();
}

export interface EncryptedPayload {
  iv: string;
  tag: string;
  data: string;
}

export function encryptToken(token: string, encryptionKey: string): string {
  try {
    const key = deriveKey(encryptionKey);
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(token, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag();

    const payload: EncryptedPayload = {
      iv: iv.toString('hex'),
      tag: authTag.toString('hex'),
      data: encrypted,
    };

    return JSON.stringify(payload);
  } catch (error) {
    throw new Error('Token encryption failed');
  }
}

export function decryptToken(encryptedPayload: string, encryptionKey: string): string {
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedPayload);
    const key = deriveKey(encryptionKey);
    const iv = Buffer.from(payload.iv, 'hex');
    const authTag = Buffer.from(payload.tag, 'hex');

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(payload.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new Error('Token decryption failed — payload may be tampered');
  }
}

export function generateSignature(data: string, secret: string): string {
  return createHash('sha256').update(data + secret, 'utf8').digest('hex');
}

export function verifySignature(data: string, signature: string, secret: string): boolean {
  const expected = generateSignature(data, secret);
  return expected === signature;
}
