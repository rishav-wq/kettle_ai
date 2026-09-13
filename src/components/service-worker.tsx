"use client";

import { useEffect } from "react";

/** Registers the service worker after the page is interactive, never before. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    const id = setTimeout(() => {
      void navigator.serviceWorker.register("/sw.js").catch(() => {
        // An install that fails is not worth bothering the person about.
      });
    }, 2000);
    return () => clearTimeout(id);
  }, []);
  return null;
}
