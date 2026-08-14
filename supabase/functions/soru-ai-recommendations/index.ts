import { createClient } from "npm:@supabase/supabase-js@2";

type RecommendationKind = "meal_plan" | "lunchbox";

type AiPayload = {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
};

type SoruTrainingContext = {
  profile: Record<string, unknown> | null;
  recent_meal_plan_requests: Array<Record<string, unknown>>;
  recent_lunchbox_requests: Array<Record<string, unknown>>;
  available_menu_items: Array<Record<string, unknown>>;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const recommendationSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "summary",
    "safety_note",
    "daily_targets",
    "meal_recommendations",
    "chef_instructions",
    "avoid_or_watch",
    "next_steps",
  ],
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    safety_note: { type: "string" },
    daily_targets: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    meal_recommendations: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["meal", "recommendation", "why_it_fits", "chef_note"],
        properties: {
          meal: { type: "string" },
          recommendation: { type: "string" },
          why_it_fits: { type: "string" },
          chef_note: { type: "string" },
        },
      },
    },
    chef_instructions: {
      type: "array",
      minItems: 3,
      maxItems: 6,
      items: { type: "string" },
    },
    avoid_or_watch: {
      type: "array",
      minItems: 2,
      maxItems: 6,
      items: { type: "string" },
    },
    next_steps: {
      type: "array",
      minItems: 2,
      maxItems: 5,
      items: { type: "string" },
    },
  },
};

function geminiCompatibleSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => geminiCompatibleSchema(item));
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([key]) => key !== "additionalProperties")
      .map(([key, nestedValue]) => [key, geminiCompatibleSchema(nestedValue)]),
  );
}

function env(name: string) {
  return Deno.env.get(name)?.trim() || "";
}

function sanitizeString(value: unknown, max = 700) {
  return String(value || "")
    .trim()
    .slice(0, max);
}

function sanitizeArray(value: unknown, maxItems = 12) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeString(item, 80))
    .filter(Boolean)
    .slice(0, maxItems);
}

function normalizePayload(kind: RecommendationKind, payload: Record<string, unknown>) {
  if (kind === "meal_plan") {
    return {
      goal: sanitizeString(payload.goal, 180),
      nutrition_focus: sanitizeArray(payload.nutrition_focus),
      diet_type: sanitizeString(payload.diet_type, 80),
      allergies: sanitizeString(payload.allergies, 260),
      meals_per_day: Number(payload.meals_per_day || 2),
      budget_range: sanitizeString(payload.budget_range, 80),
      city: sanitizeString(payload.city, 100),
      notes: sanitizeString(payload.notes, 500),
    };
  }

  return {
    child_age: sanitizeString(payload.child_age, 80),
    preferences: sanitizeString(payload.preferences, 300),
    dislikes: sanitizeString(payload.dislikes, 300),
    allergies: sanitizeString(payload.allergies, 260),
    health_goals: sanitizeArray(payload.health_goals),
    school_timing: sanitizeString(payload.school_timing, 140),
    budget_range: sanitizeString(payload.budget_range, 80),
    city: sanitizeString(payload.city, 100),
  };
}

function promptFor(kind: RecommendationKind, payload: Record<string, unknown>) {
  const framing =
    kind === "meal_plan"
      ? "Create a personalised everyday meal-plan recommendation for an Indian customer using Soru."
      : "Create a healthy, kid-friendly lunchbox recommendation for an Indian family using Soru.";

  return [
    framing,
    "",
    "Rules:",
    "- Do not diagnose, treat, or promise medical outcomes.",
    "- Respect allergies strictly; if allergies are listed, mention them in avoid_or_watch.",
    "- Keep advice practical for chef-made meals, home cooks, subscriptions, and Indian food habits.",
    "- Do not invent exact calories/macros unless the customer provided enough context.",
    "- Do not claim Soru has a matching chef available; write this as a recommendation brief.",
    "- Make the output warm, concise, premium, and useful for both customer and chef.",
    "",
    `Customer input JSON: ${JSON.stringify(payload)}`,
  ].join("\n");
}

