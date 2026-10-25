import "server-only";
import type { Account, Permission, Wedding } from "@/lib/models";
import { session } from "./auth";
import { db } from "./db";
import { weddingScope } from "@/lib/policy";
import { accountHasPermission } from "@/lib/access-control";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function requireAccount(
  allowPasswordChange = false,
): Promise<Account> {
  const user = await session();
  if (!user) throw new HttpError(401, "Giriş yapmanız gerekiyor.");
  if (user.must_change_password && !allowPasswordChange && !user.preview_read_only)
    throw new HttpError(403, "Devam etmek için geçici şifrenizi değiştirin.");
  return user;
}
export function requireManager(user: Account) {
  if (user.role === "owner")
    throw new HttpError(403, "Bu işlem için işletme yetkisi gerekli.");
}
export function requirePlatform(user: Account) {
  if (user.role !== "platform")
    throw new HttpError(
      403,
      "Bu işlem için platform yöneticisi yetkisi gerekli.",
    );
}
export function requirePermission(user: Account, permission: Permission) {
  if (!accountHasPermission(user, permission))
    throw new HttpError(403, "Bu işlem için hesabınıza yetki verilmemiş.");
}
export function requireMediaPermission(
  user: Account,
  permission: "view" | "download" | "manage" | "archive",
) {
  const required: Permission = permission === "manage"
    ? "album.manage"
    : permission === "view"
      ? "album.view"
      : "album.download";
  if (!accountHasPermission(user, required))
    throw new HttpError(403, "Bu medya işlemi için hesabınıza yetki verilmemiş.");
  if (user.media_permissions?.[permission] === false)
    throw new HttpError(403, "Bu medya işlemi için hesabınıza yetki verilmemiş.");
}
export async function eventFor(user: Account, id: string): Promise<Wedding> {
  const event = await (
    await db()
  )
    .collection<Wedding>("weddings")
    .findOne({ id, ...weddingScope(user) }, { projection: { _id: 0 } });
  if (!event) throw new HttpError(404, "Organizasyon bulunamadı.");
  return event;
}
