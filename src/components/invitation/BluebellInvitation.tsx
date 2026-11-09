"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Clock3, MapPin, MessageCircle, Music2, Shirt, UtensilsCrossed } from "lucide-react";
import { invitationDateLabels, type DigitalInvitationContent } from "@/lib/digital-invitation";
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
        <p className={styles.eyebrow}>{content.event_type} davetiyesi</p>
        <h1>{content.bride_name}<span>&amp;</span>{content.groom_name}</h1>
        <p className={styles.message}>{content.message}</p>
        <div className={styles.date}><small>{labels.weekdayLabel}</small><strong>{labels.dateLabel}</strong><small>Saat {labels.timeLabel}</small></div>
      </div>
    </section>

    {content.show_countdown ? <section className={`${styles.section} ${styles.countdownSection}`} data-reveal>
      <p className={styles.eyebrow}>Bu güzel güne</p><h2>Birlikte geri sayalım</h2>
      <div className={styles.countdown}>{[["Gün", countdown.days], ["Saat", countdown.hours], ["Dakika", countdown.minutes]].map(([label,value]) => <div key={label} data-reveal-item><strong>{String(value).padStart(2,"0")}</strong><span>{label}</span></div>)}</div>
    </section> : null}

    {content.show_families ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <p className={styles.eyebrow}>Ailelerimiz</p><h2>Sevgiyle yan yanayız</h2>
      <div className={styles.families}><div data-reveal-item><span>Gelin tarafı</span><strong>{content.bride_family || "Aile bilgisi eklenecek"}</strong></div><div data-reveal-item><span>Damat tarafı</span><strong>{content.groom_family || "Aile bilgisi eklenecek"}</strong></div></div>
    </section> : null}

    {content.show_story ? <section className={`${styles.section} ${styles.paper}`} data-reveal><p className={styles.eyebrow}>Biz</p><h2>{content.story_title}</h2><p className={styles.story}>{content.story_text}</p></section> : null}

    <section className={`${styles.section} ${styles.programSection}`} data-reveal>
      <p className={styles.eyebrow}>Davet</p><h2>Günün programı</h2>
      <div className={styles.events}>
        <div data-reveal-item><EventCard title={content.event_type} date={labels.dateLabel} time={labels.timeLabel} venue={content.venue} address={content.venue_address} mapUrl={content.map_url} /></div>
        {ceremonyLabels ? <div data-reveal-item><EventCard title={content.ceremony_title || "Nikâh"} date={ceremonyLabels.dateLabel} time={ceremonyLabels.timeLabel} venue={content.ceremony_venue} address={content.ceremony_address} mapUrl={content.ceremony_map_url} /></div> : null}
      </div>
    </section>

    {content.timeline.length ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <Clock3 size={22} className={styles.sectionIcon} />
      <p className={styles.eyebrow}>Program</p><h2>Etkinlik akışı</h2>
      <ol className={styles.timeline}>{content.timeline.map((item,index) => <li key={`${item.time}-${index}`} data-reveal-item><time>{item.time}</time><div><strong>{item.title}</strong>{item.description ? <p>{item.description}</p> : null}</div></li>)}</ol>
    </section> : null}

    {content.menu.some((group) => group.course || group.items.length) ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <UtensilsCrossed size={22} className={styles.sectionIcon} />
      <p className={styles.eyebrow}>İkramlar</p><h2>Menü</h2>
      <div className={styles.menu}>{content.menu.map((group,index) => <div key={`${group.course}-${index}`} data-reveal-item><strong>{group.course}</strong>{group.items.map((item,itemIndex) => <p key={`${item}-${itemIndex}`}>{item}</p>)}</div>)}</div>
    </section> : null}

    {(content.dress_code_title || content.dress_code_note || content.whatsapp_number || content.music_url) ? <section className={`${styles.section} ${styles.paper}`} data-reveal>
      <p className={styles.eyebrow}>Davetli rehberi</p><h2>Günün detayları</h2>
      <div className={styles.guestDetails}>
        {(content.dress_code_title || content.dress_code_note) ? <div data-reveal-item><Shirt size={21} /><span>Kıyafet kodu</span><strong>{content.dress_code_title}</strong>{content.dress_code_note ? <p>{content.dress_code_note}</p> : null}</div> : null}
        {content.whatsapp_number ? <a data-reveal-item href={`https://wa.me/${content.whatsapp_number}`} target="_blank" rel="noreferrer"><MessageCircle size={21} /><span>RSVP</span><strong>WhatsApp ile katılım bildir</strong></a> : null}
        {content.music_url ? <a data-reveal-item href={content.music_url} target="_blank" rel="noreferrer"><Music2 size={21} /><span>Müzik</span><strong>Şarkımızı dinle</strong></a> : null}
      </div>
    </section> : null}

    {content.show_gallery ? <section className={`${styles.section} ${styles.gallerySection}`} data-reveal>
      <p className={styles.eyebrow}>Hatıralar</p><h2>Bizden kareler</h2>
      <div className={styles.gallery}>{(content.gallery_images.length ? content.gallery_images : [1,2,3,4].map((number) => `/digital-invitation/botanical/gallery-${number}.jpg`)).map((image,index) => <img data-reveal-item key={`${image}-${index}`} src={image} alt={`${content.bride_name} ve ${content.groom_name} galeri görseli ${index + 1}`} />)}</div>
    </section> : null}

    <section className={`${styles.section} ${styles.closing}`} data-reveal><p>“{content.special_note}”</p><strong>{content.bride_name} &amp; {content.groom_name}</strong></section>
    <footer><span>{labels.dateLabel}</span><small>Made with ShineQR</small></footer>
  </article>;
}

function EventCard({ title, date, time, venue, address, mapUrl }: { title: string; date: string; time: string; venue: string; address: string; mapUrl: string }) {
  return <article className={styles.eventCard}><CalendarDays size={20} /><span>{title}</span><h3>{date}</h3><p>Saat {time}</p>{venue ? <strong>{venue}</strong> : null}{address ? <p>{address}</p> : null}{mapUrl ? <a href={mapUrl} target="_blank" rel="noreferrer"><MapPin size={15} /> Haritada gör</a> : null}</article>;
}
