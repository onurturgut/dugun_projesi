import type { WeddingDesign } from "./design";
import type { QrProductId } from "./qr-products";
import type { DigitalInvitationContent } from "./digital-invitation";
import type {
  AddOnSelection,
  PackageCode,
  PackagePolicy,
  PriceSnapshot,
  PhotographerPackagePolicy,
  PhotographerSettlementSnapshot,
} from "./commercial-policy";
export type Role = "platform" | "partner" | "owner";
export type BusinessType =
  "venue" | "planner" | "photography" | "print_vendor" | "other";
export type StaffRole =
  | "platform_admin"
  | "finance_manager"
  | "operations_manager"
  | "design_manager"
  | "partner_owner"
  | "partner_sales"
  | "partner_operations_design"
  | "photographer"
  | "print_vendor"
  | "organization_owner"
  | "organization_editor"
  | "album_viewer";
export type Permission =
  | "partner.manage"
  | "partner.manage_staff"
  | "organization.create"
  | "organization.update"
  | "organization.submit"
  | "organization.approve"
  | "organization.activate"
  | "organization.cancel"
  | "album.view"
  | "album.download"
  | "album.manage"
  | "media.upload_professional"
  | "print_job.view_assigned"
  | "print_job.manage"
  | "print_job.update_status"
  | "design.select"
  | "design.request_revision"
  | "design.approve_for_print"
  | "finance.view_own"
  | "finance.view_all"
  | "commission.view_own"
  | "commission.manage"
  | "payout.approve"
  | "payout.mark_paid"
  | "agent.report.view"
  | "agent.report.manage"
  | "account.impersonate_readonly";
export interface Account {
  id: string;
  email: string;
  role: Role;
  partner_id: string | null;
  display_name: string;
  must_change_password: boolean;
  disabled: boolean;
  mfa_enabled?: boolean;
  partner_name?: string;
  partner_logo_url?: string;
  theme?: "light" | "dark" | "system";
  media_permissions?: MediaPermissions;
  staff_role?: StaffRole;
  permission_overrides?: Partial<Record<Permission, boolean>>;
  assigned_event_ids?: string[];
  preview_read_only?: boolean;
  impersonated_by?: { id: string; display_name: string };
}
export type MediaPermissions = {
  view: boolean;
  download: boolean;
  manage: boolean;
  archive: boolean;
};
export interface Partner {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  logo_url: string;
  active: boolean;
  created_at: string;
  business_types?: BusinessType[];
}
export type AgentName =
  | "accounting-analyst"
  | "architecture-guardian"
  | "business-analyst"
  | "code-reviewer"
  | "frontend-developer"
  | "marketing-strategist"
  | "orchestrator"
  | "qa-engineer"
  | "security-reviewer"
  | "senior-backend"
  | "system-operator"
  | "ui-ux-designer";
export type AgentReportStatus = "complete" | "needs-review" | "blocked";
export type AgentReportReviewStatus =
  "pending" | "approved" | "changes_requested" | "rejected";
