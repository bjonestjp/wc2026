import "server-only";

import { scrypt, randomBytes, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt);

// Format: id:salt:hash
// Example: s:salt_hex:hash_hex
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buffer = (await scryptAsync(password, salt, 64)) as Buffer;
  return `s:${salt}:${buffer.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  storedHash: string,
): Promise<boolean> {
  if (!storedHash.startsWith("s:")) {
    // Unsupported format (e.g., if we introduced bcrypt later)
    return false;
  }

  const [, salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;

  const derivedBuffer = (await scryptAsync(password, salt, 64)) as Buffer;
  const hashBuffer = Buffer.from(hash, "hex");

  if (derivedBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(derivedBuffer, hashBuffer);
}
