"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface LoadingTemplatePreview {
  id: string;
  name: string;
  video: string;
  poster: string;
}

function LoadingTemplateCard({
  template,
  active,
  onToggle,
  onEnded,
}: {
  template: LoadingTemplatePreview;
  active: boolean;
  onToggle: () => void;
  onEnded: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (active) {
      void video.play().catch(() => undefined);
      return;
    }

    video.pause();
    video.currentTime = 0;
  }, [active]);

  return (
    <article>
      <div className="design-center__loading-preview">
        <video
          ref={videoRef}
          src={template.video}
          poster={template.poster}
          aria-label={`${template.name} loading page önizlemesi`}
          muted
          playsInline
          preload="metadata"
          onEnded={onEnded}
        />
      </div>
      <div className="design-center__loading-title-row">
        <h3 className="design-center__loading-title">{template.name}</h3>
        <button
          type="button"
          className="design-center__loading-play"
          aria-label={`${template.name} videosunu ${active ? "durdur" : "oynat"}`}
          aria-pressed={active}
          onClick={onToggle}
        >
          {active ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    </article>
  );
}

export function LoadingTemplateCatalog({
  templates,
}: {
  templates: LoadingTemplatePreview[];
}) {
  const [activeId, setActiveId] = useState<string | null>(null);

  return (
    <div className="design-center__catalog design-center__catalog--loading">
      {templates.map((template) => (
        <LoadingTemplateCard
          key={template.id}
          template={template}
          active={activeId === template.id}
          onToggle={() =>
            setActiveId((current) =>
              current === template.id ? null : template.id,
            )
          }
          onEnded={() =>
            setActiveId((current) =>
              current === template.id ? null : current,
            )
          }
        />
      ))}
    </div>
  );
}
