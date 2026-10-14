"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Eye,
  EyeOff,
  Headphones,
  LoaderCircle,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { api, ApiError } from "@/lib/api";
import styles from "./auth.module.css";

type View = "login" | "mfa" | "support";
type Theme = "light" | "dark";
const themeKey = "shineqr-auth-theme";

export default function AuthPage() {
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [totp, setTotp] = useState("");
  const [view, setView] = useState<View>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useLayoutEffect(() => {
    const savedTheme = window.localStorage.getItem(themeKey);
    const activeTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

    document.documentElement.dataset.authTheme = activeTheme;
    setTheme(activeTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.authTheme = nextTheme;
    window.localStorage.setItem(themeKey, nextTheme);
    setTheme(nextTheme);
  };

  const focusCurrentField = () =>
    window.setTimeout(() =>
      (view === "mfa" ? totpRef.current : usernameRef.current)?.focus(),
    );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await api<{ must_change_password: boolean }>(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: username,
            password,
            ...(view === "mfa" ? { totp } : {}),
          }),
        },
      );
      router.push(result.must_change_password ? "/account/password" : "/admin");
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 428) {
        setView("mfa");
        setTotp("");
        window.setTimeout(() => totpRef.current?.focus());
        return;
      }
      setError(caught instanceof Error ? caught.message : "Giriş yapılamadı.");
      focusCurrentField();
    } finally {
      setBusy(false);
    }
  };

  const backToLogin = () => {
    setView("login");
    setTotp("");
    setError("");
    window.setTimeout(() => usernameRef.current?.focus());
  };

  return (
    <main className={styles.page} data-theme={theme}>
      <section className={styles.shell} aria-labelledby="auth-title">
        <aside className={styles.visualPanel} aria-label="ShineQR deneyimi">
          <Image
            className={`${styles.visualImage} ${styles.lightImage}`}
            src="/auth-wedding-day.png"
            alt="Beyaz güller ve mumlarla hazırlanmış masada ShineQR masa standı"
            fill
            sizes="(max-width: 767px) 0px, 55vw"
            priority
          />
          <Image
            className={`${styles.visualImage} ${styles.darkImage}`}
            src="/auth-wedding-night.png"
            alt="Mum ışıklarıyla aydınlatılmış gece etkinliğinde ShineQR masa standı"
            fill
            sizes="(max-width: 767px) 0px, 55vw"
            priority
          />
          <div className={styles.photoShade} aria-hidden="true" />
          <div className={styles.visualTopline}>
            <span>SHINEQR</span>
            <span>ANILARI BİRLİKTE BÜYÜTELİM</span>
          </div>
          <div className={styles.visualCopy}>
            <p className={styles.visualEyebrow}>DİJİTAL HATIRA DENEYİMİ</p>
            <h2>
              Sizin gününüz,
              <br />
              sevdiklerinizin gözünden.
            </h2>
            <p>
              Tek bir QR ile tüm anılar bir arada. Düğünlerden kurumsal
              etkinliklere özel dijital albüm deneyimi.
            </p>
            <Link href="/" className={styles.discoverLink}>
              SHINEQR&apos;I KEŞFET <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
          <span className={styles.visualDomain}>SHINEQR.COM</span>
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.topbar}>
            <Link href="/" className={styles.homeLink}>
              <ArrowLeft size={15} aria-hidden="true" /> Ana sayfa
            </Link>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={
                theme === "light" ? "Gece moduna geç" : "Gündüz moduna geç"
              }
              title={theme === "light" ? "Gece modu" : "Gündüz modu"}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>

          <div className={styles.formBody}>
            <div className={styles.brand}>
              <Image
                src="/brand/shineqr-lockup-transparent.png"
                alt="ShineQR"
                width={210}
                height={72}
                priority
                className={styles.mark}
              />
            </div>
            {view === "support" ? (
              <div className={styles.content}>
                <div className={styles.iconBadge} aria-hidden="true">
                  <Headphones size={20} />
                </div>
                <p className={styles.kicker}>ERİŞİM DESTEĞİ</p>
                <h1 id="auth-title">Hesabınıza yeniden erişin.</h1>
                <p className={styles.intro}>
                  Parolanız yalnızca yetkili yöneticiniz tarafından güvenli
                  biçimde sıfırlanabilir. Yöneticinizden geçici parola
                  oluşturmasını isteyin.
                </p>
                <div className={styles.supportNotice}>
                  <ShieldCheck size={18} aria-hidden="true" />
                  <p>
                    Geçici parola ilk girişte değiştirilir. Mevcut parolanız
                    hiçbir yönetici tarafından görüntülenemez.
                  </p>
                </div>
                <Link href="/iletisim" className={styles.primaryAction}>
                  Destek ile iletişime geç
                </Link>
                <button
                  type="button"
                  className={styles.backButton}
                  onClick={backToLogin}
                >
                  <ArrowLeft size={16} aria-hidden="true" /> Giriş ekranına dön
                </button>
              </div>
            ) : (
              <div className={styles.content}>
                <p className={styles.kicker}>
                  {view === "mfa"
                    ? "GÜVENLİK DOĞRULAMASI"
                    : "YÖNETİM PANELİNE GİRİŞ"}
                </p>
                <h1 id="auth-title">
                  {view === "mfa"
                    ? "Doğrulama kodunu girin."
                    : "Tekrar hoş geldiniz."}
                </h1>
                <p className={styles.intro}>
                  {view === "mfa"
                    ? "Authenticator uygulamanızda görünen 6 haneli kodu kullanın."
                    : "Etkinliklerinizi yönetin, anıları birlikte büyütün."}
                </p>
                {error ? (
                  <div className={styles.error} role="alert" id="auth-error">
                    <CircleAlert size={18} aria-hidden="true" />
                    <span>{error}</span>
                  </div>
                ) : null}

                <form onSubmit={submit} className={styles.form}>
                  {view === "login" ? (
                    <>
                      <label className={styles.field}>
                        <span>Kullanıcı adı veya e-posta</span>
                        <input
                          ref={usernameRef}
                          type="text"
                          name="username"
                          autoComplete="username"
                          autoCapitalize="none"
                          spellCheck={false}
                          required
                          minLength={3}
                          maxLength={254}
                          disabled={busy}
                          aria-invalid={Boolean(error)}
                          aria-describedby={error ? "auth-error" : undefined}
                          value={username}
                          onChange={(event) => {
                            setUsername(event.target.value);
                            setError("");
                          }}
                        />
                      </label>
                      <div className={styles.field}>
                        <div className={styles.fieldHeader}>
                          <label htmlFor="auth-password">Parola</label>
                          <button
                            type="button"
                            className={styles.helpButton}
                            onClick={() => {
                              setView("support");
                              setError("");
                            }}
                          >
                            Parolamı unuttum
                          </button>
                        </div>
                        <div className={styles.passwordWrap}>
                          <input
                            id="auth-password"
                            type={passwordVisible ? "text" : "password"}
                            name="password"
                            autoComplete="current-password"
                            required
                            minLength={6}
                            maxLength={256}
                            disabled={busy}
                            aria-invalid={Boolean(error)}
                            aria-describedby={error ? "auth-error" : undefined}
                            value={password}
                            onChange={(event) => {
                              setPassword(event.target.value);
                              setError("");
                            }}
                            onKeyDown={(event) =>
                              setCapsLock(event.getModifierState("CapsLock"))
                            }
                            onKeyUp={(event) =>
                              setCapsLock(event.getModifierState("CapsLock"))
                            }
                            onBlur={() => setCapsLock(false)}
                          />
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() =>
                              setPasswordVisible((current) => !current)
                            }
                            aria-label={
                              passwordVisible
                                ? "Parolayı gizle"
                                : "Parolayı göster"
                            }
                            aria-pressed={passwordVisible}
                          >
                            {passwordVisible ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                        {capsLock ? (
                          <span className={styles.capsWarning} role="status">
                            Caps Lock açık
                          </span>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <label className={styles.field}>
                      <span>6 haneli doğrulama kodu</span>
                      <input
                        ref={totpRef}
                        className={styles.codeInput}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        pattern="[0-9]{6}"
                        maxLength={6}
                        required
                        disabled={busy}
                        aria-invalid={Boolean(error)}
                        aria-describedby={error ? "auth-error" : "code-hint"}
                        value={totp}
                        onChange={(event) => {
                          setTotp(
                            event.target.value.replace(/\D/g, "").slice(0, 6),
                          );
                          setError("");
                        }}
                      />
                      <small id="code-hint">
                        Kod her 30 saniyede bir yenilenir.
                      </small>
                    </label>
                  )}
                  <button
                    type="submit"
                    disabled={busy || (view === "mfa" && totp.length !== 6)}
                    className={styles.submit}
                  >
                    <span>
                      {busy ? (
                        <>
                          <LoaderCircle className={styles.spinner} size={18} />{" "}
                          Doğrulanıyor…
                        </>
                      ) : view === "mfa" ? (
                        "KODU DOĞRULA"
                      ) : (
                        "GİRİŞ YAP"
                      )}
                    </span>
                    {!busy && (
                      <ArrowRight
                        className={styles.submitArrow}
                        size={17}
                        aria-hidden="true"
                      />
                    )}
                  </button>
                  {view === "mfa" ? (
                    <button
                      type="button"
                      className={styles.backButton}
                      onClick={backToLogin}
                      disabled={busy}
                    >
                      <ArrowLeft size={16} aria-hidden="true" /> Farklı hesap
                      kullan
                    </button>
                  ) : (
                    <p className={styles.sessionNote}>
                      <ShieldCheck size={14} aria-hidden="true" /> Güvenli
                      bağlantı ile korunmaktadır.
                    </p>
                  )}
                </form>
              </div>
            )}
          </div>
          <footer className={styles.footer}>
            <span>© {new Date().getFullYear()} SHINEQR</span>
            <Link href="/iletisim">Destek</Link>
          </footer>
        </div>
      </section>
    </main>
  );
}
