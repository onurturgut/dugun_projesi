# ShineQR V4 — Versiyonlu CRM Teklifleri

**Durum:** Uygulama kodu tamamlandı; gerçek veritabanına migration uygulanmadı.

## İş kuralları

- Müşteriye gösterilen tüm fiyatlar KDV dâhil tam sayı kuruş olarak saklanır.
- Her satır KDV oranını, net tutarı, KDV tutarını ve brüt tutarı snapshot olarak taşır.
- Sabit fiyatlı katalog satırında istemci fiyatına güvenilmez; sunucudaki aktif katalog fiyatı dondurulur.
- Başlangıç fiyatlı veya teklif usulü katalog satırında görüşülen fiyat açıkça girilir ve snapshot'a alınır.
- Yeni revizyon mevcut teklifi değiştirmez; aynı seri içinde yeni bir sürüm oluşturur.
- Kabul edilmiş teklif terminal kayıttır ve yeni sürümle değiştirilemez.
- Elle kaydedilen kabul veya red kararında müşteri karar kanıtı notu zorunludur.
- Teklif snapshot'ı güncel katalog değiştiğinde sessizce yeniden hesaplanmaz.

## Durum akışı

- Taslak → Gönderildi
- Gönderildi → Görüntülendi, Kabul edildi, Reddedildi, Süresi doldu
- Görüntülendi → Kabul edildi, Reddedildi, Süresi doldu
- Kabul, red, süre dolumu ve yeni sürümle değiştirilme terminal durumlardır.

Durum güncellemesi mevcut durum filtresiyle yapılır. Eşzamanlı ikinci güncelleme `409`
ile durdurulur. Yeni sürüm üretimi transaction içinde gerçekleşir ve tenant + lead +
version benzersiz indeksi yarış koşulunu veritabanı seviyesinde engeller.

## Arayüz

CRM talep kartındaki operasyon alanında:

- katalog ürünü veya özel teklif satırı eklenebilir,
- adet, KDV dâhil birim fiyat ve KDV oranı girilebilir,
- geçerlilik tarihi ve teklif notu eklenebilir,
- sürüm geçmişi, toplam ve satır snapshot'ları görüntülenebilir,
- izin verilen durum geçişleri uygulanabilir.

SMS/e-posta/WhatsApp sağlayıcısı bağlı olmadığı için “Gönderildi” ve “Görüntülendi”
durumları şimdilik yetkili kullanıcı tarafından işaretlenir; bu durum gerçek teslimat
kanıtı olarak yorumlanmamalıdır.

## İndeksler

- `crm_quotes_id_uq`
- `crm_quotes_partner_lead_version_uq`
- `crm_quotes_partner_status_validity`

Dry-run migration, indeks oluşturulmadan önce tekrarlanan teklif kimliği ve teklif
sürümü gruplarını raporlar. Apply veya rollback bu geliştirmede çalıştırılmadı.

## Sınır

Teklifin kabul edilmesi bu aşamada otomatik satış, organizasyon, tahsilat, cari veya
hakediş kaydı oluşturmaz. Bu dönüşüm sonraki aşamada ayrı, idempotent ve transaction
tabanlı bir komut olarak uygulanacaktır.
