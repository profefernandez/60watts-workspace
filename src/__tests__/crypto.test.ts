import { describe, it, expect } from "vitest";

process.env.ENCRYPTION_SECRET = "test-secret-that-is-at-least-32-characters-long!!";

import { encrypt, decrypt, extractHint, validateEncryptionSecret } from "../lib/crypto";

describe("crypto", () => {
  describe("validateEncryptionSecret", () => {
    it("throws if ENCRYPTION_SECRET is missing", () => {
      const original = process.env.ENCRYPTION_SECRET;
      delete process.env.ENCRYPTION_SECRET;
      expect(() => validateEncryptionSecret()).toThrow("ENCRYPTION_SECRET");
      process.env.ENCRYPTION_SECRET = original;
    });

    it("throws if ENCRYPTION_SECRET is too short", () => {
      const original = process.env.ENCRYPTION_SECRET;
      process.env.ENCRYPTION_SECRET = "short";
      expect(() => validateEncryptionSecret()).toThrow("32");
      process.env.ENCRYPTION_SECRET = original;
    });

    it("passes with a valid secret", () => {
      expect(() => validateEncryptionSecret()).not.toThrow();
    });
  });

  describe("encrypt / decrypt", () => {
    it("encrypts and decrypts a string round-trip", () => {
      const plaintext = "sk-ant-api03-abc123xyz";
      const encrypted = encrypt(plaintext);
      expect(encrypted).not.toContain(plaintext);
      expect(decrypt(encrypted)).toBe(plaintext);
    });

    it("produces different ciphertext for the same plaintext", () => {
      const plaintext = "sk-ant-api03-abc123xyz";
      const a = encrypt(plaintext);
      const b = encrypt(plaintext);
      expect(a).not.toBe(b);
    });

    it("throws on tampered ciphertext", () => {
      const encrypted = encrypt("test-key");
      const tampered = encrypted.slice(0, -4) + "AAAA";
      expect(() => decrypt(tampered)).toThrow();
    });

    it("handles empty string", () => {
      const encrypted = encrypt("");
      expect(decrypt(encrypted)).toBe("");
    });

    it("handles long keys", () => {
      const longKey = "a".repeat(500);
      const encrypted = encrypt(longKey);
      expect(decrypt(encrypted)).toBe(longKey);
    });
  });

  describe("extractHint", () => {
    it("returns masked hint with last 4 chars", () => {
      expect(extractHint("sk-ant-api03-abc123xyz")).toBe("•••••3xyz");
    });

    it("returns full string masked if <= 4 chars", () => {
      expect(extractHint("ab")).toBe("••");
    });

    it("returns empty for empty string", () => {
      expect(extractHint("")).toBe("");
    });
  });
});
