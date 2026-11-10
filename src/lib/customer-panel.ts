const ORGANIZATION_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function organizationIdFromAdminPath(pathname: string) {
  const segment = pathname.match(/^\/admin\/([^/]+)/)?.[1];
  return segment && ORGANIZATION_ID.test(segment) ? segment : undefined;
}

export function accountAvatarUrl(
  role: "platform" | "partner" | "owner",
  partnerLogoUrl?: string | null,
) {
  return role === "owner" ? undefined : partnerLogoUrl || undefined;
}
