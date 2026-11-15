import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { BusinessDetail } from "@/components/business/BusinessDetail";

export const metadata: Metadata = {
  title: "İşletme Mağazası",
  description: "ShineQR işletme mağazası, hizmetleri ve iletişim bilgileri.",
};

export default async function BusinessPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return (
    <MarketingShell>
      <BusinessDetail slug={slug} />
    </MarketingShell>
  );
}
