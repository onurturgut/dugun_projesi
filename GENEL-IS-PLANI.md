# ANILAR — Genel İş ve Finansal Plan

Plan tarihi: 9 Eylül 2026.

Bu belge görüşmede alınan kararları, hesaplama varsayımlarını ve açık işleri toplar. Bütçe tutarları satın alma teklifi veya kesin net kâr değildir. 2026 mevzuat ve prim tutarları kullanılmıştır; başka bir yılda kuruluş yapılırsa güncellenmelidir.

## 1. Ürün ve hizmet

Organizasyon masalarındaki organizasyona özel QR kodu okutan misafirler, üyelik açmadan telefon kamerasından veya galeriden fotoğraf ve video yükler. İsteğe bağlı isim ve mesaj bırakabilirler. Misafirler özel albümü görüntüleyemez.

- Platform yöneticisi partner işletmeleri oluşturur.
- Partner kendi organizasyonlarını, organizasyon sahibi hesabını ve indirilebilir QR kodlarını yönetir.
- Organizasyon başına tek sahip hesabı kullanılır; ilk girişte şifre değişir.
- Albüme platform yöneticisi, ilgili partner ve ilgili organizasyon sahibi erişebilir. Başka işletmelerin veya sahiplerin içeriklerine erişilemez.
- Yetkililer içerikleri görüntüler, indirir ve yetkileri kapsamında silebilir.
- Düğün dışındaki organizasyonlar da hizmet kapsamındadır.

Süre kararları:

- Yükleme organizasyon sayfası oluşturulunca açılır; organizasyon tarihinden 7 gün sonra kapanır.
- Saklama süresi organizasyon tarihinden itibaren 3 takvim ayıdır.
- Çöp kutusu 7 gündür; üç aylık saklama sınırını uzatmaz.
- Süre sonunda medya, isim ve mesaj kalıcı silinir; organizasyon başlığı ve tarihi kalabilir.
- Süreleri organizasyon bazında yalnızca platform yöneticisi değiştirebilir.
- Fiziksel diskte saklama, yetkili kullanıcının indirmesiyle yapılır; otomatik fiziksel arşivleme henüz kapsamda değildir.

Uygulama ayrıntıları ve geliştirme durumu: [Proje gereksinimleri](PROJE-GEREKSINIMLERI.md), [Yayın ve işletim](YAYIN-VE-ISLETIM.md).

## 2. Onaylanan ticari çerçeve

| Konu | Karar / hedef |
| --- | --- |
| İlk bölge | Fethiye |
| Şirket türü | Şahıs işletmesi |
| Kurucu | 25 yaşında, ilk işletmesi; başka işyerinde 4/a sigortalı çalışmıyor |
| Partner hedefi | En az 10 işletme |
| Partner başına yıllık organizasyon | 25; kullanıcının sezonluk pazar varsayımı |
| Organizasyon başına misafir | 200 |
| Platformun partnere fiyatı | Organizasyon başına 2.000 TL, KDV dahil |
| Son müşteriye satış | Partner yapacak; nihai fiyat ve fiyatlandırma kuralları netleştirilecek |

10 × 25 = 250 organizasyon yıllık potansiyeldir. Bu işletmelerin bütün organizasyonlarında ürünün satılması halinde gerçekleşir; garantili satış değildir. Bu hacim 50.000 misafir katılımına karşılık gelir, benzersiz kişi sayısı değildir.

Partnerin müşteriden aldığı bedelle platforma ödediği bedel arasındaki fark partnerin kendi gider ve vergileri öncesindeki ticari marjıdır. Platform bütçesine ayrıca partner komisyonu eklenmemiştir.

## 3. Fethiye partner edinme planı

Pazar adayları ve kaynakları: [Fethiye pazar araştırması](FETHIYE-PAZAR-ARASTIRMASI.md). Listedeki kayıtlar doğrulanmış müşteri veya satış değildir; organizasyon firması ve mekânın aynı düğününü iki kez saymamak gerekir.

Önerilen çalışma sırası; henüz satış taahhüdü değildir:

1. Organizasyon firmalarını ve düğün mekânlarını doğrula; karar vericileri, yıllık organizasyon hacmini ve çalışma biçimini kaydet.
2. Telefonda çalışan örnek QR → yükleme → özel albüm akışıyla görüşme yap.
3. Az sayıda gerçek organizasyonda pilot yap; katılım, yüklenen veri, destek süresi ve indirme deneyimini ölç. Pilotun ücretli/ücretsiz olması ayrıca kararlaştırılacak.
4. Fiyat, ödeme zamanı, iptal koşulları, baskı sorumluluğu ve destek kapsamını partner anlaşmasında netleştir.
5. En az 10 aktif partnere ulaş; yalnızca hesap açılmasını değil, ücretli organizasyon kullanımını takip et.

