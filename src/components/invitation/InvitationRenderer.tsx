"use client";

import { useEffect, useRef, useState } from "react";
import type { DigitalInvitationContent } from "@/lib/digital-invitation";
import { BluebellInvitation } from "./BluebellInvitation";
import { BotanicalInvitation } from "./BotanicalInvitation";

export function InvitationRenderer({
  content,
  preview = false,
  replayKey = 0,
}: {
  content: DigitalInvitationContent;
  preview?: boolean;
  replayKey?: number;
}) {
  const [introVisible, setIntroVisible] = useState(content.loading_style !== "none");
  const introRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIntroVisible(content.loading_style !== "none");
  }, [content.loading_style, content.theme_id, replayKey]);

  useEffect(() => {
    if (!introVisible || !introRef.current) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || content.animation_intensity === "reduced") {
      const id = window.setTimeout(() => setIntroVisible(false), 700);
      return () => window.clearTimeout(id);
    }
    let cancelled = false;
    void import("gsap").then(({ gsap }) => {
      if (cancelled || !introRef.current) return;
      gsap.timeline({ onComplete: () => setIntroVisible(false) })
        .fromTo(introRef.current.querySelector("[data-mark]"), { opacity: 0, y: 14, scale: .96 }, { opacity: 1, y: 0, scale: 1, duration: .8, ease: "power2.out" })
        .to(introRef.current, { opacity: 0, duration: .65, delay: content.animation_intensity === "cinematic" ? 1.1 : .45, ease: "power2.inOut" });
    });
    return () => { cancelled = true; };
  }, [content.animation_intensity, introVisible]);

  const invitation = content.theme_id === "bluebell-timeless" ? (
    <BluebellInvitation content={content} preview={preview} />
  ) : (
    <BotanicalInvitation content={content} />
  );
  const loadingBackground = content.theme_id === "bluebell-timeless"
    ? "/digital-invitation/bluebell/bluebell-watercolor.png"
    : "/digital-invitation/botanical/floral-oval.png";

  return <div style={{ position: "relative", minHeight: "100%" }}>
    {introVisible ? <div ref={introRef} style={{position:preview ? "absolute" : "fixed",inset:preview ? "0 0 auto" : 0,zIndex:9999,width:"100%",height:preview ? 950 : undefined,minWidth:0,minHeight:preview ? 0 : "100svh",display:"grid",placeItems:"center",padding:preview ? 24 : "clamp(20px,6vw,56px)",boxSizing:"border-box",backgroundColor:content.theme_id === "bluebell-timeless" ? "#f7f5ef" : "#fff7f5",backgroundImage:`url(${loadingBackground})`,backgroundRepeat:"no-repeat",backgroundPosition:"center",backgroundSize:"cover",color:"#263f63",textAlign:"center",overflow:"hidden"}}>
      <div data-mark style={{width:preview ? "calc(100% - 24px)" : "min(92%,760px)",maxWidth:"100%",padding:preview ? "44px 20px" : "clamp(28px,7vw,64px) clamp(18px,5vw,48px)",boxSizing:"border-box",border:"1px solid rgba(82,108,148,.34)",borderRadius:preview ? 38 : "clamp(28px,7vw,72px)",background:"rgba(247,245,239,.82)",boxShadow:"0 24px 80px rgba(38,63,99,.16)",backdropFilter:"blur(3px)",overflow:"hidden"}}><p style={{fontSize:preview ? 10 : "clamp(10px,1.5vw,13px)",letterSpacing:preview ? 4 : "clamp(3px,.7vw,7px)",textTransform:"uppercase",marginBottom:18,whiteSpace:"normal"}}>Dijital davetiye</p><strong style={{display:"block",maxWidth:"100%",fontFamily:'"Brush Script MT","Segoe Script",cursive',fontSize:preview ? "3.25rem" : "clamp(2.7rem,12vw,6.5rem)",fontWeight:500,lineHeight:.92,overflowWrap:"anywhere"}}>{content.bride_name} &amp; {content.groom_name}</strong><span style={{display:"block",maxWidth:preview ? 340 : 680,margin:preview ? "30px auto 0" : "clamp(24px,5vw,42px) auto 0",fontFamily:"Arial,sans-serif",fontSize:preview ? "1.65rem" : "clamp(1.25rem,5vw,3.6rem)",fontWeight:900,lineHeight:1.08,letterSpacing:preview ? ".12em" : "clamp(.08em,.5vw,.2em)",textTransform:"uppercase",textWrap:"balance",overflowWrap:"anywhere"}}>{content.loading_message}</span><button type="button" onClick={() => setIntroVisible(false)} style={{minHeight:46,marginTop:preview ? 30 : "clamp(24px,5vw,42px)",padding:"0 20px",border:"1px solid currentColor",borderRadius:999,background:"rgba(255,255,255,.42)",color:"inherit",fontWeight:800}}>Açılışı geç</button></div>
    </div> : null}
    {invitation}
  </div>;
}
