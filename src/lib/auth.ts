import { createHmac, randomBytes, scrypt as rawScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

export const SESSION_COOKIE = "fluxhub_session";
export const SESSION_MAX_AGE = 12 * 60 * 60;
const scrypt = promisify(rawScrypt);

function signingSecret(): string | null {
  const secret = process.env.AUTH_SESSION_SECRET;
  return secret && secret.length >= 32 ? secret : null;
}

function sign(message: string, secret: string) {
  return createHmac("sha256", secret).update(message).digest("base64url");
}

export function createSession(): string {
  const secret = signingSecret();
  if (!secret) throw new Error("Autenticação não configurada.");
  const expires = Date.now() + SESSION_MAX_AGE * 1000;
  const payload = `v1.${expires}.${randomBytes(16).toString("base64url")}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function isValidSession(token: string | undefined): boolean {
  const secret = signingSecret();
  if (!secret || !token || token.length > 512) return false;
  const parts = token.split(".");
  if (parts.length !== 4 || parts[0] !== "v1" || !/^\d{13}$/.test(parts[1]) || !/^[\w-]{20,40}$/.test(parts[2]) || !/^[\w-]{43}$/.test(parts[3])) return false;
  const expires = Number(parts[1]);
  const now = Date.now();
  if (!Number.isSafeInteger(expires) || expires <= now || expires > now + SESSION_MAX_AGE * 1000) return false;
  const expected = Buffer.from(sign(parts.slice(0, 3).join("."), secret), "base64url");
  const provided = Buffer.from(parts[3], "base64url");
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

export async function validCredentials(email: string, password: string): Promise<boolean> {
  const hash = process.env.AUTH_PASSWORD_HASH;
  const expectedEmail = (process.env.AUTH_EMAIL || "FluxHub@gmail.com").trim().toLowerCase();
  if (!hash || password.length > 256 || !password || !email) return false;
  const [algorithm, saltHex, hashHex] = hash.split(":");
  if (algorithm !== "scrypt" || !/^[0-9a-f]{32}$/i.test(saltHex ?? "") || !/^[0-9a-f]{128}$/i.test(hashHex ?? "")) return false;
  const calculated = (await scrypt(password, Buffer.from(saltHex, "hex"), 64)) as Buffer;
  const expected = Buffer.from(hashHex, "hex");
  return timingSafeEqual(calculated, expected) && email.trim().toLowerCase() === expectedEmail;
}
