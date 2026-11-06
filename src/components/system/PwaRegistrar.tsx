"use client";

import { useEffect } from "react";

export function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production")
      return;

    let disposed = false;
    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
          updateViaCache: "none",
        });
        if (!disposed) await registration.update();
      } catch (reason) {
        if (process.env.NODE_ENV === "development")
          console.warn("PWA service worker kaydedilemedi.", reason);
      }
    };

    void register();
    return () => {
      disposed = true;
    };
  }, []);

  return null;
}