Ana tanıtım mesajı: Misafirlerin farklı açılardan çektiği fotoğraf ve videolar, uygulama indirmeden özel organizasyon albümünde toplanır. Partner organizasyonuna ek bir hizmet sunar; organizasyon sahibi anılarını indirerek saklayabilir.

Takip edilecek göstergeler: görüşülen işletme, demo, pilot, aktif partner, ücretli organizasyon, satışa dönüşüm, tahsilat, organizasyon başına veri hacmi ve destek süresi. Sezon ayları henüz belirlenmediği için aylara eşit satış dağılımı yapılmaz.

## 4. Teknik kapasite ve maliyet varsayımları

Teknoloji: Next.js uygulaması, MongoDB kayıtları ve özel Cloudflare R2 medya depolaması. Misafir yüklemesi doğrudan R2'ye gider; özel görüntüleme ve ZIP indirme uygulama sunucusuna da yük bindirir. R2'nin ücretsiz dış veri aktarımı, uygulama sunucusunun trafik ve işlem maliyetini ortadan kaldırmaz.

| Varsayım | Hesap |
| --- | --- |
| Yükleyen misafir oranı | %40 → 80 kişi |
| Fotoğraf | 80 × 10 adet × 5 MB ≈ 4 GB |
| Video | 80 × 0,5 adet × 150 MB ≈ 6 GB |
| Ortalama veri | 10 GB / organizasyon |
| Yıllık yüklenen veri | 250 × 10 GB = 2.500 GB |
| Saklama | 3 ay; yıllık toplam yükleme, aynı anda saklanan veri değildir |
| Planlama kuru | 1 USD = 50 TL; güncel kur iddiası değildir |

10 GB ortalama bir tahmindir, uygulanmış paket kotası değildir. Video kullanımına göre ciddi değişebilir. Dosya ve organizasyon limitleri satış vaadi verilmeden netleştirilmeli; sınırsız depolama sözü verilmemelidir.

R2 Standard depolama referansı: 0,015 USD/GB-ay. 10 GB × 3 ay = 0,45 USD, planlama kuruyla 22,50 TL. Küçük işlem payıyla 25 TL/organizasyon bütçelendi. Ücretsiz katman indirimleri düşülmedi. 30 GB için yalnızca depolama yaklaşık 67,50 TL olur. Yedek kopyalar ve ek işleme ayrıca değerlendirilir.

## 5. Yıllık işletme bütçesi — 250 organizasyon

Aşağıdaki tutarlar önceki görüşmenin planlama tahminleridir. Gerçek faturaların KDV, kur ve yurt dışı hizmet vergi işlemleri mali müşavirle ayrıca işlenmelidir.

| Kalem | Yıllık bütçe | Dayanak |
| --- | ---: | --- |
| Uygulama sunucusu | 18.000 TL | 30 USD/ay bütçe; referans 4 GB Droplet 24 USD/ay |
| MongoDB | 18.000 TL | 30 USD/ay bütçe; Atlas Flex referansı 8–30 USD/ay |
| Yedekleme / izleme payı | 3.000 TL | 5 USD/ay varsayım; teklif değil |
| Alan adı | 1.000 TL | 20 USD/yıl varsayım |
| R2 medya depolama / işlem payı | 6.250 TL | 250 × 25 TL |
| Partner görüşmeleri / ulaşım / demo | 10.000 TL | Tahmini yıllık bütçe |
| **Ara toplam: işletme nakit bütçesi** | **56.250 TL** | Muhasebe, prim, kuruluş ve vergi işlemleri hariç |
| Kurucunun destek emeği | 25.000 TL | 250 × 20 dakika × 300 TL/saat; kendisi yaparsa nakit çıkışı değil |
| **Emek dahil ekonomik maliyet** | **81.250 TL** | Vergisel gider toplamı değildir |
| Beklenmeyen gider rezervi | 12.187,50 TL | 81.250 TL'nin %15'i; harcanmadan gider değildir |
| **Emek ve rezerv dahil önceki bütçe** | **93.437,50 TL** | Şirket giderleri eklenmeden önce |

