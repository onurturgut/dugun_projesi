# P3 — Entegrasyon Hazırlık Katmanı

## Durum

P3 başlatıldı; sağlayıcıdan bağımsız hazırlık ve güvenlik katmanı kodlandı. Gerçek dış servis bağlantıları sağlayıcı/hesap/onay bilgileri bulunmadığı için etkin değildir.

## Kapsanan yetenekler

- Sanal POS
- Bankacılık ve mutabakat
- SMS
- WhatsApp
- E-posta
- Takvim
- Muhasebe

## Yapılanlar

- Her yetenek için sağlayıcı ve gerekli gizli yapılandırmaların varlığını kontrol eden readiness modeli eklendi.
- API yanıtı hiçbir gizli anahtar değerini açığa çıkarmaz; yalnızca eksik değişken adlarını ve hazırlık durumunu verir.
- İşletme ayarlarında hazır sağlayıcı sayısı gösterilir.
- HMAC-SHA256 webhook imza doğrulama çekirdeği ve hatalı imza testleri eklendi.
- `external_actions_enabled` güvenli varsayılanla `false` tutulur.

## Henüz yapılmayanlar

- Sağlayıcı hesabı açma veya API anahtarı üretme
- Gerçek kart provizyonu/tahsilatı
- IBAN transferi başlatma
- SMS, WhatsApp veya e-posta gönderme
- Takvim etkinliği oluşturma
- Muhasebe veya vergi belgesi gönderme

Bu işlemler sağlayıcı seçimi, sözleşme, test hesabı, webhook adresi ve insan onayı gerektirir.

## Sonraki P3 işleri

1. Onaylanan sağlayıcı için adapter uygulaması
2. Idempotent payment intent ve webhook event koleksiyonları
3. Outbox/retry/dead-letter teslimat mekanizması
4. Sağlayıcı sandbox sözleşme testleri
5. Staging E2E ve operasyon runbook'u
