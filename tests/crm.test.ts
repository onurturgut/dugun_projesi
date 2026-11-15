import test from "node:test";
import assert from "node:assert/strict";
import {
  canTransitionCrmTask,
  canTransitionLead,
  crmActivityInput,
  crmTaskInput,
  publicLeadInput,
} from "../src/lib/crm";

const input = {
  idempotency_key: "6bdbaf0d-1f2e-4f17-aa78-c4d243074cf8",
  catalog_item_id: null,
  customer_name: "Ayşe Yılmaz",
  customer_email: "ayse@example.com",
  customer_phone: "05321234567",
  event_type: "Düğün",
  event_date: "2027-06-12",
  city: "Elazığ",
  message: "Fotoğraf paketi hakkında bilgi almak istiyorum.",
  contact_preference: "whatsapp" as const,
  privacy_notice_accepted: true as const,
  marketing_consent: false,
};

test("public lead requires explicit privacy notice acceptance", () => {
  assert.equal(publicLeadInput.safeParse(input).success, true);
  assert.equal(
    publicLeadInput.safeParse({ ...input, privacy_notice_accepted: false })
      .success,
    false,
  );
});

test("service contact and marketing consent remain separate", () => {
  const parsed = publicLeadInput.parse(input);
  assert.equal(parsed.privacy_notice_accepted, true);
  assert.equal(parsed.marketing_consent, false);
});

test("lead pipeline permits only explicit forward and reopen transitions", () => {
  assert.equal(canTransitionLead("new", "contacted"), true);
  assert.equal(canTransitionLead("new", "won"), false);
  assert.equal(canTransitionLead("quote_sent", "won"), true);
  assert.equal(canTransitionLead("lost", "contacted"), true);
  assert.equal(canTransitionLead("won", "contacted"), false);
});

test("CRM activity accepts an immutable bounded timeline entry", () => {
  assert.equal(
    crmActivityInput.safeParse({
      type: "call",
      content: "Müşteri ile paket seçenekleri görüşüldü.",
      occurred_at: "2026-11-14T12:00:00.000Z",
    }).success,
    true,
  );
  assert.equal(
    crmActivityInput.safeParse({ type: "system", content: "Yetkisiz kayıt" })
      .success,
    false,
  );
});

test("CRM task requires a lead and validates due date and assignee", () => {
  assert.equal(
    crmTaskInput.safeParse({
      lead_id: "6bdbaf0d-1f2e-4f17-aa78-c4d243074cf8",
      title: "Teklifi hazırla",
      description: "Paket seçeneklerini ekle.",
      priority: "high",
      due_at: "2026-11-16T09:00:00.000Z",
      assigned_to: null,
    }).success,
    true,
  );
  assert.equal(
    crmTaskInput.safeParse({ lead_id: "wrong", title: "Eksik" }).success,
    false,
  );
});

test("CRM task lifecycle permits completion and explicit reopen only", () => {
  assert.equal(canTransitionCrmTask("todo", "in_progress"), true);
  assert.equal(canTransitionCrmTask("in_progress", "done"), true);
  assert.equal(canTransitionCrmTask("done", "in_progress"), false);
  assert.equal(canTransitionCrmTask("done", "todo"), true);
  assert.equal(canTransitionCrmTask("cancelled", "done"), false);
});