const soruTrainingPrinciples = [
  "Soru is a chef-powered food services marketplace for India.",
  "Soru should recommend affordable, trusted, chef-made everyday meals.",
  "Soru supports verified skilled cooks, home chefs, homemakers, culinary students, professional cooks, and caterers.",
  "Soru must highlight personalized nutrition plans, student lunchboxes, family meals, subscriptions, flexible ordering, chef onboarding, and FSSAI/food-license guidance when relevant.",
  "Soru must never invent available chefs, prices, delivery guarantees, medical outcomes, or fake menu items.",
  "If real chef menu records are present, use them as grounding context. If none exist, produce a chef-ready recommendation brief only.",
];

function compactRow(row: Record<string, unknown>, keys: string[]) {
  return Object.fromEntries(
    keys
      .map((key) => [key, row[key]])
      .filter(([, value]) => {
        if (Array.isArray(value)) return value.length > 0;
        return value !== null && value !== undefined && String(value).trim() !== "";
      }),
  );
}

async function safeSelect<T>(
  query: PromiseLike<{ data: T[] | T | null; error: { message: string } | null }>,
) {
  const { data, error } = await query;
  if (error) {
    console.error("Training-context read skipped", error.message);
    return null;
  }
  return data;
}

async function loadSoruTrainingContext(input: {
  supabase: ReturnType<typeof createClient>;
  userId: string;
}) {
  const [profile, mealPlans, lunchboxes, menuItems] = await Promise.all([
    safeSelect<Record<string, unknown>>(
      input.supabase
        .from("profiles")
        .select("full_name,city,default_role")
        .eq("user_id", input.userId)
        .maybeSingle(),
    ),
    safeSelect<Record<string, unknown>[]>(
      input.supabase
        .from("meal_plan_requests")
        .select("goal,nutrition_focus,diet_type,allergies,meals_per_day,budget_range,city,notes,created_at")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safeSelect<Record<string, unknown>[]>(
      input.supabase
        .from("lunchbox_requests")
        .select("child_age,preferences,dislikes,allergies,health_goals,school_timing,budget_range,city,created_at")
        .eq("user_id", input.userId)
        .order("created_at", { ascending: false })
        .limit(3),
    ),
    safeSelect<Record<string, unknown>[]>(
      input.supabase
        .from("chef_menu_items")
        .select("name,description,category,price_inr,meal_type,dietary_tags,allergens,available_days")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12),
    ),
  ]);

  return {
    profile: profile ? compactRow(profile, ["city", "default_role"]) : null,
    recent_meal_plan_requests: (Array.isArray(mealPlans) ? mealPlans : []).map((row) =>
      compactRow(row, [
        "goal",
        "nutrition_focus",
        "diet_type",
        "allergies",
        "meals_per_day",
        "budget_range",
        "city",
        "notes",
      ]),
    ),
    recent_lunchbox_requests: (Array.isArray(lunchboxes) ? lunchboxes : []).map((row) =>
      compactRow(row, [
        "child_age",
        "preferences",
        "dislikes",
        "allergies",
        "health_goals",
        "school_timing",
        "budget_range",
        "city",
      ]),
    ),
    available_menu_items: (Array.isArray(menuItems) ? menuItems : []).map((row) =>
      compactRow(row, [
        "name",
        "description",
        "category",
        "price_inr",
        "meal_type",
        "dietary_tags",
        "allergens",
        "available_days",
      ]),
    ),
  } satisfies SoruTrainingContext;
}

