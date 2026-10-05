# Design QA — Hazır QR Kartı Tasarımları

- Source visual truth: `public/qrtasarım/` içindeki 10 referans görsel
- Implementation surface: Yönetim paneli → Tasarım → Masanızdaki küçük hatıra
- Tested viewports: 1262 px masaüstü ve 390 × 844 px mobil
- Tested state: Tasarım paneli açık, “Ay Işığı” seçili

## Sonuç

- 10 referans görselin tamamı ayrı hazır tasarım olarak görünüyor.
- Kaynak görseller tutarlı 3:2 önizleme alanlarında kullanılıyor.
- Masaüstü ve mobilde iki sütunlu ızgara, etiketler ve seçili durum işareti okunaklı.
- Seçim kart şablonunu, bağımsız kart temasını ve özel renkleri birlikte uyguluyor.
- Seçimden sonra canlı önizleme otomatik olarak QR kartı sekmesine geçiyor.
- Yatay taşma veya Next.js hata katmanı bulunmadı.
- 10/10 görsel tarayıcıda başarıyla yüklendi.

## Kanıt

- Masaüstü: `artifacts/qr-presets-desktop.png`
- Mobil: `artifacts/qr-presets-mobile.png`
- Otomatik kontroller: TypeScript, ESLint ve 11 test başarılı.

## Açık bulgu

P0, P1, P2 veya P3 seviyesinde açık tasarım kusuru bulunmadı.

final result: passed

---

# Design QA — Wedding film şeridi yeniden tasarımı

- Source visual truth path: `C:/Users/onurt/OneDrive/Resimler/Ekran Görüntüleri/Ekran görüntüsü 2026-10-03 223935.png`
- Source pixels: 459 × 398 px; paylaşılan iOS sorun durumu
- Implementation screenshot path: mevcut değil
- Intended CSS viewport: 393 px mobil; density normalization uygulanamadı
- State: iki hareketli fotoğraf film şeridi ve altındaki başlık
- Browser-rendered evidence: ortamda IAB, Chrome veya Edge tarayıcı yüzeyi bulunamadı
- Primary interactions tested: animasyon davranışı kod ve reduced-motion kuralı düzeyinde kontrol edildi; tarayıcı etkileşim testi engellendi
- Console errors checked: tarayıcı bulunmadığı için engellendi

## Bulgular

- Kaynakta görülen sağ kenar taşmasına karş sayfa, kabuk, sahne ve her satırda yatay kırpma sınırı eklendi.
- Mobilde döndürme kaldırıldı; film şeridinin hareketli iç rayı sabit genişlikli kırpma alanından ayrı tutuldu.
- Film deliklerinin altı, fotoğraf ile ray arası ve fotoğraf kareleri arası `#d8b978` belirgin altın-şampanya yüzeyle dolduruldu.
- Tipografi, renk paleti, fotoğraf içeriği ve metin kopyası değiştirilmedi.

## Karşılaştırma geçmişi

- İlk kaynak incelemesindeki P1: iOS'ta film şeridinin sayfa genişliğini aşması ve sağda siyah alan oluşması.
- Uygulanan düzeltme: `overflow: clip` + `hidden` geri dönüşü, `min-width: 0`, yüzde 100 mantıksal genişlik ve mobilde dönüşümün kaldırılması.
- Uygulama sonrası görsel kanıt: tarayıcı yüzeyi bulunmadığı için alınamadı.

## Doğrulanan kontroller

- TypeScript: geçti
- ESLint: geçti
- 11 otomatik test: geçti
- Next.js production build: geçti

## Engelleyici

Kaynak ve tarayıcıda render edilmiş uygulama aynı karşılaştırma girdisinde açılamadı. Bu nedenle görsel QA geçmiş sayılamaz.

final result: blocked
