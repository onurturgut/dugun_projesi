"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { api, type Wedding, type Media } from "@/lib/api";
import { HeroCarousel } from "@/components/wedding/HeroCarousel";
import { GoldDivider } from "@/components/wedding/GoldDivider";
import { ShareMemories } from "@/components/upload/ShareMemories";
import { Skeleton } from "@/components/ui/skeleton";
import Image from "next/image";

export default function WeddingPage() {
  const { slug } = useParams<{ id: string; slug: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["wedding", slug],
    queryFn: async () => {
      return api<Wedding>(`/weddings/slug/${slug}`);
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <WeddingSkeleton />;

  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="text-2xl font-light text-cream">
            {isError ? "Sayfa yüklenemedi" : "Organizasyon bulunamadı"}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            QR kodunuzu tekrar okutmayı deneyin.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-xl border border-gold/50 px-5 text-sm uppercase tracking-[0.18em] text-gold"
          >
            Ana sayfa
          </Link>
        </div>
      </main>
    );
  }

  const names = data.title;
  const monogram = data.title
    .split(/\s+/)
    .filter((s) => s !== "&")
    .slice(0, 2)
    .map((s) => s.charAt(0))
    .join(" | ");
  const covers = data.cover_images?.length
    ? data.cover_images
    : ["/covers/couple-1.jpg"];

  return (
    <main className="min-h-screen">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5">
        <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          Anılar
        </span>
        <span className="font-display text-lg tracking-[0.35em] text-gold">
          {monogram}
        </span>
        <Heart className="h-4 w-4 text-gold" strokeWidth={1.2} />
      </header>
      {data.logo_url && (
        <div className="flex justify-center pb-4">
          <Image
            unoptimized
            src={data.logo_url}
            alt="Organizasyon işletmesi logosu"
            width={140}
            height={60}
            className="h-14 w-auto object-contain"
          />
        </div>
      )}

      <section className="mx-auto w-full max-w-5xl px-3 pt-2 fade-up">
        <HeroCarousel images={covers} alt={names} />
      </section>

      <section className="mx-auto w-full max-w-2xl px-6 pb-12 pt-10 text-center">
        <h1 className="font-display text-4xl uppercase tracking-[0.14em] text-cream sm:text-6xl">
          {names}
        </h1>
        {data.wedding_date && (
          <p className="mt-3 text-[0.7rem] uppercase tracking-[0.3em] text-muted-foreground">
            {new Date(data.wedding_date).toLocaleDateString("tr-TR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}

        <GoldDivider className="my-7" />

        {data.hero_message && (
          <p className="script text-2xl leading-snug text-beige sm:text-3xl">
            {data.hero_message}
          </p>
        )}

        {data.thank_you_message && (
          <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {data.thank_you_message}
          </p>
        )}
      </section>

      {data.can_upload ? (
        <ShareMemories weddingId={data.id} />
      ) : (
        <div className="mx-auto mb-16 max-w-xl rounded-2xl border border-border p-6 text-center text-muted-foreground">
          Bu organizasyona şu anda yükleme yapılamıyor. Organizasyon
          yetkilisiyle iletişime geçebilirsiniz.
        </div>
      )}

      <footer className="pb-10 text-center text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
        {names}
      </footer>
    </main>
  );
}

function WeddingSkeleton() {
  return (
    <main className="mx-auto w-full max-w-5xl px-5 py-10">
      <Skeleton className="mx-auto h-[52vh] w-[80%] rounded-2xl bg-surface" />
      <Skeleton className="mx-auto mt-10 h-10 w-64 bg-surface" />
      <Skeleton className="mx-auto mt-4 h-4 w-40 bg-surface" />
      <Skeleton className="mx-auto mt-10 h-64 w-full rounded-2xl bg-surface" />
    </main>
  );
}
