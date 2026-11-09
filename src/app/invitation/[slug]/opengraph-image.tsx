import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import { digitalInvitationAccessEnabled } from "@/lib/digital-invitation";
import type { Wedding } from "@/lib/models";
import { db } from "@/lib/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "ShineQR dijital davetiye";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const wedding = await (await db()).collection<Wedding>("weddings").findOne(
    { slug },
    {
      projection: {
        _id: 0,
        bride_name: 1,
        groom_name: 1,
        event_type: 1,
        package_snapshot: 1,
        digital_invitation_access: 1,
        digital_invitation: 1,
      },
    },
  );
  const published =
    wedding &&
    digitalInvitationAccessEnabled(wedding) &&
    wedding.digital_invitation?.status === "published";
  const content = published
    ? wedding.digital_invitation?.published_content ||
      wedding.digital_invitation?.content
    : null;
  const theme = content?.theme_id || wedding?.digital_invitation?.theme_id;
  const asset =
    theme === "bluebell-timeless"
      ? "digital-invitation/bluebell/bluebell-watercolor.png"
      : "digital-invitation/botanical/gallery-1.jpg";
  const image = await readFile(path.join(process.cwd(), "public", asset));
  const mime = asset.endsWith(".png") ? "image/png" : "image/jpeg";
  const background = `data:${mime};base64,${image.toString("base64")}`;
  const bride = published ? wedding?.bride_name || "Gelin" : "Dijital";
  const groom = published ? wedding?.groom_name || "Damat" : "Davetiye";
  const message =
    content?.message || "Bu özel günü birlikte kutlamaya davetlisiniz.";

  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: theme === "bluebell-timeless" ? "#f5f1e7" : "#f8e9e8",
      }}
    >
      <img
        src={background}
        alt=""
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.48,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "linear-gradient(90deg,rgba(250,248,243,.96),rgba(250,248,243,.72),rgba(250,248,243,.35))",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 92px",
          color: "#263f63",
        }}
      >
        <span style={{ fontSize: 22, letterSpacing: 8, textTransform: "uppercase" }}>
          {published ? wedding?.event_type || "Davet" : "ShineQR"} · Dijital Davetiye
        </span>
        <strong style={{ maxWidth: 820, marginTop: 28, fontSize: 86, fontWeight: 500, lineHeight: 1 }}>
          {bride} &amp; {groom}
        </strong>
        <p style={{ maxWidth: 720, marginTop: 30, fontSize: 28, lineHeight: 1.45, color: "#46566e" }}>
          {message}
        </p>
        <span style={{ marginTop: 35, fontSize: 20, letterSpacing: 4, textTransform: "uppercase" }}>
          davetiye.shineqr.com
        </span>
      </div>
    </div>,
    size,
  );
}
