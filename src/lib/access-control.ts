import type { Account, Permission, Role, StaffRole } from "./models";
export type { Permission, StaffRole } from "./models";

const allPermissions: Permission[] = [
  "partner.manage", "partner.manage_staff", "organization.create", "organization.update",
  "organization.submit", "organization.approve", "organization.activate", "organization.cancel",
  "album.view", "album.download", "album.manage", "design.select", "design.request_revision",
  "design.approve_for_print", "finance.view_own", "finance.view_all", "commission.view_own",
  "commission.manage", "account.impersonate_readonly",
  "agent.report.view", "agent.report.manage",
];

export const ROLE_PERMISSIONS: Record<StaffRole, readonly Permission[]> = {
  platform_admin: allPermissions,
  finance_manager: ["finance.view_all", "commission.manage"],
  operations_manager: ["organization.update", "organization.approve", "organization.activate", "organization.cancel", "album.view", "album.download", "album.manage"],
  design_manager: ["organization.update", "design.select", "design.request_revision", "design.approve_for_print", "album.view"],
  partner_owner: ["partner.manage_staff", "organization.create", "organization.update", "organization.submit", "organization.cancel", "album.view", "album.download", "album.manage", "design.select", "design.request_revision", "design.approve_for_print", "finance.view_own", "commission.view_own"],
  partner_sales: ["organization.create", "organization.update", "organization.submit", "design.select", "design.request_revision"],
  partner_operations_design: ["organization.update", "organization.submit", "album.view", "album.download", "album.manage", "design.select", "design.request_revision", "design.approve_for_print"],
  organization_owner: ["organization.update", "album.view", "album.download", "album.manage", "design.select", "design.request_revision", "design.approve_for_print"],
  organization_editor: ["organization.update", "album.view", "album.download", "design.select", "design.request_revision"],
  album_viewer: ["album.view", "album.download"],
};

export function defaultStaffRole(role: Role): StaffRole {
  if (role === "platform") return "platform_admin";
  if (role === "partner") return "partner_owner";
  return "organization_owner";
}

const compatibleRoles: Record<Role, readonly StaffRole[]> = {
  platform: ["platform_admin", "finance_manager", "operations_manager", "design_manager"],
  partner: ["partner_owner", "partner_sales", "partner_operations_design"],
  owner: ["organization_owner", "organization_editor", "album_viewer"],
};

export function effectiveStaffRole(account: Pick<Account, "role" | "staff_role">) {
  return account.staff_role && compatibleRoles[account.role].includes(account.staff_role)
    ? account.staff_role
    : defaultStaffRole(account.role);
}

export function hasPermission(role: StaffRole, permission: Permission) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function accountHasPermission(account: Account, permission: Permission) {
  if (account.disabled) return false;
  if (account.permission_overrides?.[permission] === false) return false;
  return hasPermission(effectiveStaffRole(account), permission);
}
