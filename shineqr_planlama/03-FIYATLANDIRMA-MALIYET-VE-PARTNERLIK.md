# ShineQR fiyatlandırma, maliyet ve partnerlik modeli

## Yönetici özeti

Önerilen ticari omurga 5.000 TL'lik pakettir. 3.000 TL giriş/pilot seçeneği, 6.009 TL ise premium seçenek olarak konumlandırılabilir. Her üç paketin yalnızca isim ve fiyatla ayrılması zayıf olur; müşteri seçim yapabilmek için somut kapsam farkı görmelidir.

Bu raporda hesaplama varsayımları:

- Müşteri fiyatları KDV dahil.
- Genel KDV varsayımı %20; hizmet sınıflandırması mali müşavirce teyit edilmeli.
- KDV hariç satışın %30'u partner, %70'i ShineQR.
- Yıllık sabit bütçe: 224.000 TL (mevcut iç finansal plandaki senaryo).
- Standart paket konservatif değişken bütçesi: 760 TL/organizasyon.
- Rakamlar vergi öncesi planlama değeridir; gerçekleşmiş fatura veya net kâr değildir.

## Önce netleştirilmesi gereken fiyat sorusu

“3.000 / 5.000 / 6.009 TL” iki farklı şekilde kullanılabilir:

1. **Aynı hizmet için üç olası satış fiyatı:** İç karar karşılaştırmasıdır; müşteriye üçü birden sunulmaz.
2. **Üç farklı paket:** Müşteriye seçenek sunulur; kapsam, baskı, destek ve hizmet seviyesi farklı olmalıdır.

Ticari öneri ikinci modeldir. Ancak mevcut kod paket kotası, baskı adedi veya ödeme durumunu otomatik uygulamaz. İlk aşamada farklar operasyon/sözleşmeyle yönetilir; P1 geliştirmesinde sisteme eklenir.

## Önerilen müşteri paketleri

### Paket 1 — Dijital Anı | 3.000 TL

Amaç: Fiyata duyarlı çift, küçük organizasyon veya ilk pilot.

- Organizasyona özel mobil paylaşım sayfası
- Fotoğraf/video yükleme
- İsteğe bağlı isim ve mesaj
- Özel albüm ve indirme
- Standart tema/tasarım seçenekleri
- Dijital PNG/SVG QR dosyası
- 10 standart QR masa kartı veya baskısız dijital teslim seçeneği
- Standart destek
- Varsayılan 7 gün yükleme, 3 ay saklama

Sınır: “Sınırsız” ifadesi kullanılmamalı. Ticari toplam medya adedi/GB sınırı belirlenip kodda uygulanana kadar adil kullanım politikası yazılmalıdır.

### Paket 2 — Anı Plus | 5.000 TL — önerilen ana paket

Amaç: Standart düğün/nişan müşterisi; satış sunumunda “en çok tercih edilen” olarak konumlandırılabilir.

- Dijital Anı paketinin tüm özellikleri
- 20 standart QR masa kartı
- Organizasyona uyarlanmış kapak, renk, açılış ve kart tasarımı
- Partnerle kurulum kontrolü
- Etkinlik öncesi QR bağlantı kontrolü
- Öncelikli destek
- Etkinlik sonrası albüm/indirme hatırlatması

### Paket 3 — Signature | 6.009 TL

Amaç: Premium organizasyon, kişiselleştirme ve daha fazla fiziksel sunum isteyen müşteri.

- Anı Plus paketinin tüm özellikleri
- 30 QR masa kartı
- Premium kişiselleştirme ve sunum kontrolü
- Öncelikli kurulum ve etkinlik günü destek penceresi
- Etkinlik sonrası indirme desteği
- Ek bir dijital QR kullanım formatı (karşılama ekranı/sosyal paylaşım görseli gibi)

**6.009 TL karar notu:** Bu fiyat bilinçli bir marka anlamı taşımıyorsa müşteri ve partner “neden 6.009?” diye soracaktır. 6.000 TL daha sade, 5.990 TL psikolojik, 6.250 TL ise mevcut eski finansal dokümanla uyumludur. 6.009 TL korunacaksa “09” için marka hikâyesi bulunmalıdır; aksi hâlde teklif dokümanında yazım hatası algısı yaratabilir.

## Aynı kapsam varsayımıyla finansal karşılaştırma

Tüm fiyatlarda 760 TL aynı değişken bütçe kullanılırsa:

| KDV dahil fiyat | KDV hariç satış | Partner %30 | ShineQR %70 | Değişken bütçe | Sabit gider öncesi katkı | Başabaş satış |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 3.000 TL | 2.500,00 | 750,00 | 1.750,00 | 760,00 | 990,00 | 227 |
| 5.000 TL | 4.166,67 | 1.250,00 | 2.916,67 | 760,00 | 2.156,67 | 104 |
| 6.009 TL | 5.007,50 | 1.502,25 | 3.505,25 | 760,00 | 2.745,25 | 82 |

