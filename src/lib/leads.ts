import { supabase } from "@/integrations/supabase/client";
import { PILOT_CONSENT_VERSION, getAttribution } from "@/lib/attribution";
import { normalizePhone } from "@/lib/validation";

export type LeadRole = "customer" | "chef" | "both" | "research";

export type PublicLeadInput = {
  full_name: string;
  phone: string;
  email: string;
  role: LeadRole;
  city?: string;
  locality?: string;
  source: string;
  campaign?: string | null;
  notes?: string | null;
  preferred_service?: string | null;
  chef_role?: string | null;
  consent: boolean;
  website?: string;
};

export async function submitPublicLead(input: PublicLeadInput) {
  const attribution = getAttribution(input.source);
  const { data, error } = await supabase.functions.invoke<{
    ok: boolean;
    duplicate?: boolean;
    lead_id?: string;
    message?: string;
  }>("soru-submit-lead", {
    body: {
      ...input,
      phone: normalizePhone(input.phone),
      consent_version: PILOT_CONSENT_VERSION,
      source: attribution.source,
      utm_source: attribution.utm_source,
      utm_medium: attribution.utm_medium,
      utm_campaign: attribution.utm_campaign,
    },
  });

  if (error) throw new Error(error.message || "Could not save lead.");
  if (!data?.ok) throw new Error(data?.message || "Could not save lead.");
  return data;
}
