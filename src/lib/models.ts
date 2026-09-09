export type Role = "platform" | "partner" | "owner";
export interface Account {
  id: string;
  email: string;
  role: Role;
  partner_id: string | null;
  display_name: string;
  must_change_password: boolean;
  disabled: boolean;
}
export interface Partner {
  id: string;
  name: string;
  logo_url: string;
  active: boolean;
  created_at: string;
}
export interface Wedding {
  id: string;
  slug: string;
  partner_id: string;
  owner_id: string | null;
  title: string;
  event_type: string;
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
  total?: number;
  trashed?: number;
  size_bytes?: number;
  can_upload?: boolean;
}
export interface Media {
  id: string;
  wedding_id: string;
  type: "photo" | "video";
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  uploader_session_id: string;
  guest_name: string;
  guest_message: string;
  uploaded_at: string;
  deleted_at: string | null;
  purge_at: string | null;
  purging?: boolean;
  url: string;
  download_url: string;
}
