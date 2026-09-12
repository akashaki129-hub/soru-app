import type { ChefInterestListing } from "@/lib/soru-app";
import { getPhoneValidationError } from "@/lib/validation";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type ChefEnrollmentRow = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  comments: string | null;
};

type ResearchRow = {
  id: string;
  created_at: string;
  audience: string;
  statements: string[];
  chef_start_timeline: string | null;
  chef_support_needs: string[];
  city: string;
  full_name: string | null;
  contact: string | null;
  comments: string | null;
};

type ChefApplicationRow = {
  id: string;
  created_at: string;
  submitted_at: string | null;
  application_status: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  cooking_role: string;
  current_step: number;
};

const AUDIENCE_LABELS: Record<string, string> = {
  home_cook: "Home cook / homemaker",
  professional_chef: "Professional chef / caterer",
  culinary_student: "Culinary student",
  both: "Customer + cook",
};

export async function loadPublicChefProspects() {
  const [listingsRes, enrollmentsRes, researchRes, applicationsRes] = await Promise.all([
    supabaseAdmin
      .from("chef_interest_listings")
      .select("*")
      .eq("public_visible", true)
      .in("status", ["submitted", "reviewing", "invited"])
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("chef_enrollments")
      .select("id,created_at,name,phone,email,role,comments")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("market_research_responses")
      .select(
        "id,created_at,audience,statements,chef_start_timeline,chef_support_needs,city,full_name,contact,comments",
      )
      .in("audience", ["home_cook", "professional_chef", "culinary_student", "both"])
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("chef_applications")
      .select(
        "id,created_at,submitted_at,application_status,full_name,phone,email,city,cooking_role,current_step",
      )
      .order("created_at", { ascending: false }),
  ]);

  const existing = ((listingsRes.data || []) as ChefInterestListing[]).filter(
    (row) => row.public_visible && ["submitted", "reviewing", "invited"].includes(row.status),
  );
  const merged = [...existing];
  const seen = new Set(existing.map((row) => listingKey(row.full_name, row.city)));
  const seenLeadIds = new Set(existing.flatMap((row) => [row.id, row.lead_id].filter(Boolean)));

  for (const row of (enrollmentsRes.data || []) as ChefEnrollmentRow[]) {
    if (
      seenLeadIds.has(row.id) ||
      !isUsablePersonName(row.name) ||
      getPhoneValidationError(row.phone)
    ) {
      continue;
    }

    addUnique(merged, seen, {
      id: `chef-enrollment-${row.id}`,
      lead_id: row.id,
      full_name: row.name.trim(),
      kitchen_name: null,
      chef_role: mapChefRole(row.role),
      city: "City to confirm",
      area: null,
      bio: cleanText(row.comments) || "Joined Soru as a chef applicant.",
      specialties: [formatLabel(row.role)],
      cuisines: [],
      signature_dish: null,
      sample_menu: cleanText(row.comments),
      expected_price_range: null,
      fssai_status: "need_guidance",
      public_visible: true,
      status: "submitted",
      created_at: row.created_at,
    });
  }

  for (const row of (applicationsRes.data || []) as ChefApplicationRow[]) {
    if (
      seenLeadIds.has(row.id) ||
      !isUsablePersonName(row.full_name) ||
      getPhoneValidationError(row.phone)
    ) {
      continue;
    }

    addUnique(merged, seen, {
      id: `chef-application-${row.id}`,
      lead_id: row.id,
      full_name: row.full_name.trim(),
      kitchen_name: null,
      chef_role: mapChefRole(row.cooking_role),
      city: row.city || "City to confirm",
      area: null,
      bio:
        row.submitted_at || row.application_status !== "draft"
          ? "Submitted a chef onboarding application with Soru."
          : "Started a chef onboarding application with Soru.",
      specialties: [formatLabel(row.cooking_role), `Step ${row.current_step}/5`],
      cuisines: [],
      signature_dish: null,
      sample_menu: null,
      expected_price_range: null,
      fssai_status: "need_guidance",
      public_visible: true,
      status: row.application_status === "draft" ? "reviewing" : "submitted",
      created_at: row.created_at,
    });
  }

  for (const row of (researchRes.data || []) as ResearchRow[]) {
    if (
      seenLeadIds.has(row.id) ||
      !isUsablePersonName(row.full_name || "") ||
      !isUsableContact(row.contact || "")
    ) {
      continue;
    }

    addUnique(merged, seen, {
      id: `chef-research-${row.id}`,
      lead_id: row.id,
      full_name: row.full_name!.trim(),
      kitchen_name: null,
      chef_role: mapChefRole(row.audience),
      city: row.city === "Other" ? "City to confirm" : row.city,
      area: null,
      bio: buildResearchBio(row),
      specialties: buildResearchSpecialties(row),
      cuisines: [],
      signature_dish: null,
      sample_menu: cleanText(row.comments),
      expected_price_range: null,
      fssai_status: row.chef_support_needs.includes("food_license")
        ? "need_guidance"
        : "not_started",
      public_visible: true,
      status: row.chef_start_timeline === "exploring" ? "reviewing" : "submitted",
      created_at: row.created_at,
    });
  }

  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

function addUnique(rows: ChefInterestListing[], seen: Set<string>, listing: ChefInterestListing) {
  const key = listingKey(listing.full_name, listing.city);
  if (seen.has(key)) return;
  seen.add(key);
  rows.push(listing);
}

function listingKey(name: string, city: string) {
  return `${name}|${city}`
    .toLowerCase()
    .replace(/[^a-z0-9|]+/g, " ")
    .trim();
}

function buildResearchBio(row: ResearchRow) {
  const comment = cleanText(row.comments);
  if (comment) return comment;
  if (row.statements.includes("earn_from_cooking")) {
    return "Shared interest in earning through Soru as a skilled cook.";
  }
  if (row.chef_start_timeline === "ready_now") {
    return "Ready to start building a food business with Soru.";
  }
  return "Shared chef interest through Soru market feedback.";
}

function buildResearchSpecialties(row: ResearchRow) {
  const specialties = new Set<string>();
  specialties.add(AUDIENCE_LABELS[row.audience] || "Chef applicant");
  if (row.statements.includes("earn_from_cooking")) specialties.add("Cooking skills");
  if (row.statements.includes("direct_from_chefs")) specialties.add("Chef-led meals");
  if (row.statements.includes("personalized_nutrition")) specialties.add("Personalized meals");
  if (row.chef_support_needs.includes("subscriptions")) specialties.add("Meal subscriptions");
  if (row.chef_support_needs.includes("menu_pricing")) specialties.add("Menu development");
  return Array.from(specialties).slice(0, 5);
}

function mapChefRole(value: string) {
  const normalized = value.toLowerCase();
  if (normalized.includes("professional") || normalized.includes("caterer"))
    return "professional_chef";
  if (normalized.includes("student")) return "culinary_student";
  if (normalized.includes("home") || normalized.includes("homemaker")) return "home_cook";
  return "home_cook";
}

function isUsablePersonName(value: string) {
  const text = value.trim();
  if (text.length < 2 || text.length > 120) return false;
  if (!/[a-z]/i.test(text)) return false;
  if (/^(test|testing|demo|sample|asdf|qwerty|none|null|na|n\/a)$/i.test(text)) return false;
  return true;
}

function isUsableContact(value: string) {
  const text = value.trim();
  if (text.length < 3 || text.length > 255) return false;
  const digits = text.replace(/\D/g, "");
  if (digits.length >= 10) return !getPhoneValidationError(text);
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(text);
}

function cleanText(value: string | null) {
  const text = value?.trim();
  if (!text) return null;
  return text.length > 420 ? `${text.slice(0, 417)}…` : text;
}

function formatLabel(value: string) {
  return value
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}
