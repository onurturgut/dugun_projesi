import { AdminShell } from "@/components/admin/AdminShell";
import { RouteState } from "@/components/system/RouteState";

export default function AdminLoading() {
  return (
    <AdminShell>
      <RouteState
        code="YÖNETİM PANELİ"
        title="Çalışma alanı hazırlanıyor."
        description="Organizasyon ve hesap bilgileri yükleniyor."
        loading
        compact
      />
    </AdminShell>
  );
}
