import { z } from "zod";
import type { BusinessStorefront, BusinessType, Partner } from "./models";

export const BUSINESS_TYPES = [
  "venue",
  "planner",
  "photography",
  "print_vendor",
  "bridal",
  "florist",
  "invitation",
  "music_entertainment",
  "beauty",
  "transportation",
  "other",
] as const satisfies readonly BusinessType[];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  venue: "Düğün salonu",
  planner: "Organizasyon firması",
  photography: "Fotoğraf ve video",
  print_vendor: "Baskı ve albüm",
  bridal: "Gelinlik",
  florist: "Çiçek ve dekorasyon",
  invitation: "Davetiye",
  music_entertainment: "Müzik ve eğlence",
  beauty: "Kuaför ve güzellik",
  transportation: "Ulaşım",
  other: "Diğer hizmetler",
};

const publicImage = z
  .string()
  .max(2048)
  .refine(
    (value) =>
      /^\/covers\/[a-zA-Z0-9._-]+$/.test(value) ||
      /^\/api\/covers\/[0-9a-f-]{36}$/.test(value) ||
      /^https:\/\//.test(value),
  );

export const businessStorefrontInput = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(100)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    status: z.enum(["draft", "published", "suspended"]),
    short_description: z.string().trim().max(240),
    about: z.string().trim().max(4000),
    cover_images: z.array(publicImage).max(12),
    service_cities: z.array(z.string().trim().min(2).max(80)).max(20),
    featured_services: z.array(z.string().trim().min(2).max(100)).max(12),
    whatsapp_phone: z
      .string()
      .regex(/^0[0-9]{10}$/)
      .or(z.literal("")),
    show_phone: z.boolean(),
    show_address: z.boolean(),
  })
  .strict();

export type PublicBusiness = {
  id: string;
  slug: string;
  name: string;
  logo_url: string;
  business_types: BusinessType[];
  short_description: string;
  about: string;
  cover_images: string[];
  service_cities: string[];
  featured_services: string[];
  whatsapp_phone: string | null;
  phone: string | null;
  address: string | null;
};

export function publicBusiness(partner: Partner): PublicBusiness | null {
  if (!partner.active) return null;
  const storefront = partner.storefront;
  const legacyPublished = !storefront && Boolean(partner.logo_url);
  if (!legacyPublished && storefront?.status !== "published") return null;
  return {
    id: partner.id,
    slug: storefront?.slug || partner.id,
    name:
      partner.settings?.profile.public_name?.trim() ||
      partner.settings?.brand.customer_facing_name?.trim() ||
      partner.name,
    logo_url: partner.logo_url || "",
    business_types: partner.business_types?.filter((type) =>
      BUSINESS_TYPES.includes(type),
    ) || ["other"],
    short_description: storefront?.short_description || "",
    about: storefront?.about || "",
    cover_images: storefront?.cover_images || [],
    service_cities:
      storefront?.service_cities ||
      partner.settings?.profile.service_cities ||
      [],
    featured_services: storefront?.featured_services || [],
    whatsapp_phone: storefront?.whatsapp_phone || null,
    phone: storefront?.show_phone ? partner.phone || null : null,
    address: storefront?.show_address ? partner.address || null : null,
  };
}

export function defaultStorefront(
  partner: Pick<Partner, "id" | "name">,
): BusinessStorefront {
  return {
    slug: partner.id,
    status: "draft",
    short_description: "",
    about: "",
    cover_images: [],
    service_cities: [],
    featured_services: [],
    whatsapp_phone: "",
    show_phone: false,
    show_address: false,
  };
}

export function storefrontPublicationIssues(
  partner: Pick<Partner, "name" | "business_types">,
  storefront: BusinessStorefront,
) {
  const issues: string[] = [];
  if (!partner.name.trim()) issues.push("İşletme adı gerekli.");
  if (!partner.business_types?.length)
    issues.push("En az bir işletme kategorisi gerekli.");
  if (storefront.short_description.trim().length < 20)
    issues.push("Kısa açıklama en az 20 karakter olmalı.");
  if (!storefront.service_cities.length)
    issues.push("En az bir hizmet şehri gerekli.");
  return issues;
}
