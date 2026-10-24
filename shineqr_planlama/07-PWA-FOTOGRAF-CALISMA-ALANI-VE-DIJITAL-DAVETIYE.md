# ShineQR PWA, Fotoğrafçı Çalışma Alanı ve Dijital Davetiye

Durum: Planlandı, uygulama onayı bekliyor

Kaynak: `düzenleme24_10/ekleniceközellikler.txt`

Kapsam sürümü: 1

## 1. Amaç

Bu belge üç sonraki-faz özelliğinin sınırlarını tanımlar:

1. ShineQR yönetim ve albüm deneyiminin PWA olarak kurulabilmesi.
2. Organizasyona atanmış fotoğrafçıların çekimlerini klasörler halinde yükleyebileceği ayrı çalışma alanı.
3. Yalnızca satış anındaki Plan 3 paket kaydına dahil organizasyonlarda kullanılabilen dijital davetiye alanı.

Bu aşamada bu özellikler üretim koduna eklenmez. Görsel tasarım, uygulama ve veri geçişi ayrı onay gerektirir.

## 2. Değişmez ürün ve güvenlik kuralları

- Tenant sınırı sunucuda uygulanır. Fotoğrafçı yalnızca kendi işletmesine ve açıkça atandığı organizasyonlara erişebilir.
- Rol veya istemci arayüzü tek başına yetki kanıtı değildir; bütün okuma, yükleme, indirme ve silme işlemleri sunucuda doğrulanır.
- Fotoğrafçı çekimleri mevcut misafir yüklemelerinden ayrı kaynak ve klasör kimliğiyle saklanır.
- Fotoğrafçı yüklemeleri organizasyonun depolama ve saklama politikasına dahildir; ayrı ve sınırsız kota oluşturmaz.
- Mevcut satışların paket hakları güncel katalogdan yeniden hesaplanmaz. Dijital davetiye erişimi organizasyonun değişmez `package_snapshot` kaydından çözülür.
- Paket veya yetki değişiklikleri audit loguna yazılır.
- Üretim verisi için geriye dönük sessiz taşıma yapılmaz.

## 3. PWA kapsamı

### 3.1 İlk sürüm

- Uygulama manifesti, ShineQR adı, marka renkleri ve gerekli ikon boyutları.
- Desteklenen tarayıcılarda ana ekrana ekleme.
- Yönetim ve albüm sayfalarının uygulama kabuğunda açılması.
- Çevrimdışı durumda açık ve dürüst bağlantı uyarısı.
- Güvenli olmayan veya süresi dolmuş verilerin cihaz önbelleğinde kalmaması.

### 3.2 Önbellek ilkeleri

- Statik marka varlıkları sürümlü olarak önbelleğe alınabilir.
- Oturum, hesap, organizasyon, medya listesi, imzalı medya bağlantısı ve finans yanıtları kalıcı önbelleğe alınmaz.
- POST, PATCH ve DELETE işlemleri çevrimdışıyken başarılıymış gibi gösterilmez.
- Yeni sürüm etkinleştiğinde eski uygulama kabuğu kontrollü biçimde temizlenir.

### 3.3 PWA kabul ölçütleri

- Manifest geçerli ve kurulabilir olmalıdır.
- Çevrimdışı açılış kullanıcıya bağlantı durumunu açıklamalıdır.
- Çıkış sonrasında korumalı veri tarayıcı önbelleğinden okunamamalıdır.
- iOS ve Android için ikon, güvenli alan ve tema renkleri doğrulanmalıdır.
- Lighthouse PWA ve erişilebilirlik kontrolleri raporlanmalıdır.

## 4. Fotoğrafçı çalışma alanı

### 4.1 Roller ve atama

- `photographer` hesabı bir işletmeye bağlıdır.
- Hesap, yalnızca `assigned_event_ids` içinde bulunan ve aynı `partner_id` değerine sahip organizasyonları görebilir.
- Atama ve kaldırma işlemini yalnızca yetkili işletme sahibi veya platform yöneticisi yapabilir.
- Atama kaldırıldığında yeni erişim hemen kesilir; önceki işlemler audit geçmişinde kalır.

### 4.2 Organizasyon içindeki görünüm

Mevcut üst navigasyona ayrı bir **Fotoğrafçı çekimleri** bölümü eklenir. Bu bölüm:

- Misafir Albümü içerikleriyle karışmaz.
- Atanmış fotoğrafçıları ve hesap durumlarını gösterir.
- Fotoğrafçı klasörlerini listeler.
- Yetkili kullanıcıya klasör bazında görüntüleme ve indirme sunar.
- Atama yoksa açık bir boş durum gösterir.

### 4.3 Klasörlü yükleme modeli

Önerilen kayıtlar:

