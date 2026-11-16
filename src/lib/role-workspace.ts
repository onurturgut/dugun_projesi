import type { Account, BusinessType } from "./models";

export type WorkspaceModule = {
  title: string;
  description: string;
  href: string;
  metricLabel: string;
};

export type RoleWorkspace = {
  eyebrow: string;
  title: string;
  description: string;
  primaryAction: { label: string; href: string };
  modules: WorkspaceModule[];
};

const commonBusinessModules: WorkspaceModule[] = [
  {
    title: "Müşteri ve fırsatlar",
    description: "Yeni talepleri, teklifleri ve takip adımlarını tek akışta yönetin.",
    href: "/admin/crm",
    metricLabel: "CRM",
  },
  {
    title: "Finans ve hakediş",
    description: "Satış, tahsilat, komisyon ve hakedişlerin güncel durumunu izleyin.",
    href: "/admin/finance-center",
    metricLabel: "Finans",
  },
  {
    title: "Dijital mağaza",
    description: "Yayınlanan hizmetlerinizi, paketlerinizi ve vitrininizi yönetin.",
    href: "/admin/storefront",
    metricLabel: "Mağaza",
  },
];

const businessCopy: Record<BusinessType, Pick<RoleWorkspace, "eyebrow" | "title" | "description">> = {
  photography: {
    eyebrow: "FOTOĞRAFÇI ÇALIŞMA ALANI",
    title: "Çekimden teslime kadar tek akış",
    description: "Atanan çekimleri, profesyonel yüklemeleri, paket satışlarını ve teslim onaylarını yönetin.",
  },
  venue: {
    eyebrow: "DÜĞÜN SALONU ÇALIŞMA ALANI",
    title: "Takvim, müşteri ve salon operasyonu",
    description: "Salon müsaitliği, organizasyon detayları, ek hizmetler ve tahsilatları birlikte yönetin.",
  },
  planner: {
    eyebrow: "ORGANİZASYON ÇALIŞMA ALANI",
    title: "Planlamadan operasyon gününe",
    description: "Teklifleri, görevleri, tedarikçileri ve etkinlik akışını ortak bir çalışma alanında yönetin.",
  },
  print_vendor: {
    eyebrow: "BASKI OPERASYONU",
    title: "Dosyadan sevkiyata izlenebilir üretim",
    description: "Atanan baskı işlerini, ön kontrolü, üretim durumunu ve teslim kanıtlarını yönetin.",
  },
  bridal: {
    eyebrow: "GELİNLİK MAĞAZASI",
    title: "Randevu, prova ve sipariş takibi",
    description: "Müşteri taleplerini, ürün tekliflerini, prova adımlarını ve teslim tarihlerini yönetin.",
  },
  florist: {
    eyebrow: "ÇİÇEKÇİ ÇALIŞMA ALANI",
    title: "Tasarım teklifinden kurulum gününe",
    description: "Konsept taleplerini, ürünleri, hazırlık görevlerini ve teslimat planını yönetin.",
  },
  invitation: {
    eyebrow: "DAVETİYE ÇALIŞMA ALANI",
    title: "Tasarım ve üretim iş akışı",
    description: "Tasarım taleplerini, revizyonları, baskı hazırlığını ve teslimatı yönetin.",
  },
  music_entertainment: {
    eyebrow: "EĞLENCE HİZMETLERİ",
    title: "Program ve etkinlik takibi",
    description: "Talepleri, program akışını ve operasyon görevlerini yönetin.",
  },
  beauty: {
    eyebrow: "GÜZELLİK HİZMETLERİ",
    title: "Randevu ve müşteri takibi",
    description: "Talepleri, randevuları ve hizmet teslim sürecini yönetin.",
  },
  transportation: {
    eyebrow: "ULAŞIM HİZMETLERİ",
    title: "Planlı ve izlenebilir transfer",
    description: "Transfer taleplerini, rota ve operasyon görevlerini yönetin.",
  },
  other: {
    eyebrow: "İŞLETME ÇALIŞMA ALANI",
    title: "Müşteri, iş ve finans yönetimi",
    description: "Talepten teslimata işletmenizin temel operasyonlarını yönetin.",
  },
};

export function workspaceForAccount(account: Pick<Account, "role" | "staff_role" | "business_types">): RoleWorkspace {
  if (account.role === "platform") {
    return {
      eyebrow: "SHINEQR PLATFORM",
      title: "Platform operasyon merkezi",
      description: "İşletmeleri, organizasyonları, finansı ve sistem sağlığını tek merkezden yönetin.",
      primaryAction: { label: "İşletmeleri görüntüle", href: "/admin/partners" },
      modules: [
        { title: "İşletmeler", description: "Onay, mağaza ve hesap durumlarını yönetin.", href: "/admin/partners", metricLabel: "Ağ" },
        { title: "Finans merkezi", description: "Satış, tahsilat ve hakedişleri denetleyin.", href: "/admin/finance-center", metricLabel: "Finans" },
        { title: "Sistem operasyonu", description: "Olay, denetim ve operasyon kayıtlarını inceleyin.", href: "/admin/operations", metricLabel: "Operasyon" },
      ],
    };
  }
  if (account.role === "owner") {
    return {
      eyebrow: "ORGANİZASYON SAHİBİ",
      title: "Etkinliğinizin tüm anları burada",
      description: "Albümünüzü, dijital davetiyenizi, profesyonel çekimleri ve paylaşım ayarlarını yönetin.",
      primaryAction: { label: "Etkinliğimi aç", href: "/admin" },
      modules: [
        { title: "Albüm ve medya", description: "Misafir ve profesyonel çekimleri görüntüleyin.", href: "/admin", metricLabel: "Albüm" },
        { title: "Dijital davetiye", description: "Davetiyenizi düzenleyin ve paylaşın.", href: "/admin/design-center", metricLabel: "Davetiye" },
        { title: "Paylaşım güvenliği", description: "QR erişimini ve paylaşım tercihlerini yönetin.", href: "/account/settings", metricLabel: "Gizlilik" },
      ],
    };
  }
  const businessType = account.business_types?.[0] || (account.staff_role === "photographer" ? "photography" : account.staff_role === "print_vendor" ? "print_vendor" : "other");
  const copy = businessCopy[businessType];
  const operationalModule: WorkspaceModule = businessType === "print_vendor"
    ? { title: "Baskı işleri", description: "Ön kontrol, üretim ve teslim durumlarını güncelleyin.", href: "/admin/print-jobs", metricLabel: "Üretim" }
    : { title: "Organizasyonlar", description: "Yaklaşan işleri, görevleri ve müşteri detaylarını açın.", href: "/admin", metricLabel: "Operasyon" };
  return {
    ...copy,
    primaryAction: { label: businessType === "print_vendor" ? "Baskı işlerini aç" : "Yeni organizasyon", href: businessType === "print_vendor" ? "/admin/print-jobs" : "/admin?new=1" },
    modules: [operationalModule, ...commonBusinessModules],
  };
}
