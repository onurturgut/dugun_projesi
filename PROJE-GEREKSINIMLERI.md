# Organizasyon Anıları — Proje Gereksinimleri

Son güncelleme: 8 Eylül 2026

Bu belge ürün kararlarını ve planlanan özellikleri tanımlar. Özelliklerin mevcut kodda tamamlandığı anlamına gelmez.

## Amaç

Misafirler, düğün veya başka bir organizasyonda masalarındaki organizasyona özel QR kodunu okutarak paylaşım sayfasına ulaşır. Üyelik olmadan galeriden veya o anda kamerayla çektikleri fotoğraf ve videoları yükler. İsteğe bağlı isim ve mesaj ekleyebilirler. Misafirler yüklenen içerikleri görüntüleyemez.

Platform, birden fazla partner işletmenin kendi organizasyonlarını ve müşterilerini yönetmesini sağlar.

## Roller ve erişim

| Rol | Yetkiler |
| --- | --- |
| Platform yöneticisi | Partner işletme hesaplarını açar; tüm işletmeleri, organizasyonları ve içerikleri yönetir. |
| Partner işletme | Yalnızca kendi organizasyonlarını oluşturur ve yönetir; organizasyon sahibinin kullanıcı adı ve şifresini oluşturur; QR kodlarını indirir; ilgili içerikleri görüntüler ve yönetir. |
| Organizasyon sahibi | Yalnızca kendi organizasyonundaki içerikleri anında görüntüler, indirir ve silebilir. |
| Misafir | Hesap açmadan ilgili organizasyona fotoğraf/video yükler; isteğe bağlı isim ve mesaj bırakır. Diğer içerikleri göremez. |

İşletmeler arasında veri erişimi ayrılmalıdır. Bir işletme başka bir işletmenin organizasyonlarını, müşterilerini veya dosyalarını göremez. Yetkiler hem API hem dosya erişiminde denetlenmelidir.

## Organizasyon oluşturma

- Düğün dışındaki organizasyon türleri de desteklenir.
- Organizasyon türü, isimler/başlık, tarih, kapak fotoğrafları ve karşılama mesajı tanımlanabilir.
- Partner işletmenin logosu sayfada gösterilebilir.
- Her organizasyona özel paylaşım bağlantısı ve indirilebilir QR kod oluşturulur.
- Partner işletme organizasyon sahibinin hesabını oluşturur.

## Misafir yüklemesi ve özel albüm

- QR kod doğrudan ilgili organizasyonun paylaşım sayfasını açar.
- Galeriden seçim ve cihazın desteklediği ölçüde kameradan fotoğraf/video çekimi sunulur.
- Yüklemeye isteğe bağlı isim ve mesaj eklenebilir.
- Yüklenen içerikler platform yöneticisi, ilgili partner ve organizasyon sahibi tarafından anında görülebilir.
- İçerikler misafirlere açık ortak bir galeride yayınlanmaz.
- Yetkili kullanıcılar fotoğraf/video görüntüleyebilir, filtreleyebilir, tekli veya toplu ZIP olarak indirebilir ve silebilir.

## Saklama ve kalıcı silme

- Saklama süresi **organizasyon tarihinden itibaren 3 aydır**.
- Saklama süresi dolduğunda organizasyona ait yüklenen fotoğraf ve videolar kalıcı olarak silinir.
- Üç aylık son tarih, çöp kutusundaki dosyalar için de geçerlidir; çöp kutusu saklama süresini uzatmaz.
- Süre dolmadan içerikler indirilebilir ve kullanıcı tarafından bilgisayar, USB bellek veya harici diskte saklanabilir.
- Otomatik olarak fiziksel bir diske/sunucuya arşivleme henüz kararlaştırılmadı.

## Sonradan değiştirilebilecek ayarlar

### 3. Misafir yükleme penceresi

**Şimdiki karar:** Misafir yüklemeleri organizasyon tarihinden **7 gün sonra** kapanır.

Bu süre ileride değiştirilebilir bir ayar olarak tasarlanmalıdır. Yüklemelerin kapanması, mevcut içeriklerin yetkili kişilerce görüntülenmesini ve indirilmesini durdurmaz; bu erişim üç aylık saklama süresi boyunca devam eder.

### 4. Çöp kutusu süresi

