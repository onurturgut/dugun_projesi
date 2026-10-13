import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/server/db";

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const event = await (await db()).collection("weddings").findOne(
    { id, purged_at: null, lifecycle_status: { $nin: ["draft", "archived"] } },
    { projection: { slug: 1 } },
  );
  if (!event?.slug) return new NextResponse("Organizasyon bulunamadı.", { status: 404 });
  return NextResponse.redirect(new URL(`/wedding/${event.slug}`, request.url), 307);
}
