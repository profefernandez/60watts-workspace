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

// ── Key Retrieval ──

const DIRECTUS_URL = process.env.NEXT_PUBLIC_DIRECTUS_URL || "http://localhost:8055";

export async function getDecryptedKey(
  provider: string
): Promise<{ key: string; extra?: string } | null> {
  try {
    const loginRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: process.env.DIRECTUS_ADMIN_EMAIL || "jason@60watts.com",
        password: process.env.DIRECTUS_ADMIN_PASSWORD || "changeme",
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.data.access_token;
    const userId = process.env.DEFAULT_USER_ID || "00000000-0000-0000-0000-000000000001";

    const res = await fetch(
      `${DIRECTUS_URL}/items/user_api_keys?filter[user_id][_eq]=${userId}&filter[provider][_eq]=${provider}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json();
    if (!data.data || data.data.length === 0) return null;

    const record = data.data[0];
    const key = decrypt(record.encrypted_key);
    const extra = record.extra_encrypted ? decrypt(record.extra_encrypted) : undefined;
    return { key, extra };
  } catch (err) {
    console.error("[getDecryptedKey] Error:", err);
    return null;
  }
}
