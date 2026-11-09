"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BotanicalInvitation } from "@/components/invitation/BotanicalInvitation";
import { api } from "@/lib/api";
import { defaultDigitalInvitationContent, type DigitalInvitationContent } from "@/lib/digital-invitation";
import styles from "./page.module.css";

type PublicWedding = {
  bride_name?: string;
  groom_name?: string;
  event_type?: string;
  digital_invitation?: {
    status: "published";
    content?: DigitalInvitationContent;
    event_date: string;
    event_time: string;
    venue: string;
    map_url: string;
    message: string;
  };
};

export default function PublishedInvitationPage() {
  const { slug } = useParams<{ slug: string }>();
  const wedding = useQuery({
    queryKey: ["public-digital-invitation", slug],
    queryFn: () => api<PublicWedding>(`/weddings/slug/${slug}`, { credentials: "omit" }),
    retry: false,
  });

  if (wedding.isLoading) return <main className={styles.state}><p>Davetiye hazırlanıyor…</p></main>;
  const record = wedding.data?.digital_invitation;
  if (wedding.error || !record) return <main className={styles.state}><div><h1>Davetiye henüz yayında değil</h1><p>Bağlantıyı kontrol edin veya davetiye sahibiyle iletişime geçin.</p></div></main>;
  const content = record.content || {
    ...defaultDigitalInvitationContent,
    bride_name: wedding.data?.bride_name || defaultDigitalInvitationContent.bride_name,
    groom_name: wedding.data?.groom_name || defaultDigitalInvitationContent.groom_name,
    event_type: wedding.data?.event_type || defaultDigitalInvitationContent.event_type,
    event_date: record.event_date,
    event_time: record.event_time,
    venue: record.venue,
    map_url: record.map_url,
    message: record.message,
  };
  return <main className={styles.page}><div className={styles.shell}><BotanicalInvitation content={content} /></div></main>;
}
