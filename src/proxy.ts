import { NextResponse, type NextRequest } from "next/server";

const rootDomain = process.env.INVITATION_ROOT_DOMAIN || "davetiye.shineqr.com";

export function proxy(request: NextRequest) {
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(":")[0].toLowerCase();
  if (request.nextUrl.pathname !== "/" || !host.endsWith(`.${rootDomain}`)) return NextResponse.next();
  const subdomain = host.slice(0, -(rootDomain.length + 1));
  if (!subdomain || subdomain.includes(".") || !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(subdomain)) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/invitation/${subdomain}`;
  return NextResponse.rewrite(url);
}

export const config = { matcher: "/" };
