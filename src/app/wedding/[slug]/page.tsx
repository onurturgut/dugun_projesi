"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api, type Wedding } from "@/lib/api";
import { WeddingIntro } from "@/components/wedding/WeddingIntro";
import { WeddingPageTemplate } from "@/components/wedding/WeddingPageTemplate";
import { ShareMemories } from "@/components/upload/ShareMemories";
import { Skeleton } from "@/components/ui/skeleton";
import { resolveDesign } from "@/lib/design";

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
        return await api<Wedding>(`/weddings/slug/${slug}`, {
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timeout);
        signal.removeEventListener("abort", cancel);
      }
    },
    refetchInterval: 30000,
  });

  if (isLoading) return <WeddingSkeleton />;
  if (isError || !data)
    return <WeddingContent data={data} isError={isError} />;

  return (
    <WeddingIntro
      design={data.design}
      title={data.title}
      ready
      failed={false}
      coverSrc={data.cover_images?.[0] || "/covers/couple-1.jpg"}
    >
      <WeddingContent data={data} isError={false} />
    </WeddingIntro>
  );
}

function WeddingContent({
  data,
  isError,
}: {
  data?: Wedding;
  isError: boolean;
}) {
  if (isError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#42090F] px-6 text-center">
        <div>
          <h1 className="text-2xl font-light text-white">
            {isError ? "Sayfa yüklenemedi" : "Organizasyon bulunamadı"}
          </h1>
          <p className="mt-3 text-sm text-white/65">
            QR kodunuzu tekrar okutmayı deneyin.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex min-h-[44px] items-center rounded-xl border border-white/50 px-5 text-sm uppercase tracking-[0.18em] text-white"
          >
            Ana sayfa
          </Link>
        </div>
      </main>
    );
  }

  const covers = data.cover_images?.length
    ? data.cover_images
    : ["/covers/couple-1.jpg"];
  const design = resolveDesign(data.design);

  return (
    <WeddingPageTemplate
      design={design}
      images={covers}
      title={data.title}
      date={data.wedding_date}
    >
      {data.digital_invitation?.status === "published" ? (
        <section className="mx-auto mb-10 max-w-xl rounded-3xl border border-white/40 bg-white/10 p-7 text-center text-white backdrop-blur-sm">
          <p className="text-xs uppercase tracking-[0.22em] text-white/70">Dijital davetiye</p>
          <h2 className="mt-3 text-2xl font-light">{data.digital_invitation.venue}</h2>
          <p className="mt-3 text-sm text-white/80">
            {new Date(`${data.digital_invitation.event_date}T12:00:00+03:00`).toLocaleDateString("tr-TR", {
              day: "numeric",
              month: "long",
              year: "numeric",
              timeZone: "Europe/Istanbul",
            })}{" "}
            · {data.digital_invitation.event_time}
          </p>
          {data.digital_invitation.message ? (
            <p className="mt-4 text-sm leading-6 text-white/75">{data.digital_invitation.message}</p>
          ) : null}
          <a
            className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-white/60 px-5 text-sm"
            href={data.digital_invitation.map_url}
            target="_blank"
            rel="noreferrer"
          >
            Haritada görüntüle
          </a>
        </section>
      ) : null}
      {data.can_upload ? (
        <ShareMemories
          weddingId={data.id}
          title={design.uploadTitle}
          prompt={design.uploadPrompt}
        />
      ) : (
        <div className="mx-auto mb-16 max-w-xl rounded-2xl border border-white/40 p-6 text-center text-white/75">
          Bu organizasyona şu anda yükleme yapılamıyor. Organizasyon
          yetkilisiyle iletişime geçebilirsiniz.
        </div>
      )}
    </WeddingPageTemplate>
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
