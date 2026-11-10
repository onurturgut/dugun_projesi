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
  const loadingMessage =
    content?.loading_message || "Davetiyemiz hazırlanıyor";

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
          opacity: theme === "bluebell-timeless" ? 0.72 : 0.58,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          background: "rgba(250,248,243,.2)",
        }}
      />
      <div
        style={{
          position: "relative",
          display: "flex",
          width: 820,
          minHeight: 430,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "54px 72px",
          border: "2px solid rgba(82,108,148,.28)",
          borderRadius: 72,
          background: "rgba(250,248,243,.86)",
          boxShadow: "0 28px 90px rgba(38,63,99,.18)",
          color: "#263f63",
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: 19, letterSpacing: 9, textTransform: "uppercase" }}>
          Dijital Davetiye
        </span>
        <strong style={{ maxWidth: 700, marginTop: 28, fontSize: 76, fontWeight: 500, lineHeight: 1 }}>
          {bride} &amp; {groom}
        </strong>
        <span style={{ maxWidth: 680, marginTop: 42, fontSize: 36, fontWeight: 800, lineHeight: 1.15, letterSpacing: 5, textTransform: "uppercase" }}>
          {loadingMessage}
        </span>
      </div>
    </div>,
    size,
  );
}