QR baskı, kargo ve müşteriye fiziksel disk teslimi bu bütçede yoktur. Bunları partnerin karşılayacağı varsayımı henüz sözleşmeyle kesinleşmemiştir. Ödeme komisyonu, ilave bakım/geliştirme, yoğun trafik ve ek personel de dahil değildir.

## 6. Şahıs işletmesi, vergi ve Bağ-Kur

### Genç girişimci gelir vergisi istisnası

Kurucu yaş ve ilk işletme bilgileri açısından uygun görünmektedir; kesin uygunluk mali müşavir tarafından mükellefiyet geçmişi ve diğer koşullarla doğrulanmalıdır. İşe başlamayı süresinde bildirme, işi yürütme/sevk ve idare etme, ilgili devir ve ortaklık koşulları da aranır.

- 2026 yılı için istisna sınırı 400.000 TL ticari kazançtır; ciro sınırı değildir.
- Faaliyete başlanan takvim yılından itibaren üç vergilendirme dönemi uygulanır. Tam 36 ay olarak düşünülmemelidir; yıl sonunda kuruluş da ilk dönemi başlatır.
- Sonraki yıllarda o yılın sınırı kullanılır.
- KDV ve beyan yükümlülükleri devam eder. İstisna tüm gider ve vergileri kaldırmaz.
- İstisna dışındaki vergiye tabi gelir için ilgili yılın artan oranlı gelir vergisi tarifesi uygulanır.

### Bağ-Kur

Genç girişimcilere bir yıl sağlanan sigorta prim desteği 1 Ocak 2026 itibarıyla kaldırılmıştır. İlk yıl primin sıfır olacağı varsayılmaz. Başka bir işyerinde sigortalı çalışmayan kurucu için 4/b yükümlülüğü kuruluşta teyit edilerek bütçelenmelidir.

| 2026 asgari prim | Aylık | 12 aylık karşılık |
| --- | ---: | ---: |
| 5 puanlık indirim koşulları sağlanırsa | 10.156,73 TL | 121.880,76 TL |
| İndirimsiz | 11.808,23 TL | 141.698,76 TL |

12 aylık karşılık sabit 2026 tutarıyla hesaplanmıştır; 2027'ye uzanan dönemin gerçek primi farklı olacaktır. Sezon dışında satış olmaması, faal işletmenin prim ve muhasebe yükünü kendiliğinden durdurmaz.

### Henüz fiyatı alınmayan şirket giderleri

- Bir defalık kuruluş ve gerekli belge/işlem ücretleri.
- Aylık mali müşavirlik ve kapsam dışı muhasebe işlemleri.
- Beyanname damga vergileri ve gerekli elektronik belge hizmetleri.
- İş adresine bağlı kira, olası stopaj ve diğer adres giderleri.
- Tahsilat yöntemi seçilirse banka/ödeme hizmeti komisyonları.

Kurucunun kendine ayırdığı emek bedeli ve kullanılmamış rezerv, otomatik olarak vergiden indirilecek gider değildir. Nakit bütçe, ekonomik maliyet ve vergi matrahı ayrı hesaplanır.

## 7. Satış ve sonuç hesabı

Genel %20 KDV varsayımıyla, hizmet sınıflandırması mali müşavirle teyit edilecektir:

| Kalem | Organizasyon başına | 250 organizasyon |
| --- | ---: | ---: |
| KDV dahil tahsilat | 2.000 TL | 500.000 TL |
| KDV hariç satış geliri | 1.666,67 TL | 416.666,67 TL |
| Hesaplanan satış KDV'si | 333,33 TL | 83.333,33 TL |

Yıllık tutarlar yuvarlanmamış değerlerle hesaplandı. Hesaplanan KDV, indirim ve mahsuplar sonrası ödenecek KDV ile aynı değildir.

250 satış ve indirimli Bağ-Kur varsayımıyla ön bütçe köprüsü:

| İşlem | Tutar |
| --- | ---: |
| KDV hariç satış geliri | 416.666,67 TL |
| İşletme nakit bütçesi | −56.250,00 TL |
| 12 aylık indirimli Bağ-Kur | −121.880,76 TL |
| **Henüz fiyatlanmayan giderlerden önce kalan** | **238.535,91 TL** |
| Kurucu emeği ve rezerv için ayrıca ayrılan | −37.187,50 TL |
| **Bu iki pay da ayrıldıktan sonra kalan** | **201.348,41 TL** |