export interface AgentReportReview {
  id: string;
  decision: Exclude<AgentReportReviewStatus, "pending">;
  note: string;
  reviewed_at: string;
  reviewed_by: string;
}
export interface AgentReport {
  id: string;
  run_id: string;
  agent_name: AgentName;
  task_title: string;
  status: AgentReportStatus;
  scope: string[];
  findings: Array<{
    severity: "critical" | "warning" | "info";
    title: string;
    evidence: string;
  }>;
  verification: Array<{
    check: string;
    result: "passed" | "failed" | "not_run";
    evidence: string;
  }>;
  risks: string[];
  recommendation: "approve" | "revise" | "reject";
  handoff: { role: AgentName | "human-owner"; action: string };
  change_ref?: string;
  review_status: AgentReportReviewStatus;
  reviews: AgentReportReview[];
  created_at: string;
  created_by: string;
  updated_at: string;
}
export interface SaleRecord {
  id: string;
  idempotency_key: string;
  partner_id: string;
  wedding_id: string;
  package_code: PackageCode;
  status: "draft" | "paid" | "cancelled" | "refunded";
  period: string;
  occurred_at: string;
  recorded_at: string;
  recorded_by: string;
  net_cents: number;
  vat_rate_bps: number;
  vat_cents: number;
  gross_cents: number;
  qualifying_ordinal: number | null;
  commission_rate_bps: number;
  commission_cents: number;
  commission_policy_snapshot?: import("./finance").CommissionPolicySnapshot;
  package_snapshot?: PackagePolicy;
  platform_cents: number;
  variable_cost_cents?: number;
  payment_method?: "bank_transfer" | "cash" | "card" | "other";
  payment_reference?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  cancelled_at?: string | null;
  cancelled_by?: string | null;
  cancellation_reason?: string | null;
  price_snapshot?: PriceSnapshot;
  refunded_at?: string | null;
  refunded_by?: string | null;
  refund_reason?: string | null;
}
export interface PhotographerSaleRecord {
  id: string;
  idempotency_key: string;
  wedding_id: string;
  photographer_account_id: string;
  photographer_partner_id: string;
  originating_partner_id: string;
  status: "pending_customer_consent" | "pending_payment" | "paid" | "refunded";
  occurred_at: string;
  recorded_at: string;
  recorded_by: string;
  settlement_snapshot: PhotographerSettlementSnapshot;
  refunded_at?: string | null;
  refunded_by?: string | null;
  refund_reason?: string | null;
  delivery_completed_at?: string | null;
  customer_approval_status: "pending_delivery" | "pending" | "approved";
  customer_approved_at?: string | null;
  customer_approved_by?: string | null;
  commercial_consent_version: 1;
  commercial_consent_at?: string | null;
  commercial_consent_by?: string | null;
  payment_method?: "bank_transfer" | "cash" | "card" | "other";
  payment_reference?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
}
export interface ServicePayoutLedgerEntry {
  id: string;
  sale_id: string;
  wedding_id: string;
  beneficiary_type: "photographer" | "originating_partner" | "platform";
  beneficiary_id: string;
  type: "accrual" | "reversal";
  gross_cents: number;
  status:
    | "pending_delivery"
    | "pending_customer_approval"
    | "payable"
    | "approved"
    | "paid"
    | "recognized"
    | "reversed";
  created_at: string;
  created_by: string;
  reason?: string;
  approved_at?: string | null;
  approved_by?: string | null;
  paid_at?: string | null;
  paid_by?: string | null;
  payment_reference?: string | null;
  payment_proof_id?: string | null;
  payment_proof_file_name?: string | null;
  payment_proof_mime_type?: string | null;
  payment_proof_storage_path?: string | null;
  payment_proof_uploaded_at?: string | null;
  payment_proof_uploaded_by?: string | null;
}
export interface Wedding {
  digital_invitation_access?: {
    granted: true;
    granted_at: string;
    granted_by: string;
    reason: string;
  };
  design_request?: DesignRequest;
  custom_design_request?: {
    description: string;
    colors: string;
    text_content: string;
    main_image_url: string;
    reference_image_urls: string[];
    surfaces: Array<
      "qr_card" | "loading_page" | "wedding_page" | "welcome_sign"
    >;
    due_date: string;
    notes: string;
  };
  digital_invitation?: {
    template_version: 1;
    status: "draft" | "published";
    theme_id?: "botanical" | "bluebell-timeless";
    content?: DigitalInvitationContent;
    published_content?: DigitalInvitationContent | null;
    has_unpublished_changes?: boolean;
    event_date: string;
    event_time: string;
    venue: string;
    map_url: string;
    message: string;
    updated_at: string;
    updated_by: string;
    published_at?: string | null;
    published_by?: string | null;
  };
  assigned_photographers?: Array<{
    id: string;
    display_name: string;
    email?: string;
    disabled: boolean;
    delivery_due_at?: string | null;
    expected_file_count?: number | null;
    delivery_status?: "assigned" | "uploading" | "completed";
    delivered_file_count?: number;
    completed_at?: string | null;
  }>;
  design?: WeddingDesign;
  design_revision?: number;
  design_snapshot_id?: string;
  design_status?: "draft" | "revision_requested" | "approved_for_print";
  design_revisions_used?: number;
  design_revision_reason?: string | null;
  design_revision_requested_at?: string | null;
  design_revision_requested_by?: string | null;
  design_approved_at?: string | null;
  design_approved_by?: string | null;
  package_snapshot?: PackagePolicy;
  package_code?: PackageCode;
  add_on_selections?: AddOnSelection[];
  qr_quantity_selections?: QrQuantitySelection[];
  price_snapshot?: PriceSnapshot;
  approval_status?:
    "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  id: string;
  slug: string;
  partner_id: string;
  lead_partner_id?: string;
  seller_partner_id?: string;
  venue_partner_id?: string | null;
  planner_partner_id?: string | null;
  participant_partner_ids?: string[];
  owner_id: string | null;
  title: string;
  event_type: string;
  venue?: string;
  description?: string;
  lifecycle_status?: "draft" | "upcoming" | "active" | "completed" | "archived";
  wizard_step?: number;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  photographer_package_requested?: boolean;
  published_at?: string | null;
  published_by?: string | null;
  commercial_status?:
    "not_ready" | "awaiting_payment" | "payment_verified" | "published";
  archived_at?: string | null;
  bride_name: string;
  groom_name: string;
  wedding_date: string | null;
  cover_images: string[];
  logo_url: string;
  hero_message: string;
  thank_you_message: string;
  created_at: string;
  upload_days: number;
  trash_days: number;
  uploads_open_at: string;
  uploads_close_at: string | null;
  expires_at: string | null;
  upload_enabled: boolean;
  purged_at: string | null;
  photo_count?: number;
  video_count?: number;
  media_bytes?: number;
  reserved_upload_bytes?: number;
  storage_limit_override_bytes?: number;
  storage_limit_approved_at?: string;
  storage_limit_approved_by?: string;
  trashed_photo_count?: number;
  trashed_video_count?: number;
  trashed_count?: number;
  trashed_bytes?: number;
  total?: number;
  trashed?: number;
  size_bytes?: number;
  can_upload?: boolean;
}

