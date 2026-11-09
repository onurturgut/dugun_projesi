"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import {
  invitationDateLabels,
  type DigitalInvitationContent,
} from "@/lib/digital-invitation";
import styles from "./BotanicalInvitation.module.css";

const asset = (name: string) => `/digital-invitation/botanical/${name}`;

function useCountdown(date: string, time: string) {
  const target = useMemo(() => new Date(`${date}T${time}:00+03:00`).getTime(), [date, time]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const distance = Math.max(0, target - now);
  return {
    days: Math.floor(distance / 86_400_000),
    hours: Math.floor((distance / 3_600_000) % 24),
    minutes: Math.floor((distance / 60_000) % 60),
    seconds: 0,
  };
}

export function BotanicalInvitation({ content }: { content: DigitalInvitationContent }) {
  const labels = invitationDateLabels(content.event_date, content.event_time);
  const countdown = useCountdown(content.event_date, content.event_time);
  const counter = [
    ["Gün", countdown.days],
    ["Saat", countdown.hours],
    ["Dakika", countdown.minutes],
    ["Saniye", countdown.seconds],
  ] as const;

  return (
    <article className={styles.theme}>
      <section className={styles.hero}>
        <div className={styles.heroArt}>
          <img className={styles.floral} src={asset("floral-oval.png")} alt="" />
          <img className={styles.ribbon} src={asset("ribbon.png")} alt="" />
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>{content.event_type} davetiyesi</p>
            <h1 className={styles.names}>
              {content.bride_name}<span className={styles.ampersand}>&amp;</span>{content.groom_name}
            </h1>
            <div className={styles.rule} />
            <p className={styles.message}>{content.message}</p>
            <div className={styles.date}>
              <small>{labels.weekdayLabel}</small>
              <strong>{labels.dateLabel}</strong>
              <small>Saat {labels.timeLabel}</small>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.countdown}>
          {counter.map(([label, value]) => <div className={styles.card} key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}
        </div>
      </section>

      <section className={styles.section}>
        <p className={styles.eyebrow} style={{ textAlign: "center" }}>Ailelerimiz</p>
        <h2 className={styles.sectionTitle}>Sevgiyle</h2>
        <div className={styles.families}>
          <article className={styles.card}><strong>Gelin tarafı</strong><p>{content.bride_family || "Aile bilgisi eklenecek"}</p></article>
          <article className={styles.card}><strong>Damat tarafı</strong><p>{content.groom_family || "Aile bilgisi eklenecek"}</p></article>
        </div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.venue} ${styles.card}`}>
          <MapPin size={25} color="#b69357" strokeWidth={1.4} />
          <p className={styles.eyebrow}>Mekân</p>
          <h2>{content.venue || "Mekân bilgisi yakında"}</h2>
          {content.venue_address ? <p>{content.venue_address}</p> : null}
          {content.map_url ? <a className={styles.link} href={content.map_url} target="_blank" rel="noreferrer"><MapPin size={15} /> Haritada Gör</a> : null}
          <img className={styles.garland} src={asset("rose-garland.png")} alt="" />
        </div>
      </section>

      {content.timeline.length ? <section className={styles.section}>
        <CalendarDays size={24} color="#b69357" style={{ margin: "0 auto .5rem" }} />
        <h2 className={styles.sectionTitle}>Etkinlik Akışı</h2>
        <ul className={styles.timeline}>{content.timeline.map((item, index) => <li key={`${item.time}-${index}`}><time>{item.time}</time><div><strong>{item.title}</strong><p>{item.description}</p></div></li>)}</ul>
      </section> : null}

      {content.menu.length ? <section className={styles.section}>
        <div className={styles.menu}><div className={styles.menuInner}><h2 className={styles.sectionTitle}>Menü</h2>{content.menu.map((group, index) => <div className={styles.menuGroup} key={`${group.course}-${index}`}><strong>{group.course}</strong>{group.items.map((item, itemIndex) => <p key={`${item}-${itemIndex}`}>{item}</p>)}</div>)}</div></div>
      </section> : null}

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kıyafet Kodu</h2>
        <div className={`${styles.card}`} style={{ padding: "1.5rem", textAlign: "center" }}><strong>{content.dress_code_title}</strong><p style={{ color: "#806f72" }}>{content.dress_code_note}</p></div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bizden Kareler</h2>
        <div className={styles.gallery}>{[1,2,3,4].map((number) => <img key={number} src={asset(`gallery-${number}.jpg`)} alt={`${content.bride_name} ve ${content.groom_name} galeri görseli ${number}`} />)}</div>
      </section>

      <section className={styles.section}>
        <div className={`${styles.note} ${styles.card}`}><img src={asset("single-rose.png")} alt="" /><h2 className={styles.sectionTitle}>Özel Not</h2><p>“{content.special_note}”</p><div className={styles.rule} /><strong>{content.bride_name} &amp; {content.groom_name}</strong></div>
      </section>

      <footer className={styles.footer}><strong>{content.bride_name} &amp; {content.groom_name}</strong><span>{labels.dateLabel}</span><small>Made with ShineQR</small></footer>
    </article>
  );
}
