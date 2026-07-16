export const PILOT_CONSENT_VERSION = "pilot-v1-2026-07-16";

export function getAttribution(source: string) {
  if (typeof window === "undefined") {
    return {
      source,
      utm_source: null,
      utm_medium: null,
      utm_campaign: null,
    };
  }

  const params = new URLSearchParams(window.location.search);
  return {
    source,
    utm_source: params.get("utm_source"),
    utm_medium: params.get("utm_medium"),
    utm_campaign: params.get("utm_campaign"),
  };
}
