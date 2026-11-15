# P2.2 — Kapora ve Tahsilat Güvenliği

## Durum

Sunucu kuralları ve dönüşüm arayüzü tamamlandı. Gerçek POS veya banka işlemi yapılmadı.

## Yapılanlar

- Teklif dönüşümünde tam ödeme veya ileri tarihli ödeme planı seçilir.
- Tercih edilen yöntem kart, nakit veya havale/EFT olarak kaydedilir.
- İleri tarihli planda son ödeme tarihi zorunludur.
- Kapora beklentisi satışın KDV dâhil toplamının tam `%20` değeridir ve tam sayı kuruşla hesaplanır.
- İlk tahsilatın türü `deposit`, tutarı da beklenen kaporaya tam eşit olmalıdır.
- Fazla tahsilat, tekrar kullanılan ödeme referansı ve eşzamanlı bakiye güncellemesi engellenir.
- Payment kaydı ve satış bakiyesi aynı transaction içinde güncellenir.

## Önemli sınır

Kart yöntemi seçimi sanal POS işlemi değildir. Onaylı sağlayıcı bağlanana ve imzalı webhook doğrulanana kadar kart ödemesi başarı kanıtı sayılmaz. Mevcut manuel tahsilat endpoint'i yalnızca yetkili finans kullanıcısının doğrulanmış harici ödeme referansını kaydetmesi içindir.

## Risk ve rollback

- Yanlış doğrulanan nakit veya banka ödemesi silinmez; iptal/iade ters kaydı gerekir.
- Gerçek banka/POS mutabakatı staging ve sağlayıcı sertifikasyonu sonrasında açılmalıdır.
