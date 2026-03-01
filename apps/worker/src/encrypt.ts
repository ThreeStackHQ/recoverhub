/**
 * AES-256-GCM encryption helpers for sensitive values (e.g. Stripe tokens).
 * Key is derived from ENCRYPTION_KEY env var (must be 32+ chars).
 *
 * Mirrors apps/web/src/lib/encrypt.ts — keep in sync or move to packages/core.
 */
import { createDecipheriv, createHash } from "crypto";

const ALGORITHM = "aes-256-gcm";

function getKey(): Buffer {
  const secret = process.env.ENCRYPTION_KEY;
  if (!secret) {
    throw new Error("ENCRYPTION_KEY env var is not set");
  }
  return createHash("sha256").update(secret).digest();
}

export interface EncryptedValue {
  enc: string;  // base64 ciphertext
  iv: string;   // base64 12-byte IV
  tag: string;  // base64 16-byte auth tag
}

/**
 * Decrypt a value previously encrypted with AES-256-GCM encrypt().
 */
export function decrypt(value: EncryptedValue): string {
  const key = getKey();
  const iv = Buffer.from(value.iv, "base64");
  const tag = Buffer.from(value.tag, "base64");
  const ciphertext = Buffer.from(value.enc, "base64");

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}
