import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const base32 = (buffer: Buffer) => {
  let bits = "";
  for (const byte of buffer) bits += byte.toString(2).padStart(8, "0");
  return Array.from(
    { length: Math.ceil(bits.length / 5) },
    (_, index) =>
      alphabet[
        Number.parseInt(bits.slice(index * 5, index * 5 + 5).padEnd(5, "0"), 2)
      ],
  ).join("");
};
const decode32 = (value: string) => {
  const bits = [...value.replace(/=+$/g, "").toUpperCase()]
    .map((char) => alphabet.indexOf(char).toString(2).padStart(5, "0"))
    .join("");
  return Buffer.from(
    Array.from({ length: Math.floor(bits.length / 8) }, (_, index) =>
      Number.parseInt(bits.slice(index * 8, index * 8 + 8), 2),
    ),
  );
};
const key = () => {
  const secret = process.env.MFA_ENCRYPTION_KEY;
  if (!secret || secret.length < 32)
    throw new Error("MFA_ENCRYPTION_KEY en az 32 karakter olmalı.");
  return createHash("sha256").update(secret).digest();
};
export const createTotpSecret = () => base32(randomBytes(20));
export const encryptTotpSecret = (secret: string) => {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  return [iv, cipher.getAuthTag(), encrypted]
    .map((part) => part.toString("base64url"))
    .join(".");
};
export const decryptTotpSecret = (payload: string) => {
  const [iv, tag, encrypted] = payload
    .split(".")
    .map((part) => Buffer.from(part, "base64url"));
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString(
    "utf8",
  );
};
const codeAt = (secret: string, counter: number) => {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", decode32(secret)).update(buffer).digest();
  const offset = digest[digest.length - 1] & 15;
  return String(
    (digest.readUInt32BE(offset) & 0x7fffffff) % 1_000_000,
  ).padStart(6, "0");
};
export const verifyTotp = (secret: string, input: string, now = Date.now()) => {
  if (!/^\d{6}$/.test(input)) return false;
  const counter = Math.floor(now / 30_000);
  return [-1, 0, 1].some((window) => {
    const expected = Buffer.from(codeAt(secret, counter + window));
    const actual = Buffer.from(input);
    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  });
};
