# ShineQR V4 — P0 İşletme ve CRM Migration Paketi

**Durum:** 15 Kasım 2026 tarihinde `wedding_fethiye` veritabanına başarıyla uygulandı ve post-check tamamlandı.  
**Migration kimliği:** `business-crm-v1`

## Amaç

- CRM taleplerinde eşzamanlı aynı isteğin tek kayda dönüşmesini DB seviyesinde
  garanti etmek.
- Tenant CRM listesi ve tekrar gönderim kontrolü sorgularını indekslemek.
- İşletme katalog ve mağaza slug sorgularını güvenceye almak.
- Eski sistemde operasyon rolüyle açılmış gerçek tekil işletme sahiplerini güvenli
  biçimde `partner_owner` adayına dönüştürmek.

## Komutlar

```text
yarn business-crm:migrate:check
yarn business-crm:migrate:apply
yarn business-crm:migrate:rollback
```

İlk komut varsayılan olarak salt okunur dry-run raporudur. Apply öncesi ve sonrası
çalıştırıldı. Rollback çalıştırılmadı.

## Uygulama sonucu — 15 Kasım 2026

- Hedef veritabanı: `wedding_fethiye`
- Migration: `business-crm-v1`
- Ön kontrol engeli: yok
- Mükerrer lead/slug/teklif/cari/dönüşüm: yok
- Oluşturulan veya doğrulanan indeks: 18
- `partner_owner` rolüne taşınan eski tekil işletme hesabı: 3
- Belirsiz tenant: 0
- Post-check: 18 indeksin tamamı mevcut
- Bekleyen rol adayı: 0

Rol değişikliklerinin önceki değerleri `business_crm_migration_backups`
koleksiyonunda tutulur. Rollback betiği hazırdır ancak çalıştırılmamıştır.

## Güvenlik kapıları

- Aynı tenant + idempotency anahtarında mükerrer lead varsa apply durur.
- Mükerrer lead `id` veya mağaza slug varsa apply durur.
- Mevcut `partner_owner` bulunan tenant değiştirilmez.
- Birden fazla aktif partner hesabı bulunan tenant otomatik değiştirilmez ve
  `ambiguous` olarak raporlanır.
- Yalnızca tek aktif hesabı bulunan ve eski rolü `photographer` veya
  `print_vendor` olan tenant otomatik adaydır.
- Rolün önceki değeri ayrı backup koleksiyonunda saklanır.
- Rollback yalnızca migration’ın oluşturduğu indeksleri kaldırır; daha önce var
  olan aynı adlı indeksleri korur.
- Rollback yalnızca hâlâ `partner_owner` olan migration kayıtlarını eski rolüne
  döndürür; sonradan elle değiştirilmiş hesabı ezmez.

## İndeksler

| Koleksiyon               | İndeks                                  | Amaç                                  |
| ------------------------ | --------------------------------------- | ------------------------------------- |
| `business_leads`         | `business_leads_id_uq`                  | Lead kimliği benzersizliği            |
| `business_leads`         | `business_leads_partner_idempotency_uq` | Tenant bağlı idempotency              |
| `business_leads`         | `business_leads_partner_status_updated` | CRM Kanban/liste sorgusu              |
| `business_leads`         | `business_leads_partner_phone_created`  | Tekrar gönderim sınırı sorgusu        |
| `business_catalog_items` | `business_catalog_partner_active_order` | Vitrin ve katalog sıralaması          |
| `partners`               | `partners_storefront_slug_uq`           | Kamuya açık mağaza slug benzersizliği |
| `crm_activities`         | `crm_activities_partner_lead_timeline`  | Tenant/lead aktivite geçmişi          |
| `crm_tasks`              | `crm_tasks_partner_lead_status_due`     | Görev durumu ve vade sorgusu          |
| `crm_quotes`             | `crm_quotes_partner_lead_version_uq`    | Teklif sürümü yarış koşulu             |
| `customer_accounts`      | `customer_accounts_partner_identity_uq` | Kalıcı tenant cari kimliği             |
| `crm_quote_conversions`  | `crm_quote_conversions_quote_uq`        | Tek dönüşüm garantisi                  |

## Yarış koşulu davranışı

Public lead endpoint’i uygulama seviyesindeki ilk kontrolden sonra insert yapar.
İki istek aynı anda insert’e ulaşırsa unique indeks yalnızca birini kabul eder.
Diğer istek `E11000` aldığında aynı tenant ve idempotency anahtarıyla oluşan kaydı
okuyup aynı lead kimliğiyle başarılı idempotent yanıt döndürür.

## Rollback sınırı

Migration satış, ödeme, cari, muhasebe belgesi, komisyon, hakediş, Wedding veya
tarihsel snapshot kayıtlarını değiştirmez. Mükerrer mevcut kayıtları otomatik
silmez ya da birleştirmez; insan incelemesi için raporlar.
