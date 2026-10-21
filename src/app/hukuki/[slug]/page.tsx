import { notFound } from "next/navigation";
import Link from "next/link";
import { LEGAL_DOCUMENT_VERSION, legalDocuments, type LegalDocumentSlug } from "@/lib/legal-documents";
import "../legal.css";

export function generateStaticParams() {
  return Object.keys(legalDocuments).map((slug) => ({ slug }));
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const document = legalDocuments[slug as LegalDocumentSlug];
  if (!document) notFound();
  return <main className="legal-page"><article><Link href="/">← ShineQR</Link><p className="legal-kicker">HUKUKİ METİN · {LEGAL_DOCUMENT_VERSION}</p><h1>{document.title}</h1><p className="legal-summary">{document.summary}</p><aside><strong>Taslak uyarısı</strong><p>Bu metin çalışma taslağıdır; hukuki danışman onayı ve işletme kimlik bilgileri tamamlanmadan müşteriye sözleşme olarak sunulmamalıdır.</p></aside>{document.sections.map(([title, body]) => <section key={title}><h2>{title}</h2><p>{body}</p></section>)}<footer>Son taslak güncellemesi: 21 Ekim 2026 · Türkiye</footer></article></main>;
}
