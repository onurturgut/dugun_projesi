import { z } from "zod";
export const loginName = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .regex(
    /^[a-z0-9@._+-]+$/,
    "Kullanıcı adında yalnızca Latin harfleri, rakam ve @._+- kullanın.",
  );
export const passwordSchema = z.string().min(12).max(256);
const imageUrl = z
  .string()
  .max(2048)
  .refine(
    (s) =>
      s === "" ||
      /^\/covers\/[a-zA-Z0-9._-]+$/.test(s) ||
      /^\/api\/covers\/[0-9a-f-]{36}$/.test(s) ||
      /^https:\/\//.test(s),
  );
export const eventInput = z.object({
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(1).max(160),
  event_type: z.string().min(1).max(60),
  venue: z.string().trim().max(200).default(""),
  description: z.string().trim().max(1200).default(""),
  bride_name: z.string().trim().min(1, "Gelin adı gerekli.").max(100),
  groom_name: z.string().trim().min(1, "Damat adı gerekli.").max(100),
  wedding_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  cover_images: z.array(imageUrl).max(20),
  logo_url: imageUrl.default(""),
  hero_message: z.string().max(1000),
  thank_you_message: z.string().max(2000),
  partner_id: z.string().min(1).max(100).optional(),
  upload_days: z.number().int().min(1).max(90).optional(),
  trash_days: z.number().int().min(1).max(30).optional(),
  upload_enabled: z.boolean().optional(),
});
export const eventDraftInput = eventInput.partial().extend({
  id: z.string().uuid().optional(),
  wizard_step: z.number().int().min(1).max(7).default(1),
  customer_name: z.string().trim().max(100).default(""),
  customer_email: loginName.or(z.literal("")).default(""),
  package_code: z.enum(["plan-1", "plan-2", "plan-3"]).optional(),
  add_on_selections: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().int().min(1).max(100),
  })).max(20).default([]),
}).superRefine((value, context) => {
  const ids = value.add_on_selections.map((item) => item.product_id);
  if (new Set(ids).size !== ids.length)
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["add_on_selections"], message: "Aynı ek ürün birden fazla kez seçilemez." });
});
export const accountInput = z.object({
  username: loginName,
  password: passwordSchema,
  display_name: z.string().trim().min(1).max(100),
});
export const eventPublishInput = accountInput.pick({ password: true });
export const approvalDecisionInput = z.object({
  decision: z.enum(["changes_requested", "rejected"]),
  reason: z.string().trim().min(3).max(1000),
});
export const agentNames = [
  "accounting-analyst", "architecture-guardian", "business-analyst", "code-reviewer",
  "frontend-developer", "marketing-strategist", "orchestrator", "qa-engineer",
  "security-reviewer", "senior-backend", "system-operator", "ui-ux-designer",
] as const;
export const agentReportInput = z.object({
  run_id: z.string().uuid(),
  agent_name: z.enum(agentNames),
  task_title: z.string().trim().min(3).max(200),
  status: z.enum(["complete", "needs-review", "blocked"]),
  scope: z.array(z.string().trim().min(1).max(300)).min(1).max(100),
  findings: z.array(z.object({
    severity: z.enum(["critical", "warning", "info"]),
    title: z.string().trim().min(3).max(200),
    evidence: z.string().trim().min(1).max(4000),
  })).max(100),
  verification: z.array(z.object({
    check: z.string().trim().min(1).max(500),
    result: z.enum(["passed", "failed", "not_run"]),
    evidence: z.string().trim().max(4000),
  })).max(100),
  risks: z.array(z.string().trim().min(1).max(1000)).max(50),
  recommendation: z.enum(["approve", "revise", "reject"]),
  handoff: z.object({ role: z.enum([...agentNames, "human-owner"]), action: z.string().trim().min(3).max(1000) }),
  change_ref: z.string().trim().max(200).optional(),
});
export const agentReportReviewInput = z.object({
  decision: z.enum(["approved", "changes_requested", "rejected"]),
  note: z.string().trim().min(3).max(2000),
});
export const mediaIds = z.array(z.string().uuid()).min(1).max(200);
export const uploadInput = z.object({
  weddingId: z.string().uuid(),
  file_name: z.string().min(1).max(180),
  mime_type: z.enum([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
    "image/avif",
    "image/gif",
    "video/mp4",
    "video/quicktime",
    "video/webm",
  ]),
  size_bytes: z.number().int().positive(),
  duration_seconds: z.number().positive().max(15 * 60).optional(),
  uploader_session_id: z.string().uuid(),
  guest_name: z.string().trim().max(100).default(""),
  guest_message: z.string().trim().max(1000).default(""),
}).superRefine((value, context) => {
  if (value.mime_type.startsWith("video/") && value.duration_seconds == null)
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["duration_seconds"],
      message: "Video süresi doğrulanamadı.",
    });
});
