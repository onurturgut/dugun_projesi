# ShineQR kalan iş grupları

Bu kayıt 21 Ekim 2026 tarihinde, ilk üç grup (çerez, kimlik doğrulama, hukuki altyapı) uygulamaya alınırken oluşturuldu.

- [ ] 4. 3/6/12 aylık toplu satın alma, teklif ve indirim motoru
- [ ] 5. Nişan ve düğünü tek Plan 3 satın alımı altında bağlama
- [ ] 6. Dokuz ek wedding şablonu ve loading page koleksiyonu
- [ ] 7. Fiziksel ürün stok, baskı, teslimat ve saklama operasyonu
- [ ] 8. Staging, insan onaylı yayınlama ve güvenli rollback sistemi
- [ ] 9. Agent görevlerini zamanlanmış veya görev bazlı otomatik çalıştırma
- [ ] 10. Son aşama — merkezi ödeme altyapısı ve ödeme linkleri

## Ertelenen ödeme altyapısı kapsamı

Bu iş grubu diğer ürün ve operasyon işleri tamamlandıktan sonra, projenin son
aşamasında ele alınacaktır. O zamana kadar harici ödeme linkine tıklanması
tahsilat kanıtı sayılmaz ve mevcut kayıtlar otomatik olarak ödenmiş duruma
getirilmez.

- Organizasyon oluşturma akışı, ödeme adımından önce organizasyonu ve müşteri
  fiyatını taslak olarak kaydeder.
- Ana paket, ek ürünler, indirimler ve KDV dahil toplam tarihsel fiyat kopyasında
  korunur.
- Yönetici, tutarı ve organizasyon bilgilerini kontrol ettikten sonra ilgili
  taslağa siparişe özel ödeme linkini ekler.
- Fotoğrafçı paketi atandığında ayrı bir ödeme bekleyen satış oluşur ve bu satışa
  özel ödeme linki gösterilir.
- Tahsilat yalnızca ödeme sağlayıcısının imzalı bildirimi veya doğrulanmış işlem
  kaydıyla kesinleşir; yalnızca linke tıklamak yeterli değildir.
- Doğrulanmış tahsilattan sonra fotoğrafçı, organizasyoncu ve ShineQR payları
  satış anındaki KDV hariç uygun matrah ve dondurulmuş kurallarla hesaplanır.
- Müşteri tahsilatı ile partner hakediş ödemeleri ayrı yaşam döngülerinde tutulur;
  iadeler, işlem referansları, ödeme belgeleri ve audit kayıtları korunur.
- Kullanılacak ödeme kuruluşu, webhook desteği, işlem maliyeti, iade/itiraz
  kuralları ve izin verilen ödeme alan adları uygulama başlamadan önce ayrıca
  onaylanır.

## Tamamlanma koşulu

Her iş grubu; sunucu yetkilendirmesi, audit kaydı, kullanıcı arayüzü, entegrasyon testi, operasyon dokümanı ve geri dönüş planı olmadan tamamlandı sayılmaz.
