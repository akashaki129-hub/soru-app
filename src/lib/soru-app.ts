import { supabase } from "@/integrations/supabase/client";
import { normalizePhone } from "@/lib/validation";
import type { User } from "@supabase/supabase-js";

type DbError = { message: string } | null;
type DbListResult<T> = { data: T[] | null; error: DbError };
type DbSingleResult<T> = { data: T | null; error: DbError };

type SoruQueryBuilder<T> = PromiseLike<DbListResult<T>> & {
  select: (columns?: string) => SoruQueryBuilder<T>;
  eq: (column: string, value: unknown) => SoruQueryBuilder<T>;
  order: (column: string, options?: { ascending?: boolean }) => SoruQueryBuilder<T>;
  insert: (values: unknown) => SoruQueryBuilder<T>;
  update: (values: unknown) => SoruQueryBuilder<T>;
  upsert: (values: unknown, options?: { onConflict?: string }) => SoruQueryBuilder<T>;
  maybeSingle: () => Promise<DbSingleResult<T>>;
};

export const db = supabase as unknown as {
  from: <T>(table: string) => SoruQueryBuilder<T>;
};

export type AppRole = "customer" | "chef" | "both";

export type Profile = {
  user_id: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  default_role: AppRole;
};

export type ChefProfile = {
  id: string;
  user_id: string;
  display_name: string;
  kitchen_name: string | null;
  chef_type: string;
  city: string;
  area: string | null;
  bio: string | null;
  specialties: string[];
  cuisines: string[];
  service_radius_km: number | null;
  fssai_status: string;
  fssai_license_no: string | null;
  verification_status: string;
  is_listed: boolean;
};

export type MenuItem = {
  id: string;
  chef_profile_id: string;
  user_id: string;
  name: string;
  description: string | null;
  category: string;
  price_inr: number;
  meal_type: string;
  dietary_tags: string[];
  allergens: string[];
  available_days: string[];
  is_active: boolean;
};

export type CustomerOrder = {
  id: string;
  chef_profile_id: string | null;
  menu_item_id: string | null;
  order_type: string;
  quantity: number;
  delivery_city: string;
  delivery_area: string | null;
  delivery_address: string | null;
  scheduled_for: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export type Subscription = {
  id: string;
  chef_profile_id: string | null;
  plan_type: string;
  meal_focus: string | null;
  meals_per_week: number;
  budget_range: string;
  dietary_preferences: string[];
  allergies: string | null;
  delivery_city: string;
  delivery_area: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

export type MealPlanRequest = {
  id: string;
  goal: string;
  nutrition_focus: string[];
  diet_type: string;
  allergies: string | null;
  meals_per_day: number;
  budget_range: string;
  city: string;
  notes: string | null;
  ai_summary: string | null;
  status: string;
  created_at: string;
};

export type LunchboxRequest = {
  id: string;
  child_age: string | null;
  preferences: string | null;
  dislikes: string | null;
  allergies: string | null;
  health_goals: string[];
  school_timing: string | null;
  budget_range: string;
  city: string;
  recommendation_summary: string | null;
  status: string;
  created_at: string;
};

export type ProfileInput = {
  userId: string;
  fullName: string;
  phone?: string;
  city?: string;
  defaultRole: AppRole;
};

export type AiRecommendation = {
  title: string;
  summary: string;
  safety_note: string;
  daily_targets: string[];
  meal_recommendations: Array<{
    meal: string;
    recommendation: string;
    why_it_fits: string;
    chef_note: string;
  }>;
  chef_instructions: string[];
  avoid_or_watch: string[];
  next_steps: string[];
};

export const chefTypeOptions = [
  ["home_cook", "Home cook"],
  ["homemaker", "Homemaker"],
  ["culinary_student", "Culinary student"],
  ["professional_chef", "Professional chef"],
  ["caterer", "Caterer"],
] as const;

export const fssaiDocumentOptions = [
  "Photo identity proof",
  "Address proof",
  "Passport-size photograph",
  "Business/kitchen address details",
  "Food category and menu details",
  "Water test report, if applicable",
  "Kitchen layout or equipment details, if applicable",
  "NOC/rent agreement/utility bill, if applicable",
];

export const fssaiSupportOptions = [
  "Choosing the right license type",
  "Document preparation",
  "FoSCoS application guidance",
  "Menu/category mapping",
  "Food safety basics",
  "Renewal and compliance reminders",
];

export const nutritionFocusOptions = [
  "High protein",
  "Calorie conscious",
  "Diabetes friendly",
  "Heart healthy",
  "Weight management",
  "Gut friendly",
  "Low oil",
  "Balanced family meals",
];

export const lunchboxGoalOptions = [
  "More vegetables",
  "High protein",
  "Steady energy",
  "Less fried food",
  "Iron-rich meals",
  "Calcium support",
  "Balanced treats",
];

export function splitList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 12);
}

export function joinList(value?: string[] | null) {
  return value?.length ? value.join(", ") : "—";
}

