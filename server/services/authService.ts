import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const keyLength = 64;

export function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(password, salt, keyLength).toString("hex");

  return `scrypt$${salt}$${key}`;
}

export function verifyPassword(password: string, storedHash?: string | null) {
  if (!storedHash) return false;

  const [method, salt, key] = storedHash.split("$");
  if (method !== "scrypt" || !salt || !key) return false;

  const actual = Buffer.from(scryptSync(password, salt, keyLength).toString("hex"), "hex");
  const expected = Buffer.from(key, "hex");

  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
