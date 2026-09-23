"use client";
import Image from "next/image";
import * as Dialog from "@radix-ui/react-dialog";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useRef } from "react";
import type { Media } from "@/lib/api";

export function MediaViewer({
  item,
  rows,
  onChange,
  returnFocus,
  allowDownload = true,
}: {
  item: Media | null;
  rows: Media[];
  onChange: (item: Media | null) => void;
  returnFocus: React.RefObject<HTMLButtonElement | null>;
  allowDownload?: boolean;
}) {
  const touch = useRef<number | null>(null);
  const index = rows.findIndex((row) => row.id === item?.id);
  const move = (step: number) => {
    const next = rows[index + step];
    if (next) onChange(next);
  };
  return (
    <Dialog.Root
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onChange(null);
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="admin-dialog-overlay" />
        <Dialog.Content
          className="admin-viewer"
          aria-describedby="media-viewer-description"
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            returnFocus.current?.focus();
          }}
          onKeyDown={(e) => {
            if ((e.target as HTMLElement).tagName === "VIDEO") return;
            if (e.key === "ArrowRight") move(1);
            if (e.key === "ArrowLeft") move(-1);
          }}
        >
          <div className="admin-viewer-top">
            <Dialog.Title className="text-sm">
              {index + 1} / {rows.length} ·{" "}
              {item?.type === "video" ? "Video" : "Fotoğraf"}
            </Dialog.Title>
            <Dialog.Close
              className="admin-button"
              aria-label="Görüntüleyiciyi kapat"
            >
              <X size={18} /> Kapat
            </Dialog.Close>
          </div>
          <div
            className="admin-viewer-stage"
            onTouchStart={(e) => {
              touch.current =
                e.touches.length === 1 ? e.touches[0].clientX : null;
            }}
            onTouchEnd={(e) => {
              if (item?.type === "video" || touch.current === null) return;
              const delta = e.changedTouches[0].clientX - touch.current;
              if (Math.abs(delta) > 70) move(delta < 0 ? 1 : -1);
              touch.current = null;
            }}
          >
            {item?.type === "photo" ? (
              <Image
                key={item.id}
                src={item.url}
                alt={item.file_name}
                fill
                unoptimized
                sizes="100vw"
                className="object-contain"
              />
            ) : (
              item && (
                <video key={item.id} src={item.url} controls playsInline />
              )
            )}
            <button
              className="admin-button admin-viewer-nav prev"
              aria-label="Önceki içerik"
              disabled={index <= 0}
              onClick={() => move(-1)}
            >
              <ChevronLeft size={22} />
            </button>
            <button
              className="admin-button admin-viewer-nav next"
              aria-label="Sonraki içerik"
              disabled={index >= rows.length - 1}
              onClick={() => move(1)}
            >
              <ChevronRight size={22} />
            </button>
          </div>
          <div className="admin-viewer-bottom">
            <Dialog.Description
              id="media-viewer-description"
              className="admin-viewer-note"
            >
              <strong>{item?.guest_name || "İsimsiz misafir"}</strong>
              <br />
              {item?.guest_message || item?.file_name}
            </Dialog.Description>
            {item && allowDownload && (
              <a href={item.download_url} className="admin-button primary">
                <Download size={16} /> İndir
              </a>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