**Şimdiki karar:** Kullanıcının sildiği içerikler **7 günlük çöp kutusuna** taşınır. Bu süre içinde yetkili kullanıcılar içeriği geri yükleyebilir. Süre sonunda kalıcı silinir.

Bu süre ileride değiştirilebilir bir ayar olarak tasarlanmalıdır. Organizasyonun üç aylık saklama süresi daha önce dolarsa kalıcı silme o tarihte gerçekleşir.

## Henüz kararlaştırılmayan konular

- Partner ücretlendirmesi: organizasyon başına ücret, abonelik veya paket modeli.
- Ödeme sisteminin kapsamı ve ne zaman ekleneceği.
- Misafir yüklemelerinin açılacağı zaman ve son tarihler için kesin saat/zaman dilimi kuralı.
- Otomatik fiziksel arşivleme ihtiyacı.

## Teknik temel

- Uygulama: Next.js App Router.
- Veritabanı: MongoDB.
- Fotoğraf/video depolama: Cloudflare R2.
- Dosyalar herkese açık olmamalı; görüntüleme ve indirme rol ve organizasyon yetkisine bağlı olmalıdır.
- Yükleme kapanışı, çöp kutusu temizliği ve üç aylık kalıcı silme yalnızca arayüzde değil sunucuda uygulanmalıdır.

## Henüz onaylanmamış öneriler

- Son saklama tarihinin panelde gösterilmesi ve silinmeden önce hatırlatma yapılması.
- Büyük ZIP arşivlerinin arka planda hazırlanması.
- Ücretlendirme kararı için işletme bazında organizasyon sayısı ve depolama kullanımının ölçülmesi.

## Onaylanan altı uygulama kararı

Aşağıdaki başlangıç ayarları geliştirme sırasında kullanıcı tarafından onaylandı.

1. **İşletmenin silme yetkisi:** İlgili partner işletme de içerikleri çöp kutusuna taşıyabilir ve geri alabilir.
2. **Yüklemelerin başlangıcı:** Tarihi tanımlı organizasyon sayfası oluşturulduğunda açılır; varsayılan kapanış organizasyon tarihinden 7 gün sonradır.
3. **Organizasyon sahibi hesabı:** Organizasyon başına tek ortak sahip hesabı oluşturulur.
4. **İlk girişte şifre değiştirme:** Partner ve organizasyon sahibi geçici şifresini ilk girişte değiştirmek zorundadır.
5. **Kalıcı silmenin kapsamı:** Fotoğraf/video ve bağlı misafir isim/mesajları silinir. Organizasyonun başlık ve tarih kaydı kalır.
6. **Sürelerin yönetimi:** Varsayılan yükleme ve çöp kutusu süreleri 7 gündür; yalnızca platform yöneticisi organizasyon bazında değiştirebilir.

## Uygulama planı

Bu bölüm planlama içindir; geliştirmeye başlandığını veya aşağıdaki aşamaların tamamlandığını belirtmez. Karar bekleyen konular, ilgili aşamanın uygulanmasından önce kesinleştirilecektir.

### Aşama 1 — Veri modeli ve erişim ayrımı

- Platform yöneticisi, partner işletme ve organizasyon sahibi rollerini tanımla.
- İşletme, kullanıcı, organizasyon, medya ve misafir mesajı kayıtlarının ilişkilerini tasarla.
- Organizasyonlara işletme ve sahip ilişkileri ekle; medya erişimini bu ilişkiler üzerinden denetle.
- Mevcut Oğuz & Hilal kaydını ve yönetici hesabını koruyan bir veri geçişi hazırla. Mevcut organizasyonun hangi işletmeye bağlanacağı geçişten önce belirlenmeli.
- Her korunan API ve dosya bağlantısı isteğinde rol ve organizasyon yetkisini kontrol et.

**Tamamlanma ölçütü:** A işletmesinin kullanıcısı, B işletmesinin organizasyonuna veya dosyalarına adres/kimlik değiştirerek erişemez. Organizasyon sahibi yalnızca kendisine atanmış organizasyonlara erişebilir.

### Aşama 2 — Platform ve partner panelleri

- Platform yöneticisinin partner hesabı oluşturmasını sağla.
- Partner panelinde yalnızca ilgili işletmenin organizasyonlarını listele.
- Organizasyon oluşturma ve düzenleme ekranlarına tür, başlık/isimler, tarih, kapaklar, mesaj ve logo alanlarını ekle.
- Partnerin organizasyon sahibi hesabı oluşturmasını sağla. Hesap sayısı ve ilk giriş davranışı 3. ve 4. karara göre uygulanmalı.
- Organizasyona özel QR kodunu PNG/SVG olarak indirilebilir yap.

