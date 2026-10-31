"use client";
import Image from "next/image";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api } from "@/lib/api";

type Photographer = {
  id: string;
  display_name: string;
  partner_id: string;
  partner_name: string;
  logo_url: string;
};

export default function PhotographersPage() {
  const photographers = useQuery({
    queryKey: ["photographers"],
    queryFn: () => api<Photographer[]>("/admin/photographers"),
  });
  return (
    <AdminShell>
      <div className="admin-heading">
        <div>
          <p className="admin-kicker">PROFESYONEL ÇEKİM AĞI</p>
          <h1>Fotoğrafçılar</h1>
          <p className="admin-subtitle">
            Kayıtlı fotoğrafçıları görüntüleyin; atamayı ilgili organizasyonun
            içinden yapın.
          </p>
        </div>
      </div>
      {photographers.error ? (
        <Notice>{photographers.error.message}</Notice>
      ) : null}
      <section className="admin-panel detail-list photographer-directory">
        <header>
          <Camera />
          <div>
            <span>AKTİF HESAPLAR</span>
            <h2>Fotoğrafçı dizini</h2>
          </div>
        </header>
        <div className="photographer-directory-grid">
          {photographers.data?.map((item) => {
            const initials = item.display_name
              .split(/\s+/)
              .filter(Boolean)
              .slice(0, 2)
              .map((part) => part[0]?.toLocaleUpperCase("tr-TR"))
              .join("");
            return (
              <article className="photographer-directory-card" key={item.id}>
                <div className="photographer-directory-logo">
                  {item.logo_url ? (
                    <Image
                      src={item.logo_url}
                      alt={`${item.display_name} logosu`}
                      fill
                      unoptimized
                      sizes="160px"
                    />
                  ) : (
                    <span aria-label={`${item.display_name} için logo bulunmuyor`}>
                      {initials || <Camera size={32} aria-hidden="true" />}
                    </span>
                  )}
                </div>
                <h3>{item.display_name}</h3>
                {item.partner_name && item.partner_name !== item.display_name ? (
                  <p>{item.partner_name}</p>
                ) : null}
              </article>
            );
          })}
        </div>
        {photographers.data?.length === 0 ? (
          <p>
            Kayıtlı fotoğrafçı bulunmuyor. Yetkili hesaplardan fotoğrafçı
            göreviyle yeni hesap oluşturabilirsiniz.
          </p>
        ) : null}
      </section>
    </AdminShell>
  );
}
