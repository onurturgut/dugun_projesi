"use client";
import Link from "next/link";
import { Building2, Camera, FileClock, Images, Printer, Users, WalletCards } from "lucide-react";
import type { Account } from "@/lib/models";
import { effectiveStaffRole } from "@/lib/access-control";

export function AccountRoleCenter({ account }: { account: Account }) {
  const role = effectiveStaffRole(account);
  const items = account.role === "platform"
    ? [
        ["/admin/accounts", "Hesap ve yetkiler", "Platform, partner ve müşteri hesaplarını yönetin.", Users],
        ["/admin/partners", "İşletmeler", "Salon, organizasyon, fotoğraf ve baskı işletmelerini inceleyin.", Building2],
        ["/admin/finance-center", "Finans politikaları", "Fiyat ve ticari yapılandırmayı yetkiniz kapsamında açın.", WalletCards],
        ["/admin/audit", "İşlem kayıtları", "Kritik hesap ve operasyon hareketlerini inceleyin.", FileClock],
      ]
    : account.role === "owner"
      ? [["/admin", "Organizasyonum ve albümüm", "Albüm, davetiye, QR ve organizasyon tercihlerinize dönün.", Images]]
      : role === "photographer"
        ? [["/admin", "Atanmış çekimler", "Profesyonel dosya yükleme ve teslimat işlerinizi açın.", Camera]]
        : role === "print_vendor"
          ? [["/admin/print-jobs", "Baskı işlerim", "Atanmış üretim, ön kontrol ve teslimat işlerini açın.", Printer]]
          : [["/admin/accounts", "Ekip ve yetkiler", "İşletme personeli ve görev rollerini yönetin.", Users], ["/admin/finance-center", "Komisyon ve kazanç", "İşletmenize ait finans görünümünü açın.", WalletCards]];
  return <section className="account-role-center" aria-labelledby="role-center-title"><div className="account-settings-section-title"><span>ÇALIŞMA ALANI</span><h2 id="role-center-title">Hesabınıza özel yönetim</h2><p>Rolünüz kapsamında kullanabildiğiniz operasyon alanları.</p></div><div>{items.map(([href, title, description, Icon]) => <Link href={href as string} key={href as string}><Icon size={20}/><span><strong>{title as string}</strong><small>{description as string}</small></span></Link>)}</div></section>;
}
