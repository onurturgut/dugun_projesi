# ShineQR Çok Taraflı Organizasyon, Fotoğrafçı ve Baskı Akışı

Karar tarihi: 25 Ekim 2026  
Durum: Ürün planı; uygulama yetkisi değildir.  
Kapsam: Düğün salonları, organizasyon firmaları, fotoğrafçılar, organizasyon sahipleri, ShineQR yönetimi ve baskıcıların tek organizasyon kaydı çevresinde çalışması.

Bu belge, çatışan konularda `07-PWA-FOTOGRAF-CALISMA-ALANI-VE-DIJITAL-DAVETIYE.md` içindeki önceki fotoğrafçı ve albüm erişimi varsayımlarından daha güncel karardır. Önceki belge silinmez; tarihsel kayıt olarak korunur.

## 1. Ürün amacı

ShineQR yalnızca QR ile misafir fotoğrafı toplayan bir ürün değildir. Sistem; düğün salonunu, organizasyon firmasını, fotoğrafçıyı ve organizasyon sahibini aynı organizasyon kaydında, birbirinden ayrılmış yetkilerle buluşturan dijital organizasyon, anı toplama ve teslimat platformudur.

Sistemin merkezi bir işletme değil, **organizasyon kaydıdır**. Her taraf organizasyona kendi göreviyle bağlanır ve yalnızca görevinin gerektirdiği alanlara erişir.

## 2. Taraflar ve ana roller

### ShineQR yöneticisi

- Organizasyonun ayarlarını, tasarım ve üretim durumunu görür.
- Baskı işini kontrol eder ve baskıcıya aktarır.
- İlgili organizasyonun albümüne operasyon ve destek amacıyla erişebilir.
- Albüm erişimleri ve kritik işlemleri denetim kaydına yazılır.

### Ana partner

Ana partner, organizasyonu ShineQR sistemine kazandıran ve ShineQR hizmetinin ticari/operasyonel sorumluluğunu alan işletmedir. Bu taraf organizasyona göre düğün salonu, organizasyon firması veya fotoğraf işletmesi olabilir. Doğrudan satışta ana taraf ShineQR olabilir.

- Organizasyonu oluşturur ve gerekli bilgileri tamamlar.
- Tasarım merkezindeki seçimleri yapar ve kaydeder.
- Organizasyon sahibini sürece bağlar.
- Kayıtlı fotoğrafçılar arasından atama yapar veya yeni fotoğrafçı daveti başlatır.
- Baskı ve teslimat durumunu takip eder.
- Albümdeki fotoğraf ve videoları göremez.

Ana partner olmak otomatik albüm erişimi vermez. Ticari sahiplik ve medya erişimi birbirinden ayrıdır.

### Organizasyon sahibi

- Yalnızca kendi organizasyonuna erişir.
- Tasarım önizlemesini kontrol eder; değişiklik ister veya baskı için onaylar.
- QR ile misafirlerden gelen içerikleri görür.
- Fotoğrafçının profesyonel çekimlerini görür.
- İçerikleri kaynağına göre filtreler ve indirir.
- Onaylanan kurallar kapsamında içerikleri yönetir.

### Fotoğrafçı

- Yalnızca açıkça atandığı organizasyonları görür.
- Etkinlikten sonra profesyonel çekim dosyalarını yükler.
- Misafirlerin QR ile yüklediği içerikleri göremez.
- Organizasyon albümünü, ZIP arşivini veya başka fotoğrafçıların dosyalarını göremez ve indiremez.
- QR, tasarım, fiyat, sözleşme ve organizasyon ayarlarını değiştiremez.
- Yükleme ekranında yalnızca dosya aktarım durumu, başarılı/başarısız dosya sayısı ve gerekli teknik sonuçlar gösterilir.

### Misafir

