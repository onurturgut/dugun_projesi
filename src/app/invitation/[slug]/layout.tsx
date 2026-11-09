import type { Metadata } from "next";
import type { ReactNode } from "react";
import { digitalInvitationAccessEnabled } from "@/lib/digital-invitation";
import type { Wedding } from "@/lib/models";
import { db } from "@/lib/server/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
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
  const couple = wedding
    ? `${wedding.bride_name || ""} & ${wedding.groom_name || ""}`.trim()
    : "Dijital Davetiye";
  const title = published ? `${couple} · Dijital Davetiye` : "Dijital Davetiye";
  const description =
    content?.message ||
    (published
      ? `${couple} sizi bu özel günü birlikte kutlamaya davet ediyor.`
      : "ShineQR dijital davetiye bağlantısı.");
  const rootDomain =
    process.env.INVITATION_ROOT_DOMAIN || "davetiye.shineqr.com";
  const url = `https://${slug}.${rootDomain}`;

  return {
    metadataBase: new URL(url),
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: "ShineQR Dijital Davetiye",
      url,
      title,
      description,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function InvitationLayout({ children }: { children: ReactNode }) {
  return children;
}
