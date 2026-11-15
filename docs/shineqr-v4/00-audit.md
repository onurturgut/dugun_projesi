# ShineQR V4 — A0 Kaynak Denetimi

**Tarih:** 14 Kasım 2026  
**Durum:** Tamamlandı; uygulama fazlarına giriş için kaynak tabanı  
**Kapsam:** Mevcut repo, V4 tasarım paketi, route ve koleksiyon envanteri, yetki modeli, CRM, finans, tasarım/baskı ve test yüzeyi

## 1. Yönetici özeti

ShineQR boş bir V4 projesi değildir. Çalışan uygulamada organizasyon, QR yönlendirme,
misafir yükleme, özel albüm, dijital davetiye, tasarım merkezi, baskı işleri,
satış/tahsilat/cari/mutabakat, komisyon ve hakediş altyapıları bulunmaktadır.

V4 dönüşümünün amacı bu altyapıyı yeniden yazmak değil; mevcut sözleşmeleri ve
tarihsel snapshot'ları koruyarak ortak bir tasarım sistemi altında birleştirmek,
dijital işletme mağazasını tamamlamak, bağımsız işletme CRM'ini genişletmek ve
organizasyon maliyetlerini tekil/idempotent finans olaylarıyla izlenebilir hale
getirmektir.

Denetim anındaki en ileri yeni modül, dijital işletme vitrini + katalog + CRM lead
Kanban akışıdır. Bir sonraki güvenli veri işi `business_leads` ve işletme verileri
için indeks/migration/rollback paketidir. Görsel dönüşümde sıradaki iş A1 V4 UI Kit'tir.

## 2. Kaynak ve öncelik sırası

1. `AGENTS.md` ve onaylı ürün kuralları.
2. Mevcut domain kodu, veritabanı modelleri ve tarihsel snapshot'lar.
3. Mevcut testler ve API davranışları.
4. V4 tasarım paketi; görsel referanstır, üretim verisi veya iş kuralı değildir.
5. Yapıştırılan V4 uygulama metni; uygulanacak hedefleri açıklar ancak örnek fiyat,
   oran ve maliyetler doğrulanmadan kanonik üretim kuralına dönüştürülemez.

ZIP içindeki `ShineQR_V4_Bilgilendirme.md`, HTML'in gerçek API/veritabanına bağlı
olmadığını ve işletme, medya, tarih, finans ve CRM verilerinin temsili olduğunu
açıkça belirtmektedir. Bu nedenle prototip rakamları gerçek raporlara taşınmayacaktır.

## 3. Teknik taban

| Alan                  | Mevcut kaynak                                                          |
| --------------------- | ---------------------------------------------------------------------- |
| Uygulama              | Next.js App Router, React, TypeScript                                  |
| Veri                  | MongoDB                                                                |
| Medya                 | S3 uyumlu Cloudflare R2 akışı                                          |
| İstemci veri yönetimi | TanStack React Query                                                   |
| Form/validasyon       | React Hook Form, Zod                                                   |
| UI                    | Radix UI/shadcn tabanlı bileşenler, CSS/Tailwind altyapısı             |
| Hareket               | GSAP mevcut                                                            |
| Finans                | Tam sayı kuruş, KDV dahil müşteri fiyatı, snapshot tabanlı kayıt       |
| Test                  | Node test runner + TSX; entegrasyon ve migration/concurrency betikleri |

`src/lib/server/handler.ts` çok geniş bir catch-all API uygulamasıdır. Dış endpoint
sözleşmeleri korunarak yalnızca dokunulan alanlar kademeli servis modüllerine
ayrılmalıdır. Tek seferlik büyük refactor yapılmamalıdır.

## 4. Gerçek route envanteri

### 4.1 Kamuya açık ve hesap rotaları