- Hesap açmadan organizasyona özel QR kod üzerinden fotoğraf veya video yükler.
- İsteğe bağlı isim ve mesaj bırakabilir.
- Albüm içeriğini göremez veya indiremez.

### Baskıcı

- Yalnızca kendisine atanmış baskı işlerini görür.
- Baskıya hazır üretim dosyalarını indirir.
- İşin üretim durumunu günceller.
- Albüme, misafir bilgilerine, fotoğrafçı yüklemelerine, fiyatlara, komisyonlara ve diğer organizasyonlara erişemez.

## 3. Medya erişimi kararı

Organizasyonun fotoğraf ve videolarını yalnızca:

1. ilgili organizasyon sahibi ve
2. gerekli yetkiye sahip ShineQR yöneticisi

görebilir.

| Taraf | Profesyonel yükleme | QR yüklemesi | Albümü görme | İndirme | Silme/yönetme |
| --- | ---: | ---: | ---: | ---: | ---: |
| ShineQR yetkili yöneticisi | Gerektiğinde | Hayır | Evet | Evet | Yetkili operasyonlarda |
| Organizasyon sahibi | Karara bağlı | Hayır | Evet | Evet | Onaylı kurala göre |
| Ana partner | Hayır | Hayır | Hayır | Hayır | Hayır |
| Fotoğrafçı | Evet | Hayır | Hayır | Hayır | Hayır |
| Misafir | Hayır | Evet | Hayır | Hayır | Hayır |
| Baskıcı | Hayır | Hayır | Hayır | Hayır | Hayır |

Arayüzde bir alanın gizlenmesi yeterli değildir. Medya listeleme, önizleme, tekli indirme, ZIP indirme ve dosya erişim yetkileri sunucuda uygulanır.

Her medya kaydında en az organizasyon kimliği, kaynak (`guest` veya `photographer`), yükleyen hesap/oturum kimliği, yükleme zamanı ve işleme durumu tutulur. Fotoğrafçı yüklemesi güvenilir hesap kimliğiyle ilişkilendirilir.

## 4. Organizasyon oluşturma ve tasarım merkezi

### Aşama 1 — Taslak organizasyon

Ana partner organizasyonu oluşturur ve gerekli alanları tamamlar:

- Organizasyon adı ve türü
- Tarih ve mekân
- Organizasyon sahibi bilgileri
- Onaylı ürün/paket seçimi
- QR baskı adedi ve gerekli teslimat bilgileri

Kayıt ilk olarak `Taslak` durumundadır. Taslak organizasyon baskıya gönderilemez.

### Aşama 2 — Tasarım merkezi

Ana partner üç yüzeyi seçer ve kaydeder:

1. **QR tasarımı:** Hazır tasarım veya kapsamı ayrıca belirlenen özel tasarım; izin verilen renk ve metin ayarları; ön/arka yüz önizlemesi.
2. **Loading page:** QR okutulduktan sonra gösterilen açılış tasarımı, logo/isim ve izin verilen görsel tercihler.
3. **Wedding alanı:** Misafir yükleme sayfasının teması, başlığı, tarihi, mesajı ve onaylı görseli.

QR hedef bağlantısı sistem tarafından üretilir ve kullanıcı tarafından değiştirilemez.

### Aşama 3 — Organizasyon sahibi onayı

Organizasyon sahibi QR, Loading ve Wedding önizlemelerini kontrol eder. Değişiklik isteyebilir veya baskı için onaylayabilir.

Onaylanan tasarım sürümü kilitlenir. Sonraki değişiklik yeni bir revizyon ve yeni bir onay gerektirir; önceki onaylı sürüm silinmez veya sessizce değiştirilmez.

## 5. Fotoğrafçı dizini ve atama

Yönetim panelinde ayrı bir **Fotoğrafçılar** alanı bulunur. Kayıtlı fotoğrafçı ve fotoğraf işletmeleri burada listelenir.

Listede yalnızca operasyon için gerekli bilgiler gösterilir:

