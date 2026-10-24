import type { WeddingDesign } from "./design";
import type { AddOnSelection, PackageCode, PackagePolicy, PriceSnapshot } from "./commercial-policy";
export type Role = "platform" | "partner" | "owner";
export type StaffRole =
  | "platform_admin"
  | "finance_manager"
  | "operations_manager"
  | "design_manager"
  | "partner_owner"
  | "partner_sales"
  | "partner_operations_design"
  | "photographer"
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
  | "design.select"
  | "design.request_revision"
  | "design.approve_for_print"
  | "finance.view_own"
  | "finance.view_all"
  | "commission.view_own"
  | "commission.manage"
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
  logo_url: string;
  active: boolean;
  created_at: string;
}
export type AgentName =
  | "accounting-analyst" | "architecture-guardian" | "business-analyst" | "code-reviewer"
  | "frontend-developer" | "marketing-strategist" | "orchestrator" | "qa-engineer"
  | "security-reviewer" | "senior-backend" | "system-operator" | "ui-ux-designer";
export type AgentReportStatus = "complete" | "needs-review" | "blocked";
export type AgentReportReviewStatus = "pending" | "approved" | "changes_requested" | "rejected";
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
  findings: Array<{ severity: "critical" | "warning" | "info"; title: string; evidence: string }>;
  verification: Array<{ check: string; result: "passed" | "failed" | "not_run"; evidence: string }>;
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
  status: "paid" | "refunded";
  period: string;
  occurred_at: string;
  recorded_at: string;
  recorded_by: string;
  net_cents: number;
  vat_rate_bps: number;
  vat_cents: number;
  gross_cents: number;
  qualifying_ordinal: number | null;
  commission_rate_bps: 3000 | 4000;
  commission_cents: number;
  platform_cents: number;
  price_snapshot?: PriceSnapshot;
  refunded_at?: string | null;
  refunded_by?: string | null;
  refund_reason?: string | null;
}
export interface Wedding {
  assigned_photographers?: Array<{
    id: string;
    display_name: string;
    email?: string;
    disabled: boolean;
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
  price_snapshot?: PriceSnapshot;
  approval_status?: "draft" | "submitted" | "changes_requested" | "approved" | "rejected";
  submitted_at?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  id: string;
  slug: string;
  partner_id: string;
  owner_id: string | null;
  title: string;
  event_type: string;
  venue?: string;
  description?: string;
  lifecycle_status?: "draft" | "upcoming" | "active" | "completed" | "archived";
  wizard_step?: number;
  customer_name?: string;
  customer_email?: string;
  published_at?: string | null;
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
export interface AddOnProduct {
  id: string;
  name: string;
  description: string;
  gross_price_cents: number;
  commissionable: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
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
