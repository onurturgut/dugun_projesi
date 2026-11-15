# P2.1 — Teklif Finans ve Komisyon Onayı

## Durum

Uygulama kodu tamamlandı. Gerçek veritabanı migration'ı ve staging entegrasyon testi uygulanmadı.

## Yapılanlar

- Finans yöneticisi teklif satırlarından komisyona uygun olanları açıkça seçer.
- Partner komisyon oranı baz puan olarak, değişken maliyet tam sayı kuruş olarak girilir.
- Komisyon KDV hariç uygun satırların net toplamından hesaplanır.
- Onay sonucu satışta değiştirilemez `quote_finance_snapshot` olarak saklanır.
- Onaylı snapshot; uygun satır kimlikleri, net matrah, oran, partner komisyonu, platform net payı, maliyet, onaylayan ve zamanı içerir.
- İkinci onayla snapshot ezilemez; ticari revizyon yeni teklif sürümü gerektirir.
- Yetki sunucuda `commission.manage` ile korunur ve audit kaydı yazılır.

## Arayüz

Süperadmin finans satış defterinde teklif kaynaklı satış için ödeme formundan önce finans eşleştirme kartı görür. Her satırın net ve KDV dâhil tutarı gösterilir; oran ve maliyet boş başlar, sistem değer uydurmaz.

## Risk ve rollback

- Onaylı oran hukuki veya mali doğruluk garantisi değildir; yetkili finans kullanıcısının sorumluluğundadır.
- Snapshot değiştirilemez. Hatalı onayda satış iptal edilmeli ve yeni teklif sürümü oluşturulmalıdır.
- Geri alma, yalnızca henüz ödeme almamış taslak kaydın insan incelemesiyle iptal edilmesidir; tarihsel snapshot silinmez.