| Route                                    | Durum                | V4 notu                                           |
| ---------------------------------------- | -------------------- | ------------------------------------------------- |
| `/`                                      | Mevcut               | Ana içerik korunarak V4 görsel diline taşınacak   |
| `/nasil-calisir`                         | Mevcut               | V4 kamu sayfası fazı                              |
| `/ozellikler`                            | Mevcut               | V4 kamu sayfası fazı                              |
| `/temalar`                               | Mevcut               | QR/davetiye tema kimliği korunmalı                |
| `/paketler`                              | Mevcut               | Aktif DB kataloğu/snapshot öncelikli              |
| `/kullanim-alanlari`                     | Mevcut               | V4 kamu sayfası fazı                              |
| `/isletmeler-icin`                       | Mevcut               | İşletme edinme anlatımı                           |
| `/fotografci-paketi`                     | Mevcut               | Gerçek politika ve hakedişle uyumlu olmalı        |
| `/is-ortaklarimiz`                       | Mevcut               | Yeni işletme rehberiyle rolü netleştirilmeli      |
| `/tasarim-onizleme`                      | Mevcut               | Tasarım referansı/demo niteliği açık olmalı       |
| `/sss`, `/iletisim`                      | Mevcut               | V4 kamu sayfası fazı                              |
| `/hukuki/[slug]`                         | Mevcut               | Hukuki içerik tasarımdan bağımsız korunmalı       |
| `/isletmeler`                            | **Mevcut/yeni**      | Onaylı işletme dizini uygulanmış durumda          |
| `/isletmeler/[slug]`                     | **Mevcut/yeni**      | Vitrin, katalog ve lead formu uygulanmış durumda  |
| `/dijital-davetiyeler`                   | Eksik                | Galeri route'u A4 kapsamında oluşturulmalı        |
| `/auth`, `/auth/reset-password`          | Mevcut               | Kimlik akışı korunmalı                            |
| `/account/settings`, `/account/password` | Mevcut               | İşletme/hesap ayarları ayrımı korunmalı           |
| `/wedding/[slug]`                        | Mevcut               | Misafir yükleme ve özel album davranışı korunmalı |
| `/invitation/[slug]`                     | Mevcut               | Eski paylaşılan linkler bozulmamalı               |
| `/photographer-invite/[token]`           | Mevcut               | Atama ve token güvenliği korunmalı                |
| `/q/[id]`                                | Mevcut route handler | QR yönlendirmesi geriye uyumlu kalmalı            |

### 4.2 Yönetim ve operasyon rotaları

Mevcut yönetim yüzeyi: `/admin`, `/admin/[id]`, davetiye ve tasarım alt rotaları,
partnerler, fotoğrafçılar, hesaplar, CRM, finans merkezi, satış/hakediş, muhasebe,
cari hesaplar, audit, medya operasyonu, geliştirme operasyonu, baskı işleri,
tasarım merkezi, tasarım planları ve sistem ayarlarıdır.

V4 paketindeki `/partner/crm` bir prototip hedefidir. Gerçek repoda CRM şu anda
`/admin/crm` altında ve işletme tenant'ına göre çalışır. URL'nin değiştirilmesi
geriye uyumluluk ve navigasyon kararı gerektirir. Kısa vadede mevcut route korunmalı;
gerekirse ileride partner odaklı route alias'ı eklenmelidir.

## 5. V4 43 ekran kataloğu eşleşmesi

V4 HTML, 43 tasarım ekranını listeler: 39'u paket hazırlanırken mevcut kabul edilen,
4'ü planlanan rotadır. Güncel repo bu snapshot'tan ileridedir.

| V4'te planlanan rota   | Güncel gerçek durum                                               |
| ---------------------- | ----------------------------------------------------------------- |
| `/isletmeler`          | Uygulandı                                                         |
| `/isletmeler/[slug]`   | Uygulandı                                                         |
| `/dijital-davetiyeler` | Uygulanmadı                                                       |
| `/partner/crm`         | Aynı adla yok; tenant bağlı ilk CRM `/admin/crm` olarak uygulandı |

Sonuç: “43 ekran” bir tasarım kataloğu sayısıdır; gerçek Next.js route sayısı veya
tamamlanmış özellik sayısı olarak raporlanmamalıdır.

## 6. MongoDB koleksiyon envanteri

Sunucu kodunda doğrudan doğrulanan koleksiyonlar:

`accounting_documents`, `add_on_products`, `agent_reports`, `archive_jobs`,
`audit_logs`, `bank_transactions`, `business_catalog_items`, `business_leads`,
`commission_ledger`, `cover_assets`, `design_snapshots`, `expense_records`,
`login_attempts`, `maintenance_runs`, `media`, `monthly_sales_counters`,
`organization_approval_requests`, `organization_participants`,
`package_configurations`, `partner_commission_policies`, `partners`,
`password_reset_tokens`, `payment_quotes`, `payments`,
`photographer_invitations`, `photographer_package_configurations`,
`photographer_sales`, `pricing_change_history`, `print_jobs`, `sales`,
`service_payout_ledger`, `sessions`, `tax_configurations`, `upload_tickets`,
`users`, `weddings`.

