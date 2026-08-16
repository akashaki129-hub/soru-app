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
  kitchen_name: z.string().trim().max(120).optional().nullable(),
  chef_role: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  area: z.string().trim().max(120).optional().nullable(),
  specialties: z.string().trim().min(2).max(500),
  cuisines: z.string().trim().min(2).max(500),
  signature_dish: z.string().trim().min(2).max(160),
  sample_menu: z.string().trim().max(600).optional().nullable(),
  expected_price_range: z.string().trim().min(2).max(120),
  fssai_status: z.enum(["not_started", "need_guidance", "in_progress", "submitted", "approved"]),
  notes: z.string().trim().max(1500).optional().nullable(),
  public_listing_consent: z.literal(true),
  consent: z.literal(true),
  consent_version: z.string().trim().max(80).optional().nullable(),
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

function splitList(value: string | null | undefined) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
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
      { ok: false, message: "Chef registration service is not configured." },
      { status: 500, headers: corsHeaders },
    );
  }

  let payload: z.infer<typeof schema>;
  try {
    payload = schema.parse(await request.json());
  } catch (error) {
    console.error("Chef registration validation failed", error);
    return Response.json(
      { ok: false, message: "Please check the form and try again." },
      { status: 400, headers: corsHeaders },
    );
  }

  if (!isRealisticPhone(payload.phone)) {
    return Response.json(
      { ok: false, message: "Please enter a real mobile number." },
      { status: 400, headers: corsHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const normalizedPhone = normalizePhone(payload.phone);
  const normalizedEmail = normalizeEmail(payload.email);

  const listingData = {
    full_name: payload.full_name,
    kitchen_name: payload.kitchen_name || null,
    chef_role: payload.chef_role,
    city: payload.city,
    area: payload.area || null,
    bio: payload.notes || null,
    specialties: splitList(payload.specialties),
    cuisines: splitList(payload.cuisines),
    signature_dish: payload.signature_dish,
    sample_menu: payload.sample_menu || null,
    expected_price_range: payload.expected_price_range,
    fssai_status: payload.fssai_status,
    public_visible: true,
    status: "submitted",
  };

  const existingContact = await supabase
    .from("chef_interest_contacts")
    .select("listing_id")
    .or(`normalized_phone.eq.${normalizedPhone},normalized_email.eq.${normalizedEmail}`)
    .limit(1)
    .maybeSingle();

  if (existingContact.error) {
    console.error("Chef contact lookup failed", existingContact.error);
    return Response.json(
      { ok: false, message: "Could not check this registration." },
      { status: 500, headers: corsHeaders },
    );
  }

  let listingId = existingContact.data?.listing_id as string | undefined;

  if (listingId) {
    const updated = await supabase
      .from("chef_interest_listings")
      .update(listingData)
      .eq("id", listingId)
      .select("id")
      .maybeSingle();

    if (updated.error) {
      console.error("Chef listing update failed", updated.error);
      return Response.json(
        { ok: false, message: "Could not update your chef profile." },
        { status: 500, headers: corsHeaders },
      );
    }
    listingId = updated.data?.id || listingId;
  } else {
    const inserted = await supabase
      .from("chef_interest_listings")
      .insert(listingData)
      .select("id")
      .maybeSingle();

    if (inserted.error || !inserted.data?.id) {
      console.error("Chef listing insert failed", inserted.error);
      return Response.json(
        { ok: false, message: "Could not save your chef profile." },
        { status: 500, headers: corsHeaders },
      );
    }
    listingId = inserted.data.id;
  }

  const contactData = {
    listing_id: listingId,
    full_name: payload.full_name,
    phone: payload.phone,
    normalized_phone: normalizedPhone,
    email: normalizedEmail,
    normalized_email: normalizedEmail,
    consent_version: payload.consent_version || null,
    consent_at: new Date().toISOString(),
    metadata: {
      source: "chef_one_page_registration",
      chef_role: payload.chef_role,
      city: payload.city,
      area: payload.area || null,
      fssai_status: payload.fssai_status,
      public_listing_consent: payload.public_listing_consent,
    },
  };

  const contactSaved = await supabase
    .from("chef_interest_contacts")
    .upsert(contactData, { onConflict: "listing_id" });

  if (contactSaved.error) {
    console.error("Chef contact save failed", contactSaved.error);
    return Response.json(
      { ok: false, message: "Chef profile saved, but contact details could not be saved." },
      { status: 500, headers: corsHeaders },
    );
  }

  return Response.json({ ok: true, listing_id: listingId }, { headers: corsHeaders });
});
