# ShineQR V4 rol panelleri, entegrasyon runtime ve QA raporu

Tarih: 15 Kasım 2026

## Kapsam

- Fotoğrafçı, düğün salonu, organizasyon firması, baskıcı, gelinlik, çiçekçi, süperadmin ve organizasyon sahibi için rol/işletme türüne duyarlı V4 çalışma alanı.
- Genel site ve yönetim paneli arasında ortak renk ve tipografi token sözleşmesi.
- Payment intent durum makinesi, idempotent outbox, üstel retry ve dead-letter veri modeli.
- Adapter kayıt defteriyle atomik outbox claim, teslimat ve hata sonlandırma işlemcisi.
- İmza doğrulaması, sağlayıcı olay tekilleştirmesi, ham içerik özeti ve retry/dead-letter worker sözleşmesi olan provider-neutral webhook runtime.
- Tenant kapsamlı entegrasyon kuyruk özeti ve dead-letter gözlem endpoint'i.
- Payment intent, outbox ve webhook event koleksiyon indeksleri için apply/rollback migration.
- WCAG kontrast, klavye odağı, minimum dokunma alanı, azaltılmış hareket ve responsive sözleşme testleri.

## Uygulanan davranış

İşletmenin ana hesabı `partner_owner` kalır. Panel varyantı yetkiyi değiştiren bir istemci kararı değildir; oturumdaki sunucu kaynaklı `business_types` alanından belirlenir. Fotoğrafçı ve baskıcı operasyon rolleri mevcut sunucu izin matrisiyle sınırlı kalır. Her işletme türü organizasyon/üretim, CRM, finans-hakediş ve dijital mağaza modüllerine uygun metin ve birincil işlemle ulaşır.

Payment intent terminal durumları gecikmiş webhook ile yeniden açılamaz. Outbox olayı idempotency key ile tekilleştirilir, başarısız teslimatlar sınırlandırılmış üstel gecikmeyle tekrar denenir ve deneme sınırında dead-letter durumuna geçer. Olay oluşturulurken sağlayıcı snapshot'ı dondurulur; worker yalnızca kendi capability/sağlayıcı çiftini atomik olarak claim eder. Süresi dolan işlem lease'i geri alınır, adapter-sağlayıcı uyuşmazlığı kapalı-güvenli sonuçlanır ve geçersiz sağlayıcı makbuzu teslim edilmiş kabul edilmez. Lease sahipliği kaybedilmişse worker teslimat başarısı raporlamaz.

Webhook kabul katmanı geçersiz imzayı kalıcılaştırmaz. Doğrulanan olayda ham gövde yerine SHA-256 özeti ve en fazla 64 KB boyutlu, gizli anahtar adları reddedilmiş normalize veri tutulur. Sağlayıcı olay kimliği benzersizdir; tekrar teslimatlar duplicate sonucu verir. Webhook worker capability/sağlayıcı kuyruğunu atomik claim eder, süre aşmış lease'i geri alır ve hata sınırında dead-letter durumuna geçirir. Migration yalnızca yeni indeksleri yönetir; rollback veri silmez.

Outbox ve webhook worker'ları yetkili maintenance çağrısına bağlandı. Tek cron turu her kuyrukta en fazla 25 olay işler ve boş kuyrukta ilk idle sonucunda durur. Adapter registry boşken dış çağrı yapılmaz; ödeme ve banka capability'leri ancak aynı sağlayıcı için hem outbound hem webhook adapterı kayıtlıysa hazır kabul edilir.

Provider-neutral webhook HTTP girişi `/api/integrations/webhooks/{capability}/{provider}` sözleşmesiyle hazırdır. Yalnızca registry'deki tam eşleşme çalışır; diğer sağlayıcılar 404 alır. Rota 1 MB gövde sınırı uygular, adapter imza doğrulamasından geçmeyen isteği 401 ile reddeder, ilk kabulü 202 ve doğrulanmış tekrar teslimatı idempotent 200 ile sonuçlandırır.

Gövde sınırı yalnızca `Content-Length` başlığına güvenmez. Chunked istek akışının gerçek byte sayısı okunurken ölçülür, 1 MB üzerinde stream iptal edilir ve geçersiz UTF-8 içerik işlenmez. Boş registry ile üretim sunucusu smoke testinde kayıtlı olmayan ödeme sağlayıcısı 404 döndürdü.

Kart payment intent endpoint'i tutarı istemciden kabul etmez. Tutar doğrulanmış tahsilatlar düşüldükten sonra satış snapshot'ından hesaplanır; ileri tarihli satışın ilk intent'i organizasyonda dondurulmuş yüzde 20 kapora tutarıdır. Intent ve `payment_intent.create` outbox olayı aynı transaction içinde yazılır. Sağlayıcı readiness durumu hazır değilse endpoint 503 ile kapalı kalır ve harici yönlendirme üretmez.

Payment intent son kullanma zamanı outbox olayına snapshot olarak taşınır. Worker süresi geçmiş veya geçersiz son kullanma zamanı olan olayı adapter çağrısından önce `event_expired` koduyla dead-letter'a alır; böylece gecikmiş kuyruk işlemi yeni bir harici ödeme başlatamaz.

