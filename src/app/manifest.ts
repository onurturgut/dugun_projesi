import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ShineQR — Düğün ve Etkinlik Anıları",
    short_name: "ShineQR",
    description:
      "Düğün ve etkinlik fotoğraflarını QR kodla güvenli bir özel albümde toplayın.",
    lang: "tr",
    dir: "ltr",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f1e8",
    theme_color: "#120b08",
    categories: ["photo", "lifestyle", "business"],
    icons: [
      {
        src: "/pwa/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Yönetim paneli",
        short_name: "Panel",
        description: "Atanmış organizasyonları ve işlemleri açın.",
        url: "/admin?source=pwa-shortcut",
        icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Hesabım",
        short_name: "Hesabım",
        description: "ShineQR hesabınıza giriş yapın.",
        url: "/auth?source=pwa-shortcut",
        icons: [{ src: "/pwa/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