Yeni koleksiyon adları bu envanterle çakışmadan seçilmelidir. CRM müşteri, aktivite,
görev, teklif, iş ve bağımsız CRM finans kayıtları henüz tam domain koleksiyonları
olarak mevcut değildir. `business_leads` yalnızca ilk talep hunisini karşılar.

## 7. Yetki ve tenant matrisi

| Rol                         | Temel kapsam                                        | Kritik sınır                           |
| --------------------------- | --------------------------------------------------- | -------------------------------------- |
| `platform_admin`            | Platform geneli                                     | Kritik eylemler audit gerektirir       |
| `finance_manager`           | Platform finansı                                    | Operasyon/tenant sahipliği çıkarılamaz |
| `operations_manager`        | Organizasyon/medya/baskı                            | Finans ödeme yetkisi ayrı              |
| `design_manager`            | Tasarım ve baskı onayı                              | Satış/tahsilat yetkisi ayrı            |
| `partner_owner`             | Kendi işletmesi, CRM, organizasyon, finans görünümü | Başka tenant verisi yasak              |
| `partner_sales`             | Kendi CRM ve satış hazırlığı                        | Yönetim/ödeme yetkisi sınırlı          |
| `partner_operations_design` | Operasyon/tasarım                                   | CRM/finans varsayılan değil            |
| `photographer`              | Atanmış profesyonel yükleme/operasyon               | İşletme sahibi yetkisi değildir        |
| `print_vendor`              | Atanmış baskı işi                                   | Başka baskı/finans verisi yasak        |
| `organization_owner/editor` | Kendi etkinliği/album/tasarımı                      | Başka etkinlik yasak                   |
| `album_viewer`              | Atanmış albüm görüntüleme/indirme                   | Düzenleme ve finans yasak              |
| Guest                       | Hesapsız QR yükleme                                 | Album/profesyonel medya görünmez       |

`initialPartnerStaffRole` güncel çalışma ağacında işletme kategorisine bakmadan
`partner_owner` döndürmektedir. Böylece fotoğrafçı işletme sahibi ile operasyonel
`photographer` rolü ayrılmıştır. Eski gerçek sahip hesapları için dry-run + geri
alma destekli rol migration'ı hâlâ gereklidir.

## 8. Dijital işletme ve CRM durumu

Tamamlanan ilk kapsam:

- İşletme kategori modeli ve kamuya açık profil alanları.
- İşletme dizini ve slug detay sayfası.
- İşletme vitrin/magaza ayarları.
- Tenant'a bağlı ürün/hizmet kataloğu.
- Ürün/hizmet bağlantılı public lead formu.
- Açık rıza ve pazarlama izninin ayrılması.
- Uygulama seviyesi idempotency ve temel tekrar gönderim sınırı.
- Tenant bağlı CRM listeleme ve kontrollü durum geçişleri.
- Durum değişikliklerinde audit kaydı.
- `partner_owner` ve `partner_sales` için CRM izinleri.
- Durum bazlı ilk Kanban ekranı.

Eksikler:

- `business_leads` için DB unique idempotency indeksi.
- Tenant/status/update sorgu indeksleri ve rollback betiği.
- Dağıtık kötüye kullanım/rate limit altyapısı.
- CRM müşteri, iş, aktivite, görev, takvim, teklif ve bağımsız CRM finansı.
- Atanan sorumlu, timeline, hatırlatma ve bildirimler.
- Lead'in müşteri/cari/organizasyon/satışa idempotent dönüşümü.

CRM kaydı bir `Wedding` veya platform satışına bağlandığında ikinci satış veya ikinci
gelir oluşturmamalıdır. Bu kural yeni domain sözleşmesinin kabul kriteridir.

## 9. Mevcut finans akışı

Kanonik akışın mevcut parçaları:

1. Aktif paket/ek ürün/fotoğrafçı paketi konfigürasyonu okunur.
2. Satış anında paket ve fiyat snapshot'ı oluşturulur.
3. KDV dahil brüt tutardan tam sayı kuruşla net/KDV ayrılır.
4. Partner komisyon politikası snapshot olarak satışa bağlanır.
5. `sales` tahakkuku ile `payments` tahsilatı ayrı tutulur.
6. `bank_transactions` ile mutabakat yapılır.
7. `accounting_documents` belge yaşam döngüsünü takip eder.
8. `commission_ledger` ve `service_payout_ledger` hakediş yaşam döngülerini tutar.
9. `expense_records` giderleri, `print_jobs` üretim operasyonunu izler.
10. İade/iptal geçmişi silmemeli; ters kayıt ve audit yaklaşımı korunmalıdır.

