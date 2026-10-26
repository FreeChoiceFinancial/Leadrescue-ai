import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const VERSION = "v1";

export function crmTokenKey(): Buffer | null {
  const raw = (process.env.CRM_TOKEN_KEY ?? "").trim();
  if (!raw) return null;
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) return null;
  return key;
}

/** AES-256-GCM. The plaintext token is not returned in errors. */
export function encryptSecret(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(packed: string, key: Buffer): string {
  const [version, ivPart, tagPart, bodyPart] = packed.split(".");
  if (version !== VERSION || !ivPart || !tagPart || !bodyPart) {
    throw new Error("CRM token could not be read.");
  }
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(ivPart, "base64url"));
    decipher.setAuthTag(Buffer.from(tagPart, "base64url"));
    const plain = Buffer.concat([decipher.update(Buffer.from(bodyPart, "base64url")), decipher.final()]);
    return plain.toString("utf8");
  } catch {
    throw new Error("CRM token could not be read.");
  }
}

export type CrmStatePayload = {
  tenantId: string;
  provider: "hubspot" | "zoho";
  region: "com" | "eu" | "in" | "com.au" | null;
  exp: number;
};

export function signCrmState(payload: CrmStatePayload, key: Buffer): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readCrmState(state: string, key: Buffer, nowMs: number): CrmStatePayload | null {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  const left = Buffer.from(sig);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as CrmStatePayload;
    if (parsed.exp <= nowMs) return null;
    if (parsed.provider !== "hubspot" && parsed.provider !== "zoho") return null;
    return parsed;
  } catch {
    return null;
  }
}
