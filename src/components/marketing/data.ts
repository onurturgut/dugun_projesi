import { cardPresets } from "@/lib/design";

export const navigation = [
  { href: "/nasil-calisir", label: "Nasıl çalışır?" },
  { href: "/ozellikler", label: "Özellikler" },
  { href: "/temalar", label: "Temalar" },
  { href: "/paketler", label: "Paketler" },
  { href: "/kullanim-alanlari", label: "Kullanım alanları" },
  { href: "/isletmeler-icin", label: "İşletmeler için" },
] as const;

export const features = [
  [
    "QR kodla kolay erişim",
    "Misafirler kamera uygulamasıyla saniyeler içinde paylaşım ekranına ulaşır.",
  ],
  [
    "Fotoğraf ve video",
    "Tek akışta fotoğraf, video ve kişisel mesaj yüklenebilir.",
  ],
  [
    "Özel dijital albüm",
    "Tüm anılar yalnızca yetkili hesapların erişebildiği albümde toplanır.",
  ],
  [
    "3 aylık saklama",
    "İçerikler organizasyon tarihinden itibaren varsayılan olarak üç ay saklanır.",
  ],
  [
    "Yüksek kalite",
    "Fotoğraflar ve videolar arşivlenmeye uygun biçimde korunur.",
  ],
  [
    "Toplu indirme",
    "Organizasyon sahibi tüm anıları saklama süresi içinde indirebilir.",
  ],
  [
    "Mobil uyumlu",
    "Yükleme sayfası telefonda, tablette ve masaüstünde çalışır.",
  ],
  [
    "Tema seçenekleri",
    "QR kartı ve misafir ekranı organizasyonun görsel diline uyarlanır.",
  ],
  [
    "Kontrollü erişim",
    "Misafirler diğer yüklemeleri görmez; albümü yetkili kullanıcılar yönetir.",
  ],
  [
    "Panel yönetimi",
    "İşletmeler organizasyonlarını ve müşteri hesaplarını tek panelde yönetir.",
  ],
] as const;

export const themes = cardPresets.map((preset, index) => ({
  ...preset,
  category: ["Düğün", "Nişan", "Kurumsal", "Mezuniyet"][index % 4],
  displayName: [
    "Burgundy Elegance",
    "Floral Champagne",
    "Golden Memories",
    "Modern Botanical",
    "Midnight Luxury",
    "Romantic Ivory",
    "Blush Garden",
    "Minimal Sepia",
    "Burgundy Glow",
    "Ivory Floral",
  ][index],
}));

export const useCases = [
  [
    "Düğün",
    "En özel gününüzü misafirlerinizin gözünden yeniden yaşayın.",
    "/marketing/seher-muhammed-wedding-composition-v2.png",
  ],
  [
    "Nişan",
    "Sözden kutlamaya, samimi anıları tek bir yerde biriktirin.",
    "/marketing/celebration.webp",
  ],
  [
    "Mezuniyet",
    "Kep atma heyecanını arkadaşlarınızın kareleriyle tamamlayın.",
    "/covers/couple-3.jpg",
  ],
  [
    "Doğum günü",
    "Pastadan dansa, kutlamanın doğal anlarını kaçırmayın.",
    "/marketing/printed-memories.webp",
  ],
  [
    "Kurumsal etkinlik",
    "Etkinliğinizi katılımcıların içerikleriyle yaşayan bir arşive dönüştürün.",
    "/marketing/guest-camera.webp",
  ],
  [
    "Diğer organizasyonlar",
    "Size özel tema ve akışla farklı etkinlikleri dijitalleştirin.",
    "/marketing/qr-card-options.webp",
  ],
] as const;

export const faqs = [
  [
    "ShineQR nasıl çalışır?",
    "Organizasyonunuza özel bir QR kod oluşturulur. Misafirler kodu okutup fotoğraf, video ve mesajlarını tarayıcıdan yükler; içerikler özel albümünüzde toplanır.",
  ],
  [
    "Misafirler uygulama indirmek zorunda mı?",
    "Hayır. Tüm deneyim mobil tarayıcıda çalışır; uygulama kurulumu gerekmez.",
  ],
  [
    "Hesap oluşturmak gerekiyor mu?",
    "Misafirlerin hesap oluşturması gerekmez. Albüm yönetimi için organizasyon sahibine yetkili hesap verilir.",
  ],
  [
    "Fotoğraf ve video yüklenebilir mi?",
    "Evet. Desteklenen fotoğraf biçimleriyle birlikte MP4, MOV ve WebM dahil yaygın video biçimleri yüklenebilir.",
  ],
  [
    "Albümü kimler görüntüleyebilir?",
    "Albüm yalnızca organizasyon sahibi, ilgili işletme ve yetkili platform yöneticileri tarafından görüntülenebilir.",
  ],
  [
    "Fotoğraflar ne kadar saklanır?",
    "Varsayılan saklama süresi organizasyon tarihinden itibaren üç aydır. Kesin süre satın alınan hizmet sözleşmesinde belirtilir.",
  ],
  [
    "QR kod tasarımı özelleştirilebilir mi?",
    "Evet. Mevcut renk paletleri ve kart şablonları kullanılabilir; özel tasarım talepleri ayrıca değerlendirilir.",
  ],
  [
    "Yükleme sayfası teması değiştirilebilir mi?",
    "Evet. Yönetim panelindeki desteklenen tema, renk ve metin seçenekleriyle düzenlenebilir.",
  ],
  [
    "Ödeme nasıl yapılır?",
    "Güncel paket ve ödeme koşulları teklif sırasında paylaşılır. Sitede doğrulanmamış fiyat yayınlamıyoruz.",
  ],
] as const;
