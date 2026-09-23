import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Download } from "lucide-react";
import { toast } from "sonner";

export function QrPanel({ slug }: { slug: string }) {
  const [png, setPng] = useState<string>("");
  const [svg, setSvg] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  useEffect(() => {
    const target = `${window.location.origin}/wedding/${slug}`;
    setUrl(target);
    const options = {
      margin: 2,
      width: 720,
      color: { dark: "#11100F", light: "#F3EBDD" },
    } as const;
    QRCode.toDataURL(target, options)
      .then(setPng)
      .catch(() => undefined);
    QRCode.toString(target, { ...options, type: "svg" })
      .then(setSvg)
      .catch(() => undefined);
  }, [slug]);

  const download = (href: string, name: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  };

  return (
    <div className="card-luxe rounded-2xl px-5 py-6">
      <h3 className="text-xs uppercase tracking-[0.24em] text-gold">QR Kod</h3>
      {png && (
        <img
          src={png}
          alt={`${slug} düğün sayfası QR kodu`}
          width={720}
          height={720}
          className="mt-4 w-full max-w-[220px] rounded-xl"
        />
      )}
      <p className="mt-3 break-all text-[11px] text-muted-foreground">{url}</p>
      <button
        className="admin-button mt-4 w-full"
        disabled={!url}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            toast.success("Misafir bağlantısı kopyalandı.");
          } catch {
            toast.error(
              "Bağlantı kopyalanamadı. Yukarıdaki adresi seçip kopyalayabilirsiniz.",
            );
          }
        }}
      >
        Misafir bağlantısını kopyala
      </button>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!png}
          onClick={() => download(png, `${slug}-qr.png`)}
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-gold/50 px-4 text-xs uppercase tracking-[0.16em] text-gold transition-colors hover:bg-gold/10"
        >
          <Download className="h-4 w-4" strokeWidth={1.3} /> PNG
        </button>
        <button
          type="button"
          disabled={!svg}
          onClick={() =>
            download(
              `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`,
              `${slug}-qr.svg`,
            )
          }
          className="flex min-h-[44px] items-center gap-2 rounded-xl border border-border px-4 text-xs uppercase tracking-[0.16em] text-cream transition-colors hover:border-gold/60"
        >
          <Download className="h-4 w-4" strokeWidth={1.3} /> SVG
        </button>
      </div>
    </div>
  );
}
