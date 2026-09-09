import { redirect } from "next/navigation";
import { session } from "@/lib/server/auth";
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
  if (!user) redirect("/auth");
  if (user.must_change_password) redirect("/account/password");
  return children;
}
