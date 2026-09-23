# Organizasyon başına fiyat ve maliyet modeli

Hazırlanma: 17 Eylül 2026. Bu çalışma satış önerisi ve senaryo bütçesidir; gerçekleşmiş kullanım, tedarikçi faturası, muhasebe kârı veya talep tahmini değildir. Uygulamadaki fiyat ve limitleri değiştirmez.

## Hesabın kapsamı

- Birim: bir organizasyonun tüm yükleme, saklama, görüntüleme/indirme ve destek yaşam döngüsü.
- Planlama kuru 50 TL/USD; güncel kur iddiası değildir. Satış fiyatları %20 KDV varsayımıyla brüt; gelir hesabı fiyat / 1,20. Hizmetin vergisel sınıflandırması teyit edilmelidir.
- 3 ay saklama; tüm dosyaların 3 ay boyunca mevcut olduğu basitleştirmesi. Organizasyondan önceki yüklemeler ek saklama oluşturur. Gerçek R2 faturalaması günlük tepe boyutlarından hesaplanır.
- Fotoğraf ortalama 5 MB, video 150 MB; 1 GB = 1.000 MB. Bunlar ölçüm değildir. Tek dosya uygulama sınırları yaklaşık 15 MiB / 200 MiB olarak kalır.
- Toplam medya çıkışı saklanan boyutun 3 katı: tüm görüntüleme, tekli indirme, ZIP ve yeniden denemeler birlikte. Her bir işlem için ayrıca 3 kat sayılmaz. ZIP kalıcı saklanmıyor.
- R2 A işlemleri dosya sayısının 1,05 katı, B işlemleri 6 katı varsayıldı. İşlem tutarları birim dağıtım hesabıdır. Cloudflare'ın hesap/ay düzeyindeki ücretsiz hakları ve fatura birimine yuvarlaması uygulanmadı; organizasyon başına ayrı fatura oluşmaz.
- Vercel Frankfurt tarifesi referans alındı: Fast Data Transfer 0,15 USD/GB ve Fast Origin Transfer 0,06 USD/GB. Gerçek ziyaretçi/sunucu bölgeleri farklı fiyat doğurabilir. Bu iki kalem aynı dosyanın farklı ağ aşamalarıdır.
- Vercel CPU, bellek ve istek adetleri örnek varsayımlardır, profil ölçümü değildir. Sırasıyla Mini/Standart/Yoğun için 0,1/0,2/0,6 CPU-saat; 1/2/6 GB-saat; 5.000/10.000/30.000 istek.
- Vercel aylık 20 USD kredi ve dahil kullanım indirimleri birim maliyetten düşülmedi. Ücretli trafik referansı + platform bedeli ihtiyatlı fiyatlandırma bütçesidir, birebir fatura tahmini değildir. Flat Rate CDN uygunluğu varsayılmadı: yoğun medya dağıtımı kapsam dışı olabilir.
- Destek emeği 300 TL/saat; 15/20/45 dakika. Kurucunun kendi emeği ekonomik maliyettir, mutlaka nakit çıkışı değildir.
- Değişken maliyetin %15'i rezerv; toplam yukarı doğru 10 TL'ye yuvarlanır. Harcanmayan rezerv muhasebe gideri değildir.

## Birim senaryolar

| | Mini | Standart | Yoğun |
|---|---:|---:|---:|
| Fotoğraf | 400 | 800 | 2.400 |
| Video | 20 | 40 | 120 |
| Saklanan GB | 5 | 10 | 30 |
| Yaşam döngüsü toplam çıkış GB | 15 | 30 | 90 |
| R2 saklama TL | 11,25 | 22,50 | 67,50 |
| R2 işlem dağıtımı TL | 0,14 | 0,29 | 0,87 |
| Vercel iki transfer kalemi TL | 157,50 | 315,00 | 945,00 |
| CPU/bellek/istek TL | 2,48 | 4,96 | 14,88 |
| Destek emeği TL | 75,00 | 100,00 | 225,00 |
| Rezerv ve yuvarlama dahil değişken bütçe TL | 290 | 510 | 1.450 |
| Önerilen partner fiyatı, KDV dahil TL | 1.800 | 2.500 | 4.500 |

Dosya sayıları örnek karışımlardır; hem bu adetler hem sınırsız dosya boyutu vaat edilmez. Önerilen GB kotaları mevcut kodda uygulanmış değildir. Trafik 3 kat varsayımı bir indirme hakkı veya mevcut kullanım sınırı değildir.

## Sabit bütçe ve hacim

| Kalem | Yıllık TL | Tür |
|---|---:|---|
| Vercel Pro, tek deploy koltuğu, 20 USD/ay | 12.000 | Tarife × planlama kuru |
| MongoDB Flex, 30 USD/ay bütçe | 18.000 | Paylaşılan cluster; kapasite yeterliliği test edilmedi |
| İzleme/worker/veritabanı yedekleme payı, 5 USD/ay | 3.000 | Varsayım, alınmış hizmet değil |
| Alan adı | 1.000 | Varsayım |
| Partner edinme, demo, ulaşım | 10.000 | Varsayım; ayrıca birim CAC eklenmedi |
| Şirket gideri 15.000 TL/ay | 180.000 | Kullanıcının senaryo olarak hesaplanmasını istediği varsayım |
| Toplam | 224.000 | |