export type DesignRequestSurfaceId = "qr" | "loading" | "wedding";
export type DesignRequestStatus =
  | "draft"
  | "submitted"
  | "in_design"
  | "awaiting_approval"
  | "revision_requested"
  | "completed";
export interface DesignRequestSurface {
  mode: "catalog" | "custom";
  template_id?: string;
  template_name?: string;
  template_asset?: string;
  color: string;
  heading: string;
  title: string;
  description: string;
  cta: string;
  footer: string;
  back_title: string;
  back_description: string;
  back_names: string;
  back_date: string;
  style: string;
  format: string;
  typography: string;
  layout: string;
  notes: string;
  reference_image_urls: string[];
  status: DesignRequestStatus;
  delivery?: {
    preview_url: string;
    notes: string;
    version: number;
    uploaded_at: string;
    uploaded_by: string;
  };
  revision_reason?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
}
export interface DesignRequest {
  version: 1;
  status: DesignRequestStatus;
  surfaces: Record<DesignRequestSurfaceId, DesignRequestSurface>;
  updated_at: string;
  updated_by: string;
  submitted_at?: string | null;
  submitted_by?: string | null;
  sent_at?: string | null;
  sent_by?: string | null;
}
export interface PhotographerAssignment {
  id: string;
  wedding_id: string;
  photographer_account_id: string;
  photographer_partner_id: string;
  delivery_due_at: string | null;
  expected_file_count: number | null;
  delivery_status: "assigned" | "uploading" | "completed";
  delivered_file_count: number;
  assigned_at: string;
  assigned_by: string;
  completed_at: string | null;
  completed_by: string | null;
}
export interface AddOnProduct {
  id: string;
  code?: string;
  name: string;
  description: string;
  gross_price_cents: number;
  unit_cost_cents?: number;
  vat_rate_bps?: number;
  quantity?: number;
  /** @deprecated Historical catalog compatibility. New writes use quantity. */
  minimum_quantity?: number;
  /** @deprecated Historical catalog compatibility. New writes use quantity. */
  maximum_quantity?: number;
  eligible_package_codes?: PackageCode[];
  image_url?: string;
  commissionable: boolean;
  category?:
    "qr_print" | "storage_retention" | "digital" | "design" | "organization";
  unit?: "item" | "gib" | "month" | "service" | "organization";
  effect_type?:
    | "print_quantity"
    | "welcome_sign"
    | "storage_gib"
    | "retention_months"
    | "digital_invitation"
    | "custom_design"
    | "second_event";
  effect_value?: number;
  print_format?: "vertical_mini" | "table_card";
  pricing_type?: "fixed" | "package_percentage_discount";
  percentage_bps?: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QrQuantitySelection {
  product_id: string;
  total_quantity: number;
}

export interface PackageConfiguration extends PackagePolicy {
  active: boolean;
  description: string;
  category: string;
  display_order: number;
  featured: boolean;
  campaign_starts_at?: string | null;
  campaign_ends_at?: string | null;
  compare_at_gross_cents?: number | null;
  vat_rate_bps: number;
  target_margin_bps: number;
  variable_cost_cents: number;
  updated_at: string;
  updated_by: string;
}

export interface PhotographerPackageConfiguration extends PhotographerPackagePolicy {
  active: boolean;
  description: string;
  updated_at: string;
  updated_by: string;
}

export interface PartnerCommissionPolicy {
  id: string;
  partner_id: string;
  version: number;
  base_rate_bps: number;
  threshold: number;
  elevated_rate_bps: number;
  tiered: boolean;
  qualifying_package_codes: PackageCode[];
  effective_from: string;
  active: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
}

export interface ExpenseRecord {
  id: string;
  name: string;
  category: string;
  amount_cents: number;
  currency: "TRY";
  vat_rate_bps: number;
  deductible_vat: boolean;
  kind: "fixed" | "variable";
  recurrence: "once" | "monthly" | "yearly";
  payment_status: "planned" | "paid";
  payment_date: string;
  order_id?: string;
  estimated: boolean;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  archived_at?: string | null;
  archived_by?: string | null;
}

export interface TaxConfiguration {
  id: "default";
  version: number;
  default_vat_rate_bps: number;
  category_vat_rate_bps: Record<string, number>;
  carried_vat_cents: number;
  effective_from: string;
  updated_at: string;
  updated_by: string;
}
export interface Media {
  id: string;
  wedding_id: string;
  type: "photo" | "video";
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  duration_seconds?: number;
  uploader_session_id: string;
  source?: "guest" | "photographer";
  uploader_account_id?: string | null;
  photographer_partner_id?: string | null;
  guest_name: string;
  guest_message: string;
  uploaded_at: string;
  deleted_at: string | null;
  purge_at: string | null;
  purging?: boolean;
  processing_status?: "pending" | "processing" | "ready" | "failed";
  processing_attempts?: number;
  processing_started_at?: string;
  preview_path?: string;
  preview_mime_type?: string;
  preview_url?: string;
  url: string;
  download_url: string;
}

export interface MediaSummary {
  photos: number;
  videos: number;
  totalBytes: number;
}

export interface MediaPage {
  items: Media[];
  nextCursor: string | null;
  total: number;
  summary: MediaSummary;
}

export type PrintJobStatus =
  | "assigned"
  | "downloaded"
  | "printing"
  | "ready"
  | "received_by_shineqr"
  | "quality_checked"
  | "delivered_to_partner"
  | "cancelled";

export interface PrintJob {
  id: string;
  wedding_id: string;
  wedding_title: string;
  design_snapshot_id: string;
  design_revision: number;
  qr_product_id: QrProductId;
  printer_account_id: string;
  printer_partner_id: string;
  printer_name: string;
  product_description: string;
  quantity: number;
  due_date: string | null;
  production_notes: string;
  production_pdf?: {
    storage_path: string;
    file_name: string;
    size_bytes: number;
    uploaded_at: string;
    uploaded_by: string;
  };
  printer_preflight?: {
    color_profile_confirmed: boolean;
    fonts_confirmed: boolean;
    resolution_confirmed: boolean;
    bleed_and_trim_confirmed: boolean;
    note: string;
    confirmed_at: string;
    confirmed_by: string;
  };
  fulfillment_records?: Array<{
    status: PrintJobStatus;
    note: string;
    carrier?: string;
    tracking_code?: string;
    at: string;
    by: string;
  }>;
  delivery_proof?: {
    recipient_name: string;
    file_name: string;
    mime_type: "application/pdf" | "image/jpeg" | "image/png";
    storage_path: string;
    size_bytes: number;
    uploaded_at: string;
    uploaded_by: string;
  };
  status: PrintJobStatus;
  status_version: number;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string;
  status_history: Array<{
    status: PrintJobStatus;
    at: string;
    by: string;
  }>;
}