Başabaş = `tavan(224.000 / organizasyon katkısı)`.

### Yıllık sonuç — aynı kapsam ve 760 TL değişken bütçe

| Ücretli organizasyon | 3.000 TL | 5.000 TL | 6.009 TL |
| ---: | ---: | ---: | ---: |
| 100 | −125.000 TL | −8.333 TL | 50.525 TL |
| 175 | −50.750 TL | 153.417 TL | 256.419 TL |
| 250 | 23.500 TL | 315.167 TL | 462.313 TL |

Bu sonuçlar partner payı, değişken ve sabit bütçe sonrasıdır; gelir/kurumlar vergisi, tahsilat kaybı ve fiyatlanmamış giderler öncesidir.

## Farklılaştırılmış paket bütçesi — önerilen model

Mevcut iç modelde 20 baskı 250 TL, 20 dakika destek 100 TL ve diğer konservatif değişken bütçe yaklaşık 410 TL'dir. Buna göre planlama bütçesi:

| Paket | Baskı varsayımı | Destek | Diğer teknik/rezerv bütçe | Toplam değişken bütçe |
| --- | ---: | ---: | ---: | ---: |
| Dijital Anı | 10 × 12,50 = 125 TL | 75 TL | 410 TL | 610 TL |
| Anı Plus | 20 × 12,50 = 250 TL | 100 TL | 410 TL | 760 TL |
| Signature | 30 × 12,50 = 375 TL | 225 TL | 410 TL | 1.010 TL |

Bu bütçeyle katkı ve başabaş:

| Paket | ShineQR payı | Değişken bütçe | Katkı | Başabaş |
| --- | ---: | ---: | ---: | ---: |
| 3.000 TL Dijital | 1.750,00 TL | 610 TL | 1.140,00 TL | 197 satış |
| 5.000 TL Plus | 2.916,67 TL | 760 TL | 2.156,67 TL | 104 satış |
| 6.009 TL Signature | 3.505,25 TL | 1.010 TL | 2.495,25 TL | 90 satış |

Gerçek baskı, kargo, destek ve altyapı faturaları ilk 10 pilotta ölçülmeden bu rakamlarla fiyat garantisi verilmemelidir.

## Maliyet yapısı

### Değişken maliyetler

- R2 depolama ve işlem istekleri
- Normal görüntüleme dışındaki uygulama trafiği; özellikle ZIP
- Thumbnail/video poster işleme CPU'su
- QR baskısı, kesim, ambalaj ve kargo
- Ödeme kuruluşu/banka komisyonu
- Kurulum ve müşteri destek emeği
- İade, tekrar baskı ve başarısız teslim rezervi

### Sabit maliyetler

- Uygulama hosting'i
- MongoDB
- İzleme, hata takibi ve yedekleme
- Alan adı, e-posta ve işletme araçları
- Muhasebe, şirket ve zorunlu primler
- Satış/partner edinme, ulaşım ve demo
- Sürekli geliştirme ve bakım emeği

### Güncel altyapı fiyat referansları

