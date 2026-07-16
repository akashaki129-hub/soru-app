import { useEffect } from "react";

export function MobileAppInstaller() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (!window.location.protocol.startsWith("https") && window.location.hostname !== "localhost")
      return;

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Soru still works as a normal web app if service worker registration fails.
      });
    });
  }, []);

  return null;
}
