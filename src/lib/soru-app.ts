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

export type ChefInterestListing = {
  id: string;
  lead_id: string | null;
  full_name: string;
  kitchen_name: string | null;
  chef_role: string;
  city: string;
  area: string | null;
  bio: string | null;
  specialties: string[];
  cuisines: string[];
  signature_dish: string | null;
  sample_menu: string | null;
  expected_price_range: string | null;
  fssai_status: string;
  public_visible: boolean;
  status: string;
  created_at: string;
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

export function generateSoruSmartRecommendation(input: {
  kind: "meal_plan" | "lunchbox";
  payload: Record<string, unknown>;
}): AiRecommendation {
  if (input.kind === "lunchbox") return generateLunchboxSmartRecommendation(input.payload);
  return generateMealPlanSmartRecommendation(input.payload);
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

function generateMealPlanSmartRecommendation(payload: Record<string, unknown>): AiRecommendation {
  const goal = text(payload.goal) || "balanced everyday eating";
  const dietType = titleCase(text(payload.diet_type) || "flexible");
  const allergies = text(payload.allergies);
  const budget = text(payload.budget_range) || "budget to confirm";
  const city = text(payload.city) || "your city";
  const notes = text(payload.notes);
  const mealsPerDay = Number(payload.meals_per_day || 2);
  const focus = list(payload.nutrition_focus);
  const isVegan = /vegan/i.test(dietType);
  const isVegetarian = /vegetarian|jain|vegan/i.test(dietType);
  const highProtein = focus.some((item) => /protein/i.test(item)) || /protein|fitness/i.test(goal);
  const calorieAware =
    focus.some((item) => /calorie|weight/i.test(item)) || /weight|fat loss/i.test(goal);
  const lowOil = focus.some((item) => /low oil|heart/i.test(item));

  const proteinBase = isVegan
    ? "dal, chana, rajma, sprouts, tofu, soy chunks, peanuts, and sesame chutney"
    : isVegetarian
      ? "dal, paneer, curd, sprouts, chana, rajma, eggs if acceptable, and millet khichdi"
      : "eggs, chicken, fish, dal, curd, sprouts, and lean regional curries";
  const grainBase = calorieAware
    ? "controlled portions of millet, phulka, red rice, or vegetable-heavy poha"
    : "rice, millet, phulka, dosa, idli, and regional staples in steady portions";

  return {
    title: "Soru Smart Meal Plan",
    summary: [
      `Zero-cost Soru Smart Engine created a ${dietType.toLowerCase()} chef-ready plan for ${goal}.`,
      `Match with chefs in ${city} who can work around ${budget} and repeat meals consistently.`,
      notes ? `Customer note considered: ${notes}` : "No extra customer note was shared.",
    ].join(" "),
    safety_note:
      allergies.trim().length > 0
        ? `Allergy watch: avoid ${allergies}. Chef must confirm ingredients, oil, spice level, and cross-contact before accepting.`
        : "General food guidance only. Chef should confirm ingredients, portions, and any medical/diet restrictions before fulfilment.",
    daily_targets: [
      `${mealsPerDay} meal${mealsPerDay === 1 ? "" : "s"} per day with repeatable chef prep`,
      highProtein
        ? `Protein anchor from ${proteinBase}`
        : "One dal/legume/curd or equivalent protein anchor daily",
      calorieAware
        ? "Half plate vegetables, controlled grain portions, and minimal fried snacks"
        : "Balanced plate: vegetables, protein, staple, and curd/chutney",
      lowOil
        ? "Low-oil cooking, grilled/steamed options, and lighter gravies"
        : "Home-style cooking with spice and oil adjusted to preference",
    ],
    meal_recommendations: [
      {
        meal: "Breakfast",
        recommendation: isVegan
          ? "Moong dal chilla with chutney, vegetable upma, idli-sambar, or tofu bhurji millet wrap."
          : "Idli-sambar, paneer/egg bhurji with phulka, moong dal chilla, or vegetable poha with curd.",
        why_it_fits: "Starts the day with protein, fibre, and familiar Indian flavours.",
        chef_note: "Offer 2–3 rotating breakfast options and keep spice level selectable.",
      },
      {
        meal: "Lunch",
        recommendation: `Chef thali with ${grainBase}, seasonal sabzi, dal/legume/protein, salad, and curd or vegan substitute.`,
        why_it_fits: "Works well for office, student, family, and subscription routines.",
        chef_note: "Package as a repeatable weekday plan with portion guidance and allergy labels.",
      },
      {
        meal: "Dinner",
        recommendation: highProtein
          ? `Lighter high-protein bowl using ${proteinBase}, vegetables, and a small grain portion.`
          : "Comforting regional dinner such as khichdi, dosa-sambar, phulka-sabzi-dal, or soup plus millet bowl.",
        why_it_fits: "Keeps dinner practical, home-style, and easier to repeat.",
        chef_note: "Keep oil and spice moderate; add a weekly regional special for retention.",
      },
      {
        meal: "Snack",
        recommendation:
          "Roasted chana, fruit, sprouts chaat, makhana, curd bowl, or vegetable sandwich.",
        why_it_fits: "Reduces impulse restaurant snacking while staying affordable.",
        chef_note: "Bundle snacks as optional add-ons for monthly plans.",
      },
    ],
    chef_instructions: [
      "Confirm allergies before preparing the first meal.",
      "Offer a 3-day sample menu before monthly subscription confirmation.",
      "Mark every meal as vegetarian, vegan, high-protein, low-oil, or allergy-aware where relevant.",
      "Use Soru admin notes to match the customer with chefs who can repeat this plan consistently.",
    ],
    avoid_or_watch: [
      allergies || "Unshared allergies",
      "Very oily gravies for routine plans",
      "Overpromising medical outcomes",
      "Menus without portion clarity",
    ],
    next_steps: [
      "Share this brief with shortlisted chefs.",
      "Ask the customer to choose preferred cuisines and delivery timing.",
      "Start with a weekly trial before monthly billing.",
    ],
  };
}

function generateLunchboxSmartRecommendation(payload: Record<string, unknown>): AiRecommendation {
  const childAge = text(payload.child_age) || "school-age child";
  const preferences = text(payload.preferences);
  const dislikes = text(payload.dislikes);
  const allergies = text(payload.allergies);
  const timing = text(payload.school_timing);
  const budget = text(payload.budget_range) || "budget to confirm";
  const city = text(payload.city) || "your city";
  const goals = list(payload.health_goals);
  const highProtein = goals.some((item) => /protein/i.test(item));
  const vegetables = goals.some((item) => /vegetable/i.test(item));
  const lessFried = goals.some((item) => /fried/i.test(item));

  return {
    title: "Soru Smart Kids Lunchbox Plan",
    summary: [
      `Zero-cost Soru Smart Engine created a kid-friendly lunchbox brief for ${childAge} in ${city}.`,
      `Chef should keep it healthy, familiar, and repeatable within ${budget}.`,
      preferences ? `Likes considered: ${preferences}.` : "No favourite foods were shared.",
      dislikes ? `Reduce or avoid: ${dislikes}.` : "",
      timing ? `School timing considered: ${timing}.` : "",
    ]
      .filter(Boolean)
      .join(" "),
    safety_note:
      allergies.trim().length > 0
        ? `Allergy watch: avoid ${allergies}. Parent and chef must confirm ingredients and cross-contact risk.`
        : "General lunchbox guidance only. Parent and chef should confirm allergies, choking risks, spice tolerance, and school rules.",
    daily_targets: [
      "One familiar main, one protein/fibre side, one fruit or vegetable, and water-friendly packing",
      highProtein
        ? "Add paneer, egg, dal, chana, sprouts, tofu, curd, or peanut-free alternatives when suitable"
        : "Add a small protein side at least once per lunchbox",
      vegetables
        ? "Hide or pair vegetables inside dosa, paratha, rice, wraps, cutlets, or chutneys"
        : "Use vegetables in familiar forms rather than forcing unfamiliar dishes",
      lessFried
        ? "Prefer steamed, roasted, pan-seared, or lightly sautéed options"
        : "Limit fried treats to occasional planned days",
    ],
    meal_recommendations: [
      {
        meal: "Monday / Wednesday",
        recommendation: "Mini idli or dosa rolls with sambar dip, cucumber sticks, and fruit.",
        why_it_fits: "Familiar South Indian flavours pack well and can include vegetables.",
        chef_note: "Keep chutney thick, not watery; pack dips separately.",
      },
      {
        meal: "Tuesday / Thursday",
        recommendation:
          "Paneer/tofu/egg or dal paratha roll with mild veggie filling and curd or fruit.",
        why_it_fits: "Easy to eat quickly, customizable, and good for steady energy.",
        chef_note: "Use bite-size portions and mark allergens clearly.",
      },
      {
        meal: "Friday special",
        recommendation:
          "Healthy pasta, millet pulao, lemon rice with chana, or veg fried-rice style bowl with less oil.",
        why_it_fits: "Feels exciting for kids while staying healthier than restaurant food.",
        chef_note: "Keep one fun weekly item to improve acceptance.",
      },
      {
        meal: "Snack add-on",
        recommendation:
          "Makhana, fruit, homemade ladoo, sprouts chaat, or vegetable sandwich triangles.",
        why_it_fits: "Gives a predictable second break option without relying on packaged snacks.",
        chef_note: "Avoid nuts when allergies are unknown or school policy restricts them.",
      },
    ],
    chef_instructions: [
      "Prioritize food safety, spill-proof packing, and mild spice.",
      "Offer parent-approved weekly menu rotation before subscription starts.",
      "Make disliked ingredients invisible or optional, not forced.",
      "Label allergens and reheating/storage guidance clearly.",
    ],
    avoid_or_watch: [
      allergies || "Unshared allergies",
      "Watery gravies and messy sauces",
      "Very spicy foods",
      "Hard-to-chew items for younger children",
    ],
    next_steps: [
      "Send a 5-day sample lunchbox menu to the parent.",
      "Ask for school break timing and allowed foods.",
      "Start with a one-week trial and adjust based on what returns uneaten.",
    ],
  };
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function list(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
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