### Doğrulanan kritik finans bulguları

1. `src/lib/server/pricing.ts` içindeki legacy komisyon fallback'i `%30/%40`
   (`3000/4000` bps) kullanmaktadır. V4 metnindeki `%20/%25` hedefi doğrudan
   değiştirilmemelidir; aktif DB politikaları ve tarihsel snapshot'lar korunarak
   onaylı, tarih etkili yeni politika/migration hazırlanmalıdır.
2. `qualifying_package_codes` hem sayaca dahil olma hem yüksek oran uygunluğu için
   tek kavram olarak kullanılıyorsa hedef “plan-1/2/3 birlikte sayılır, yalnızca
   plan-2/3 yükselir” kuralını ifade edemez. Sayaç uygunluğu ve oran uygunluğu
   ayrı alanlar olmalıdır.
3. Komisyon matrahı mevcut güvenli davranışta KDV hariç uygun nettir. Ticari oran
   onayı olmadan bu davranış değiştirilmemelidir.
4. Paket genel `variable_cost_cents`, ek ürün `line_cost_cents` ve raporda ayrıca
   hesaplanan fiziksel maliyetler arasında tek kaynak garantisi kurulmalıdır.
   Eski satışlar güncel maliyetlerle sessizce yeniden hesaplanmamalıdır.
5. Tahmini üretim maliyeti ile gerçek baskı/kargo/yeniden baskı gideri ayrı finans
   olayları olmalı ve aynı belge iki kez gider yazmamalıdır.

## 10. Tasarım ve baskı durumu

Mevcut tasarım yüzeyleri `qr`, `loading`, `wedding`; dijital davetiye ayrı domain
olarak yönetilmektedir. Tasarım merkezi, planlar, yüzey editörü, davetiye editörü,
snapshot ve baskı işi altyapısı kullanılmalıdır.

Kritik kurallar:

- Onaylı baskı snapshot'ı olmadan üretime geçilmez.
- Mevcut tema ve QR tasarımları V4 renkleriyle zorla değiştirilmez.
- Kim, hangi sürümü, ne zaman onayladı audit ile saklanır.
- Tahmini ve gerçek baskı maliyeti ayrıdır.
- Baskıya hazır etiketi gerçek preflight ve QR okunabilirlik kontrolüne dayanır.

## 11. V4 UI yönü ve erişilebilirlik sözleşmesi

Onaylı referans yön: beyaz zemin/yüzey, `#161B2E` grafit lacivert, `#C5FF39`
lime, `#CDB8FF` lavanta, çok katmanlı fakat hafif örgülü gradient ve 18–24 px
kart radius. Altın/şampanya ana aksiyon rengi kullanılmayacaktır.

Uygulama ilkeleri:

- Ortak token ve bileşen katmanı; route bazlı büyük CSS kopyaları yok.
- Mobil öncelikli düzen ve en az 44 px dokunma hedefi.
- Görünür focus ring, semantik etiketler, klavye ve WCAG kontrastı.
- Default/hover/focus/loading/empty/error/success durumları.
- GSAP yalnızca anlamlı pazarlama hareketlerinde; CRM ve finansta sade hareket.
- `prefers-reduced-motion` zorunlu; animasyon cleanup ve responsive eşleşme.
- Davetiye/QR temalarının kendi font ve renk kimliği korunur.

## 12. Faz kapıları ve güncel durum

| Faz | Kapsam                     | Denetim anındaki durum                                     |
| --- | -------------------------- | ---------------------------------------------------------- |
| A0  | Kaynak denetimi            | **Tamamlandı — bu belge**                                  |
| A1  | V4 UI Kit                  | Sıradaki görsel altyapı işi                                |
| A2  | Kamu sayfaları             | Mevcut sayfalar var; V4 dönüşümü kısmi                     |
| A3  | İşletme rehberi/mağaza     | İlk işlevsel sürüm tamamlandı; indeks/migration eksik      |
| A4  | Davetiye ve albüm          | Çalışan eski akış var; V4 galeri ve görsel dönüşüm eksik   |
| A5  | Partner CRM                | Lead + Kanban ilk sürüm; tam CRM eksik                     |
| A6  | Tasarım/print              | Çalışan altyapı var; V4 süreç/maliyet bağları kısmi        |
| A7  | Organizasyon finans motoru | Satış/muhasebe temeli var; tekil cost-line motoru eksik    |
| A8  | Admin finans/muhasebe UI   | Mevcut ekranlar var; V4 ortak agregasyon/drill-down kısmi  |
| A9  | Regresyon/yayın hazırlığı  | Yerel doğrulamalar var; staging/gerçek servis kabulü eksik |

