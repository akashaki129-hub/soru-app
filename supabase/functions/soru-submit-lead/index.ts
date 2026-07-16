import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.24.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, x-client-info, apikey",
};

const schema = z.object({
  full_name: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(10).max(25),
  email: z.string().trim().email().max(255),
  role: z.enum(["customer", "chef", "both", "research"]),
  city: z.string().trim().max(120).optional().nullable(),
  locality: z.string().trim().max(120).optional().nullable(),
  source: z.string().trim().min(2).max(80),
  campaign: z.string().trim().max(120).optional().nullable(),
  notes: z.string().trim().max(1500).optional().nullable(),
  preferred_service: z.string().trim().max(120).optional().nullable(),
  chef_role: z.string().trim().max(120).optional().nullable(),
  consent: z.literal(true),
  consent_version: z.string().trim().min(2).max(80),
  utm_source: z.string().trim().max(120).optional().nullable(),
  utm_medium: z.string().trim().max(120).optional().nullable(),
  utm_campaign: z.string().trim().max(120).optional().nullable(),
  website: z.string().trim().max(200).optional().nullable(),
  turnstile_token: z.string().trim().max(2000).optional().nullable(),
});

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isRealisticPhone(value: string) {
  const digits = normalizePhone(value);
  if (digits.length < 10 || digits.length > 15) return false;
  if (/^(\d)\1+$/.test(digits)) return false;
  if (new Set(digits).size < 4) return false;
  return !["0123456789", "1234567890", "9876543210", "9999999999", "0000000000"].includes(
    digits.slice(-10),
  );
}

function eventTypeForLead(source: string, role: z.infer<typeof schema>["role"]) {
  if (source === "homepage_waitlist") return "waitlist_entry";
  if (source === "market_feedback") return "market_feedback";
  if (role === "chef") return "chef_enrollment";
  if (role === "customer") return "customer_enrollment";
  return "waitlist_entry";
}

async function verifyTurnstile(token: string | null | undefined, ip: string) {
  const secret = env("TURNSTILE_SECRET_KEY");
  if (!secret) return true;
  if (!token) return false;

  const body = new FormData();
  body.set("secret", secret);
  body.set("response", token);
  body.set("remoteip", ip);

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    body,
  });
  if (!response.ok) return false;
  const result = (await response.json()) as { success?: boolean };
  return Boolean(result.success);
}

