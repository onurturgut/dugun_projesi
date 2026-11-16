import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { session } from "@/lib/server/auth";
import { allowsVisualQaBypass } from "@/lib/visual-qa";
export const metadata = {
  title: "Yönetim — Düğün Anıları",
  robots: { index: false, follow: false },
};
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await session();
  const requestHeaders = await headers();
  const visualQaBypass = allowsVisualQaBypass(
    process.env.VISUAL_QA_ALLOW_BYPASS,
    requestHeaders.get("x-shineqr-visual-qa"),
  );
  if (!user && !visualQaBypass) redirect("/auth");
  if (user?.must_change_password) redirect("/account/password");
  return <div className="event-page-background">{children}</div>;
}
