import { z } from "zod";
import type { BusinessLeadStatus, CrmTaskStatus } from "./models";

export const publicLeadInput = z
  .object({
    idempotency_key: z.string().uuid(),
    catalog_item_id: z.string().uuid().nullable().default(null),
    customer_name: z.string().trim().min(2).max(120),
    customer_email: z.string().trim().email().max(254),
    customer_phone: z.string().regex(/^0[0-9]{10}$/),
    event_type: z.string().trim().min(2).max(80),
    event_date: z.string().date().or(z.literal("")).default(""),
    city: z.string().trim().min(2).max(100),
    message: z.string().trim().max(2000).default(""),
    contact_preference: z.enum(["phone", "email", "whatsapp"]),
    privacy_notice_accepted: z.literal(true),
    marketing_consent: z.boolean().default(false),
  })
  .strict();

export const leadStatusInput = z
  .object({
    status: z.enum([
      "new",
      "contacted",
      "quote_preparing",
      "quote_sent",
      "won",
      "lost",
    ]),
  })
  .strict();

export const leadAssignmentInput = z
  .object({ assigned_to: z.string().uuid().nullable() })
  .strict();

export const crmActivityInput = z
  .object({
    type: z.enum(["note", "call", "email", "meeting"]),
    content: z.string().trim().min(2).max(4000),
    occurred_at: z.string().datetime().optional(),
  })
  .strict();

export const crmTaskInput = z
  .object({
    lead_id: z.string().uuid(),
    title: z.string().trim().min(2).max(180),
    description: z.string().trim().max(2000).default(""),
    priority: z.enum(["low", "normal", "high"]).default("normal"),
    due_at: z.string().datetime().nullable().default(null),
    assigned_to: z.string().uuid().nullable().default(null),
  })
  .strict();

export const crmTaskUpdateInput = z
  .object({
    status: z.enum(["todo", "in_progress", "done", "cancelled"]),
  })
  .strict();

const transitions: Record<BusinessLeadStatus, readonly BusinessLeadStatus[]> = {
  new: ["contacted", "lost"],
  contacted: ["quote_preparing", "lost"],
  quote_preparing: ["quote_sent", "lost"],
  quote_sent: ["contacted", "won", "lost"],
  won: [],
  lost: ["contacted"],
};

export function canTransitionLead(
  from: BusinessLeadStatus,
  to: BusinessLeadStatus,
) {
  return from === to || transitions[from].includes(to);
}

const taskTransitions: Record<CrmTaskStatus, readonly CrmTaskStatus[]> = {
  todo: ["in_progress", "done", "cancelled"],
  in_progress: ["todo", "done", "cancelled"],
  done: ["todo"],
  cancelled: ["todo"],
};

export function canTransitionCrmTask(from: CrmTaskStatus, to: CrmTaskStatus) {
  return from === to || taskTransitions[from].includes(to);
}

export const CRM_TASK_STATUS_LABELS: Record<CrmTaskStatus, string> = {
  todo: "Yapılacak",
  in_progress: "Devam ediyor",
  done: "Tamamlandı",
  cancelled: "İptal edildi",
};

export const CRM_STAGE_LABELS: Record<BusinessLeadStatus, string> = {
  new: "Yeni talep",
  contacted: "Görüşme",
  quote_preparing: "Teklif hazırlanıyor",
  quote_sent: "Teklif gönderildi",
  won: "Kazanıldı",
  lost: "Kaybedildi",
};
