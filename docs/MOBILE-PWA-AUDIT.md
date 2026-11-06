# ShineQR mobil ve PWA denetimi

Tarih: 6 Kasım 2026

## Kapsam ve yöntem

Bu çalışma; pazarlama sayfaları, kimlik doğrulama, partner yönetimi, tasarım
araçları, finans ekranları ve özel düğün albümü yüzeylerinin kaynak kodu ve
responsive kuralları üzerinden incelenmesini kapsar. Oturumdaki tarayıcı yüzeyi
kullanılamadığı için cihaz ekran görüntüsüyle görsel doğrulama yapılamadı. Bu
belge tam WCAG uyumluluğu veya cihaz laboratuvarı testi iddiasında bulunmaz.

## Akış sağlığı

1. **Pazarlama ve genel sayfalar — iyi:** 760 px ve 420/520 px kırılımları,
   yatay taşma sınırları, azaltılmış hareket tercihi ve mobil navigasyon kuralları
   bulunuyor.
2. **Giriş ve hesap — iyi:** 767 px altında tek kolon, safe-area alt dolgusu ve
   kısa ekran yüksekliği için ayrı kurallar mevcut.
3. **Partner yönetimi — dikkat gerekli:** geniş veri tabloları kontrollü yatay
   kaydırma kullanıyor. Gerçek cihazda sabit başlık, odak sırası ve 44 px dokunma
   hedefleri ayrıca doğrulanmalı.
4. **Tasarım çalışma alanları — orta:** küçük ekranda adım rayları yatay kaydırmaya,
   önizleme ve denetçi alanları tek kolona dönüyor. 320–390 px cihazlarda uzun
   düzenleme oturumları gerçek dokunma testi gerektiriyor.
5. **Özel düğün albümü — iyi:** çok sayıda 479/720 px kırılımı, `svh`, safe-area
   ve hareket azaltma desteği bulunuyor. Özel medya güvenlik nedeniyle çevrimdışı
   cache kapsamına alınmadı.
6. **Finans ve ödeme — güvenli:** finans ve API yanıtları service worker tarafından
   tutulmuyor; çevrimdışıyken eski finans verisi gösterilmiyor.
7. **PWA kurulumu — tamamlandı:** manifest, standart/maskable/Apple ikonları,
   standalone görünüm, tema rengi, kısayollar ve üretim service worker kaydı var.
8. **Çevrimdışı durum — tamamlandı:** JavaScript paketlerine bağımlı olmayan statik
   fallback ekranı mevcut. Kullanıcıya özel albüm ve yönetim verilerinin neden
   çevrimdışı gösterilmediği açıkça anlatılıyor.

## Cache ve güvenlik kararı

- `/api`, `/admin`, `/auth`, `/account`, davet kabulü, QR yönlendirmesi ve özel
  düğün albümü istekleri cache dışıdır.
- Yalnızca sürümlü Next.js statik dosyaları ile PWA ve marka varlıkları sınırlı
  bir cache içinde tutulur.
- Service worker güncellemesi ağdan yeniden doğrulanır; eski PWA cache sürümleri
  aktivasyonda temizlenir ve statik cache 80 kayıtla sınırlandırılır.

## Kalan cihaz testleri

- iOS Safari: Ana Ekrana Ekle, status bar ve safe-area.
- Android Chrome: kurulum istemi, maskable ikon ve standalone açılış.
- 320, 360, 390 ve 430 px genişliklerde admin tabloları ve tasarım editörleri.
- Ekran okuyucu, klavye odağı, %200 yakınlaştırma ve renk kontrastı.
- Uçak modunda açık sayfa, yeni navigasyon ve bağlantı geri geldiğinde yenileme.
