"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { api, type Wedding } from "@/lib/api";
import { WeddingIntro } from "@/components/wedding/WeddingIntro";
import { WeddingFilmstrip } from "@/components/wedding/WeddingFilmstrip";
import { ShareMemories } from "@/components/upload/ShareMemories";
import { Skeleton } from "@/components/ui/skeleton";
import styles from "./wedding.module.css";

export default function WeddingPage() {
  const { slug } = useParams<{ slug: string }>();
  return <WeddingExperience key={slug} slug={slug} />;
}

function WeddingExperience({ slug }: { slug: string }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["wedding", slug],
    networkMode: "always",
    queryFn: async ({ signal }) => {
      const controller = new AbortController();
      const cancel = () => controller.abort();
      signal.addEventListener("abort", cancel, { once: true });
      const timeout = setTimeout(cancel, 12000);
      try {
        return await api<Wedding>(`/weddings/slug/${slug}`, { signal: controller.signal });
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
      }
    },
    refetchInterval: 30000,
  });

  return (
    <WeddingIntro
      design={data?.design}
      title={data?.title}
      ready={!isLoading}
      failed={isError || (!isLoading && !data)}
      coverSrc={data ? data.cover_images?.[0] || "/covers/couple-1.jpg" : undefined}
    >
      {isLoading ? <WeddingSkeleton /> : <WeddingContent data={data} isError={isError} />}
    </WeddingIntro>
  );
}

function WeddingContent({ data, isError }: { data?: Wedding; isError: boolean }) {
  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#42090F] px-6 text-center">
        <div>
          <h1 className="text-2xl font-light text-white">
            {isError ? "Sayfa yüklenemedi" : "Organizasyon bulunamadı"}
          </h1>
          <p className="mt-3 text-sm text-white/65">QR kodunuzu tekrar okutmayı deneyin.</p>
          <Link href="/" className="mt-6 inline-flex min-h-[44px] items-center rounded-xl border border-white/50 px-5 text-sm uppercase tracking-[0.18em] text-white">Ana sayfa</Link>
        </div>
      </main>
    );
  }

  const covers = data.cover_images?.length ? data.cover_images : ["/covers/couple-1.jpg"];

  return (
    <main className={styles.page} data-wedding-theme="cinematic-burgundy">
      <div className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.brandBlock}>
            <Link href="/" className={styles.brandLogo} aria-label="ShineQR ana sayfa">
              <Image
                src="/brand/shineqr-lockup.png"
                alt="ShineQR"
                width={360}
                height={240}
                priority
              />
            </Link>
            <p className={styles.brandTagline}>Anılarınız her karede ışıldasın.</p>
            <span className={styles.brandOrnament} aria-hidden="true">
              <i />
            </span>
          </div>
        </header>

        <WeddingFilmstrip images={covers} alt={data.title} date={data.wedding_date} />

        <section className={styles.statement}>
          <h1>Sıradaki kare sizden.</h1>
          <div className={styles.divider}><Heart size={16} strokeWidth={1.4} /></div>
          <p>Bu özel günde yakaladığınız anları bizimle paylaşın.</p>
        </section>

        {data.can_upload ? <ShareMemories weddingId={data.id} /> : (
          <div className="mx-auto mb-16 max-w-xl rounded-2xl border border-white/40 p-6 text-center text-white/75">Bu organizasyona şu anda yükleme yapılamıyor. Organizasyon yetkilisiyle iletişime geçebilirsiniz.</div>
        )}
        <footer className={styles.footer}>{data.title}</footer>
      </div>
    </main>
  );
}

function WeddingSkeleton() {
  return (
    <main className="min-h-screen bg-[#42090F] px-5 py-10">
      <Skeleton className="mx-auto h-[58vh] w-full max-w-[660px] rounded-3xl bg-[#4f0a0a]" />
      <Skeleton className="mx-auto mt-10 h-10 w-64 bg-[#4f0a0a]" />
      <Skeleton className="mx-auto mt-10 h-64 w-full max-w-xl rounded-2xl bg-[#4f0a0a]" />
    </main>
  );
}