function buildLangChainRecommendationSchema(z: {
  object: (shape: Record<string, unknown>) => unknown;
  string: () => {
    describe: (text: string) => unknown;
  };
  array: (schema: unknown) => {
    min: (count: number) => { max: (count: number) => { describe: (text: string) => unknown } };
  };
}) {
  const shortText = z.string();
  return z.object({
    title: shortText.describe("A short premium title for the recommendation."),
    summary: shortText.describe("A concise customer-facing summary."),
    safety_note: shortText.describe("A non-medical safety note, including allergy caution."),
    daily_targets: z
      .array(shortText)
      .min(3)
      .max(6)
      .describe("Practical daily food targets, without invented medical claims."),
    meal_recommendations: z
      .array(
        z.object({
          meal: shortText.describe("Meal slot, such as breakfast, lunch, dinner, snack, or lunchbox."),
          recommendation: shortText.describe("Chef-ready meal recommendation."),
          why_it_fits: shortText.describe("Why this fits the customer's goals and constraints."),
          chef_note: shortText.describe("Instruction a Soru chef or home cook can follow."),
        }),
      )
      .min(3)
      .max(6)
      .describe("Three to six practical meal recommendations."),
    chef_instructions: z
      .array(shortText)
      .min(3)
      .max(6)
      .describe("Instructions for chefs preparing this plan."),
    avoid_or_watch: z
      .array(shortText)
      .min(2)
      .max(6)
      .describe("Allergies, ingredients, or preparation choices to avoid or watch."),
    next_steps: z
      .array(shortText)
      .min(2)
      .max(5)
      .describe("Next actions for the customer or Soru team."),
  });
}

function langChainPromptFor(input: {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
  trainingContext: SoruTrainingContext;
}) {
  return [
    input.kind === "meal_plan"
      ? "Generate a personalized Soru meal-plan recommendation."
      : "Generate a Soru kids lunchbox recommendation.",
    "",
    "Use this as Soru's training/grounding context:",
    JSON.stringify(
      {
        soru_principles: soruTrainingPrinciples,
        user_request: input.payload,
        user_history: {
          profile: input.trainingContext.profile,
          recent_meal_plan_requests: input.trainingContext.recent_meal_plan_requests,
          recent_lunchbox_requests: input.trainingContext.recent_lunchbox_requests,
        },
        live_menu_context: input.trainingContext.available_menu_items,
      },
      null,
      2,
    ),
    "",
    "Recommendation rules:",
    "- Use the user's current request as the highest-priority signal.",
    "- Use user history only to personalize; do not expose private history directly.",
    "- Use live_menu_context only if it contains real records. If it is empty, do not invent menu items or chef availability.",
    "- Respect allergies strictly.",
    "- Keep language concise, premium, warm, and practical for Indian chef-made meals.",
    "- Mention when a chef, nutrition expert, or doctor should review the request for allergies, pregnancy, medical conditions, or clinical nutrition needs.",
    "- Return only structured data matching the schema.",
  ].join("\n");
}

function extractOutputText(result: Record<string, unknown>) {
  if (typeof result.output_text === "string") return result.output_text;
  const output = Array.isArray(result.output) ? result.output : [];
  for (const item of output) {
    const content =
      typeof item === "object" && item ? (item as Record<string, unknown>).content : [];
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        typeof part === "object" &&
        part &&
        typeof (part as Record<string, unknown>).text === "string"
      ) {
        return String((part as Record<string, unknown>).text);
      }
    }
  }
  return "";
}

function extractGeminiText(result: Record<string, unknown>) {
  const candidates = Array.isArray(result.candidates) ? result.candidates : [];
  for (const candidate of candidates) {
    const content =
      typeof candidate === "object" && candidate
        ? (candidate as Record<string, unknown>).content
        : null;
    const parts =
      typeof content === "object" &&
      content &&
      Array.isArray((content as Record<string, unknown>).parts)
        ? ((content as Record<string, unknown>).parts as unknown[])
        : [];
    for (const part of parts) {
      if (
        typeof part === "object" &&
        part &&
        typeof (part as Record<string, unknown>).text === "string"
      ) {
        return String((part as Record<string, unknown>).text);
      }
    }
  }
  return "";
}

async function generateWithGemini(input: {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
  apiKey: string;
  model: string;
}) {
  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${input.model}:generateContent?key=${input.apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [
              {
                text: "You are Soru's nutrition-aware food recommendation assistant. Give practical chef-ready food recommendations, not medical advice.",
              },
            ],
          },
          contents: [
            {
              role: "user",
              parts: [{ text: promptFor(input.kind, input.payload) }],
            },
          ],
          generationConfig: {
            temperature: 0.45,
            responseMimeType: "application/json",
            responseSchema: geminiCompatibleSchema(recommendationSchema),
          },
        }),
      },
    );
  } catch (error) {
    console.error("Gemini network error", error);
    throw new Error("gemini_unavailable");
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error("Gemini request failed", {
      status: response.status,
      kind: input.kind,
      detail,
    });
    throw new Error("gemini_unavailable");
  }

  const result = await response.json();
  const outputText = extractGeminiText(result);
  if (!outputText) throw new Error("gemini_empty_response");

  return {
    recommendation: JSON.parse(outputText),
    model: input.model,
    provider: "gemini",
    generated_at: new Date().toISOString(),
  };
}

