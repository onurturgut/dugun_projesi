"use client";
import { useQuery } from "@tanstack/react-query";
import { Camera } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Notice } from "@/components/admin/Fields";
import { api } from "@/lib/api";

type Photographer = { id: string; display_name: string; partner_id: string };

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
      <section className="admin-panel detail-list">
        <header>
          <Camera />
          <div>
            <span>AKTİF HESAPLAR</span>
            <h2>Fotoğrafçı dizini</h2>
          </div>
        </header>
        {photographers.data?.map((item) => (
          <div className="detail-static-row" key={item.id}>
            <div>
              <strong>{item.display_name}</strong>
              <small>İşletme kimliği: {item.partner_id}</small>
            </div>
            <span>Yükleme odaklı erişim</span>
          </div>
        ))}
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
