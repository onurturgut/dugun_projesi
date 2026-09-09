# Yayın ve işletim

## Kurulum

Node.js 22+ ve MongoDB gerekir. `.env.example` dosyasından `.env.local` hazırlayın. Üretimde değişkenleri sunucunun ortam ayarlarına da ekleyin. Bu dosyayı depoya göndermeyin.

```text
npm install
npm run setup
npm run platform:migrate
npm run build
npm start
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
[{"AllowedOrigins":["http://localhost:3000","https://alan-adiniz.com"],"AllowedMethods":["PUT"],"AllowedHeaders":["content-type"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3600}]
```

Özel fotoğraf/video okuma ve indirme, oturum ve organizasyon yetkisini her istekte denetleyen uygulama API'sinden akar. Videoların ileri/geri sarılması için Range istekleri desteklenir. Misafir sayfasındaki kapaklar ve işletme logosu halka açık görsellerdir; özel albüm bucketının adresini kapak olarak kullanmayın. Mevcut kapak yükleme komutu ayrı public bucket kullanır: `npm run upload:covers`.

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
npm run maintenance
```

Bu komutu işletim sisteminin görev zamanlayıcısıyla dakikada bir çalıştırın veya ayrı, yeniden başlatılabilir bir servis olarak aşağıdakini çalıştırın:

```text
npm run worker
```

Worker her tamamlanan turdan bir dakika sonra tekrar çalışır. Tek tur en fazla 500 medya dosyası, 500 yükleme bileti ve 100 organizasyon işler. Büyük kuyruklar sonraki turlarda tamamlanır. Depolama hatasında kayıt korunur ve silme tekrar denenir. Dolayısıyla uygulamada erişim tam son tarihte kapanır; fiziksel silmenin tamamlanması worker çalışmasına, kuyruğa ve R2 erişimine bağlıdır.

Çöp kutusundan geri alma, silme işlemi başlamış veya süresi dolmuş dosyalarda kapalıdır. Süre sonunda dosyalar ve bağlı misafir isim/mesajları silinir; organizasyon başlık/tarih kaydı panelde kalır. Tamamlanmamış yükleme anahtarları TTL ile kaybedilmez; orphan dosyalar temizlendikten sonra biletler kaldırılır. Platform panelinde son temizlik çalışması ve hata durumu görünür.

## Kontroller

```text
npm run typecheck
npm run lint
npm test
npm run test:integration
npm run build
```

Entegrasyon testi ayrı `test_platform_*` MongoDB veritabanı, 3100 portunda Next.js sunucusu ve geçici bir yerel S3 taklidi kullanır. Test bitince yalnızca kendi test veritabanını siler. `.next-test` çıktı klasörü kullanılır. R2_TEST_ENDPOINT sadece üretim dışı ortamda ve veritabanı adı `test_` ile başlıyorsa etkilidir; üretimde Cloudflare adresi kullanılır.

Testler canlı Cloudflare R2 hesabını doğrulamaz. Yayın öncesinde gerçek R2 ile mobil yükleme, özel görüntüleme, ZIP ve silme işlemleri ayrıca denenmelidir. QR kodları yayın adresinde yeniden indirin; localhost QR kodlarını misafirlere dağıtmayın.

Kaynaklar: [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers), [Cloudflare R2 imzalı URL'ler](https://developers.cloudflare.com/r2/api/s3/presigned-urls/), [R2 CORS](https://developers.cloudflare.com/r2/buckets/cors/).
