# ShineQR V4 — A1 UI Kit

**Durum:** İkinci temel paket uygulandı  
**Kapsam:** İzole tokenlar ve server-component uyumlu temel V4 yapı taşları

## İlk paket

- `V4Theme`: V4 renk, radius, gölge ve focus token kapsamı.
- `BraidedGradient`: içerikten bağımsız, `aria-hidden`, düşük maliyetli katman.
- `ElevatedCard`: standart ve etkileşimli 3D kart yüzeyi.
- `SectionHeading`: semantik `h1/h2/h3`, eyebrow ve açıklama düzeni.
- `PageHero`: tekil erişilebilir başlık, örgülü gradient ve aksiyon alanı.
- `V4Button`: lime, graphite ve outline tonları; en az 44 px hedef.
- `StatePanel`: empty/error/success gibi durum ekranlarının ortak iskeleti.
- `V4Navbar`: masaüstü navigasyon, seçili rota, CTA ve Radix tabanlı mobil menü.
- `V4Footer`: gruplanmış semantik footer navigasyonu ve yasal alt alan.
- `V4FormField`: label, açıklama, hata, `aria-describedby` ve invalid durumu.
- `FilterBar`: responsive filtre grubu ve işlem alanı.
- `KpiCard`: yönetim, CRM ve finans ekranları için ortak metrik kartı.

## Tasarım kararları

- Stiller CSS Module içinde tutulur; mevcut global temalar topluca değiştirilmez.
- Bileşenler varsayılan olarak server component'tir; istemci JavaScript'i eklemez.
- `prefers-reduced-motion` ve `prefers-contrast` desteklenir.
- Davetiye ve QR temaları bu token kapsamına zorla alınmaz.
- Var olan Radix/shadcn `Button` altyapısı yeniden kullanılır.

## Sonraki A1 parçaları

1. DataTable ve Pagination kompozisyonları.
2. Sekme ve permission-aware panel kalıpları.
3. Dialog/Drawer/Toast davranışlarının V4 görsel varyantları.
4. Story/demo rotası yerine test fixture ve görsel regresyon altyapısı.

Bu ilk paket herhangi bir üretim route'unun görünümünü henüz değiştirmez. Kamu
sayfaları A2'de, yönetim ekranları ilgili fazlarında kademeli olarak bu bileşenlere
taşınacaktır.
