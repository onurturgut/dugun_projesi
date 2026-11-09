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
  theme_id: "botanical";
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
};

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