**Tamamlanma ölçütü:** Platform yöneticisi bir partner açabilir; partner organizasyon ve sahip hesabı oluşturabilir; QR doğru organizasyonun misafir sayfasını açar.

### Aşama 3 — Misafir paylaşımı ve R2 bağlantısı

- Mobil paylaşım sayfasında galeriden seçim, kamera, önizleme ve yükleme ilerlemesini tamamla.
- İsteğe bağlı misafir ismi ve mesajı ekle; bunları ilgili yüklemelerle ilişkilendir.
- R2 erişim ayarlarını ve tarayıcı yüklemeleri için CORS yapılandırmasını tamamla.
- Sunucuda dosya türü/boyutu, organizasyonun varlığı ve yükleme zaman aralığını denetle.
- Yüklemenin açılışını 2. karara göre uygula; kapanış varsayılanı organizasyondan 7 gün sonra olsun.
- Tamamlanmamış veya başarısız yüklemeleri başarılı içerik olarak göstermeme davranışını doğrula.

**Tamamlanma ölçütü:** Misafir üyelik olmadan gerçek bir fotoğraf/video yükleyebilir; dosya R2’de, ilgili kayıt MongoDB’de oluşur. Misafir albümü göremez ve süresi kapanmış organizasyona yükleyemez.

### Aşama 4 — Özel albüm ve indirme

- Platform yöneticisi, ilgili partner ve organizasyon sahibine yetkileri kapsamındaki albümü göster.
- Yüklemeleri görüntüleme onayı bekletmeden albüme yansıt; sayfanın güncellenme yöntemini uygula.
- Fotoğraf/video görüntüleme, filtreleme, isim ve mesaj gösterimini ekle.
- Tekli indirmeyi ve toplu ZIP indirmeyi tamamla. ZIP bağlantıları da albümle aynı erişim kontrolüne tabi olmalı.
- Büyük arşivlerde arka planda hazırlama önerisini değerlendir; hazırlanan ZIP dosyalarının geçici saklama ve temizleme kuralını belirle.

**Tamamlanma ölçütü:** Yetkili kullanıcı yüklenen içeriği görebilir ve indirebilir; başka işletmenin veya organizasyon sahibinin albümünü ya da ZIP arşivini açamaz.

### Aşama 5 — Çöp kutusu ve saklama süresi

- Silmeyi önce çöp kutusuna taşıma olarak uygula; varsayılan geri alma süresi 7 gün olsun.
- Silme ve geri alma yetkilerini 1. karara göre uygula.
- Organizasyon tarihinden itibaren üç aylık son saklama tarihini hesapla. Kesin saat, zaman dilimi ve takvim ayı hesabı geliştirmeden önce netleştirilmeli.
- Çöp kutusu süresi ve üç aylık son tarihten önce gelen tarihte kalıcı silme uygula.
- Süre yönetimini 6. karara göre tasarla; kalıcı silinecek verileri 5. karara göre belirle.
- R2 dosyaları ve ilgili MongoDB kayıtlarını temizleyen zamanlanmış görev hazırla. Görev kesinti sonrası yeniden çalıştığında işlemleri güvenle tamamlayabilmeli.
- Arşiv kopyalarının da saklama süresi nedeniyle silinen içerikleri erişilebilir tutmadığını doğrula.

**Tamamlanma ölçütü:** İçerik çöp kutusu süresi içinde geri alınabilir; süre dolduğunda kalıcı silinir. Üç aylık son tarih çöp kutusuyla uzamaz. Bu kontroller gerçek süreleri beklemeden test tarihleriyle doğrulanır.

### Aşama 6 — Uçtan uca doğrulama ve yayın hazırlığı

- İki ayrı partner ve farklı organizasyon sahipleriyle erişim ayrımını test et.
- QR → misafir yüklemesi → özel albüm → indirme → çöp kutusu → geri alma → kalıcı silme akışını doğrula.
- Mobil kamera/galeri, video yükleme ve başarısız yüklemeyi yeniden deneme akışlarını kontrol et.
- Gerçek alan adı, HTTPS, MongoDB, R2 CORS ve zamanlanmış görevleri yayın ortamında yapılandır.
- QR kodlarını yerel adres yerine yayın adresi üzerinden üret.
- Yayınlama işlemini, hazır ve kontrol edilmiş sonuç üzerinden ayrıca ele al.

