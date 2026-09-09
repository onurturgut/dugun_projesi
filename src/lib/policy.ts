import type { Account, Wedding } from "./models";
export const DAY = 86400000;
// Istanbul uses UTC+03:00. Date-only organization dates start at local midnight.
export function deadlines(date: string, uploadDays = 7) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Geçersiz tarih.");
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.toISOString().slice(0, 10) !== date)
    throw new Error("Geçersiz tarih.");
  const target = new Date(Date.UTC(year, month - 1 + 3, 1));
  const last = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const expires =
    Date.UTC(
      target.getUTCFullYear(),
      target.getUTCMonth(),
      Math.min(day, last),
    ) -
    3 * 3600000;
  return {
    uploads_close_at: new Date(
      check.getTime() - 3 * 3600000 + uploadDays * DAY,
    ).toISOString(),
    expires_at: new Date(expires).toISOString(),
  };
}
export function weddingScope(user: Account) {
  if (user.role === "platform") return {};
  if (user.role === "partner")
    return { partner_id: user.partner_id || "__unassigned__" };
  return { partner_id: user.partner_id || "__unassigned__", owner_id: user.id };
}
export function canAccess(user: Account, event: Wedding) {
  if (user.disabled) return false;
  return (
    user.role === "platform" ||
    (user.partner_id === event.partner_id &&
      (user.role === "partner" || event.owner_id === user.id))
  );
}
export function expired(
  event: Pick<Wedding, "expires_at" | "purged_at">,
  now = Date.now(),
) {
  return (
    !!event.purged_at ||
    (!!event.expires_at && Date.parse(event.expires_at) <= now)
  );
}
export function uploadsOpen(event: Wedding, now = Date.now()) {
  return (
    event.upload_enabled &&
    !expired(event, now) &&
    !!event.uploads_close_at &&
    Date.parse(event.uploads_open_at) <= now &&
    Date.parse(event.uploads_close_at) > now
  );
}
export function trashDeadline(event: Wedding, now = Date.now()) {
  return new Date(
    Math.min(
      now + event.trash_days * DAY,
      event.expires_at ? Date.parse(event.expires_at) : Infinity,
    ),
  ).toISOString();
}
