# KVKK veri işleme ve bilgi güvenliği eki

Sürüm: 0.9 taslak

Bu Ek, ShineQR Partner Hizmet ve İş Birliği Sözleşmesinin ayrılmaz parçasıdır.

## 1. Roller ve talimat

Her Taraf, kendi müşteri/satış/personel/iletişim amaçları için işlediği veriler bakımından ayrı veri sorumlusudur. ShineQR'ın yalnızca Partnerin belgeli talimatıyla gerçekleştirdiği bir işlem varsa ShineQR o işlemle sınırlı veri işleyen; Partner veri sorumlusudur. Fiilî karar yetkisi bu nitelendirmenin önündedir.

Veri işleyen, verileri yalnızca sözleşme, Sipariş Formu ve hukuka uygun yazılı talimatlar doğrultusunda işler. Hukuka aykırı görülen talimat uygulanmadan önce bildirilir.

## 2. İşlemenin konusu

- Konu: QR üzerinden misafir medyası toplama, özel albüm, yetkili erişim, indirme, destek ve silme.
- Süre: aktif sipariş ve kanuni/teknik imha süreci.
- İlgili kişiler: misafirler, organizasyon sahipleri, Partner ve ShineQR yetkilileri.
- Veri türleri: fotoğraf, video, ses/görüntü, isteğe bağlı ad ve mesaj; hesap/iletişim; IP, cihaz, oturum, audit ve destek kayıtları.
- Amaç: sözleşmedeki organizasyon hizmetinin güvenli biçimde sunulması.

## 3. Taraf yükümlülükleri

Veri sorumlusu; hukuki sebebi, aydınlatmayı, gerekiyorsa açık rızayı, veri minimizasyonunu ve ilgili kişi başvurularını yönetir. Veri işleyen; gizlilik taahhütlü personel kullanır, uygun güvenlik tedbirlerini alır, verileri kendi amacı için kullanmaz ve veri sorumlusuna başvuru/olay/denetim süreçlerinde yardımcı olur.

## 4. Asgari güvenlik tedbirleri

- Rol ve organizasyon bazlı en az yetki erişimi,
- güçlü parola, ilk girişte parola değişikliği ve yönetici için 2FA,
- özel nesne depolama ve süreli/imzalı erişim bağlantıları,
- aktarım sırasında TLS ve uygun hâllerde depolamada şifreleme,
- audit, oturum ve güvenlik kayıtları ile anomali takibi,
- üretim/test ayrımı ve gerçek verinin testte kullanılmaması,
- düzenli yama, bağımlılık ve erişim gözden geçirmesi,
- yedekleme/geri dönüş ve silme işlerinin izlenmesi,
- çalışan/alt yüklenici gizlilik ve erişim sonlandırma süreci.

## 5. Alt veri işleyenler

Onaylı liste: [CLOUDFLARE R2], [MONGODB/HOST], [UYGULAMA HOST], [E-POSTA], [İZLEME], [DESTEK]. Liste; unvan, hizmet, veri kategorisi, ülke ve aktarım mekanizmasını içerir. Esaslı yeni alt işleyen [15] gün önce bildirilir; haklı veri koruma itirazında Taraflar alternatif çözüm arar.

Alt işleyenle en az bu Ekteki korumaları içeren yazılı sözleşme kurulur. ShineQR kendi alt işleyeninin sözleşmeye aykırılığından ana sözleşme çerçevesinde sorumludur.

## 6. Yurt dışı aktarım

Yurt dışı aktarım ancak KVKK'nın 9. maddesindeki yeterlilik kararı, uygun güvence veya kanundaki arızi hâllerden somut işleme uygun olanına dayanılarak yapılır. Standart sözleşme kullanılıyorsa Kurul metni seçimlik alanlar dışında değiştirilmez ve imzadan itibaren yasal sürede Kuruma bildirilir. Aktarım envanteri ve belgeler güncel tutulur.

## 7. Güvenlik olayı

Veri işleyen, kişisel veriyi etkileyen kesinleşmiş veya makul şüpheli olayı öğrendikten sonra gereksiz gecikme olmaksızın ve en geç [12] saat içinde veri sorumlusuna bildirir. İlk bildirim; olay zamanı, veri/kişi kategorileri, yaklaşık kapsam, olası sonuç, alınan tedbir ve irtibatı içerir. Bilgiler tamamlandıkça güncellenir. Resmî bildirim kararını ilgili veri sorumlusu verir; diğer Taraf gerekli desteği sağlar.

## 8. İlgili kişi talepleri

Talebi doğrudan alan veri işleyen, yanıt vermeye hukuken yetkili olmadığı ölçüde talebi en geç [1] iş günü içinde veri sorumlusuna iletir. Arama, dışa aktarma, düzeltme, erişim kısıtlama ve silme için makul teknik destek verir. Kimlik doğrulamada gereksiz veri istenmez.

## 9. İade ve imha

Hizmet sonunda ve kanuni saklama gerekmiyorsa kişisel veriler veri sorumlusunun tercihine göre iade edilir veya güvenli biçimde silinir/yok edilir. Aktif albüm medyası için ürünün üç aylık saklama ve yedi günlük çöp kutusu kuralı geçerlidir. İmha işleri loglanır; tamamlanamayan işler izlenir ve tekrar denenir.

## 10. Denetim ve kayıt

ShineQR yılda en fazla bir kez, makul ön bildirimle ve diğer müşterilerin gizliliğini koruyarak uyum bilgisi sunar. Ciddi olay veya düzenleyici talepte ek inceleme yapılabilir. Denetim ticari sırları ve sistem güvenliğini tehlikeye atamaz; bağımsız rapor veya kontrollü kanıt sunumu tercih edilir.

## 11. Veri işleme tablosu

| İşlem | Birincil rol | Erişim | Saklama |
| --- | --- | --- | --- |
| Misafir medya yüklemesi | [HUKUKİ ANALİZLE DOLDUR] | ShineQR, ilgili Partner, organizasyon sahibi | Etkinlikten itibaren 3 ay |
| Organizasyon/hesap yönetimi | Her Taraf kendi faaliyeti için veri sorumlusu | Yetkili roller | Hesap/sözleşme süresi + yasal süre |
| Ödeme/fatura | Faturayı kesen Taraf veri sorumlusu | Muhasebe ve yetkili sağlayıcı | Yasal mali saklama süresi |
| Pazarlama/referans | İzni alan ve amacı belirleyen Taraf | İzin kapsamındaki alıcı | İzin geri alınana veya amaç sona erene kadar |
| Güvenlik/audit | Sistemi işleten ShineQR veri sorumlusu | Sınırlı teknik/yönetici ekip | [SÜREYİ ENVANTERLE BELİRLE] |