- Cloudflare R2 Standard: 0,015 USD/GB-ay; Class A 4,50 USD/milyon, Class B 0,36 USD/milyon; internet egress ücretsiz. Kaynak: [Cloudflare R2 Pricing](https://developers.cloudflare.com/r2/pricing/).
- MongoDB Atlas Flex: aylık 8–30 USD, 5 GB ve 500 ops/sn sınırı; Dedicated yaklaşık 60 USD/aydan başlar. Kaynak: [Atlas Flex Costs](https://www.mongodb.com/docs/atlas/billing/atlas-flex-costs/).
- Vercel Pro: 20 USD/ay platform ücreti ve 20 USD kullanım kredisi. Kaynak: [Vercel Pro](https://vercel.com/docs/plans/pro-plan).

Normal orijinal ve thumbnail trafiği artık doğrudan R2'den aktığı için eski 315 TL/organizasyon medya transfer bütçesi konservatif kalabilir. Buna karşılık ZIP indirme uygulama üzerinden akar. İlk canlı faturalar görülmeden maliyet bütçesini agresif biçimde düşürmek doğru değildir.

## Partnerlik modeli

### Önerilen model: satış üzerinden gelir paylaşımı

- Müşteri fiyatı sözleşmede tanımlanır.
- KDV hariç tahsilatın %30'u partner, %70'i ShineQR.
- ShineQR altyapı, ürün, QR tasarım/baskı (paket kapsamı kadar), teknik destek ve saklama operasyonunu üstlenir.
- Partner müşteriye tanıtır, organizasyon bilgilerini eksiksiz iletir, onayı alır ve satış sürecini takip eder.

Avantajı: Partner peşin lisans riski almaz; yalnızca satılan organizasyondan kazanır. Dezavantajı: Tahsilat, fatura ve komisyon belgelendirmesi dikkatle kurulmalıdır.

### Alternatif: toptan organizasyon kredisi

Partner ShineQR'dan organizasyon kullanım hakkını sabit fiyatla alır ve son müşteriye kendi fiyatıyla satar. Örnek: ShineQR toptan 3.000 TL, partner satış 5.000 TL.

Avantajı: Fatura ve marj anlatımı daha basit olabilir. Dezavantajı: Partnerin fiyatı kontrolsüz düşürmesi/yükseltmesi marka algısını bozabilir; kullanılmayan krediler ve iadeler sorun yaratır.

İlk 5–10 partnerde gelir paylaşımı daha düşük giriş bariyeri yaratır. Muhasebeci, hangi modelin fatura/komisyon bakımından doğru olduğunu teyit etmelidir.

## Partner anlaşmasında zorunlu ticari maddeler

1. Tarafların unvan, vergi ve iletişim bilgileri.
2. Hizmetin net kapsamı ve mevcut olmayan özellikler.
3. Paket fiyatları, KDV ve fiyat güncelleme yöntemi.
4. Partner payının hangi matrah üzerinden hesaplandığı.
5. Müşteri faturasını kimin keseceği.
6. Tahsilatı kimin alacağı ve partner payının ödeme günü.
7. İptal, tarih değişikliği, iade ve kullanılmayan hizmet.
8. Baskı adedi, ek baskı bedeli, kargo ve tekrar baskı.
9. Organizasyon bilgilerinin son teslim tarihi.
10. Destek kapsamı ve destek saatleri.
11. Veri sorumlusu/veri işleyen rolleri ve KVKK yükümlülükleri.
12. Saklama süresi, silme, indirme sorumluluğu ve müşteri bilgilendirmesi.
13. Marka/logo kullanım izni ve referans paylaşımı.
14. Hizmet seviyesi, planlı bakım ve mücbir sebep.
15. Gizlilik, hesap güvenliği ve yetkisiz erişim bildirimi.
16. Sözleşme süresi, fesih ve fesih sonrası aktif organizasyonlar.
17. Bölgesel münhasırlık varsa satış hedefi ve kayıp koşulları.
18. Sorumluluk sınırları; profesyonel çekim ve kalıcı arşiv olmadığı.

## Organizasyon bazlı sipariş formu

Her ücretli etkinlik için ana partner sözleşmesine ek kısa sipariş formu kullanılmalıdır:

- Partner ve son müşteri adı
- Organizasyon adı/türü/tarihi/mekânı
- Seçilen paket ve KDV dahil bedel
- Tahsilat durumu
- Partner payı
- Baskı adedi/teslim adresi/teslim tarihi
- Slug ve QR hedef adresi
- Tasarım onay tarihi
- Yükleme kapanış ve medya silme tarihi
- Owner hesabı teslim durumu
- İptal/değişiklik notu
- Referans kullanım izni

## Fiyat sunma yöntemi

Fiyat konuşmasına teknolojiyle değil sonuçla başlanmalıdır:

1. “Misafirlerin telefonunda kalan doğal anıları tek albümde topluyoruz.”
2. 30 saniyelik canlı demo.
3. Partnerin kazanacağı tutar.
4. Operasyonun kimde olduğu.
5. Paketlerin farkı.
6. İlk pilot için net tarih ve teklif.

Önerilen paket sıralaması:

| Dijital | **Anı Plus — önerilen** | Signature |
| --- | --- | --- |
| 3.000 TL | **5.000 TL** | 6.009 TL |
| Küçük etkinlik/pilot | Çoğu düğün için dengeli | Premium kişiselleştirme |

## İndirim politikası

- Liste fiyatı üzerinden sürekli pazarlık yapılmamalı.
- İndirim fiyat düşürmek yerine kapsam/baskı adediyle yönetilmeli.
- Pilot indirimi tek organizasyon, son kullanım tarihi ve referans/ölçüm karşılığıyla yazılı olmalı.
- Partner hacim indirimi gerçekleşmiş ücretli satışa bağlanmalı; “yılda 50 yaparım” sözüne peşin indirim verilmemeli.
- Örnek: ilk 5 ücretli etkinlik standart pay; 6–20 arasında +2 puan, 21+ için dönemsel yeniden müzakere. Bu yalnızca öneridir ve finansal model yeniden hesaplanmadan uygulanmamalıdır.

## Fiyat karar önerisi

- Ana vitrin: **5.000 TL Anı Plus**.
- Giriş seçeneği: 3.000 TL, kapsamı ve baskısı sınırlı.
- Premium: 6.009 TL yalnızca anlamı açıklanabiliyorsa; aksi hâlde yuvarlak/alışılmış fiyat seç.
- İlk 10 ücretli organizasyonda paket bazında veri hacmi, destek dakikası, baskı/kargo, iade ve ödeme komisyonunu ölç.
- 10 organizasyon sonunda değişken maliyet bütçesini gerçek verilerle yeniden kur.
