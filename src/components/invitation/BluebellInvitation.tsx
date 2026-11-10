"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, MapPin, MessageCircle, Music2, Shirt, UtensilsCrossed } from "lucide-react";
import { invitationDateLabels, invitationRsvpUrl, invitationTextPresent, type DigitalInvitationContent } from "@/lib/digital-invitation";
import styles from "./BluebellInvitation.module.css";

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
  };
}

export function BluebellInvitation({ content, preview = false }: { content: DigitalInvitationContent; preview?: boolean }) {
  const rootRef = useRef<HTMLElement>(null);
  const labels = invitationDateLabels(content.event_date, content.event_time);
  const ceremonyLabels = content.ceremony_date && content.ceremony_time
    ? invitationDateLabels(content.ceremony_date, content.ceremony_time)
    : null;
  const countdown = useCountdown(content.event_date, content.event_time);
  const timeline = content.timeline.filter((item) =>
    [item.time, item.title, item.description].some(invitationTextPresent),
  );
  const menu = content.menu
    .map((group) => ({
      ...group,
      items: group.items.filter(invitationTextPresent),
    }))
    .filter((group) => invitationTextPresent(group.course) || group.items.length);
  const hasFamilies = [content.bride_family, content.groom_family].some(invitationTextPresent);
  const hasStory = [content.story_title, content.story_text].some(invitationTextPresent);
  const hasPrimaryEvent = [content.event_date, content.event_time, content.venue, content.venue_address, content.map_url].some(invitationTextPresent);
  const hasGallery = content.gallery_images.some(invitationTextPresent);
  const attendingUrl = invitationRsvpUrl(content, true);
  const notAttendingUrl = invitationRsvpUrl(content, false);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches || content.animation_intensity === "reduced";
    const targets = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduced) {
      targets.forEach((target) => { target.style.opacity = "1"; target.style.transform = "none"; });
      return;
    }
    let disposed = false;
    let observer: IntersectionObserver | undefined;
    void import("gsap").then(({ gsap }) => {
      if (disposed) return;
      gsap.set(targets, { autoAlpha: 0, y: content.animation_intensity === "cinematic" ? 30 : 18 });
      observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const target = entry.target as HTMLElement;
          gsap.to(target, { autoAlpha: 1, y: 0, duration: content.animation_intensity === "cinematic" ? 1 : .72, ease: "power2.out", clearProps: "transform" });
          const children = target.querySelectorAll<HTMLElement>("[data-reveal-item]");
          if (children.length) gsap.fromTo(children, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: .55, stagger: .1, delay: .12, ease: "power2.out", clearProps: "transform" });
          observer?.unobserve(target);
        }
      }, { root: preview ? root.closest("[class*='screenScroll']") : null, threshold: .16, rootMargin: "0px 0px -8% 0px" });
      targets.forEach((target) => observer?.observe(target));
    });
    return () => { disposed = true; observer?.disconnect(); };
  }, [content.animation_intensity, content.theme_id, preview]);

  return <article ref={rootRef} className={styles.theme} data-preview={preview} data-motion={content.animation_intensity}>
    <section className={styles.hero}>
      <div className={styles.heroCopy} data-reveal>
        {invitationTextPresent(content.event_type) ? <p className={styles.eyebrow}>{content.event_type} davetiyesi</p> : null}
        <h1>{content.bride_name}<span>&amp;</span>{content.groom_name}</h1>
        {invitationTextPresent(content.message) ? <p className={styles.message}>{content.message}</p> : null}
        {(invitationTextPresent(content.event_date) || invitationTextPresent(content.event_time)) ? <div className={styles.date}>{invitationTextPresent(content.event_date) ? <><small>{labels.weekdayLabel}</small><strong>{labels.dateLabel}</strong></> : null}{invitationTextPresent(content.event_time) ? <small>Saat {labels.timeLabel}</small> : null}</div> : null}
      </div>
    </section>

    {content.show_countdown && invitationTextPresent(content.event_date) && invitationTextPresent(content.event_time) ? <section className={`${styles.section} ${styles.countdownSection}`} data-reveal>
      <p className={styles.eyebrow}>Bu güzel güne</p><h2>Birlikte geri sayalım</h2>
      <div className={styles.countdown}>{[["Gün", countdown.days], ["Saat", countdown.hours], ["Dakika", countdown.minutes]].map(([label,value]) => <div key={label} data-reveal-item><strong>{String(value).padStart(2,"0")}</strong><span>{label}</span></div>)}</div>
    </section> : null}

    {content.show_families && hasFamilies ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <p className={styles.eyebrow}>Ailelerimiz</p><h2>Sevgiyle yan yanayız</h2>
      <div className={styles.families}>{invitationTextPresent(content.bride_family) ? <div data-reveal-item><span>Gelin tarafı</span><strong>{content.bride_family}</strong></div> : null}{invitationTextPresent(content.groom_family) ? <div data-reveal-item><span>Damat tarafı</span><strong>{content.groom_family}</strong></div> : null}</div>
    </section> : null}

    {content.show_story && hasStory ? <section className={`${styles.section} ${styles.paper}`} data-reveal><p className={styles.eyebrow}>Biz</p>{invitationTextPresent(content.story_title) ? <h2>{content.story_title}</h2> : null}{invitationTextPresent(content.story_text) ? <p className={styles.story}>{content.story_text}</p> : null}</section> : null}

    {hasPrimaryEvent ? <section className={`${styles.section} ${styles.programSection}`} data-reveal>
      <p className={styles.eyebrow}>Davet</p><h2>Günün programı</h2>
      <div className={styles.events}>
        <div data-reveal-item><EventCard title={content.event_type} date={invitationTextPresent(content.event_date) ? labels.dateLabel : ""} time={invitationTextPresent(content.event_time) ? labels.timeLabel : ""} venue={content.venue} address={content.venue_address} mapUrl={content.map_url} /></div>
        {ceremonyLabels ? <div data-reveal-item><EventCard title={content.ceremony_title || "Nikâh"} date={ceremonyLabels.dateLabel} time={ceremonyLabels.timeLabel} venue={content.ceremony_venue} address={content.ceremony_address} mapUrl={content.ceremony_map_url} /></div> : null}
      </div>
    </section> : null}

    {timeline.length ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <Clock3 size={22} className={styles.sectionIcon} />
      <p className={styles.eyebrow}>Program</p><h2>Etkinlik akışı</h2>
      <ol className={styles.timeline}>{timeline.map((item,index) => <li key={`${item.time}-${index}`} data-reveal-item>{invitationTextPresent(item.time) ? <time>{item.time}</time> : null}<div>{invitationTextPresent(item.title) ? <strong>{item.title}</strong> : null}{invitationTextPresent(item.description) ? <p>{item.description}</p> : null}</div></li>)}</ol>
    </section> : null}

    {menu.length ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <UtensilsCrossed size={22} className={styles.sectionIcon} />
      <p className={styles.eyebrow}>İkramlar</p><h2>Menü</h2>
      <div className={styles.menu}>{menu.map((group,index) => <div key={`${group.course}-${index}`} data-reveal-item>{invitationTextPresent(group.course) ? <strong>{group.course}</strong> : null}{group.items.map((item,itemIndex) => <p key={`${item}-${itemIndex}`}>{item}</p>)}</div>)}</div>
    </section> : null}

    {([content.dress_code_title, content.dress_code_note, content.music_url].some(invitationTextPresent) || attendingUrl) ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <p className={styles.eyebrow}>Davetli rehberi</p><h2>Günün detayları</h2>
      <div className={styles.guestDetails}>
        {(content.dress_code_title || content.dress_code_note) ? <div data-reveal-item><Shirt size={21} /><span>Kıyafet kodu</span><strong>{content.dress_code_title}</strong>{content.dress_code_note ? <p>{content.dress_code_note}</p> : null}</div> : null}
        {attendingUrl ? <div className={styles.rsvp} data-reveal-item><MessageCircle size={21} /><span>RSVP</span><strong>Katılım durumunuzu bildirin</strong><div><a href={attendingUrl} target="_blank" rel="noreferrer">Katılacağım</a><a href={notAttendingUrl} target="_blank" rel="noreferrer">Katılamayacağım</a></div></div> : null}
        {invitationTextPresent(content.music_url) ? <a data-reveal-item href={content.music_url} target="_blank" rel="noreferrer"><Music2 size={21} /><span>Müzik</span><strong>Şarkımızı dinle</strong></a> : null}
      </div>
    </section> : null}

    {content.show_gallery && hasGallery ? <section className={`${styles.section} ${styles.gallerySection}`} data-reveal>
      <p className={styles.eyebrow}>Hatıralar</p><h2>Bizden kareler</h2>
      <div className={styles.gallery}>{content.gallery_images.filter(invitationTextPresent).map((image,index) => <img data-reveal-item key={`${image}-${index}`} src={image} alt={`${content.bride_name} ve ${content.groom_name} galeri görseli ${index + 1}`} />)}</div>
    </section> : null}

    {invitationTextPresent(content.special_note) ? <section className={`${styles.section} ${styles.closing}`} data-reveal><p>“{content.special_note}”</p><strong>{content.bride_name} &amp; {content.groom_name}</strong></section> : null}
    <footer>{invitationTextPresent(content.event_date) ? <span>{labels.dateLabel}</span> : null}<a href="https://www.shineqr.com/" target="_blank" rel="noreferrer">Made with ShineQR</a></footer>
  </article>;
}

function EventCard({ title, date, time, venue, address, mapUrl }: { title: string; date: string; time: string; venue: string; address: string; mapUrl: string }) {
  return <article className={styles.eventCard}><CalendarDays size={20} />{invitationTextPresent(title) ? <span>{title}</span> : null}{invitationTextPresent(date) ? <h3>{date}</h3> : null}{invitationTextPresent(time) ? <p>Saat {time}</p> : null}{invitationTextPresent(venue) ? <strong>{venue}</strong> : null}{invitationTextPresent(address) ? <p>{address}</p> : null}{invitationTextPresent(mapUrl) ? <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> Haritada gör</a> : null}</article>;
}
