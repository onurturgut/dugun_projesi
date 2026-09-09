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
  bride_name: z.string().max(100).default(""),
  groom_name: z.string().max(100).default(""),
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
export const accountInput = z.object({
  username: loginName,
  password: passwordSchema,
  display_name: z.string().trim().min(1).max(100),
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
  uploader_session_id: z.string().uuid(),
  guest_name: z.string().trim().max(100).default(""),
  guest_message: z.string().trim().max(1000).default(""),
});
