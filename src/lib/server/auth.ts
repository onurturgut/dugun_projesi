import "server-only";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { db } from "./db";
import type { Account } from "@/lib/models";
export const hash = (token: string) =>
  createHash("sha256").update(token).digest("hex");

const SESSION_CACHE_TTL_MS = 30_000;
const SESSION_CACHE_MAX_ENTRIES = 10_000;
type CachedSession = { account: Account; expiresAt: number };
const authGlobal = globalThis as typeof globalThis & {
  weddingSessionCache?: Map<string, CachedSession>;
};
const sessionCache =
  authGlobal.weddingSessionCache ||
  (authGlobal.weddingSessionCache = new Map<string, CachedSession>());

export function invalidateSessionCache(token?: string) {
  if (token) sessionCache.delete(hash(token));
  else sessionCache.clear();
}

export async function session() {
  const token = (await cookies()).get("wm_session")?.value;
  if (!token) return null;
  const tokenHash = hash(token);
  const cached = sessionCache.get(tokenHash);
  if (cached && cached.expiresAt > Date.now()) return cached.account;
  if (cached) sessionCache.delete(tokenHash);
  const database = await db();
  const current = await database
    .collection("sessions")
    .findOne({ token: tokenHash, expiresAt: { $gt: new Date() } });
  if (!current) return null;
  const user = await database.collection<Account>("users").findOne(
    { id: current.userId, disabled: { $ne: true } },
    {
      projection: {
        _id: 0,
        id: 1,
        email: 1,
        role: 1,
        partner_id: 1,
        display_name: 1,
        must_change_password: 1,
        disabled: 1,
        mfa_enabled: 1,
        theme: 1,
      },
    },
  );
  if (!user || !["platform", "partner", "owner"].includes(user.role))
    return null;
  const partner = await database.collection("partners").findOne({
    id: user.partner_id || "platform",
    active: true,
  });
  if (user.role !== "platform" && !partner) return null;
  const account = {
    ...user,
    partner_name: partner?.name || "ShineQR Platform",
    partner_logo_url: partner?.logo_url || "",
    theme: user.theme || "dark",
  };
  if (sessionCache.size >= SESSION_CACHE_MAX_ENTRIES) {
    const now = Date.now();
    for (const [key, value] of sessionCache) {
      if (value.expiresAt <= now) sessionCache.delete(key);
    }
    if (sessionCache.size >= SESSION_CACHE_MAX_ENTRIES) sessionCache.clear();
  }
  sessionCache.set(tokenHash, {
    account,
    expiresAt: Math.min(
      Date.now() + SESSION_CACHE_TTL_MS,
      new Date(current.expiresAt).getTime(),
    ),
  });
  return account;
}
