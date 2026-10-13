# ShineQR Tasarım Merkezi V2 — Teknik Envanter ve Faz 1–2 Raporu

Tarih: 14 Ekim 2026

## 1. Mevcut sistemin durumu

- Uygulama Next.js 16.1 App Router, React 19.2 ve TypeScript 5.8 kullanıyor.
- MongoDB erişimi `src/lib/server/db.ts`, sunucu işlemleri tek catch-all route üzerinden `src/lib/server/handler.ts` içinde yürütülüyor.
- Roller `platform`, `partner`, `owner`; tenant ve organizasyon erişimi `src/lib/server/access.ts` ile sınırlandırılıyor.
- Organizasyon, Wedding sayfası, loading/açılış ve QR kartı tek bir `WeddingDesign` yapılandırmasında tutuluyor.
- Her tasarım kaydı önce `design_snapshots` koleksiyonuna değişmez snapshot olarak yazılıyor, ardından organizasyon kaydı optimistic revision kontrolüyle güncelleniyor.
- Kalıcı QR hedefi `/q/{event.id}`. Bu route organizasyon slug’ına yönlendiriyor; renk, metin ve tema değişiklikleri basılmış QR hedefini değiştirmiyor.
- Fotoğraf/video yükleme ve Cloudflare R2 akışı tasarım katmanından bağımsız. Bu çalışma bu API’leri veya medya kayıtlarını değiştirmedi.

## 2. Korunan altyapı

- MongoDB organizasyon, kullanıcı, medya ve snapshot kayıtları.
- R2 yükleme, önizleme, indirme ve lifecycle işlemleri.
- Mevcut authentication, MFA, rol ve tenant izolasyonu.
- Wedding sayfası ile loading/açılış bileşenleri.
- Mevcut organizasyon kimliği ve `/q/{event.id}` yönlendirmesi.
- Eski `WeddingDesign` alanları geriye dönük çözümleme için korunuyor.

## 3. Değiştirilen tasarım sistemi

- `WeddingDesign` içine şablon kimliği, şablon sürümü, preset, font eşleşmesi ve QR metin rolleri eklendi.
- The Editorial sürüm 1; Krem Taş, Adaçayı Yeşili ve Terracotta preset’leriyle tanımlandı.
- Baskı kompozisyonu mockup üstüne bindirme yerine bağımsız SVG render olarak üretildi.
- Ön/arka yüz, 4 modül quiet zone, siyah/beyaz QR, 3 mm bleed, 5 mm safe area ve 300 DPI raster hedefi sağlandı.
- SVG, PNG ve minimal RGB PDF çıktısı destekleniyor. PDF/X ve gerçek CMYK renk yönetimi desteklenmiyor.

## 4. Eski dosyalar ve temizlik kararı

- Eski QR preset kodları ve referansları aktif organizasyonların geriye uyumluluğu için bu aşamada fiziksel olarak silinmedi.
- ZIP içindeki beş PNG dosyası 3D ürün mockup’ıdır; baskı şablonu olarak kullanılmadı.
- Çalışma ağacı başlangıçta çok sayıda kullanıcı değişikliği ve silinmiş dosya içerdiği için güvenli, yalnızca bu işe ait bir Git geri dönüş commit’i oluşturulamadı.
- R2, kullanıcı albümleri, müşteri kayıtları ve veritabanı üzerinde silme yapılmadı.
- Görsel onaydan sonra eski presetlerin kullanım sayımı yapılmalı; yalnızca sıfır referanslı dosyalar ayrı bir temizlik değişikliğinde kaldırılmalı.

## 5. Yeni veri modeli

Organizasyonun mevcut `design` alanına geriye uyumlu olarak şu QR alanları eklendi:

```json
{
  "qrTemplateId": "the-editorial",
  "qrTemplateVersion": 1,
  "qrPresetId": "editorial-cream",
  "qrFontPairId": "cormorant-manrope",
  "qrHook": "Bu günün bir karesi de senden olsun.",
  "qrDescription": "Fotoğraf ve videolarını bizimle paylaş.",
  "qrCta": "QR kodu okut ve anılarını yükle."
}
```

Kaydetme sırasında tam yapılandırma ve etkinlik bağlamı `design_snapshots` koleksiyonunda revision numarasıyla saklanır.

## 6. Oluşturulan sayfalar

- `/admin/design-center`: platform yöneticisi için Tasarım Merkezi genel bakış, modül envanteri, koleksiyon yayın durumu ve preset özeti.
- `/admin/{eventId}/design/qr`: mevcut organizasyon stüdyosu içinde The Editorial seçimi, özelleştirme, canlı ön/arka yüz ve baskı çıktısı.

## 7. Oluşturulan/değiştirilen bileşenler

- The Editorial token ve validasyon modeli.
- The Editorial bağımsız SVG baskı renderer’ı.
- 15 × 20 cm çift taraflı fiziksel ürün tanımı ve baskı işaretleri.
- Tasarım Merkezi overview arayüzü ve platform navigasyon bağlantısı.
- QR stüdyosunda preset, font, hook, açıklama ve CTA kontrolleri.

## 8. Uygulama sırası

1. Teknik envanter ve Next.js 16 yerel dokümantasyon kontrolü.
2. ZIP mockuplarının görsel analizi.
3. Geriye uyumlu QR veri alanlarının eklenmesi.
4. The Editorial ön/arka yüz renderer’ı.
5. Fiziksel ürün ve export ölçülerinin 15 × 20 cm’ye taşınması.
6. Tasarım Merkezi yönetim ekranı.
7. Tip, lint, unit test ve production build doğrulaması.
8. Görsel onaydan sonra Velvet Flow, Botanical, Modern Arch ve Aurora.

## 9. Teknik riskler

- Tarayıcı üretimli PDF RGB/JPEG tabanlıdır; profesyonel CMYK veya PDF/X olarak sunulmamalıdır.
- Fontların ekranda fallback’e düşmemesi için üretimde lisanslı self-hosted dosyalar veya doğrulanmış font sağlayıcısı gerekir.
- Gerçek basılı örneklerde farklı telefon, mesafe ve ışık koşullarında QR tarama testi hâlâ fiziksel QA gerektirir.
- Eski ve yeni QR preset kontrolleri geçiş sürecinde aynı stüdyoda görünür; görsel onay sonrası eski panel kontrollü biçimde kaldırılmalıdır.
- Mevcut kirli çalışma ağacı nedeniyle temizlik veya toplu migration öncesinde ayrı bir kullanıcı onaylı checkpoint gerekir.

## Faz 1–2 sonucu

Faz 1’in merkezi görünümü ve sürüm/preset temeli hazırlandı. Faz 2 kapsamında yalnızca The Editorial üretime bağlandı. Kalan dört ana tasarım kilitli tutuldu ve görsel onaydan önce uygulanmadı.
