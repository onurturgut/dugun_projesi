# ShineQR planlama dosyaları

Hazırlanma tarihi: 6 Ekim 2026  
Kapsam: mevcut kod tabanı, mevcut iş/finans dokümanları, 6 Ekim 2026 tarihli yerel yük testi ve belirtilen 3.000 / 5.000 / 6.009 TL müşteri fiyatları.

Bu klasör, ShineQR'ı teknik ürün olarak değerlendirmek, fiyatlandırmak, partnerlere anlatmak, WhatsApp üzerinden satmak ve kontrollü biçimde pazara çıkarmak için hazırlanmış karar setidir.

## Okuma sırası

1. [Ürün ve pazar raporu](01-URUN-VE-PAZAR-RAPORU.md)
2. [Teknik mimari ve risk raporu](02-TEKNIK-MIMARI-VE-RISK-RAPORU.md)
3. [Fiyatlandırma, maliyet ve partnerlik modeli](03-FIYATLANDIRMA-MALIYET-VE-PARTNERLIK.md)
4. [Satış, WhatsApp ve sunum konuşma rehberi](04-SATIS-WHATSAPP-VE-SUNUM-PLAYBOOK.md)
5. [Pazarlama senaryoları ve 90 günlük plan](05-PAZARLAMA-SENARYOLARI-VE-90-GUN-PLAN.md)
6. [Operasyon, sözleşme, KPI ve kontrol listeleri](06-OPERASYON-SOZLESME-KPI.md)
7. [PWA, fotoğrafçı çalışma alanı ve dijital davetiye](07-PWA-FOTOGRAF-CALISMA-ALANI-VE-DIJITAL-DAVETIYE.md)
8. [Çok taraflı organizasyon, fotoğrafçı ve baskı akışı](08-COK-TARAFLI-ORGANIZASYON-FOTOGRAFCI-VE-BASKI-AKISI.md)
9. [Ana sayfa pazarlama ve detaylı ürün anlatımı](09-ANASAYFA-PAZARLAMA-VE-DETAYLI-URUN-ANLATIMI.md)

## En kısa yönetici özeti

- ShineQR, misafirlerin uygulama indirmeden QR kod üzerinden fotoğraf/video yüklediği; içeriğin yalnızca yetkili platform, partner ve organizasyon sahibi tarafından görüldüğü özel albüm hizmetidir.
- En güçlü ilk müşteri grubu düğün organizasyon firmaları, düğün mekânları, fotoğrafçılar ve etkinlik ajanslarıdır. Son kullanıcıya doğrudan satış ikinci kanal olmalıdır.
- Mevcut ürün partner/organizasyon izolasyonu, doğrudan R2 yükleme, özel albüm, QR üretimi, tasarım özelleştirme, ZIP indirme, çöp kutusu ve otomatik silme akışına sahiptir.
- 6 Ekim 2026 yerel yük testinde 10.800 istekte hata görülmemiştir. 30 eşzamanlı kullanıcıda p95 yaklaşık 918 ms, 50 kullanıcıda 1,60 sn, 100 kullanıcıda 2,91 sn ölçülmüştür. Bu sonuç üretim kapasite garantisi değildir.
- Ticari çekirdek teklif olarak 5.000 TL seçeneği en dengeli görünmektedir. %20 KDV ve KDV hariç satışın %30 partner payı varsayımıyla partner payı 1.250 TL, platform katkısı sabit gider öncesi yaklaşık 2.156,67 TL'dir.
- 3.000 TL seçeneği edinme/pilot ürünü olarak sınırlandırılmalıdır; ana ürün yapılırsa yıllık başabaş yaklaşık 227 satışa çıkar. 6.009 TL seçeneğinin matematiği güçlüdür ancak müşteri karşısında neden 6.009 olduğu açıklanamıyorsa 6.000, 5.990 veya 6.250 TL gibi daha anlaşılır bir fiyat değerlendirilmelidir.
- Kod bugün farklı ticari paketlere göre toplam depolama kotası, baskı adedi, ödeme, komisyon veya sözleşme durumunu otomatik uygulamıyor. Paket farkları sözleşme/operasyonla yönetilebilir; “sistem otomatik sınırlar” sözü verilmemelidir.
- Canlı satıştan önce KVKK/aydınlatma/onay metni, kalıcı worker, izleme/uyarı, yedekleme politikası, canlı R2 mobil testi, ticari sözleşmeler ve faturalama akışı tamamlanmalıdır.

## Belge kullanım kuralı

Bu dosyalardaki finansal rakamlar teklif veya net kâr garantisi değildir. Vergi, KDV, komisyon belgelendirmesi, şirket türü ve sözleşmeler mali müşavir ve hukuk danışmanıyla doğrulanmalıdır. Teknik kapasite rakamları yerel ölçümdür; canlı ortamdan ayrı bir yük üreticisiyle yeniden ölçülmelidir.

