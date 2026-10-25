import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY,
  deadlines,
  canAccess,
  uploadsOpen,
  uploadsOpenForRuntime,
  uploadWindowDeadline,
  trashDeadline,
  expired,
  weddingScope,
} from "../src/lib/policy";
import type { Account, Wedding } from "../src/lib/models";
import { eventDraftInput, eventPublishInput } from "../src/lib/server/validation";
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
test("Plan 1 can close at event-day midnight and retain for one month", () => {
  const result = deadlines("2026-10-19", 1, 1);
  assert.equal(result.uploads_close_at, "2026-10-19T21:00:00.000Z");
  assert.equal(result.expires_at, "2026-11-18T21:00:00.000Z");
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
test("partner staff can access only explicitly assigned events", () => {
  const staff = {
    id: "sales-a",
    role: "partner",
    staff_role: "partner_sales",
    partner_id: "a",
    assigned_event_ids: ["one"],
    disabled: false,
  } as Account;
  assert.equal(canAccess(staff, event), true);
  assert.equal(canAccess({ ...staff, assigned_event_ids: [] }, event), false);
  assert.deepEqual(weddingScope(staff), { id: { $in: ["one"] } });
});
test("photographers can cross tenant boundaries only through explicit event assignment", () => {
  const photographer = {
    id: "photo-a",
    role: "partner",
    staff_role: "photographer",
    partner_id: "a",
    assigned_event_ids: ["one"],
    disabled: false,
  } as Account;
  assert.equal(canAccess(photographer, event), true);
  assert.equal(canAccess({ ...photographer, partner_id: "b" }, event), true);
  assert.equal(canAccess({ ...photographer, assigned_event_ids: [] }, event), false);
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
test("Muhammed development event can upload after closing only outside production", () => {
  const now = Date.parse("2026-10-24T12:00:00.000Z");
  const developmentEvent = {
    ...event,
    id: "941abe00-e71d-448d-be40-82b2608babeb",
    uploads_close_at: "2026-10-17T21:00:00.000Z",
    expires_at: "2027-01-10T21:00:00.000Z",
  } as Wedding;
  assert.equal(uploadsOpen(developmentEvent, now), false);
  assert.equal(
    uploadsOpenForRuntime(developmentEvent, now, "development"),
    true,
  );
  assert.equal(
    uploadsOpenForRuntime(developmentEvent, now, "production"),
    false,
  );
  assert.equal(
    uploadWindowDeadline(developmentEvent, now, "development"),
    now + DAY,
  );
  assert.equal(
    uploadsOpenForRuntime(
      { ...developmentEvent, upload_enabled: false },
      now,
      "development",
    ),
    false,
  );
  assert.equal(
    uploadsOpenForRuntime(
      { ...developmentEvent, purged_at: "2026-10-20T00:00:00.000Z" },
      now,
      "development",
    ),
    false,
  );
  assert.equal(
    uploadsOpenForRuntime(
      { ...developmentEvent, id: "another-event" },
      now,
      "development",
    ),
    false,
  );
});
test("trash cannot extend retention", () => {
  const end = Date.parse(event.expires_at!);
  assert.equal(trashDeadline(event, end - 86400000), event.expires_at);
  assert.equal(expired(event, end), true);
  assert.equal(expired(event, end - 1), false);
});
test("drafts retain safe profile fields but never retain a password", () => {
  const parsed = eventDraftInput.parse({
    wizard_step: 6,
    customer_name: "Hilal Oğuz",
    customer_email: "hilal@example.com",
    password: "this-must-never-be-saved",
  });
  assert.equal(parsed.customer_email, "hilal@example.com");
  assert.equal("password" in parsed, false);
});
test("early wizard drafts omit names that are required only in later steps", () => {
  assert.equal(eventDraftInput.safeParse({ title: "Onur Turgut", wizard_step: 2 }).success, true);
  assert.equal(eventDraftInput.safeParse({ title: "Onur Turgut", bride_name: "", groom_name: "", wizard_step: 2 }).success, false);
});
test("publishing requires a strong temporary password", () => {
  assert.equal(eventPublishInput.safeParse({ password: "short" }).success, false);
  assert.equal(eventPublishInput.safeParse({ password: "strong-enough-password" }).success, true);
});