export function currency(value?: number | null) {
  if (!value) return "Price on request";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function titleCase(value: string) {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

export function buildMealPlanSummary(input: {
  goal: string;
  nutritionFocus: string[];
  dietType: string;
  allergies: string;
  mealsPerDay: number;
  budgetRange: string;
  notes: string;
}) {
  const focus = input.nutritionFocus.length
    ? input.nutritionFocus.join(", ").toLowerCase()
    : "balanced nutrition";
  const allergyLine = input.allergies.trim()
    ? `Avoid: ${input.allergies.trim()}.`
    : "No allergies were shared.";
  return [
    `Meal-plan brief: ${input.goal.trim()} with ${focus}.`,
    `Preference: ${titleCase(input.dietType)} · ${input.mealsPerDay} meal(s)/day · ${input.budgetRange}.`,
    allergyLine,
    input.notes.trim()
      ? `Customer note: ${input.notes.trim()}`
      : "Chef can recommend a simple weekly rotation.",
  ].join(" ");
}

export function formatAiRecommendation(recommendation: AiRecommendation) {
  const meals = recommendation.meal_recommendations
    .map(
      (item) =>
        `${item.meal}: ${item.recommendation} Why it fits: ${item.why_it_fits} Chef note: ${item.chef_note}`,
    )
    .join("\n");
  return [
    recommendation.title,
    "",
    recommendation.summary,
    "",
    `Safety note: ${recommendation.safety_note}`,
    "",
    `Daily targets: ${recommendation.daily_targets.join("; ")}`,
    "",
    "Recommendations:",
    meals,
    "",
    `Chef instructions: ${recommendation.chef_instructions.join("; ")}`,
    "",
    `Avoid/watch: ${recommendation.avoid_or_watch.join("; ")}`,
    "",
    `Next steps: ${recommendation.next_steps.join("; ")}`,
  ].join("\n");
}

export async function generateAiRecommendation(input: {
  kind: "meal_plan" | "lunchbox";
  payload: Record<string, unknown>;
}) {
  const { data, error } = await supabase.functions.invoke<{
    recommendation: AiRecommendation;
    model: string;
    generated_at: string;
  }>("soru-ai-recommendations", {
    body: input,
  });

  if (error) throw new Error(error.message || "AI recommendation failed.");
  if (!data?.recommendation) throw new Error("AI recommendation failed.");
  return data;
}

export function buildLunchboxSummary(input: {
  childAge: string;
  preferences: string;
  dislikes: string;
  allergies: string;
  healthGoals: string[];
  schoolTiming: string;
}) {
  const goals = input.healthGoals.length
    ? input.healthGoals.join(", ").toLowerCase()
    : "balanced, kid-friendly meals";
  const preferenceLine = input.preferences.trim()
    ? `Likes: ${input.preferences.trim()}.`
    : "Likes were not specified.";
  const dislikesLine = input.dislikes.trim()
    ? `Avoid or reduce: ${input.dislikes.trim()}.`
    : "No dislikes were shared.";
  const allergyLine = input.allergies.trim()
    ? `Allergy alert: ${input.allergies.trim()}.`
    : "No allergies were shared.";
  return [
    `Lunchbox brief for age ${input.childAge.trim() || "not shared"}: ${goals}.`,
    preferenceLine,
    dislikesLine,
    allergyLine,
    input.schoolTiming.trim() ? `Timing: ${input.schoolTiming.trim()}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}

function cleanProfileText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeRole(value: unknown, fallback: AppRole): AppRole {
  return value === "chef" || value === "both" || value === "customer" ? value : fallback;
}

function fallbackNameFromEmail(email?: string) {
  const fromEmail =
    email
      ?.split("@")[0]
      ?.replace(/[._-]+/g, " ")
      .trim() || "";
  return fromEmail.length >= 2 ? titleCase(fromEmail) : "Soru member";
}

export async function upsertProfile(input: ProfileInput) {
  return db.from<Profile>("profiles").upsert(
    {
      user_id: input.userId,
      full_name: input.fullName.trim(),
      phone: input.phone ? normalizePhone(input.phone) || null : null,
      city: input.city?.trim() || null,
      default_role: input.defaultRole,
    },
    { onConflict: "user_id" },
  );
}

export async function ensureProfileForUser(user: User, fallbackRole: AppRole) {
  const existing = await db
    .from<Profile>("profiles")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing.error || existing.data) return existing;

  const metadata = user.user_metadata || {};
  const fullName =
    cleanProfileText(metadata.full_name) ||
    cleanProfileText(metadata.name) ||
    fallbackNameFromEmail(user.email);

  const profile: Profile = {
    user_id: user.id,
    full_name: fullName.length >= 2 ? fullName : "Soru member",
    phone: cleanProfileText(metadata.phone) || null,
    city: cleanProfileText(metadata.city) || null,
    default_role: normalizeRole(metadata.default_role, fallbackRole),
  };

  const saved = await upsertProfile({
    userId: profile.user_id,
    fullName: profile.full_name,
    phone: profile.phone || undefined,
    city: profile.city || undefined,
    defaultRole: profile.default_role,
  });

  return saved.error ? { data: null, error: saved.error } : { data: profile, error: null };
}
