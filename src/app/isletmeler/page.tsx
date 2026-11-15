import type { Metadata } from "next";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { BusinessDirectory } from "@/components/business/BusinessDirectory";

export const metadata: Metadata = {
  title: "Dijital İşletmeler",
  description: "ShineQR işletmelerini ve dijital mağazalarını keşfedin.",
};

export default function BusinessesPage() {
  return (
    <MarketingShell>
      <BusinessDirectory />
    </MarketingShell>
  );
}
