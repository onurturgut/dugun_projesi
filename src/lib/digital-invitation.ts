export type InvitationTimelineItem = {
  time: string;
  title: string;
  description: string;
};

export type InvitationMenuGroup = {
  course: string;
  items: string[];
};

export type DigitalInvitationContent = {
  theme_id: "botanical" | "bluebell-timeless";
  bride_name: string;
  groom_name: string;
  event_type: string;
  event_date: string;
  event_time: string;
  message: string;
  venue: string;
  venue_address: string;
  map_url: string;
  bride_family: string;
  groom_family: string;
  timeline: InvitationTimelineItem[];
  menu: InvitationMenuGroup[];
  dress_code_title: string;
  dress_code_note: string;
  special_note: string;
  whatsapp_number: string;
  music_url: string;
  ceremony_title: string;
  ceremony_date: string;
  ceremony_time: string;
  ceremony_venue: string;
  ceremony_address: string;
  ceremony_map_url: string;
  show_countdown: boolean;
  show_families: boolean;
  show_gallery: boolean;
  story_title: string;
  story_text: string;
  show_story: boolean;
  gallery_images: string[];
  loading_style: "theme" | "minimal" | "none";
  loading_message: string;
  animation_intensity: "reduced" | "rich" | "cinematic";
};

export const defaultDigitalInvitationContent: DigitalInvitationContent = {
  theme_id: "botanical",
  bride_name: "Zeynep",
  groom_name: "Emir",
  event_type: "Düğün",
  event_date: "2027-06-19",
  event_time: "19:00",
  message:
    "Hayatımızın en özel gününde sizleri aramızda görmekten mutluluk duyarız.",
  venue: "",
  venue_address: "",
  map_url: "",
  bride_family: "Ayşe & Mehmet Yılmaz",
  groom_family: "Elif & Ahmet Kaya",
  timeline: [
    { time: "17:00", title: "Nikâh Töreni", description: "Evet dediğimiz o an" },
    { time: "18:30", title: "Karşılama", description: "Kokteyl eşliğinde sohbet" },
    { time: "20:00", title: "Akşam Yemeği", description: "Özenle hazırlanmış menü" },
    { time: "22:30", title: "Dans ve Müzik", description: "Gece boyunca eğlence" },
  ],
  menu: [
    { course: "Başlangıçlar", items: ["Burrata, incir ve fesleğen", "Levrek carpaccio"] },
    { course: "Ana Yemek", items: ["Kuzu incik, kök sebzeler", "Mantarlı risotto"] },
    { course: "Tatlı", items: ["Gül ve fıstıklı düğün pastası"] },
  ],
  dress_code_title: "Zarif & Şık",
  dress_code_note: "Pastel ve doğal tonlar tercih edebilirsiniz.",
  special_note:
    "Bu mutlu günümüzü sizinle paylaşmak istiyoruz. Varlığınız bizim için en güzel armağan.",
  whatsapp_number: "",
  music_url: "",
  ceremony_title: "Nikâh",
  ceremony_date: "",
  ceremony_time: "",
  ceremony_venue: "",
  ceremony_address: "",
  ceremony_map_url: "",
  show_countdown: true,
  show_families: true,
  show_gallery: true,
  story_title: "Hikâyemiz",
  story_text: "Birlikte başlayan hikâyemizi, sevdiklerimizle aynı masada kutlamak istiyoruz.",
  show_story: true,
  gallery_images: [],
  loading_style: "theme",
  loading_message: "Davetiyemiz hazırlanıyor",
  animation_intensity: "rich",
};

export const digitalInvitationThemes = [
  {
    id: "botanical" as const,
    name: "Botanical",
    category: "Romantik",
    description: "Pudra tonları, çiçek çerçeveleri ve zarif editorial düzen.",
    image: "/digital-invitation/botanical/gallery-1.jpg",
    features: ["Galeri", "Program", "Menü", "RSVP"],
  },
  {
    id: "bluebell-timeless" as const,
    name: "Bluebell — Zamansız Zarafet",
    category: "Botanik",
    description: "Mavi çan çiçekleri, fildişi kâğıt ve klasik davetiye estetiği.",
    image: "/digital-invitation/bluebell/bluebell-watercolor.png",
    features: ["Sinematik açılış", "İki etkinlik", "Galeri", "Müzik"],
  },
] satisfies ReadonlyArray<{
  id: DigitalInvitationContent["theme_id"];
  name: string;
  category: string;
  description: string;
  image: string;
  features: readonly string[];
}>;

export function invitationGalleryBelongsToWedding(
  galleryImages: readonly string[],
  weddingImages: readonly string[],
) {
  const allowed = new Set(weddingImages);
  return galleryImages.length <= 20 && galleryImages.every((image) => allowed.has(image));
}

export function digitalInvitationAccessEnabled(value: {
  package_snapshot?: { version?: number; code?: string; digitalInvitationIncluded?: boolean };
  digital_invitation_access?: { granted?: boolean };
}) {
  return Boolean(
    (value.package_snapshot?.version === 2 &&
      value.package_snapshot.code === "plan-3" &&
      value.package_snapshot.digitalInvitationIncluded === true) ||
      value.digital_invitation_access?.granted === true,
  );
}

export function priceSnapshotIncludesDigitalInvitation(value?: {
  add_ons?: ReadonlyArray<{ effect_type?: string; quantity?: number }>;
} | null) {
  return Boolean(
    value?.add_ons?.some(
      (item) =>
        item.effect_type === "digital_invitation" && (item.quantity || 0) > 0,
    ),
  );
}

export function invitationDateLabels(date: string, time: string) {
  const value = new Date(`${date || "2027-06-19"}T${time || "19:00"}:00+03:00`);
  if (Number.isNaN(value.getTime()))
    return { dateLabel: "Tarih belirlenecek", weekdayLabel: "", timeLabel: time || "" };
  return {
    dateLabel: value.toLocaleDateString("tr-TR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
    weekdayLabel: value.toLocaleDateString("tr-TR", { weekday: "long" }),
    timeLabel: time.replace(":", "."),
  };
}
