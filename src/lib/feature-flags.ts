type FlagName =
  | "PILOT_MODE"
  | "DEMO_CONTENT_ENABLED"
  | "PAYMENTS_ENABLED"
  | "AI_RECOMMENDATIONS_ENABLED"
  | "DELIVERY_ENABLED"
  | "REVIEWS_ENABLED";

function envFlag(name: string, fallback = false) {
  const value = String(import.meta.env[name] ?? "")
    .trim()
    .toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on", "enabled"].includes(value);
}

export const featureFlags: Record<FlagName, boolean> = {
  PILOT_MODE: envFlag("VITE_PILOT_MODE", true),
  DEMO_CONTENT_ENABLED: envFlag("VITE_DEMO_CONTENT_ENABLED", false),
  PAYMENTS_ENABLED: envFlag("VITE_PAYMENTS_ENABLED", false),
  AI_RECOMMENDATIONS_ENABLED: envFlag("VITE_AI_RECOMMENDATIONS_ENABLED", true),
  DELIVERY_ENABLED: envFlag("VITE_DELIVERY_ENABLED", false),
  REVIEWS_ENABLED: envFlag("VITE_REVIEWS_ENABLED", false),
};

export function isFeatureEnabled(name: FlagName) {
  return featureFlags[name];
}