Readiness yalnızca ortam değişkenlerinin bulunmasına güvenmez; capability için aynı sağlayıcı adına kayıtlı gerçek adapter da bulunmalıdır. Secret'ları tamamlanmış fakat adapterı olmayan sağlayıcı `adapter_unavailable` kalır ve payment intent oluşturamaz. Yetkili işletme kullanıcısı intent durumunu yalnızca kendi tenant kaydı için sorgulayabilir; yanıt sağlayıcı iç kimliklerini açığa çıkarmaz.

## Sağlayıcı sınırı

POS, banka, SMS, WhatsApp Business, e-posta, takvim ve muhasebe için sağlayıcı seçimi, sözleşme, sandbox hesabı, callback adresi ve secret bulunmadığından gerçek dış servise çağrı eklenmedi. Readiness kapalı-güvenli çalışır. Bu kalemler sağlayıcı bilgileri olmadan tamamlanmış veya test edilmiş kabul edilemez.

Gerekli ortam değişkenlerinin yalnızca isimlerini içeren, secretsiz şablon `.env.integrations.example` dosyasındadır.

## Doğrulama

- `npm test`: 161/161 geçti.
- `yarn typecheck`: geçti.
- `yarn lint`: geçti.
- `yarn build`: Next.js 16.3.8 production build geçti; 39 statik/dinamik route üretildi.
- `git diff --check`: whitespace hatası yok.
- `playwright test tests/e2e/public-visual.spec.ts`: 18/18 geçti.
- Anasayfa, işletme dizini, dijital davetiye galerisi, fotoğrafçı paketi ve işletme onboarding ekranları için telefon, tablet ve masaüstü olmak üzere 15 görsel baseline üretildi.
- Aynı beş route üç viewportta gerçek axe-core WCAG 2.2 taramasından ciddi/kritik ihlal olmadan geçti.
- Süper admin, organizasyon sahibi, fotoğrafçı, düğün salonu, organizasyon
  firması, baskıcı, gelinlik ve çiçekçi panelleri için deterministik API
  sözleşmesiyle telefon, tablet ve masaüstünde 24 görsel baseline üretildi.
- Rol paneli baseline değiştirilmeden yeniden çalıştırıldı: 24/24 görsel
  regresyon ve axe WCAG 2.2 serious/critical kontrolü geçti.
- Aynı 24 senaryoda yatay taşma sınırı ve klavyeyle “içeriğe geç” odağı
  doğrulandı; telefon, tablet ve masaüstü baseline'ları değişmedi.
- İşletme hesap ayarları ve dijital mağaza çalışma alanı için telefon, tablet ve
  masaüstünde açık/koyu tema için 12 ek baseline üretildi. Güncellemesiz ikinci koşu 12/12 geçti;
  yatay taşma ve axe WCAG 2.2 serious/critical ihlali bulunmadı.
- Gerçek tarayıcı denetiminde bulunan eski açık tema renk override'ı kaldırıldı;
  panel artık merkezi marka tokenlarını kullanıyor. Küçük vurgu metinleri için
  ayrı AA uyumlu `brand-accent-text` tokenı kullanılıyor.
- Test sırasında bulunan açık tema küçük metin, çerez bağlantısı, koyu kapsam kartı ve onboarding etiketi kontrast sorunları düzeltildi.
- Yeni ayar/mağaza matrisi; küçük bölüm başlıkları, yardımcı metinler, ikincil
  güvenlik düğmesi ve canlı önizleme notundaki açık tema kontrast sorunlarını
  ortaya çıkardı. Bu öğeler `admin-accent-text`, `admin-muted` ve `admin-text`
  tokenlarına bağlandı.
- Koyu temada ayar açıklamaları, birincil düğme, taslak durumu ve medya notu
  merkezi admin tema tokenlarına taşındı; ciddi/kritik axe bulgusu kalmadı.
- V4 admin, rol çalışma alanı, işletme ve pazarlama yüzeylerindeki yerel
  `Georgia`, `Geist`, `Inter`, `Manrope` ve `Arial` tanımları kaldırıldı;
  tipografi merkezi `--font-display` ve `--font-sans` tokenlarından tüketiliyor.
  Bu sözleşme birim testiyle korunuyor.
- Merkezi tipografi geçişinden sonra 24 rol paneli, 12 ayar/mağaza ve 18
  kamusal route senaryosu baseline güncellenmeden yeniden çalıştırıldı;
  toplam 54/54 Playwright senaryosu geçti.

## Kalan kabul işleri

1. Onaylanan her sağlayıcı için adapter ve webhook payload sözleşmesi.
2. Sandbox anahtarlarıyla başarı, red, timeout, duplicate webhook ve sıra dışı webhook testleri.
3. Staging ortamında migration apply ve worker çalıştırma.
4. Staging hesaplarıyla gerçek oturum/uçtan uca rol paneli kabul turu. Yerel
   secretsiz rol sözleşmesi ve 24 baseline tamamlandı; staging testi onun yerine
   geçmez.
5. Ekran okuyucu ve klavye ile manuel WCAG 2.2 kabul turu.

## Rollback

- UI değişiklikleri uygulama sürümü geri alınarak döndürülür; veri şekli değiştirmez.
- Yeni entegrasyon indeksleri `yarn integrations:migrate:rollback` ile kaldırılır; koleksiyon kayıtları silinmez.
- Yeni sağlayıcı adapterları feature/readiness kontrolü geçmeden etkinleşmemelidir.
