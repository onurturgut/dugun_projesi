# Yayın ve işletim

## Kurulum

Node.js 22+ ve MongoDB gerekir. `.env.example` dosyasından `.env.local` hazırlayın. Üretimde değişkenleri sunucunun ortam ayarlarına da ekleyin. Bu dosyayı depoya göndermeyin.

```text
yarn install
yarn setup
yarn platform:migrate
yarn build
yarn start
```

Mevcut kurulumda `platform:migrate` yönetici hesabını platform rolüne geçirir ve eski organizasyonları `Platform organizasyonları` işletmesine bağlar. Kayıtlar silinmez. Tarihi bilinmeyen eski organizasyonlarda yükleme kapalı kalır; gerçek tarihi panelden girin. Tekrar çalıştırmak organizasyonun bilgilerini veya mevcut parolayı değiştirmez. ADMIN_EMAIL mevcut platform yöneticisini göstermelidir.

## Roller

- `/auth`: Kullanıcı adı veya e-posta ile giriş.
- `/admin`: Rolün erişebildiği organizasyonlar.
- `/admin/partners`: Yalnızca platform yöneticisi; işletme oluşturma, erişimi kapatma/açma.
- `/admin/[id]`: Yetkili işletme ve platform için düzenleme/QR/sahip hesabı; organizasyon sahibi için özel albüm.
- `/account/password`: Şifre değiştirme. Partner ve sahip hesaplarında ilk girişte zorunlu.
- `/wedding/[slug]`: Üyeliksiz misafir yükleme sayfası. Albüm içerikleri misafirlere açılmaz.

Organizasyon başına bir sahip hesabı vardır. İşletme bu hesabın kullanıcı adını ve geçici şifresini belirler. İlk girişten sonra gerçek şifre işletmeye gösterilmez. Hesap oluşturma ekranını doldurmadan önce geçici şifreyi müşteriye iletecek şekilde kaydedin.

## R2 bağlantısı

R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY ve R2_BUCKET_NAME gerekli. Misafir dosyalarının bucketı private kalmalıdır. Erişim anahtarını bu bucketta okuma/yazma/silme yapacak şekilde yetkilendirin.

Tarayıcı doğrudan imzalı PUT URL'sine yükler. Bucket CORS ayarı kendi yayın adresinizi içermelidir:

```json
[
  {
    "AllowedOrigins": ["http://localhost:3000", "https://alan-adiniz.com"],
    "AllowedMethods": ["GET", "HEAD", "PUT"],
    "AllowedHeaders": ["content-type", "range"],
    "ExposeHeaders": [
      "ETag",
      "Content-Length",
      "Content-Range",
      "Accept-Ranges"
    ],
    "MaxAgeSeconds": 3600
  }
]
```

Özel albüm listesi yetki kontrolünden sonra 15 dakika geçerli imzalı R2 adresleri üretir. Tam boy fotoğraf ve video trafiği doğrudan R2'den akar; indirmeler ve cache'lenebilir küçük önizlemeler uygulama API'sinde yetki denetiminden geçer. Video ileri/geri sarma için R2 CORS ayarında Range başlığına izin verilmelidir. Misafir sayfasındaki kapaklar ve işletme logosu halka açık görsellerdir; özel albüm bucketının adresini kapak olarak kullanmayın. Mevcut kapak yükleme komutu ayrı public bucket kullanır: `yarn upload:covers`.

## Medya önizleme worker'ı

Tamamlanan yüklemeler `pending` durumuyla kuyruğa girer. `yarn worker` her turda en fazla 8 kayıt için kalıcı 640×640 WebP önizleme üretir. Fotoğraflar Sharp ile döndürülüp kırpılır; videolardan paketle gelen FFmpeg ile poster karesi alınır. Başarısız işler en fazla üç kez denenir. On beş dakikadan uzun süre `processing` durumunda kalan işler sonraki turda yeniden denenir. Orijinal medya silinirken türetilmiş önizleme de R2'den silinir.

Worker ayrı ve yeniden başlatılabilir bir servis olarak sürekli çalışmalıdır. FFmpeg paketinin platform binary'sinin deployment çıktısına dahil edildiği yayın öncesinde doğrulanmalıdır.

## ZIP indirme

Albümün tamamı veya en fazla 200 seçili dosya ZIP olarak indirilebilir. ZIP içinde dosyalara eşlenmiş isim/mesaj bilgileri `misafir-mesajlari.json` olarak yer alır. Arşiv akış halinde oluşturulur; kalıcı bir ZIP kopyası saklanmaz. Bu sayede eski ZIP bağlantıları silinen içeriklerin erişimini sürdürmez.

Arka planda iş kuyruğuyla arşiv hazırlama bu sürümde yoktur. Çok büyük albümlerde indirme süresi dosyaların toplam boyutuna bağlıdır. Yayın sunucusu ve varsa reverse proxy, uzun yanıtları kesmeyecek şekilde yapılandırılmalıdır. Kısa süre sınırı olan serverless ortamlarda büyük arşivler için ayrı worker/kuyruk eklenmelidir. Üretim kabulünde temsilî büyüklükte bir video albümüyle indirme testi yapılmalıdır.

## Saklama ve otomatik temizlik

