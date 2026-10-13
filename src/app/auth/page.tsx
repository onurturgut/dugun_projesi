"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  CircleAlert,
  Headphones,
  LoaderCircle,
  LockKeyhole,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
import { PasswordField } from "@/components/admin/Fields";
import { api, ApiError } from "@/lib/api";
import styles from "./auth.module.css";

type View = "login" | "mfa" | "support";
type Theme = "light" | "dark";

export default function AuthPage() {
  const router = useRouter();
  const usernameRef = useRef<HTMLInputElement>(null);
  const totpRef = useRef<HTMLInputElement>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [view, setView] = useState<View>("login");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("shineqr-auth-theme");
    const initialTheme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
    setTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    window.localStorage.setItem("shineqr-auth-theme", nextTheme);
  };

  const focusCurrentField = () => {
    window.setTimeout(() =>
      (view === "mfa" ? totpRef.current : usernameRef.current)?.focus(),
    );
  };

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
      <div className={styles.ambient} aria-hidden="true" />
      <section className={styles.shell} aria-labelledby="auth-title">
        <aside className={styles.visualPanel} aria-label="ShineQR deneyimi">
          <Image
            className={styles.visualImage}
            src="/auth-wedding-scene.png"
            alt="Mumlar ve çiçeklerle hazırlanan zarif düğün masası"
            fill
            sizes="(max-width: 700px) 0px, 62vw"
            priority
          />
          <Image
            className={styles.visualMonogram}
            src="/brand/shineqr-mark.png"
            alt=""
            width={520}
            height={347}
            priority
          />
        </aside>

        <div className={styles.formPanel}>
          <div className={styles.topbar}>
            <Link href="/" className={styles.homeLink}>
              <ArrowLeft size={15} /> Ana sayfa
            </Link>
            <button
              type="button"
              className={styles.themeToggle}
              onClick={toggleTheme}
              aria-label={
                theme === "light" ? "Koyu moda geç" : "Gündüz moduna geç"
              }
              title={theme === "light" ? "Koyu mod" : "Gündüz modu"}
            >
              {theme === "light" ? <Moon size={17} /> : <Sun size={17} />}
            </button>
          </div>
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
                <Headphones size={22} />
              </div>
              <p className={styles.kicker}>ERİŞİM DESTEĞİ</p>
              <h1 id="auth-title">Hesabınıza yeniden erişin</h1>
              <p className={styles.intro}>
                Parolanız, hesap güvenliği için yalnızca yetkili yöneticiniz
                tarafından sıfırlanabilir. İşletme yöneticinizden geçici parola
                oluşturmasını isteyin.
              </p>
              <div className={styles.supportNotice}>
                <ShieldCheck size={18} aria-hidden="true" />
                <p>
                  Yeni geçici parola ilk girişte değiştirilir. Mevcut parolanız
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
              <div className={styles.iconBadge} aria-hidden="true">
                {view === "mfa" ? (
                  <ShieldCheck size={22} />
                ) : (
                  <LockKeyhole size={22} />
                )}
              </div>
              <p className={styles.kicker}>
                {view === "mfa" ? "GÜVENLİK DOĞRULAMASI" : "YÖNETİM PANELİ"}
              </p>
              <h1 id="auth-title">
                {view === "mfa"
                  ? "Doğrulama kodunu girin"
                  : "Tekrar hoş geldiniz"}
              </h1>
              <p className={styles.intro}>
                {view === "mfa"
                  ? "Authenticator uygulamanızda görünen 6 haneli kodu kullanın."
                  : "İşletme, etkinlik ve medya yönetimine güvenli erişim."}
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
                        <span>Parola</span>
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
                      <PasswordField
                        label="Parola"
                        hideLabel
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
                        className={styles.input}
                      />
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
                  {busy ? (
                    <>
                      <LoaderCircle className={styles.spinner} size={18} />
                      Doğrulanıyor…
                    </>
                  ) : view === "mfa" ? (
                    "Kodu doğrula"
                  ) : (
                    "Giriş yap"
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
                    Bu cihazdaki güvenli oturum 7 gün boyunca açık kalır.
                  </p>
                )}
              </form>
            </div>
          )}

          <footer className={styles.footer}>
            <ShieldCheck size={15} aria-hidden="true" />
            <span>Yalnızca yetkili hesaplarla sınırlıdır</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