**Tamamlanma ölçütü:** Gerçek bir telefondan okutulan QR doğru sayfayı açar; yüklenen içerik yalnızca yetkililerce görülür ve tüm süre kuralları sunucuda uygulanır.

## İlk sürümün dışında veya karar bekleyen işler

- Online ödeme, abonelik ve paket satın alma: ücretlendirme modeli belirlenene kadar kapsam dışında.
- Otomatik fiziksel sunucu/disk arşivlemesi: henüz kararlaştırılmadı. İlk yaklaşım kullanıcı tarafından indirme ve yerel saklamadır.
- Silinme öncesi bildirimler: öneri aşamasında; kanal ve zamanlama onaylanmadı.

## Geliştirmeye başlama sırası

Önce veri ve yetki modeli, ardından partner/organizasyon hesapları, misafir yüklemeleri, özel albüm, süre yönetimi ve son olarak yayın doğrulaması yapılır. Altı başlangıç kararı onaylanmıştır; ödeme modelinin belirsizliği temel platformun geliştirilmesini engellemez.

## Geliştirme durumu — 7 Eylül 2026

| Aşama | Durum |
| --- | --- |
| 1 — Veri modeli / erişim | Rol ve işletme/sahip filtreleri uygulandı. Mevcut organizasyon platform işletmesine taşındı. İşletmeler arası ve aynı işletmedeki farklı sahipler arası erişim testleri geçti. |
| 2 — Paneller | İşletme oluşturma/kapatma, organizasyon oluşturma/düzenleme, sahip hesabı ve zorunlu şifre değişimi uygulandı. QR indirme korundu. |
| 3 — Misafir yüklemesi | İsim/mesaj, zaman aralığı kontrolü, doğrudan R2 yükleme ve dosya doğrulama uygulandı. Yerel S3 taklidiyle test edildi; gerçek R2 kimlik bilgileri hâlâ gerekli. |
| 4 — Özel albüm | Rol bazlı albüm, 10 saniyede yenileme, özel fotoğraf/video erişimi, tekli ve ZIP indirme uygulandı. ZIP akış şeklinde; arka plan kuyruğu yok. |
| 5 — Süre yönetimi | 7 günlük çöp kutusu/geri alma, üç takvim ayı son tarihi, tekrar denenebilir fiziksel silme görevi ve worker komutu uygulandı. Yayında zamanlayıcının ayrıca çalıştırılması gerekli. |
| 6 — Doğrulama / yayın | Ayrı MongoDB + yerel S3 testlerinde temel akışlar geçti. Üretim derlemesi ve yerel tarayıcı kontrolleri yapıldı. Gerçek R2, yayın adresi, HTTPS, zamanlayıcı ve gerçek telefon kabul testi henüz tamamlanmadı; site dış ortama yayınlanmadı. |

Kurulum, sürelerin kesin saat hesabı, testler ve yayın öncesi kalan işler: [YAYIN-VE-ISLETIM.md](YAYIN-VE-ISLETIM.md).

### Son doğrulama — 8 Eylül 2026

- TypeScript, ESLint ve dört süre/yetki testi geçti. Önceki uçtan uca testlerde ayrı MongoDB ve yerel S3 taklidiyle yükleme, özel indirme, ZIP, işletme/sahip ayrımı, çöp kutusu ve kalıcı temizleme doğrulandı.
- Yerel uygulama `http://localhost:3000` adresinde çalışıyor. Platform hesabı girişi, işletme listesi, organizasyon listesi ve sistem durumu API'leri 200 döndü.
- Yerel APP_URL ve CRON_SECRET yapılandırıldı. Temizlik worker'ı başlatıldı; ilk çağrılar başarılı ve hatasız. Bu yerel süreç bilgisayar/terminal kapandıktan sonra otomatik yeniden başlayacak bir işletim sistemi servisi değildir; yayında kalıcı servis veya görev zamanlayıcısı kurulmalıdır.
- Gerçek R2 hesap kimliği ve anahtarları henüz eklenmedi. Canlı bulut dosya akışı ve dış ortama yayın tamamlanmadı.
- Mevcut Oğuz & Hilal organizasyonunun tarihi hâlâ boş. Gerçek tarih panelden girilene kadar yükleme kapalıdır; örnek bir tarih otomatik atanmadı.

