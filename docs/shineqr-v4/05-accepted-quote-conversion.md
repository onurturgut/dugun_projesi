# ShineQR V4 — Kabul Edilen Teklif Dönüşümü

**Durum:** Uygulama kodu tamamlandı; gerçek veritabanına migration uygulanmadı.

## Dönüşüm çıktıları

Kabul edilmiş CRM teklifi tek MongoDB transaction'ı içinde aşağıdaki kayıtlara
dönüştürülür:

1. İşletmeye bağlı kalıcı müşteri cari kimliği
2. Organizasyon taslağı
3. Ödenmemiş satış taslağı
4. Teklif ile üretilen kayıtları bağlayan idempotent dönüşüm kaydı
5. CRM sistem aktivitesi

Satıcı işletme istemciden alınmaz; oturumdaki `partner_id` kullanılır. Müşteri cari
kimliği işletme + normalize e-posta anahtarıyla bulunur veya oluşturulur. Aynı müşteri
başka bir işletmede ayrı cari kimliğe sahiptir.

## Tarihsel finans kuralı

Satış taslağının toplamı, KDV tutarı ve satırları kabul edilmiş teklif snapshot'ından
alınır. Güncel katalog yeniden okunmaz. Satırların farklı KDV oranları korunur ve satış
`tax_mode: line_snapshot` olarak işaretlenir.

Teklif ürünlerinin komisyon uygunluğu henüz onaylı bir finans politikasıyla
eşleştirilmediği için dönüşüm sırasında komisyon, platform payı, tahsilat veya hakediş
oluşturulmaz. `custom-quote` satışında finans/komisyon eşleştirmesi yapılmadan ödeme
onayı sunucu tarafından `409` ile engellenir.

## İdempotency ve yarış koşulu

- `crm_quote_conversions.quote_id` benzersizdir.
- `sales.idempotency_key` değeri `crm-quote:{quote_id}` biçimindedir.
- Aynı teklif iki oturumdan dönüştürülürse yalnızca bir transaction kayıt üretir.
- İkinci çağrı mevcut dönüşüm bağını döndürür.
- Kısmi kayıt bırakmamak için müşteri, organizasyon, satış, dönüşüm ve aktivite aynı
  transaction içindedir.

## Arayüz

Kabul edilmiş teklif kartında gelin/damat adı, mekân ve tarih tamamlanabilir. Dönüşümden
sonra organizasyon taslağına doğrudan bağlantı gösterilir. Eksik alanlar organizasyon
taslağında tamamlanabilir; müşteri için otomatik kullanıcı hesabı veya geçici parola
üretilmez.

## İndeksler

- `customer_accounts_id_uq`
- `customer_accounts_partner_identity_uq`
- `crm_quote_conversions_quote_uq`
- `crm_quote_conversions_partner_lead_created`

Dry-run migration müşteri kimliği ve teklif dönüşümü mükerrerlerini raporlar. Apply ve
rollback bu geliştirme sırasında çalıştırılmadı.

## Sonraki aşama

Teklif satırlarının komisyon ve hakediş politikasına eşlenmesi; ardından onaylı satış
taslağında kapora/tahsilat yöntemleri ve muhasebe belge akışının açılmasıdır.