async function generateWithLangChainGemini(input: {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
  apiKey: string;
  model: string;
  trainingContext: SoruTrainingContext;
}) {
  let ChatGoogle: new (options: Record<string, unknown>) => {
    withStructuredOutput: (schema: unknown) => {
      invoke: (messages: Array<[string, string]>) => Promise<Record<string, unknown>>;
    };
  };
  let z: Parameters<typeof buildLangChainRecommendationSchema>[0];

  try {
    ({ ChatGoogle } = await import("npm:@langchain/google@0.2.1"));
    ({ z } = await import("npm:zod@3.25.76"));
  } catch (error) {
    console.error("LangChain import failed", error);
    throw new Error("langchain_unavailable");
  }

  try {
    const llm = new ChatGoogle({
      apiKey: input.apiKey,
      model: input.model,
      temperature: 0.35,
      maxRetries: 1,
    });
    const structuredModel = llm.withStructuredOutput(buildLangChainRecommendationSchema(z));

    const recommendation = await structuredModel.invoke([
      [
        "system",
        "You are Soru's nutrition-aware AI meal planning engine. You create safe, practical, chef-ready food recommendations for India. You are not a doctor and must not provide medical diagnosis or treatment.",
      ],
      [
        "human",
        langChainPromptFor({
          kind: input.kind,
          payload: input.payload,
          trainingContext: input.trainingContext,
        }),
      ],
    ]);

    return {
      recommendation,
      model: input.model,
      provider: "langchain-gemini",
      generated_at: new Date().toISOString(),
      training_context: {
        recent_meal_plan_requests: input.trainingContext.recent_meal_plan_requests.length,
        recent_lunchbox_requests: input.trainingContext.recent_lunchbox_requests.length,
        live_menu_items: input.trainingContext.available_menu_items.length,
      },
    };
  } catch (error) {
    console.error("LangChain Gemini request failed", {
      model: input.model,
      kind: input.kind,
      error,
    });
    throw new Error("langchain_gemini_unavailable");
  }
}

async function generateWithOpenAI(input: {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
  apiKey: string;
  model: string;
}) {
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: input.model,
        input: [
          {
            role: "system",
            content:
              "You are Soru's nutrition-aware food recommendation assistant. Give practical chef-ready food recommendations, not medical advice.",
          },
          {
            role: "user",
            content: promptFor(input.kind, input.payload),
          },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "soru_food_recommendation",
            strict: true,
            schema: recommendationSchema,
          },
        },
      }),
    });
  } catch (error) {
    console.error("OpenAI network error", error);
    throw new Error("openai_unavailable");
  }

  if (!response.ok) {
    const detail = await response.text();
    console.error("OpenAI request failed", {
      status: response.status,
      kind: input.kind,
      detail,
    });
    throw new Error("openai_unavailable");
  }

  const result = await response.json();
  const outputText = extractOutputText(result);
  if (!outputText) throw new Error("openai_empty_response");

  return {
    recommendation: JSON.parse(outputText),
    model: input.model,
    provider: "openai",
    generated_at: new Date().toISOString(),
  };
}

async function generateWithGeminiFallback(input: {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
  apiKey: string;
}) {
  const configuredModel = env("GEMINI_MODEL");
  const models = configuredModel
    ? [configuredModel]
    : ["gemini-flash-latest", "gemini-flash-lite-latest", "gemini-2.0-flash-lite"];

  let lastError: unknown;
  for (const model of models) {
    try {
      return await generateWithGemini({
        kind: input.kind,
        payload: input.payload,
        apiKey: input.apiKey,
        model,
      });
    } catch (error) {
      lastError = error;
      console.error("Gemini model attempt failed", { model, kind: input.kind, error });
    }
  }

  throw lastError instanceof Error ? lastError : new Error("gemini_unavailable");
}