- `photographer_folders`: `id`, `wedding_id`, `partner_id`, `photographer_id`, `name`, `created_at`, `created_by`.
- Medya kaydına kaynak bilgisi: `source = guest | photographer` ve isteğe bağlı `photographer_folder_id`.
- Klasör adı sunucuda kırpılır, uzunluk sınırına tabi tutulur ve HTML olarak yorumlanmaz.
- Bir medya kaydı yalnızca aynı organizasyona ait klasöre bağlanabilir.

### 4.4 İşlem ve yarış koşulları

- Yükleme başlatılırken atama tekrar doğrulanır.
- Yükleme tamamlanırken organizasyon, klasör, kota ve atama yeniden doğrulanır.
- Ataması kaldırılan fotoğrafçının bekleyen yüklemesi tamamlanamaz.
- Aynı dosyanın yeniden gönderilmesi için idempotency anahtarı kullanılır.
- Klasör silme, içeriği doğrudan kalıcı silmez; mevcut çöp kutusu ve saklama politikası uygulanır.

### 4.5 Fotoğrafçı kabul ölçütleri

- Farklı işletmedeki fotoğrafçı organizasyonu veya klasörü göremez.
- Atanmamış fotoğrafçı doğrudan URL ile erişemez.
- Atanmış fotoğrafçı yalnızca kendi yüklemelerini klasörleyebilir.
- İşletme sahibi ve organizasyon sahibi yetkileri ürün kararıyla ayrı ayrı doğrulanır.
- Kota hesabında misafir, fotoğrafçı, çöp kutusu ve bekleyen yüklemeler birlikte değerlendirilir.

## 5. Dijital davetiye

### 5.1 Paket kapısı

- Dijital davetiye yalnızca organizasyonun kayıtlı paket snapshot’ı Plan 3 hakkını içeriyorsa açılır.
- Güncel katalogdaki Plan 3 değişiklikleri eski organizasyonların hakkını sessizce değiştirmez.
- Plan 1 ve Plan 2 için alan kilitli görünür; satın alma veya yükseltme akışı bu belgenin kapsamı dışındadır.

### 5.2 İlk alan modeli

Tasarım daha sonra hazırlanacağı için ilk uygulama yalnızca kontrollü içerik alanlarını tanımlar:

- Davetiye etkin/pasif durumu.
- Başlık ve kısa davet metni.
- Organizasyon tarihi ve mekânı; varsayılan olarak organizasyon kaydından okunur.
- Paylaşım adresi.
- Şablon kimliği ve şablon sürümü.
- Yayınlanma zamanı ve yayınlayan hesap.

### 5.3 Yayınlama kuralları

- Taslak içerik herkese açık değildir.
- Yayınlama sunucuda Plan 3 paket snapshot’ı ve organizasyon sahipliği doğrulandıktan sonra yapılır.
- Organizasyon arşivlendiğinde veya süresi dolduğunda davetiye davranışı ayrıca ürün kararıyla belirlenmelidir.
- Davetiye şablonu sürümlenir; yeni şablon eski yayınları kendiliğinden değiştirmez.

### 5.4 Dijital davetiye kabul ölçütleri

- Plan 1 ve Plan 2 organizasyonları API üzerinden de davetiye yayınlayamaz.
- Plan 3 erişimi güncel katalogdan değil kayıtlı snapshot’tan hesaplanır.
- Taslak ve yayınlanmış durumlar ayrıdır.
- Kullanıcı metinleri doğrulanır, uzunluk sınırına tabidir ve güvenli biçimde gösterilir.
- Yayınlama ve geri çekme işlemleri audit loguna yazılır.

## 6. Uygulama sırası

1. Paket snapshot’ına sürümlü dijital davetiye hakkı ekleme ve geriye uyumluluk kararı.
2. Fotoğrafçı atama API’si ve yetkilendirme testleri.
3. Fotoğrafçı klasör modeli, yükleme tamamlama kontrolleri ve kota entegrasyonu.
4. Organizasyon içi Fotoğrafçı Çekimleri arayüzü.
5. Dijital davetiye taslak/yayın API’si.
6. Onaylanan dijital davetiye tasarımı.
7. PWA manifesti, güvenli önbellek politikası ve cihaz testleri.

## 7. Uygulama öncesi açık kararlar

- Organizasyon sahibinin fotoğrafçı çekimlerini indirme ve silme yetkileri.
- Bir organizasyona atanabilecek fotoğrafçı sayısı.
- Fotoğrafçıların birbirlerinin klasörlerini görüp göremeyeceği.
- Davetiye için kullanılacak son adres yapısı ve yayın sonrası saklama davranışı.
- Plan 3 snapshot’ına eklenecek hakkın alan adı ve eski Plan 3 satışlarına uygulanıp uygulanmayacağı.
- PWA çevrimdışı ekranının onaylı görsel tasarımı.

Bu kararlar onaylanmadan üretim veri modeli veya mevcut satış kayıtları değiştirilmemelidir.
