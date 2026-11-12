import { z } from "zod";
import type { Account, Partner, PartnerSettings } from "./models";
import { effectiveStaffRole } from "./access-control";

export function canManagePartnerSettings(account: Pick<Account, "role" | "staff_role" | "partner_id" | "disabled">) {
  return !account.disabled && account.role === "partner" && effectiveStaffRole(account) === "partner_owner" && !!account.partner_id;
}

const optionalHttpsUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => !value || (z.string().url().safeParse(value).success && value.startsWith("https://")),
    "Bağlantı HTTPS ile başlamalı.",
  );

export const partnerSettingsInput = z.object({
  profile: z.object({
    public_name: z.string().trim().max(160),
    website_url: optionalHttpsUrl,
    instagram_url: optionalHttpsUrl,
    service_cities: z.array(z.string().trim().min(2).max(80)).max(20),
    working_hours: z.string().trim().max(240),
    operations_contact_name: z.string().trim().max(100),
    operations_contact_email: z.string().trim().email().max(254).or(z.literal("")),
  }).strict(),
  brand: z.object({
    customer_facing_name: z.string().trim().max(160),
    support_phone: z.string().regex(/^0[0-9]{10}$/).or(z.literal("")),
    support_email: z.string().trim().email().max(254).or(z.literal("")),
    primary_color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    welcome_text: z.string().trim().max(500),
    completion_text: z.string().trim().max(500),
    show_partner_brand: z.boolean(),
  }).strict(),
  locations: z.array(z.object({
    id: z.string().uuid(),
    name: z.string().trim().min(2).max(160),
    address: z.string().trim().max(500),
    map_url: optionalHttpsUrl,
    capacity: z.number().int().min(1).max(100000).nullable(),
    working_hours: z.string().trim().max(240),
    closed_weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    active: z.boolean(),
  }).strict()).max(20),
  organization_defaults: z.object({
    event_type: z.string().trim().max(80),
    venue: z.string().trim().max(200),
    hero_message: z.string().trim().max(1000),
    thank_you_message: z.string().trim().max(2000),
  }).strict(),
  notifications: z.object({
    approval_updates: z.boolean(),
    photographer_delivery: z.boolean(),
    quota_warning: z.boolean(),
    retention_warning: z.boolean(),
    print_updates: z.boolean(),
    finance_updates: z.boolean(),
    weekly_summary: z.boolean(),
  }).strict(),
  privacy: z.object({
    customer_data_contact_email: z.string().trim().email().max(254).or(z.literal("")),
    security_alerts: z.boolean(),
  }).strict(),
}).strict();

export function defaultPartnerSettings(partner?: Pick<Partner, "name">): PartnerSettings {
  return {
    version: 1,
    profile: {
      public_name: partner?.name || "",
      website_url: "",
      instagram_url: "",
      service_cities: [],
      working_hours: "",
      operations_contact_name: "",
      operations_contact_email: "",
    },
    brand: {
      customer_facing_name: partner?.name || "",
      support_phone: "",
      support_email: "",
      primary_color: "#B78A42",
      welcome_text: "",
      completion_text: "",
      show_partner_brand: true,
    },
    locations: [],
    organization_defaults: {
      event_type: "Düğün",
      venue: "",
      hero_message: "Anılarınızı bizimle paylaşın.",
      thank_you_message: "Bu özel günümüzde yanımızda olduğunuz için teşekkür ederiz.",
    },
    notifications: {
      approval_updates: true,
      photographer_delivery: true,
      quota_warning: true,
      retention_warning: true,
      print_updates: true,
      finance_updates: true,
      weekly_summary: false,
    },
    privacy: {
      customer_data_contact_email: "",
      security_alerts: true,
    },
  };
}

export function resolvePartnerSettings(partner: Pick<Partner, "name" | "settings">): PartnerSettings {
  const defaults = defaultPartnerSettings(partner);
  const stored = partner.settings;
  if (!stored) return defaults;
  return {
    ...defaults,
    ...stored,
    profile: { ...defaults.profile, ...stored.profile },
    brand: { ...defaults.brand, ...stored.brand },
    locations: stored.locations || defaults.locations,
    organization_defaults: { ...defaults.organization_defaults, ...stored.organization_defaults },
    notifications: { ...defaults.notifications, ...stored.notifications },
    privacy: { ...defaults.privacy, ...stored.privacy },
  };
}