Şirket gideri Bağ-Kur, muhasebe ve adres/kira için toplam zarf niteliğindedir; güncel prim hesabı değildir. Kurucu destek emeği buraya tekrar eklenmedi. Eski plandaki ayrı uygulama sunucusu, Vercel'e ek olarak sayılmadı. MongoDB işlemleri paylaşılan cluster bütçesinde olduğundan işlem başına tekrar ücret eklenmedi; daha büyük cluster gerekirse bütçe değişir.

Yıllık 250 organizasyonda sabit pay 896 TL/organizasyondur. Mini/Standart/Yoğun toplam birim bütçeleri 1.186 / 1.406 / 2.346 TL; KDV hariç gelir / bütçe oranları 1,26 / 1,48 / 1,60'tır. Bu oran ROI veya muhasebe net kârı değildir.

Standart 2.500 TL fiyatla 100 / 175 / 250 satışta, tüm yaşam döngüsü değişken bütçesi satışa ayrıldığında yıllık bütçe sonuçları -66.667 / +51.333 / +169.333 TL'dir. Gerçek aylık nakit akışı değildir; satış sezonu, tahsilat ve üç aylık maliyetlerin takvim yılları arasında kayması ayrıca modellenmelidir.

| Aylık şirket gideri TL | Yıllık toplam sabit TL | Standart 2.000 TL başa baş | Standart 2.500 TL başa baş |
|---|---:|---:|---:|
| 10.000 | 164.000 | 142 | 105 |
| 15.000 | 224.000 | 194 | 143 |
| 20.000 | 284.000 | 246 | 181 |

Başa baş = tavan(yıllık sabit bütçe / (KDV hariç birim gelir − değişken birim bütçe)). Satışların aynı Standart kullanımda olduğu varsayılır. Paket karışımı için ağırlıklı katkı payı gerekir; üç paketin ayrı başa baş adetleri toplanmaz.

## Partner faydası ve hassasiyet

Örnek nihai müşteri fiyatları 2.700 / 3.750 / 6.750 TL KDV dahil seçilirse, partnerin kendi maliyetlerinden önce KDV hariç alış-satış farkı 750 / 1.041,67 / 1.875 TL olur. Nihai fiyatlar talep araştırmasıyla doğrulanmamış öneridir, zorunlu yeniden satış fiyatı değildir. Baskı ve müşteri desteğini partner karşılıyorsa bu farktan düşmelidir.

Standart albüm çıkışı boyutun 1 / 3 / 6 katı olduğunda değişken bütçe yaklaşık 270 / 510 / 880 TL'dir; istek ve CPU varsayımları sabit tutuldu. 40 / 50 / 60 TL kurda standart değişken bütçe 440 / 510 / 590 TL olur.

Vercel üzerinden medya çıkışı azaltılırsa Standart senaryodaki 315 TL brüt trafik referansı azaltılabilir. Yetkili, kısa ömürlü R2 indirme bağlantıları ve ayrı ZIP işleme tasarımı değerlendirme konusudur; geliştirme/worker maliyeti ve erişim iptali davranışı hesaplanmadan tamamı net tasarruf sayılamaz.

## Hariç tutulanlar ve ölçülecekler

- Gelir vergisi, kuruluş gideri, ilk geliştirme yatırımının geri kazanımı, büyük özellik geliştirmeleri ve tam zamanlı kurucu maaşı.
- Fiziksel QR baskı/kargo, disk teslimi, kart komisyonu, iadeler ve tahsilat kaybı. Ana model havale varsayar. Örnek %3 brüt kart kesintisi Standart satışta 75 TL ek maliyet olur; bu oran sağlayıcı teklifi değildir.
- Tedarikçi faturalarındaki vergiler/kur makası ve bunların indirilebilirliği; muhasebeciyle netleştirilmeli. Hesaplanan satış KDV'si doğrudan ödenecek KDV değildir.
- İkinci tam medya yedeği yok; 3.000 TL izleme payı tam medya yedeği sözü vermez.
- Aylık trafik bölgeleri, gerçekten faturalanan kullanım, iPhone/Android dosya boyutu dağılımı, destek dakikaları, albüm indirme oranı, başarısız yükleme ve tekrar oranı pilotta ölçülmeli.
- Üç ay sonra fiziksel silme görevinin çalıştığı ve büyük ZIP'lerin tamamlandığı doğrulanmalı.

## Kaynaklar ve yeniden hesaplama

Tarifeler 17 Eylül 2026 tarihinde resmî belgelerden kontrol edildi:

- https://developers.cloudflare.com/r2/pricing/
- https://vercel.com/docs/pricing/regional-pricing/fra1
- https://vercel.com/pricing
- https://vercel.com/docs/plans/pro-plan
- https://vercel.com/docs/pricing/flat-rate-cdn
- https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/

Yerel dayanaklar: GENEL-IS-PLANI.md, src/lib/server/media-response.ts, src/lib/server/handler.ts, src/lib/config.ts. Bunlar fiyat varsayımı ve uygulama akışını gösterir, gerçekleşmiş fatura değildir.

`python financial-planning/unit_economics.py` hesapları tekrar çalıştırır. Çıktılar `results.json` ve Excel'de açılabilir `unit-costs.csv` dosyalarına yazılır. Girdi parametreleri betiğin başındadır; sonuçlar betikle doğrulandı. Yeniden çalıştırıldığında bu açıklama dosyasındaki tablolar kendiliğinden güncellenmez.