## 13. Öncelikli uygulama sırası

### P0 — veri güvenliği

1. `business_leads` idempotency unique indeksi.
2. CRM tenant/status/update indeksleri.
3. Eski işletme sahibi rol migration dry-run/apply/rollback.
4. Migration fark raporu ve eşzamanlı duplicate testi.

### P1 — ortak deneyim ve CRM operasyonu

1. A1 V4 token ve temel bileşen kütüphanesi.
2. CRM sorumlu, aktivite, not, görev ve takvim domain'i.
3. Versiyonlu teklif ve teklif durum akışı.
4. CRM finansının platform finansından koleksiyon, KPI ve izin düzeyinde ayrılması.

### P2 — ticari dönüşüm ve finans olayları

1. Kazanılan lead'i tek ve idempotent işlemle müşteri/cari kaydına dönüştürme.
2. Onaylı tekliften organizasyon + tarihsel satış snapshot'ı oluşturma.
3. Organizasyon maliyet olayları, tahmini/gerçek farkı ve reversal.
4. Komisyon sayaç uygunluğu ile oran uygunluğunu ayıran versiyonlu politika.

### P3 — görünür V4 ve yayın hazırlığı

1. Kamu sayfaları ve rol panellerini kademeli V4 bileşenlerine taşıma.
2. Dijital davetiye galerisi ve gerçek renderer önizlemesi.
3. Erişilebilirlik, responsive, görsel regresyon ve performans testleri.
4. Migration dry-run, staging, gerçek R2/telefon/yük testi ve rollback provası.

## 14. Zorunlu kabul kriterleri

- İki tenant birbirinin CRM, finans, mağaza veya medya özel verisine erişemez.
- UI gizleme değil, sunucu yetkisi ve sahiplik kontrolü belirleyicidir.
- Aynı idempotency anahtarı eşzamanlı isteklerde tek kayıt üretir.
- Mevcut satış/paket/komisyon snapshot'ları güncel katalogla değişmez.
- CRM işi platform cirosuna kendiliğinden girmez; Wedding bağlantısı ikinci satış
  oluşturmaz.
- Satış tahakkuku, tahsilat, banka mutabakatı ve hakediş ayrı yaşam döngüleridir.
- Tahmini ve gerçek maliyet ayrı görünür; aynı kaynak iki kez gider yazılmaz.
- Eski QR, wedding ve davetiye linkleri çalışmaya devam eder.
- Masaüstü/mobil, klavye, reduced-motion, loading/empty/error/success durumları
  test edilir.
- TypeScript, lint, birim testleri ve production build geçmeden faz tamamlanmış
  sayılmaz.

## 15. Açık kararlar ve riskler

- `%20/%25` komisyon politikasının yürürlük tarihi ve onaylı ticari kaynağı.
- İade/iptalin aylık satış ordinalini geri alıp almayacağı.
- Fiziksel birim maliyetlerin aktif konfigürasyon ve versiyonlama kaynağı.
- Ödeme sağlayıcısı, webhook, iade/itiraz ve izinli ödeme alan adları.
- CRM mesaj kanalları ve pazarlama izin metinlerinin hukuki onayı.
- Gerçek R2, staging, HTTPS, zamanlayıcı ve yüksek hacim kabul ortamı.
- Büyük ve commitlenmemiş çalışma ağacı; değişiklikler konu bazlı ayrılmalı,
  kullanıcı değişiklikleri geri alınmamalıdır.

## 16. Rollback yaklaşımı

- V4 görsel dönüşümü eski domain/API sözleşmelerini silmez.
- Yeni görsel bileşenler route bazında kademeli devreye alınır.
- Veri migration'ları varsayılan olarak dry-run çalışır; `--apply` açık seçimdir.
- Her migration önce etkilenecek kayıtları ve fark özetini üretir.
- Oluşturulan indekslerin adları sabittir ve rollback yalnızca bu indeksleri hedefler.
- Tarihsel satış/ödeme/snapshot kayıtları rollback sırasında silinmez veya yeniden
  hesaplanmaz.
- Production deploy, production migration ve canlı veri düzeltmesi ayrıca insan
  onayı gerektirir.
