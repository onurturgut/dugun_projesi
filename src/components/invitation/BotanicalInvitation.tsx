"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin, MessageCircle, Music2 } from "lucide-react";
import {
  invitationDateLabels,
  invitationRsvpUrl,
  invitationTextPresent,
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
  const timeline = content.timeline.filter((item) =>
    [item.time, item.title, item.description].some(invitationTextPresent),
  );
  const menu = content.menu
    .map((group) => ({ ...group, items: group.items.filter(invitationTextPresent) }))
    .filter((group) => invitationTextPresent(group.course) || group.items.length);
  const hasFamilies = [content.bride_family, content.groom_family].some(invitationTextPresent);
  const hasVenue = [content.venue, content.venue_address, content.map_url].some(invitationTextPresent);
  const hasStory = [content.story_title, content.story_text].some(invitationTextPresent);
  const hasDressCode = [content.dress_code_title, content.dress_code_note].some(invitationTextPresent);
  const hasGallery = content.gallery_images.some(invitationTextPresent);
  const attendingUrl = invitationRsvpUrl(content, true);
  const notAttendingUrl = invitationRsvpUrl(content, false);
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
            {invitationTextPresent(content.event_type) ? <p className={styles.eyebrow}>{content.event_type} davetiyesi</p> : null}
            <h1 className={styles.names}>
              {content.bride_name}<span className={styles.ampersand}>&amp;</span>{content.groom_name}
            </h1>
            <div className={styles.rule} />
            {invitationTextPresent(content.message) ? <p className={styles.message}>{content.message}</p> : null}
            {(invitationTextPresent(content.event_date) || invitationTextPresent(content.event_time)) ? <div className={styles.date}>
              {invitationTextPresent(content.event_date) ? <><small>{labels.weekdayLabel}</small><strong>{labels.dateLabel}</strong></> : null}
              {invitationTextPresent(content.event_time) ? <small>Saat {labels.timeLabel}</small> : null}
            </div> : null}
          </div>
        </div>
      </section>

      {content.show_countdown && invitationTextPresent(content.event_date) && invitationTextPresent(content.event_time) ? <section className={styles.section}>
        <div className={styles.countdown}>
          {counter.map(([label, value]) => <div className={styles.card} key={label}><strong>{String(value).padStart(2, "0")}</strong><span>{label}</span></div>)}
        </div>
      </section> : null}

      {content.show_families && hasFamilies ? <section className={styles.section}>
        <p className={styles.eyebrow} style={{ textAlign: "center" }}>Ailelerimiz</p>
        <h2 className={styles.sectionTitle}>Sevgiyle</h2>
        <div className={styles.families}>
          {invitationTextPresent(content.bride_family) ? <article className={styles.card}><strong>Gelin tarafı</strong><p>{content.bride_family}</p></article> : null}
          {invitationTextPresent(content.groom_family) ? <article className={styles.card}><strong>Damat tarafı</strong><p>{content.groom_family}</p></article> : null}
        </div>
      </section> : null}

      {hasVenue ? <section className={styles.section}>
        <div className={`${styles.venue} ${styles.card}`}>
          <MapPin size={25} color="#b69357" strokeWidth={1.4} />
          <p className={styles.eyebrow}>Mekân</p>
          {invitationTextPresent(content.venue) ? <h2>{content.venue}</h2> : null}
          {content.venue_address ? <p>{content.venue_address}</p> : null}
          {content.map_url ? <a className={styles.link} href={content.map_url} target="_blank" rel="noreferrer"><MapPin size={15} /> Haritada Gör</a> : null}
          <img className={styles.garland} src={asset("rose-garland.png")} alt="" />
        </div>
      </section> : null}

      {timeline.length ? <section className={styles.section}>
        <CalendarDays size={24} color="#b69357" style={{ margin: "0 auto .5rem" }} />
        <h2 className={styles.sectionTitle}>Etkinlik Akışı</h2>
        <ul className={styles.timeline}>{timeline.map((item, index) => <li key={`${item.time}-${index}`}>{invitationTextPresent(item.time) ? <time>{item.time}</time> : null}<div>{invitationTextPresent(item.title) ? <strong>{item.title}</strong> : null}{invitationTextPresent(item.description) ? <p>{item.description}</p> : null}</div></li>)}</ul>
      </section> : null}

      {menu.length ? <section className={styles.section}>
        <div className={styles.menu}><div className={styles.menuInner}><h2 className={styles.sectionTitle}>Menü</h2>{menu.map((group, index) => <div className={styles.menuGroup} key={`${group.course}-${index}`}>{invitationTextPresent(group.course) ? <strong>{group.course}</strong> : null}{group.items.map((item, itemIndex) => <p key={`${item}-${itemIndex}`}>{item}</p>)}</div>)}</div></div>
      </section> : null}

      {content.show_story && hasStory ? <section className={styles.section}>
        <p className={styles.eyebrow} style={{ textAlign: "center" }}>Biz</p>
        {invitationTextPresent(content.story_title) ? <h2 className={styles.sectionTitle}>{content.story_title}</h2> : null}
        {invitationTextPresent(content.story_text) ? <div className={styles.card} style={{ padding: "1.5rem", textAlign: "center", lineHeight: 1.7 }}><p>{content.story_text}</p></div> : null}
      </section> : null}

      {hasDressCode ? <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Kıyafet Kodu</h2>
        <div className={`${styles.card}`} style={{ padding: "1.5rem", textAlign: "center" }}>{invitationTextPresent(content.dress_code_title) ? <strong>{content.dress_code_title}</strong> : null}{invitationTextPresent(content.dress_code_note) ? <p style={{ color: "#806f72" }}>{content.dress_code_note}</p> : null}</div>
      </section> : null}

      {(attendingUrl || invitationTextPresent(content.music_url)) ? <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Davetli Rehberi</h2>
        <div className={styles.guestActions}>
          {attendingUrl ? <div className={styles.rsvp}><MessageCircle size={18} /><strong>Katılım durumunuz</strong><div><a className={styles.link} href={attendingUrl} target="_blank" rel="noreferrer">Katılacağım</a><a className={`${styles.link} ${styles.secondaryLink}`} href={notAttendingUrl} target="_blank" rel="noreferrer">Katılamayacağım</a></div></div> : null}
          {invitationTextPresent(content.music_url) ? <a className={styles.link} href={content.music_url} target="_blank" rel="noreferrer"><Music2 size={16} /> Şarkımızı Dinle</a> : null}
        </div>
      </section> : null}

      {content.show_gallery && hasGallery ? <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Bizden Kareler</h2>
        <div className={styles.gallery}>{content.gallery_images.filter(invitationTextPresent).map((image, index) => <img key={`${image}-${index}`} src={image} alt={`${content.bride_name} ve ${content.groom_name} galeri görseli ${index + 1}`} />)}</div>
      </section> : null}

      {invitationTextPresent(content.special_note) ? <section className={styles.section}>
        <div className={`${styles.note} ${styles.card}`}><img src={asset("single-rose.png")} alt="" /><h2 className={styles.sectionTitle}>Özel Not</h2><p>“{content.special_note}”</p><div className={styles.rule} /><strong>{content.bride_name} &amp; {content.groom_name}</strong></div>
      </section> : null}

      <footer className={styles.footer}><strong>{content.bride_name} &amp; {content.groom_name}</strong>{invitationTextPresent(content.event_date) ? <span>{labels.dateLabel}</span> : null}<a href="https://www.shineqr.com/" target="_blank" rel="noreferrer">Made with ShineQR</a></footer>
    </article>
  );
}
