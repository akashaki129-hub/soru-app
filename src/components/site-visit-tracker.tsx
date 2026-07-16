import { useEffect, useRef } from "react";
import { useLocation } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_ID_KEY = "soru_visitor_id_v1";
const SESSION_ID_KEY = "soru_session_id_v1";

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function getOrCreate(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) return existing;
  const value = createId();
  storage.setItem(key, value);
  return value;
}

export function SiteVisitTracker() {
  const location = useLocation();
  const lastTrackedPath = useRef("");

  useEffect(() => {
    const path = location.pathname;
    if (!path || path === "/admin" || path === "/auth" || lastTrackedPath.current === path) return;
    lastTrackedPath.current = path;

    const visitorId = getOrCreate(localStorage, VISITOR_ID_KEY);
    const sessionId = getOrCreate(sessionStorage, SESSION_ID_KEY);
    let referrerHost: string | null = null;
    try {
      referrerHost = document.referrer ? new URL(document.referrer).hostname.slice(0, 255) : null;
    } catch {
      referrerHost = null;
    }

    void supabase
      .from("site_visits")
      .insert({
        visitor_id: visitorId,
        session_id: sessionId,
        path: path.slice(0, 300),
        referrer_host: referrerHost,
      })
      .then(({ error }) => {
        if (error) console.error("Visit tracking failed", error.message);
      });
  }, [location.pathname]);

  return null;
}