bu kadar organizasyonun fotograf ve video depolamasını nasıl bir sunucuda tutacağım 
hepsi ayrı ayrı nasıl çalışıcak 
bucketler mi olucak partnerler yeni organizasyon yaptığında otomatik mi oluşucak ?

## Sonraya bırakılan yayın işleri — 9 Eylül 2026

Kullanıcı kararı: Aşağıdaki işler kayda alınmıştır; şimdi uygulanmayacak, yayın hazırlığı sırasında tamamlanacaktır. Ana işlevlerin geliştirilmiş olması canlı ortam doğrulamasının tamamlandığı anlamına gelmez.

- [ ] **Cloudflare R2 bağlantısı:** Hesap kimliği ve erişim anahtarlarını yapılandır. Misafir medyası için private bucket ve yayın alan adına uygun CORS ayarlarını tamamla. Anahtarları bu belgeye veya kaynak koduna yazma.
- [ ] **Canlı yayın ve MongoDB:** Uygulamanın çalışacağı sunucuyu, alan adını ve HTTPS'i hazırla. Yerel MongoDB bağlantısını üretim ortamının bağlantısıyla değiştir; APP_URL değerini canlı adresle yapılandır.
- [ ] **Kalıcı temizlik görevi:** Üç aylık saklama ve çöp kutusu sürelerinin sonunda fiziksel silmeyi yapan worker veya zamanlanmış görevi sunucuda kesintilerden sonra yeniden çalışacak şekilde kur. Başarılı çalışma ve hata durumunu doğrula.
- [ ] **Gerçek ortam kabul testi:** Gerçek telefondan QR okutma → fotoğraf/video yükleme → özel albümde görüntüleme → indirme → çöp kutusu → geri alma → kalıcı silme akışını gerçek R2 üzerinde doğrula. Farklı işletme ve sahip hesapları arasındaki erişim ayrımını tekrar kontrol et. Önceki yerel S3 taklidi testleri bu kabul testinin yerine geçmez.
- [ ] **Büyük albüm ve ZIP testi:** Temsilî büyüklükte bir video albümünün indirilmesini yayın sunucusunda dene. Sunucu/proxy süre sınırlarını doğrula; seçilen barındırma ortamı gerektiriyorsa arka plan kuyruğu ve ayrı worker ihtiyacını değerlendir. Mevcut ZIP uygulaması akış halinde çalışır.
- [ ] **İlk gerçek organizasyon hazırlığı:** Organizasyon tarihlerini gir, işletme ve sahip hesaplarını hazırla, QR kodları canlı alan adı üzerinden yeniden üretip indir. Tanıtım görsellerindeki temsili QR kodları baskıda kullanma; organizasyonun gerçek QR kodunu kullan.

### İlk sürüm dışında kalan konular

- Online ödeme, abonelik ve paket satın alma henüz uygulanmadı; ücretlendirme modeli planlama aşamasında.
- Silinmeden önce bildirim gönderimi henüz uygulanmadı; kanal ve zamanlama kararlaştırılacak.
- Otomatik fiziksel sunucu/diske arşivleme henüz uygulanmadı; mevcut yaklaşım yetkili kullanıcının dosyaları indirerek saklamasıdır.

## Sıradaki çalışma: teknik, pazarlama ve finansal planlama

Kullanıcıyla birlikte aşağıdaki başlıklar planlanacak. Bu bölüm uygulama veya harcama kararı değildir; kararlar netleştikçe belgelenecektir.

1. **Teknik plan:** Hedef organizasyon ve misafir sayısı, fotoğraf/video hacmi, eşzamanlı yükleme, üç aylık depolama, barındırma, yedekleme ve işletim ihtiyaçları.
2. **Pazarlama planı:** Hedef işletme türleri ve bölge, partner edinme yöntemi, ürünün sunduğu fayda, pilot organizasyonlar ve satış süreci.
3. **Finansal projeksiyon:** Ücretlendirme modeli, organizasyon başına gelir ve değişken maliyet, sabit giderler, müşteri edinme maliyeti, başa baş noktası ve 12 aylık senaryolar. Varsayımlar gerçek verilerden ayrılacak; hizmet fiyatları hesaplama sırasında güncel kaynaklardan doğrulanacaktır.
