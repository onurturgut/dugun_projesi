import { V4Footer, V4Navbar, V4Theme } from "@/components/v4/ui";

const navigation = [
  { href: "/", label: "Ana sayfa" },
  { href: "/dijital-davetiyeler", label: "Davetiyeler" },
  { href: "/isletmeler", label: "İşletmeler" },
  { href: "/paketler", label: "Paketler" },
] as const;

const footerGroups = [
  {
    title: "Keşfet",
    links: [
      { href: "/nasil-calisir", label: "Nasıl çalışır?" },
      { href: "/ozellikler", label: "Özellikler" },
      { href: "/isletmeler", label: "İşletmeler" },
      { href: "/paketler", label: "Paketler" },
    ],
  },
  {
    title: "ShineQR",
    links: [
      { href: "/dijital-davetiyeler", label: "Dijital davetiyeler" },
      { href: "/isletmeler-icin", label: "İşletmeler için" },
      { href: "/iletisim", label: "İletişim" },
      { href: "/hukuki/kvkk-aydinlatma", label: "KVKK" },
    ],
  },
] as const;

export function V4MarketingShell({
  children,
  currentPath,
}: {
  children: React.ReactNode;
  currentPath?: string;
}) {
  return (
    <V4Theme>
      <V4Navbar
        items={navigation}
        currentPath={currentPath}
        ctaLabel="Hemen başla"
      />
      <main>{children}</main>
      <V4Footer
        description="QR ile toplanmış anılar, profesyonel albümler ve dijital davetiyeler için yeni nesil etkinlik platformu."
        groups={footerGroups}
      />
    </V4Theme>
  );
}