- Fotoğrafçı veya işletme adı
- İletişim bilgisi
- Hesap durumu
- Atandığı yaklaşan organizasyonlar
- Teslimat durumu

Organizasyon içindeki `Fotoğrafçı ata` işlemi bu dizinden seçim yapar.

- Fotoğrafçı kayıtlıysa ilgili organizasyona atanır.
- Fotoğrafçı kayıtlı değilse davet oluşturulur.
- Davet fotoğrafçı tarafından kabul edilip hesap etkinleştirildikten sonra erişim açılır.
- Atama kaldırıldığında yeni yükleme başlatılamaz ve bekleyen tamamlamalar sunucuda reddedilir.

Fotoğrafçının panelinde yalnızca atandığı organizasyonlar ve profesyonel dosya yükleme alanı görünür.

## 6. Fotoğrafçı teslimat akışı

1. Organizasyon fotoğrafçının panelinde görünür.
2. Etkinlikten sonra fotoğrafçı ilgili organizasyonu açar.
3. Profesyonel çekimlerini seçer ve yüklemeyi başlatır.
4. Sistem dosya türü, boyutu, organizasyon ataması, hesap durumu, kota ve teslimat süresini sunucuda doğrular.
5. Fotoğrafçı yükleme ilerlemesini ve sonucunu görür.
6. Başarılı dosyalar ilgili organizasyon albümüne `photographer` kaynağıyla eklenir.
7. Organizasyon sahibi aynı panelde profesyonel çekimler ve QR ile gelen misafir içerikleri arasında filtreleme yapar.

Fotoğrafçı teslimat penceresi, misafirlerin QR yükleme penceresinden ayrı yönetilebilir. Kesin süre henüz açık ürün kararıdır.

## 7. Baskıcı çalışma alanı

Baskıcı için ayrı ve sınırlı bir hesap türü oluşturulur. Baskıcı genel yönetim paneline alınmaz.

Her baskı işi şu bilgileri içerebilir:

- Benzersiz baskı iş numarası
- Son teslim tarihi
- Ürün tipi, adet, malzeme ve ölçü
- Ön ve arka yüz üretim dosyaları
- Üretim notu
- Dosyanın sürümü
- İndirme ve üretim durumu

Baskıcı panelindeki durumlar:

1. Yeni iş
2. Dosya indirildi
3. Baskıya alındı
4. Hazır
5. ShineQR'a teslim edildi

Baskıcı için organizasyon sahibinin tam kimliği yerine mümkün olduğunda iş numarası kullanılır.

## 8. Baskıya hazır dosya ve sürüm kuralları

Ekran önizlemesi ile üretim dosyası farklı çıktılardır. Baskıya hazır dosyada en az aşağıdakiler doğrulanır:

- Fiziksel ölçü
- Çözünürlük
- Kesim ve taşma payları
- Ön/arka yüz eşleşmesi
- Canlı organizasyon bağlantısını taşıyan gerçek QR kodu
- Tasarım sürümü
- Baskı iş numarası

Baskıya hazır dosya yalnızca organizasyon sahibi onayı ve ShineQR kontrolünden sonra baskıcıya açılır. Baskıcı dosyayı indirdiğinde denetim kaydı oluşur. Değişiklik gerektiğinde eski dosyanın üzerine yazılmaz; yeni sürüm oluşturulur ve önceki sürüm korunur.

## 9. Fiziksel üretim ve teslimat

1. ShineQR onaylı tasarımdan baskı işini oluşturur.
2. İş ve üretim dosyaları yetkili baskıcıya atanır.
3. Baskıcı dosyayı indirir ve üretim durumunu günceller.
4. Ürünler ShineQR'a teslim edilir.
5. ShineQR fiziksel kalite ve doğru QR kontrolü yapar.
6. Ürünler ilgili ana partnere teslim edilir.
7. Teslim alan taraf ve teslim zamanı kaydedilir.

