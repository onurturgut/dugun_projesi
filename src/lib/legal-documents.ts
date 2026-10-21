export const LEGAL_DOCUMENT_VERSION = "2026-10-draft-1";

export const legalDocuments = {
  "kvkk-aydinlatma": {
    title: "KVKK Aydınlatma Metni",
    summary: "Kişisel verilerin hangi amaçlarla, hangi hukuki sebeplerle ve ne kadar süreyle işlendiğine ilişkin taslak bilgilendirme.",
    sections: [
      ["Veri sorumlusu", "Bu bölümde ShineQR hizmetini sunan gerçek veya tüzel kişinin ticari unvanı, adresi ve iletişim bilgileri hukukçu onayından sonra yayımlanacaktır."],
      ["İşlenen veriler", "Hesap ve iletişim bilgileri, organizasyon bilgileri, işlem güvenliği kayıtları, yüklenen fotoğraf ve videolar ile misafirlerin isteğe bağlı ad ve mesajları işlenebilir."],
      ["Amaç ve hukuki sebep", "Hizmetin kurulması ve yürütülmesi, güvenlik, destek, faturalandırma ve hukuki yükümlülüklerin yerine getirilmesi amaçlarıyla; sözleşmenin kurulması/ifası, hukuki yükümlülük ve meşru menfaat sebeplerine dayanılır. Açık rıza gereken işlemler ayrıca sorulur."],
      ["Saklama ve silme", "Dijital içerikler satın alınan paketin saklama süresine göre tutulur. Güvenlik, finans ve sözleşme kayıtlarının süreleri ilgili mevzuat ve zamanaşımı süreleri doğrultusunda ayrıca belirlenir."],
      ["Haklarınız", "KVKK kapsamındaki erişim, düzeltme, silme, itiraz ve diğer talepler veri sorumlusunun yayımlanacak başvuru kanalından iletilebilir."],
    ],
  },
  "mesafeli-satis": {
    title: "Mesafeli Satış Sözleşmesi",
    summary: "Paket, ek ürün, teslimat, iptal ve iade hükümlerinin siparişe özel üretileceği taslak çerçeve.",
    sections: [
      ["Taraflar ve sipariş", "Satıcı ve alıcı bilgileri, seçilen paket, ek ürünler, KDV dahil toplam bedel ve ödeme bilgileri her sipariş için değiştirilemez bir sözleşme kopyasına yazılacaktır."],
      ["Hizmet ve teslim", "Dijital organizasyon alanının açılış koşulları, baskıların üretim ve teslim takvimi ile müşterinin sağlaması gereken içerikler sipariş özetinde gösterilecektir."],
      ["Kişiye özel ürünler", "İsim, tarih, fotoğraf veya özel tasarımla hazırlanan baskıların cayma hakkı kapsamı hukukçu tarafından nihai metinde ayrıca değerlendirilecektir."],
      ["İptal ve iade", "Üretime başlanma, dijital hizmetin aktive edilmesi, kısmi ifa ve ayıplı hizmet durumlarına göre uygulanacak kesinti ve iade kuralları nihai ticari politikayla doldurulacaktır."],
      ["Uyuşmazlık", "Tüketici hakem heyeti ve tüketici mahkemesine ilişkin güncel parasal sınırlar sözleşmeye sabit yazılmayacak; ilgili yılın resmi düzenlemelerine yönlendirme yapılacaktır."],
    ],
  },
  "cerez-politikasi": {
    title: "Çerez Politikası",
    summary: "Zorunlu, analitik ve pazarlama teknolojileri için tercihlerinizi nasıl yönettiğimizi açıklar.",
    sections: [
      ["Zorunlu çerezler", "Oturum, güvenlik, tema ve çerez tercihinin saklanması için gereklidir; hizmetin çalışması için kapatılamaz."],
      ["Analitik", "Site kullanımını toplu olarak anlamaya yarayan Vercel Analytics yalnızca analitik izni verildiğinde yüklenir."],
      ["Pazarlama", "Pazarlama teknolojileri varsayılan olarak kapalıdır ve ancak ayrı tercih verilirse kullanılabilir."],
      ["Tercihi değiştirme", "Sayfanın sol altındaki Çerez tercihleri düğmesinden izninizi dilediğiniz zaman değiştirebilirsiniz."],
    ],
  },
  "partner-sozlesmesi": {
    title: "Partner İş Birliği Sözleşmesi",
    summary: "Yetki, komisyon, müşteri ilişkisi ve marka kullanımını düzenleyecek hukukçu incelemesi bekleyen taslak.",
    sections: [
      ["Komisyon", "Plan 1 satışları %30; Plan 2 ve Plan 3 satışları aynı takvim ayındaki toplam uygun satış sayacında ilk 10 satış için %30, 11. satıştan itibaren %40 oranına tabidir. Hesap KDV hariç uygun matrah üzerinden yapılır."],
      ["Yetki ve onay", "Partner organizasyonu hazırlar; hizmet süper admin onayından sonra açılır. Partner kendisine ait olmayan müşteri veya organizasyon verilerine erişemez."],
      ["Müşteri ve marka", "Yanıltıcı fiyat, kapsam veya teslim taahhüdü verilemez. ShineQR marka materyalleri yalnızca onaylanan satış faaliyeti için kullanılabilir."],
      ["Fesih ve kayıtlar", "Fesih, bekleyen komisyonlar, iadeler ve müşteri hizmetinin devamına ilişkin hükümler hukukçu onayıyla kesinleştirilecektir."],
    ],
  },
  "organizasyon-sozlesmesi": {
    title: "Organizasyon Hizmet Sözleşmesi",
    summary: "Organizasyon sahibinin içerik, yükleme, saklama ve tasarım sorumluluklarını belirleyen taslak.",
    sections: [
      ["Organizasyon kapsamı", "Paket kapsamı, yükleme penceresi, dijital saklama süresi, fiziksel ürünler ve revizyon hakkı sipariş anındaki paket görüntüsüyle sabitlenir."],
      ["İçerik sorumluluğu", "Organizasyon sahibi, yükleme bağlantısını paylaştığı kişileri bilgilendirmek ve hukuka aykırı içeriklerin kaldırılması için ShineQR ile iş birliği yapmakla sorumludur."],
      ["Tasarım ve revizyon", "Plan 1, 2 ve 3 sırasıyla 1, 2 ve 3 revizyon hakkı içerir. Baskı onayından sonra değişiklik yeni revizyon veya ek ücret gerektirebilir."],
      ["Saklama", "Süre bitiminden önce içeriklerin indirilmesi organizasyon sahibinin sorumluluğundadır. Silme ve yedekleme süreci nihai saklama politikasına göre yürütülür."],
    ],
  },
} as const;

export type LegalDocumentSlug = keyof typeof legalDocuments;
