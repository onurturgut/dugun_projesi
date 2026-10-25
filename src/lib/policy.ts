import type { Account, Wedding } from "./models";
import { effectiveStaffRole } from "./access-control";
export const DAY = 86400000;
const DEVELOPMENT_UPLOAD_EVENT_IDS = new Set([
  "941abe00-e71d-448d-be40-82b2608babeb",
]);
// Istanbul uses UTC+03:00. Date-only organization dates start at local midnight.
export function deadlines(date: string, uploadDays = 7, retentionMonths = 3) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Geçersiz tarih.");
  const [year, month, day] = date.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.toISOString().slice(0, 10) !== date)
    throw new Error("Geçersiz tarih.");
  if (!Number.isInteger(uploadDays) || uploadDays < 1)
    throw new Error("Yükleme süresi en az bir gün olmalı.");
  if (!Number.isInteger(retentionMonths) || retentionMonths < 1)
    throw new Error("Saklama süresi en az bir ay olmalı.");
  const target = new Date(Date.UTC(year, month - 1 + retentionMonths, 1));
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
  if (user.role === "partner") {
    const base = { partner_id: user.partner_id || "__unassigned__" };
    if (effectiveStaffRole(user) === "partner_owner") return base;
    return { id: { $in: user.assigned_event_ids || [] } };
  }
  return { partner_id: user.partner_id || "__unassigned__", owner_id: user.id };
}
export function canAccess(user: Account, event: Wedding) {
  if (user.disabled) return false;
  const assignedPartnerStaff =
    user.role === "partner" &&
    effectiveStaffRole(user) !== "partner_owner" &&
    (user.assigned_event_ids || []).includes(event.id);
  return (
    user.role === "platform" ||
    assignedPartnerStaff ||
    (user.partner_id === event.partner_id &&
      (user.role === "partner" ? effectiveStaffRole(user) === "partner_owner" : event.owner_id === user.id))
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
export function developmentUploadOverride(
  event: Wedding,
  environment = process.env.NODE_ENV,
  now = Date.now(),
) {
  return (
    environment !== "production" &&
    DEVELOPMENT_UPLOAD_EVENT_IDS.has(event.id) &&
    event.upload_enabled &&
    !expired(event, now)
  );
}
export function uploadsOpenForRuntime(
  event: Wedding,
  now = Date.now(),
  environment = process.env.NODE_ENV,
) {
  return (
    uploadsOpen(event, now) ||
    developmentUploadOverride(event, environment, now)
  );
}
export function uploadWindowDeadline(
  event: Wedding,
  now = Date.now(),
  environment = process.env.NODE_ENV,
) {
  return developmentUploadOverride(event, environment, now)
    ? now + DAY
    : Date.parse(event.uploads_close_at || "");
}
export function trashDeadline(event: Wedding, now = Date.now()) {
  return new Date(
    Math.min(
      now + event.trash_days * DAY,
      event.expires_at ? Date.parse(event.expires_at) : Infinity,
    ),
  ).toISOString();
}