- Saat dilimi: Europe/Istanbul, UTC+03:00.
- Tarih alanı yerel saatle 00:00 kabul edilir.
- Yükleme oluşturma anında açılır, organizasyon tarihinden varsayılan 7 gün sonra 00:00'da kapanır.
- Saklama süresi 3 takvim ayıdır; hedef ayda aynı gün yoksa ayın son günü kullanılır.
- Silinen dosya varsayılan 7 gün çöp kutusunda kalır. Üç aylık son tarih daha erkense o tarih geçerlidir.
- Yükleme ve erişim bitişi her API isteğinde denetlenir. Süreyi yalnızca platform yöneticisi organizasyon bazında değiştirebilir; üç aylık saklama politikası sabittir.

`CRON_SECRET` için rastgele en az 32 karakter belirleyin; `APP_URL` çalışan uygulamanın adresi olmalı. Süresi dolan R2 dosyalarının fiziksel temizliği için bir zamanlayıcı **zorunludur**:

```text
yarn maintenance
```

Bu komutu işletim sisteminin görev zamanlayıcısıyla dakikada bir çalıştırın veya ayrı, yeniden başlatılabilir bir servis olarak aşağıdakini çalıştırın:

```text
yarn worker
```

Worker her tamamlanan turdan bir dakika sonra tekrar çalışır. Tek tur en fazla 500 medya dosyası, 500 yükleme bileti ve 100 organizasyon işler. Büyük kuyruklar sonraki turlarda tamamlanır. Depolama hatasında kayıt korunur ve silme tekrar denenir. Dolayısıyla uygulamada erişim tam son tarihte kapanır; fiziksel silmenin tamamlanması worker çalışmasına, kuyruğa ve R2 erişimine bağlıdır.

Çöp kutusundan geri alma, silme işlemi başlamış veya süresi dolmuş dosyalarda kapalıdır. Süre sonunda dosyalar ve bağlı misafir isim/mesajları silinir; organizasyon başlık/tarih kaydı panelde kalır. Tamamlanmamış yükleme anahtarları TTL ile kaybedilmez; orphan dosyalar temizlendikten sonra biletler kaldırılır. Platform panelinde son temizlik çalışması ve hata durumu görünür.

## Kontroller

## Güvenlik ve arşiv ortam ayarları

- Platform yöneticisinin 2FA anahtarlarını şifrelemek için Production ve Preview ortamlarına en az 32 karakterlik `MFA_ENCRYPTION_KEY` ekleyin ve güvenli parola kasasında yedekleyin.
- Yeni audit, oturum, arşiv işi ve rate-limit indekslerini oluşturmak için sürümden sonra bir kez `yarn setup --database-only` çalıştırın.
- Tüm albüm arşivleri worker tarafından hazırlanır, R2'ye yazılır ve 24 saat sonra worker tarafından silinir. Bu nedenle cron/worker kesintisiz çalışmalıdır.
- Kritik yönetim hareketleri platform yöneticisinin `/admin/audit` ekranında görüntülenir.

```text
yarn typecheck
yarn lint
yarn test
yarn test:integration
yarn build
```

## Temsilî yük testi

Yük testi sabit `temsili-yuk-testi` organizasyonu ve `load-tests/` R2 öneki kullanır. Gerçek organizasyon kayıtlarına dokunmaz; yine de seed ve cleanup komutları açık onay olmadan çalışmaz. PowerShell'de:

```powershell
$env:LOAD_TEST_CONFIRM="YES"
$env:LOAD_TEST_PASSWORD="yalnizca-test-icin-guclu-sifre"
$env:LOAD_TEST_MEDIA_COUNT="500"
yarn load:seed

$env:LOAD_TEST_USERS="5,10,30"
$env:LOAD_TEST_PHASE_SECONDS="30"
yarn load:test

yarn load:cleanup
```

Test boyunca web uygulaması ve worker ayrı terminallerde çalışmalıdır. `load:test` albümün ilk/ikinci sayfasını, fotoğraf filtresini, aramayı ve yetkili thumbnail erişimini tekrarlar; sonunda istek sayısı, hata oranı, saniyedeki istek ve p50/p95/p99 gecikmelerini raporlar. Hata oranı `%1` veya p95 `750 ms` ve üzerindeyse komut başarısız kodla kapanır.

Seed içindeki temsili video kayıtları video filtresi ve poster kartı yükünü ölçer; gerçek video kodlama/oynatma testi için ayrıca gerçek bir MP4 yüklenmelidir. Test yarıda kesilse bile aynı onay değişkeniyle `yarn load:cleanup` yalnızca sabit yük testi kimliklerini ve bunlara bağlı R2 anahtarlarını siler.

Entegrasyon testi ayrı `test_platform_*` MongoDB veritabanı, 3100 portunda Next.js sunucusu ve geçici bir yerel S3 taklidi kullanır. Test bitince yalnızca kendi test veritabanını siler. `.next-test` çıktı klasörü kullanılır. R2_TEST_ENDPOINT sadece üretim dışı ortamda ve veritabanı adı `test_` ile başlıyorsa etkilidir; üretimde Cloudflare adresi kullanılır.

Testler canlı Cloudflare R2 hesabını doğrulamaz. Yayın öncesinde gerçek R2 ile mobil yükleme, özel görüntüleme, ZIP ve silme işlemleri ayrıca denenmelidir. QR kodları yayın adresinde yeniden indirin; localhost QR kodlarını misafirlere dağıtmayın.

Kaynaklar: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Cloudflare R2 imzalı URL'ler](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/).
