/** FluxHub session: encrypted server-validated backend JWT, never a local user DB. */
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "fluxhub_session";
export const SESSION_MAX_AGE = 12 * 60 * 60;

type Session = {
  accessToken: string;
  expires: number;
  email: string;
  isAdmin: boolean;
};

function key(): Buffer {
  const secret = process.env.AUTH_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SESSION_SECRET deve conter pelo menos 32 caracteres.");
  }
  return createHash("sha256").update(secret).digest();
}

export function authConfigurationIssue(): "AUTH_SESSION_SECRET" | null {
  try { key(); return null; } catch { return "AUTH_SESSION_SECRET"; }
}

export function createSession(
  accessToken: string, expiresIn: number, email: string, isAdmin: boolean,
): string {
  if (typeof accessToken !== "string" || accessToken.length < 20 || accessToken.length > 2500) {
    throw new Error("JWT do backend inválido.");
  }
  if (!Number.isSafeInteger(expiresIn) || expiresIn < 1 || expiresIn > SESSION_MAX_AGE) {
    throw new Error("Validade do JWT inválida.");
  }
  const data: Session = {
    accessToken,
    expires: Date.now() + expiresIn * 1000,
    email: email.slice(0, 320).trim().toLowerCase(),
    isAdmin: Boolean(isAdmin),
  };
  const nonce = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), nonce);
  const encoded = Buffer.concat([
    cipher.update(JSON.stringify(data), "utf8"), cipher.final(),
  ]);
  return [nonce.toString("base64url"),
          encoded.toString("base64url"),
          cipher.getAuthTag().toString("base64url")].join(".");
}

export function readSession(value: string | undefined): Session | null {
  if (!value || value.length > 3900) return null;
  const parts = value.split(".");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64url");
    const body = Buffer.from(parts[1], "base64url");
    const tag = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const data = JSON.parse(Buffer.concat([decipher.update(body), decipher.final()])
      .toString("utf8")) as Session;
    if (!data || !Number.isFinite(data.expires) ||
        data.expires <= Date.now() ||
        data.expires > Date.now() + SESSION_MAX_AGE * 1000 ||
        typeof data.accessToken !== "string" ||
        data.accessToken.length < 20 ||
        typeof data.email !== "string" ||
        typeof data.isAdmin !== "boolean") return null;
    return data;
  } catch { return null; }
}

export function isValidSession(value: string | undefined): boolean {
  return Boolean(readSession(value));
}