async function incrementRateLimit(
  supabase: ReturnType<typeof createClient>,
  rateKey: string,
  limit: number,
) {
  const windowStart = new Date();
  windowStart.setUTCMinutes(0, 0, 0);
  const windowIso = windowStart.toISOString();

  const existing = await supabase
    .from("lead_rate_limits")
    .select("id,attempts")
    .eq("rate_key", rateKey)
    .eq("window_start", windowIso)
    .maybeSingle();

  if (existing.error) throw existing.error;
  if (!existing.data) {
    const inserted = await supabase
      .from("lead_rate_limits")
      .insert({ rate_key: rateKey, window_start: windowIso, attempts: 1 });
    if (inserted.error) throw inserted.error;
    return true;
  }

  const nextAttempts = Number(existing.data.attempts || 0) + 1;
  if (nextAttempts > limit) return false;
  const updated = await supabase
    .from("lead_rate_limits")
    .update({ attempts: nextAttempts })
    .eq("id", existing.data.id);
  if (updated.error) throw updated.error;
  return true;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json(
      { ok: false, message: "Method not allowed" },
      { status: 405, headers: corsHeaders },
    );
  }

  const supabaseUrl = env("SUPABASE_URL");
  const serviceRoleKey = env("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json(
      { ok: false, message: "Lead service is not configured" },
      { status: 500, headers: corsHeaders },
    );
  }

  const ip =
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch {
    return Response.json(
      { ok: false, message: "Please check the form and try again." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (payload.website) {
    return Response.json({ ok: true, message: "Thanks." }, { headers: corsHeaders });
  }

  if (!isRealisticPhone(payload.phone)) {
    return Response.json(
      { ok: false, message: "Please enter a real mobile number." },
      { status: 400, headers: corsHeaders },
    );
  }

  const turnstileOk = await verifyTurnstile(payload.turnstile_token, ip);
  if (!turnstileOk) {
    return Response.json(
      { ok: false, message: "Verification failed. Please try again." },
      { status: 400, headers: corsHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  try {
    const phoneKey = `phone:${normalizePhone(payload.phone)}`;
    const ipKey = `ip:${ip}`;
    const [phoneOk, ipOk] = await Promise.all([
      incrementRateLimit(supabase, phoneKey, 3),
      incrementRateLimit(supabase, ipKey, 20),
    ]);
    if (!phoneOk || !ipOk) {
      return Response.json(
        { ok: false, message: "Too many submissions. Please try later." },
        { status: 429, headers: corsHeaders },
      );
    }
  } catch (error) {
    console.error("Lead rate limit failed", error);
    return Response.json(
      { ok: false, message: "Please try again shortly." },
      { status: 503, headers: corsHeaders },
    );
  }

  const metadata = {
    notes: payload.notes || null,
    preferred_service: payload.preferred_service || null,
    chef_role: payload.chef_role || null,
    utm_source: payload.utm_source || null,
    utm_medium: payload.utm_medium || null,
    utm_campaign: payload.utm_campaign || null,
    ip_hash: await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip)).then((buffer) =>
      Array.from(new Uint8Array(buffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("")
        .slice(0, 24),
    ),
  };

  const lead = {
    full_name: payload.full_name,
    phone: payload.phone,
    email: normalizeEmail(payload.email),
    role: payload.role,
    city: payload.city || null,
    locality: payload.locality || null,
    source: payload.source,
    campaign: payload.campaign || payload.utm_campaign || null,
    consent_version: payload.consent_version,
    consent_at: new Date().toISOString(),
    metadata,
  };

  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedEmail = normalizeEmail(payload.email);

  const { data: existingByPhone } = await supabase
    .from("leads")
    .select("id")
    .eq("normalized_phone", normalizedPhone)
    .limit(1)
    .maybeSingle();

  if (existingByPhone?.id) {
    return Response.json(
      { ok: true, duplicate: true, lead_id: existingByPhone.id },
      { headers: corsHeaders },
    );
  }

  const { data: existingByEmail } = await supabase
    .from("leads")
    .select("id")
    .eq("normalized_email", normalizedEmail)
    .limit(1)
    .maybeSingle();

  if (existingByEmail?.id) {
    return Response.json(
      { ok: true, duplicate: true, lead_id: existingByEmail.id },
      { headers: corsHeaders },
    );
  }

  const inserted = await supabase.from("leads").insert(lead).select("id").maybeSingle();
  if (inserted.error) {
    console.error("Lead insert failed", inserted.error);
    return Response.json(
      { ok: false, message: "Could not save your details." },
      { status: 500, headers: corsHeaders },
    );
  }

  if (inserted.data?.id) {
    const notification = await supabase.from("notification_events").insert({
      dedupe_key: `lead:${inserted.data.id}`,
      event_type: eventTypeForLead(payload.source, payload.role),
      record_id: inserted.data.id,
      payload: {
        name: lead.full_name,
        email: lead.email,
        phone: lead.phone,
        role: lead.role,
        city: lead.city,
        locality: lead.locality,
        source: lead.source,
        campaign: lead.campaign,
        preferred_service: metadata.preferred_service,
        chef_role: metadata.chef_role,
        comments: metadata.notes,
      },
    });

    if (notification.error) {
      console.error("Lead notification enqueue failed", notification.error);
    }
  }

  return Response.json({ ok: true, lead_id: inserted.data?.id }, { headers: corsHeaders });
});
