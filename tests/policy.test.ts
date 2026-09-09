import { test } from "node:test";
import assert from "node:assert/strict";
import {
  deadlines,
  canAccess,
  uploadsOpen,
  trashDeadline,
  expired,
} from "../src/lib/policy";
import type { Account, Wedding } from "../src/lib/models";
const event = {
  id: "one",
  partner_id: "a",
  owner_id: "owner-a",
  upload_enabled: true,
  uploads_open_at: "2026-09-01T00:00:00Z",
  ...deadlines("2026-09-07"),
  purged_at: null,
  trash_days: 7,
} as Wedding;
test("calendar-month retention clamps month end and uses Istanbul midnight", () => {
  assert.equal(deadlines("2026-11-30").expires_at, "2027-02-27T21:00:00.000Z");
  assert.equal(deadlines("2027-11-30").expires_at, "2028-02-28T21:00:00.000Z");
  assert.equal(
    deadlines("2026-09-07").uploads_close_at,
    "2026-09-13T21:00:00.000Z",
  );
  assert.throws(() => deadlines("2026-02-30"));
});
test("tenant and owner isolation", () => {
  const user = (role: Account["role"], partner_id: string, id = "x") =>
    ({ role, partner_id, id, disabled: false }) as Account;
  assert.equal(canAccess(user("partner", "a"), event), true);
  assert.equal(canAccess(user("partner", "b"), event), false);
  assert.equal(canAccess(user("owner", "a", "owner-a"), event), true);
  assert.equal(canAccess(user("owner", "a", "other"), event), false);
  assert.equal(canAccess(user("platform", ""), event), true);
});
test("upload closing is enforced at exact deadline", () => {
  const end = Date.parse(event.uploads_close_at!);
  assert.equal(uploadsOpen(event, end - 1), true);
  assert.equal(uploadsOpen(event, end), false);
  assert.equal(
    uploadsOpen({ ...event, upload_enabled: false }, end - 1),
    false,
  );
});
test("trash cannot extend retention", () => {
  const end = Date.parse(event.expires_at!);
  assert.equal(trashDeadline(event, end - 86400000), event.expires_at);
  assert.equal(expired(event, end), true);
  assert.equal(expired(event, end - 1), false);
});