async function generateWithLangChainGeminiFallback(input: {
  kind: RecommendationKind;
  payload: Record<string, unknown>;
  apiKey: string;
  trainingContext: SoruTrainingContext;
}) {
  const configuredModel = env("LANGCHAIN_GEMINI_MODEL") || env("GEMINI_MODEL");
  const models = configuredModel
    ? [configuredModel]
    : ["gemini-2.5-flash", "gemini-flash-latest", "gemini-flash-lite-latest"];

  let lastError: unknown;
  for (const model of models) {
    try {
      return await generateWithLangChainGemini({
        kind: input.kind,
        payload: input.payload,
        apiKey: input.apiKey,
        model,
        trainingContext: input.trainingContext,
      });
    } catch (error) {
      lastError = error;
      console.error("LangChain model attempt failed", { model, kind: input.kind, error });
    }
  }

  throw lastError instanceof Error ? lastError : new Error("langchain_gemini_unavailable");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405, headers: corsHeaders });
  }

  const authorization = request.headers.get("authorization") || "";
  if (!authorization.toLowerCase().startsWith("bearer ")) {
    return Response.json(
      { error: "Please sign in to use AI recommendations." },
      { status: 401, headers: corsHeaders },
    );
  }

  const supabaseUrl = env("SUPABASE_URL");
  const anonKey = env("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !anonKey) {
    return Response.json(
      { error: "Supabase auth is not available." },
      { status: 500, headers: corsHeaders },
    );
  }

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return Response.json(
      { error: "Please sign in to use AI recommendations." },
      { status: 401, headers: corsHeaders },
    );
  }

  let body: AiPayload;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400, headers: corsHeaders });
  }

  if (body.kind !== "meal_plan" && body.kind !== "lunchbox") {
    return Response.json(
      { error: "Unknown recommendation type." },
      { status: 400, headers: corsHeaders },
    );
  }

  const payload = normalizePayload(body.kind, body.payload || {});
  const geminiApiKey = env("GEMINI_API_KEY");
  const openAiApiKey = env("OPENAI_API_KEY");

  if (!geminiApiKey && !openAiApiKey) {
    return Response.json(
      {
        error:
          "AI recommendations are not connected yet. Add GEMINI_API_KEY or OPENAI_API_KEY in Supabase secrets.",
      },
      { status: 503, headers: corsHeaders },
    );
  }

  try {
    if (geminiApiKey) {
      const trainingContext = await loadSoruTrainingContext({
        supabase,
        userId: userData.user.id,
      });

      try {
        return Response.json(
          await generateWithLangChainGeminiFallback({
            kind: body.kind,
            payload,
            apiKey: geminiApiKey,
            trainingContext,
          }),
          { headers: corsHeaders },
        );
      } catch (langChainError) {
        console.error("LangChain unavailable, falling back to direct Gemini", {
          kind: body.kind,
          error: langChainError,
        });
      }

      return Response.json(
        {
          ...(await generateWithGeminiFallback({
            kind: body.kind,
            payload,
            apiKey: geminiApiKey,
          })),
          training_context: {
            fallback: "direct-gemini",
            recent_meal_plan_requests: trainingContext.recent_meal_plan_requests.length,
            recent_lunchbox_requests: trainingContext.recent_lunchbox_requests.length,
            live_menu_items: trainingContext.available_menu_items.length,
          },
        },
        { headers: corsHeaders },
      );
    }

    return Response.json(
      await generateWithOpenAI({
        kind: body.kind,
        payload,
        apiKey: openAiApiKey,
        model: env("OPENAI_MODEL") || "gpt-4o-mini",
      }),
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("AI recommendation failed", {
      provider: geminiApiKey ? "gemini" : "openai",
      kind: body.kind,
      error,
    });
  }

  return Response.json(
    {
      error:
        "AI recommendations are temporarily unavailable. Soru saved requests can still be reviewed by the team.",
    },
    { status: 503, headers: corsHeaders },
  );
});

/* c8 ignore start */
export const __soruAiRecommendationInternals = {
  normalizePayload,
  promptFor,
  langChainPromptFor,
  soruTrainingPrinciples,
};
/* c8 ignore stop */
