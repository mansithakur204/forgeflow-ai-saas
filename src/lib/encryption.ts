// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Credentials Encryption Utilities
// Uses node:crypto to run AES-256-CBC encryption for credential security.
// ─────────────────────────────────────────────────────────────────────────────

import crypto from "crypto";

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || "forgeflow-default-secret-key-32-chars-long!";
const IV_LENGTH = 16; // AES block size

// Helper to get a stable 32-byte key buffer
function getKeyBuffer(): Buffer {
  return Buffer.from(ENCRYPTION_KEY.padEnd(32).slice(0, 32));
}

/**
 * Encrypts a plain text string into a hex string containing IV and encrypted data
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv("aes-256-cbc", getKeyBuffer(), iv);
  
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  
  // Return IV joined with encrypted text for self-contained decryption
  return `${iv.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts a hex string (formatted "iv:encrypted_data") back into plain text
 */
export function decrypt(encryptedText: string): string {
  const parts = encryptedText.split(":");
  const ivHex = parts.shift();
  const encryptedHex = parts.join(":");
  
  if (!ivHex || !encryptedHex) {
    throw new Error("Invalid encrypted text format");
  }

  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getKeyBuffer(), iv);
  
  let decrypted = decipher.update(encryptedHex, "hex", "utf8");
  decrypted += decipher.final("utf8");
  
  return decrypted;
}
