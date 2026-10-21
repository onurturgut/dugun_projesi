"use client";

import Link from "next/link";
import { Analytics } from "@vercel/analytics/next";
import { useEffect, useState } from "react";

type Consent = { necessary: true; analytics: boolean; marketing: boolean; version: 1 };
const cookieName = "shineqr_consent";

function readConsent(): Consent | null {
  const value = document.cookie.split("; ").find((item) => item.startsWith(`${cookieName}=`))?.split("=")[1];
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as Consent;
    return parsed.version === 1 ? parsed : null;
  } catch {
    return null;
  }
}

export function ConsentManager() {
  const [consent, setConsent] = useState<Consent | null | undefined>(undefined);
  const [settings, setSettings] = useState(false);
  useEffect(() => setConsent(readConsent()), []);

  function save(analytics: boolean, marketing: boolean) {
    const next: Consent = { necessary: true, analytics, marketing, version: 1 };
    document.cookie = `${cookieName}=${encodeURIComponent(JSON.stringify(next))}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    setConsent(next);
    setSettings(false);
  }

  if (consent === undefined) return null;
  return (
    <>
      {consent?.analytics ? <Analytics /> : null}
      {!consent || settings ? (
        <section className="consent-panel" role="dialog" aria-modal="true" aria-labelledby="consent-title">
          <div>
            <strong id="consent-title">Çerez tercihleri</strong>
            <p>Zorunlu çerezler oturum ve güvenlik için kullanılır. Analitik çerezleri yalnızca izninizle etkinleştiririz. Ayrıntılar için <Link href="/hukuki/cerez-politikasi">Çerez Politikası</Link>.</p>
            {settings ? (
              <div className="consent-options">
                <label><input type="checkbox" checked disabled /> Zorunlu</label>
                <label><input id="consent-analytics" type="checkbox" defaultChecked={consent?.analytics} /> Analitik</label>
                <label><input id="consent-marketing" type="checkbox" defaultChecked={consent?.marketing} /> Pazarlama</label>
              </div>
            ) : null}
          </div>
          <div className="consent-actions">
            <button type="button" onClick={() => save(false, false)}>Yalnızca zorunlu</button>
            {settings ? <button type="button" onClick={() => save((document.querySelector("#consent-analytics") as HTMLInputElement)?.checked, (document.querySelector("#consent-marketing") as HTMLInputElement)?.checked)}>Tercihleri kaydet</button> : <button type="button" onClick={() => setSettings(true)}>Tercihleri yönet</button>}
            <button type="button" className="primary" onClick={() => save(true, true)}>Tümünü kabul et</button>
          </div>
        </section>
      ) : (
        <button type="button" className="consent-reopen" onClick={() => setSettings(true)}>Çerez tercihleri</button>
      )}
    </>
  );
}
