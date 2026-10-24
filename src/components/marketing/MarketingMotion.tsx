"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./marketing.module.css";

export function MarketingMotion({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    const context = gsap.context(() => {
      const sections = gsap.utils.toArray<HTMLElement>("section", container);

      media.add("(min-width: 761px)", () => {
        sections.slice(1).forEach((section) => {
          const headings = section.querySelectorAll(":scope h2, :scope > div > h3");
          const cards = section.querySelectorAll("article");

          if (headings.length) {
            gsap.fromTo(headings, { autoAlpha: 0, y: 34 }, {
              autoAlpha: 1,
              y: 0,
              duration: 0.72,
              ease: "power3.out",
              stagger: 0.08,
              scrollTrigger: { trigger: section, start: "top 82%", once: true },
            });
          }

          if (cards.length) {
            gsap.fromTo(cards, { autoAlpha: 0, y: 42 }, {
              autoAlpha: 1,
              y: 0,
              duration: 0.68,
              ease: "power2.out",
              stagger: 0.09,
              scrollTrigger: { trigger: cards[0], start: "top 86%", once: true },
            });
          } else {
            gsap.fromTo(section, { autoAlpha: 0, y: 28 }, {
              autoAlpha: 1,
              y: 0,
              duration: 0.65,
              ease: "power2.out",
              scrollTrigger: { trigger: section, start: "top 86%", once: true },
            });
          }
        });
      });

      media.add("(max-width: 760px)", () => {
        sections.slice(1).forEach((section) => {
          const items = section.querySelectorAll("article");
          const targets = items.length ? items : [section];
          gsap.fromTo(targets, { autoAlpha: 0, y: 22 }, {
            autoAlpha: 1,
            y: 0,
            duration: 0.42,
            ease: "power2.out",
            stagger: 0.06,
            scrollTrigger: { trigger: section, start: "top 90%", once: true },
          });
        });
      });
    }, container);

    ScrollTrigger.refresh();
    return () => {
      media.revert();
      context.revert();
    };
  }, []);

  return <div ref={root} className={styles.motionRoot}>{children}</div>;
}