Bu kalan tutarlar net kâr veya kesin banka bakiyesi değildir: muhasebe, kuruluş, adres, diğer vergisel işlemler ve yukarıdaki kapsam dışı giderler henüz düşülmemiştir. Gelir vergisi hesabı için belgelenen gerçek giderler ve istisna uygunluğu kullanılacaktır. 2026'da istisnaya tabi kazanç 400.000 TL altında kalırsa bu faaliyetten gelir vergisi çıkmayabilir.

Satış hassasiyeti (KDV hariç gelir):

| Yıllık satış | 250 potansiyele göre kullanım | Gelir |
| --- | ---: | ---: |
| 100 | %40 | 166.666,67 TL |
| 175 | %70 | 291.666,67 TL |
| 250 | %100 | 416.666,67 TL |

Ön nakit başa baş hesabı: sabit teknik bütçe 40.000 TL + pazarlama 10.000 TL + indirimli prim 121.880,76 TL = 171.880,76 TL. Bir satışın R2 sonrası katkısı 1.666,67 − 25 ≈ 1.641,67 TL. Yalnızca bu kalemlerle yaklaşık 105 satış gerekir. Muhasebe, kuruluş, diğer giderler ve kurucu emeği eklenince gerçek başa baş adedi artar; 105 satış tam işletme başa başı değildir.

## 8. Karar bekleyenler ve sonraki adımlar

- [ ] Kuruluş yılı/ayı, iş adresi ve mali müşavir teklifini belirle; genç girişimci uygunluğu ile 4/b indirimini doğrula.
- [ ] Partnerin müşteriye satış fiyatını, fiyat belirleme yaklaşımını ve fatura/tahsilat akışını netleştir.
- [ ] Partner ödemesinin rezervasyonda mı, etkinlikten önce mi, sonra mı alınacağını belirle.
- [ ] İptal, iade, ücretsiz pilot ve kullanılmayan organizasyon koşullarını belirle.
- [ ] QR baskı, kargo, fiziksel disk ve destek sorumluluklarını belirle.
- [ ] Organizasyon kotası, video sınırları ve kapasite aşımı politikasını belirle.
- [ ] Gerçek pilotla 10 GB ve 20 dakika destek varsayımlarını ölç.
- [ ] Sezon aylarını ve aylık satış dağılımını gir; sezon dışı giderler için nakit rezervini hesapla.
- [ ] Kişisel veri süreçleri, aydınlatma metinleri ve partner sözleşmesini hizmet akışına göre tamamla.
- [ ] Son maliyetlerle 12 aylık nakit akışı, vergi hesabı ve tam başa baş analizini güncelle.

Yayın işleri ertelenmiş olarak kalır: gerçek R2 anahtarları/private bucket/CORS, üretim MongoDB ve sunucu, alan adı/HTTPS, kalıcı temizleme görevi, gerçek telefon ve büyük ZIP testleri, gerçek organizasyon tarihleri ve canlı QR üretimi. Ayrıntılı kontrol listesi proje gereksinimlerindedir. Bu belgenin hazırlanması bu işlerin tamamlandığı anlamına gelmez.

## 9. Kaynaklar

- [Cloudflare R2 fiyatları](https://developers.cloudflare.com/r2/pricing/)
- [DigitalOcean Droplet fiyatları](https://www.digitalocean.com/pricing/droplets)
- [MongoDB fiyatları](https://www.mongodb.com/pricing)
- [GİB genç girişimci rehberi — 2026; vergi istisnası ve prim desteğinin kaldırılması](https://cdn.gib.gov.tr/api/gibportal-file/file/getFile?objectKey=DUYURU%2FUNIVERSAL%2F2026%2F2026_genc_girisimciler.pdf)
- [SGK bağımsız çalışan primleri — 2026](https://www.sgk.gov.tr/Content/Post/e85649be-3a38-484f-8a82-95109bc7ccde/Bagimsiz-Calisanlarin-Prim-Tahakkuk-ve-Tahsilat-Islemleri-2026-05-11-10-21-03)
- [GİB KDV oranları](https://cdn.gib.gov.tr/api/gibportal-file/file/getFileResources?objectKey=arsiv%2Fyardim-kaynaklar%2Fyararli-bilgiler%2Fkdv-oranlari.pdf)
- [GİB gelir vergisi tarifeleri](https://istanbul.gib.gov.tr/yardim-ve-kaynaklar/yararli-bilgiler/gelir-vergisi-tarifesi)

Resmî tutarlar ile tahmini işletme bütçeleri ayrı değerlendirilmelidir. Satın alma ve kuruluş öncesinde kaynaklar yeniden kontrol edilir.
