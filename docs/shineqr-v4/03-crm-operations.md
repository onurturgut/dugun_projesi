# ShineQR V4 — CRM Operasyon Katmanı

**Durum:** Uygulama kodu tamamlandı; gerçek veritabanına migration uygulanmadı.

## Kapsam

- Talebi aynı işletmedeki aktif ekip üyesine atama
- Not, telefon, e-posta ve toplantı aktivitelerini kronolojik saklama
- Sistem atama olaylarını değiştirilemez aktivite olarak kaydetme
- Talebe bağlı görev, öncelik, vade ve sorumlu oluşturma
- Görev durum geçişlerini sunucuda doğrulama
- Tüm yazma işlemlerinde tenant doğrulaması, yetki kontrolü ve audit kaydı
- CRM kartında açık görev sayısı ve mobil uyumlu operasyon paneli

## Veri sınırları

`crm_activities` için güncelleme ve silme endpoint'i yoktur. Kullanıcı aktiviteleri
ve sistem olayları eklemeli bir zaman çizelgesi olarak korunur. `crm_tasks` ve
`crm_activities` sorguları her zaman oturumdaki `partner_id` ile sınırlandırılır.
Sorumlu kullanıcı ayrıca aynı işletmeye bağlı, aktif bir partner hesabı olmalıdır.

## Durum geçişleri

- Yapılacak → Devam ediyor, Tamamlandı, İptal edildi
- Devam ediyor → Yapılacak, Tamamlandı, İptal edildi
- Tamamlandı → Yapılacak
- İptal edildi → Yapılacak

Güncellemede mevcut durum da filtreye eklenir. Böylece iki oturum aynı görevi
eşzamanlı değiştirirse ikinci işlem `409` ile durur.

## İndeksler

- `crm_activities_id_uq`
- `crm_activities_partner_lead_timeline`
- `crm_tasks_id_uq`
- `crm_tasks_partner_lead_status_due`
- `crm_tasks_partner_assignee_status_due`

Bu indeksler mevcut `business-crm-v1` migration paketine ve yeni kurulum betiğine
eklendi. Canlı veya staging veritabanına bu geliştirme sırasında uygulanmadı.

## Sonraki aşama

Versiyonlu teklif modeli; teklif satırlarında KDV dahil müşteri fiyatı, tarihsel
ürün/fiyat snapshot'ı, sunucu kontrollü durum geçişleri ve kabul/red kanıtı ile
kurulacaktır. Kabul edilmiş teklif sonradan güncel katalogla sessizce yeniden
hesaplanmayacaktır.
