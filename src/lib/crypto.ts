import { randomBytes, pbkdf2Sync, createCipheriv, createDecipheriv } from "crypto";

const ALGORITHM = "aes-256-gcm";
const SALT_LENGTH = 16;
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const PBKDF2_ITERATIONS = 100_000;
const KEY_LENGTH = 32;

export function validateEncryptionSecret(): void {
  const secret = process.env.ENCRYPTION_SECRET;
  if (!secret) {
    throw new Error("ENCRYPTION_SECRET environment variable is required");
  }
  if (secret.length < 32) {
    throw new Error("ENCRYPTION_SECRET must be at least 32 characters");
  }
}

function deriveKey(salt: Buffer): Buffer {
  const secret = process.env.ENCRYPTION_SECRET!;
  return pbkdf2Sync(secret, salt, PBKDF2_ITERATIONS, KEY_LENGTH, "sha512");
}

export function encrypt(plaintext: string): string {
  validateEncryptionSecret();
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  const key = deriveKey(salt);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const packed = Buffer.concat([salt, iv, tag, encrypted]);
  return packed.toString("base64");
}

export function decrypt(encoded: string): string {
  validateEncryptionSecret();
  const packed = Buffer.from(encoded, "base64");
  const salt = packed.subarray(0, SALT_LENGTH);
  const iv = packed.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const tag = packed.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const ciphertext = packed.subarray(SALT_LENGTH + IV_LENGTH + TAG_LENGTH);
  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return decrypted.toString("utf8");
}

export function extractHint(value: string): string {
  if (!value) return "";
  if (value.length <= 4) return "•".repeat(value.length);
  return "•••••" + value.slice(-4);
}