Baskıya gönderme ve fiziksel teslim geri alınması zor işlemlerdir; açık insan onayı gerektirir.

## 10. Önerilen organizasyon durumları

1. Taslak
2. Tasarım hazırlanıyor
3. Organizasyon sahibi onayı bekleniyor
4. Revizyon istendi
5. Baskıya hazır
6. Baskıcıya gönderildi
7. Baskıda
8. ShineQR teslim aldı
9. Partnere teslim edildi
10. Organizasyon aktif
11. Fotoğrafçı teslimatı bekleniyor
12. Tamamlandı
13. Arşivlendi

Her durum değişikliği tarih, saat ve işlemi yapan hesapla denetim kaydına yazılır.

## 11. Güvenlik ve sınır kuralları

- Tenant ve organizasyon sınırları yalnızca arayüzde değil sunucuda uygulanır.
- Fotoğrafçı sadece açıkça atandığı organizasyona yükleme yapabilir.
- Ana partner albüme erişemez.
- Baskıcı yalnızca kendisine atanmış, onaylı baskı dosyalarını indirebilir.
- Özel medya ve baskı dosyaları herkese açık URL olarak yayımlanmaz.
- Organizasyon sahibi başka bir organizasyonun albümüne erişemez.
- ShineQR yönetici erişimleri rol bazlı sınırlandırılır ve denetlenir.
- Organizasyonun mevcut paket, fiyat ve tasarım kayıtları tarihsel anlık görüntü olarak korunur; güncel katalogdan sessizce yeniden hesaplanmaz.

## 12. Kabul ölçütleri

- Ana partner bir organizasyon oluşturup QR, Loading ve Wedding seçimlerini taslak olarak kaydedebilir.
- Organizasyon sahibi önizlemeyi onaylamadan baskı dosyası baskıcıya açılamaz.
- Kayıtlı fotoğrafçı dizinden seçilip organizasyona atanabilir.
- Atanmamış veya farklı işletmedeki fotoğrafçı organizasyona erişemez.
- Fotoğrafçı profesyonel dosya yükleyebilir fakat misafir içeriklerini veya albümü göremez.
- Organizasyon sahibi hem profesyonel hem misafir içeriklerini aynı albümde, kaynak filtresiyle görebilir.
- Ana partner ve baskıcı hiçbir medya listeleme, önizleme, indirme veya ZIP bağlantısına erişemez.
- Baskıcı yalnızca atanmış ve onaylı üretim dosyasını indirebilir.
- Onaylı tasarım veya baskı dosyası sessizce değiştirilemez; yeni sürüm oluşturulur.
- Kritik atama, onay, indirme, durum ve erişim işlemleri denetim kaydında bulunur.

## 13. Uygulama öncesi açık kararlar

- Fotoğrafçı profesyonel dosyalarını etkinlikten sonra kaç gün içinde yükleyebilir?
- Profesyonel çekimler mevcut organizasyon kotasına hangi kuralla dahil edilir?
- Organizasyon sahibi kendi albümünde silme ve geri alma işlemlerini hangi kapsamda yapabilir?
- Bir organizasyona atanabilecek fotoğrafçı sayısı nedir?
- Ana partner organizasyon sahibinin hangi iletişim bilgilerini görebilir?
- Baskıya gönderme yetkisi yalnızca ShineQR yöneticisinde mi olacaktır?
- Baskıcıya iş atama ve teslim alma işlemini hangi ShineQR rolü yapacaktır?
- Fiziksel teslim şekilleri ve teslim kanıtı nasıl tutulacaktır?
- ShineQR yöneticilerinden hangileri albüm erişimi alacaktır?

Bu kararlar onaylanmadan fiyat, komisyon, özel tasarım hakkı, revizyon sayısı, baskı sorumluluğu veya teslim süresi hakkında yeni ticari taahhüt oluşturulmaz.

