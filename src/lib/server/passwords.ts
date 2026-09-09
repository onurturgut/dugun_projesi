import "server-only";
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export async function passwordFields(password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = ((await scrypt(password, salt, 64)) as Buffer).toString(
    "hex",
  );
  return { salt, passwordHash };
}
export async function matches(
  password: string,
  user: { salt: string; passwordHash: string } | null,
) {
  const value = (await scrypt(
    password,
    user?.salt || "missing-user",
    64,
  )) as Buffer;
  const stored = Buffer.from(user?.passwordHash || "", "hex");
  return stored.length === value.length && timingSafeEqual(value, stored);
}
