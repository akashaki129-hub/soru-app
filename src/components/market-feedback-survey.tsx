import { useEffect, useMemo, useState } from "react";
import { track } from "@vercel/analytics/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChefHat,
  MessageCircle,
  Sparkles,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getPhoneValidationError, normalizePhone } from "@/lib/validation";

const DISMISSED_KEY = "soru_market_feedback_dismissed_at_v1";
const SUBMITTED_KEY = "soru_market_feedback_submitted_v1";
const SUBMISSION_ID_KEY = "soru_market_feedback_submission_id_v1";
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

type Audience = "" | "customer" | "home_cook" | "professional_chef" | "culinary_student" | "both";

const AUDIENCES: Array<{ value: Exclude<Audience, "">; label: string; icon: typeof Users }> = [
  { value: "customer", label: "Customer", icon: Users },
  { value: "home_cook", label: "Home cook or homemaker", icon: ChefHat },
  { value: "professional_chef", label: "Professional chef or caterer", icon: ChefHat },
  { value: "culinary_student", label: "Culinary student", icon: ChefHat },
  { value: "both", label: "Both customer and cook", icon: Sparkles },
];

const STATEMENTS = [
  {
    value: "monthly_plan",
    label: "I’m ready to try a monthly meal plan.",
    group: "customer",
  },
  {
    value: "direct_from_chefs",
    label: "I’m excited to eat food directly from talented local chefs.",
    group: "universal",
  },
  {
    value: "refer_a_cook",
    label: "I know a great cook—like a friend’s mom—who would love Soru.",
    group: "universal",
  },
  {
    value: "earn_from_cooking",
    label: "I want a place to show my cooking skills while I earn.",
    group: "chef",
  },
  {
    value: "personalized_nutrition",
    label: "Personalized nutrition plans would help me eat better.",
    group: "customer",
  },
  {
    value: "routine_meals",
    label: "Affordable student, office, or family meals would make my routine easier.",
    group: "customer",
  },
] as const;

const ORDER_FREQUENCIES = [
  { value: "1_2_weekly", label: "1–2 meals a week" },
  { value: "3_5_weekly", label: "3–5 meals a week" },
  { value: "6_plus_weekly", label: "6+ meals a week" },
] as const;

const BUDGETS = [
  { value: "2999_3999", label: "₹2,999–₹3,999" },
  { value: "4000_5999", label: "₹4,000–₹5,999" },
  { value: "6000_plus", label: "₹6,000+" },
  { value: "unsure", label: "Not sure yet" },
] as const;

const CHEF_TIMELINES = [
  { value: "ready_now", label: "Ready now" },
  { value: "1_3_months", label: "Within 1–3 months" },
  { value: "exploring", label: "Exploring for later" },
] as const;

const CHEF_SUPPORT = [
  { value: "customers_orders", label: "Finding customers & orders" },
  { value: "food_license", label: "FSSAI & food licensing" },
  { value: "menu_pricing", label: "Menu design & pricing" },
  { value: "subscriptions", label: "Building subscriptions" },
  { value: "kitchen_verification", label: "Kitchen verification" },
  { value: "delivery", label: "Delivery support" },
] as const;

function analytics(name: string, properties?: Record<string, string | number | boolean>) {
  try {
    track(name, properties);
  } catch {
    // Feedback collection must continue even when analytics is unavailable locally.
  }
}

function createSubmissionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

export function MarketFeedbackSurvey() {
  const [eligible, setEligible] = useState(false);
  const [open, setOpen] = useState(false);
  const [showTab, setShowTab] = useState(false);
  const [step, setStep] = useState(1);
  const [audience, setAudience] = useState<Audience>("");
  const [statements, setStatements] = useState<string[]>([]);
  const [orderFrequency, setOrderFrequency] = useState("");
  const [budget, setBudget] = useState("");
  const [chefTimeline, setChefTimeline] = useState("");
  const [chefSupport, setChefSupport] = useState<string[]>([]);
  const [city, setCity] = useState("Bengaluru");
  const [fullName, setFullName] = useState("");
  const [contact, setContact] = useState("");
  const [comments, setComments] = useState("");
  const [submissionId, setSubmissionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState("");

  const customerAudience = audience === "customer" || audience === "both";
  const chefAudience = Boolean(audience) && audience !== "customer";

  const availableStatements = useMemo(
    () =>
      STATEMENTS.filter(
        (statement) =>
          statement.group === "universal" ||
          (statement.group === "customer" && customerAudience) ||
          (statement.group === "chef" && chefAudience),
      ),
    [chefAudience, customerAudience],
  );

  useEffect(() => {
    if (localStorage.getItem(SUBMITTED_KEY)) return;

    setEligible(true);
    let id = localStorage.getItem(SUBMISSION_ID_KEY);
    if (!id) {
      id = createSubmissionId();
      localStorage.setItem(SUBMISSION_ID_KEY, id);
    }
    setSubmissionId(id);

    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < THIRTY_DAYS) {
      setShowTab(true);
      return;
    }

    const timer = window.setTimeout(() => {
      setOpen(true);
      analytics("feedback_survey_opened", { trigger: "automatic" });
    }, 12_000);
    return () => window.clearTimeout(timer);
  }, []);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen && !completed) {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
      setShowTab(true);
      analytics("feedback_survey_dismissed", { step });
    }
  }

  function openManually() {
    setShowTab(false);
    setOpen(true);
    analytics("feedback_survey_opened", { trigger: "manual" });
  }

  function chooseAudience(value: Exclude<Audience, "">) {
    setAudience(value);
    setStatements([]);
    setError("");
  }

  function toggleStatement(value: string) {
    setStatements((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
    setError("");
  }

  function toggleSupport(value: string) {
    setChefSupport((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
    setError("");
  }

  function continueSurvey() {
    if (step === 1 && !audience) {
      setError("Choose the option that best describes you.");
      return;
    }
    if (step === 2 && statements.length === 0) {
      setError("Choose at least one statement that feels true.");
      return;
    }
    setError("");
    setStep((current) => Math.min(3, current + 1));
  }

  async function submitSurvey() {
    if (customerAudience && (!orderFrequency || !budget)) {
      setError("Tell us how often you would order and the monthly range that feels right.");
      return;
    }
    if (chefAudience && (!chefTimeline || chefSupport.length === 0)) {
      setError("Tell us when you may start and choose at least one kind of support.");
      return;
    }
    if (!city) {
      setError("Choose your city.");
      return;
    }
    if (fullName.trim().length < 2) {
      setError("Enter your full name so we can identify your response.");
      return;
    }
    const phoneError = getPhoneValidationError(contact);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    setLoading(true);
    setError("");
    const { error: saveError } = await supabase.from("market_research_responses").insert({
      client_submission_id: submissionId || createSubmissionId(),
      audience,
      statements,
      customer_order_frequency: customerAudience ? orderFrequency : null,
      customer_monthly_budget: customerAudience ? budget : null,
      chef_start_timeline: chefAudience ? chefTimeline : null,
      chef_support_needs: chefAudience ? chefSupport : [],
      city,
      full_name: fullName.trim(),
      contact: normalizePhone(contact),
      comments: comments.trim() || null,
      source: "homepage_feedback_popup",
    });
    setLoading(false);

    if (saveError && saveError.code !== "23505") {
      console.error("Market feedback submission failed", saveError);
      setError("We couldn’t save your feedback. Please try again.");
      return;
    }

    localStorage.setItem(SUBMITTED_KEY, "true");
    localStorage.removeItem(DISMISSED_KEY);
    setShowTab(false);
    setCompleted(true);
    analytics("feedback_survey_submitted", { audience, city });
  }

  function finish() {
    setOpen(false);
    setEligible(false);
  }

  if (!eligible) return null;

  return (
    <>
      {showTab && !completed && (
        <button
          type="button"
          onClick={openManually}
          className="fixed bottom-5 right-0 z-40 inline-flex items-center gap-2 rounded-l-full border border-r-0 border-border bg-white px-4 py-3 text-sm font-semibold text-foreground shadow-xl transition hover:-translate-x-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        >
          <MessageCircle className="size-4 text-primary" /> Share your view
        </button>
      )}

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bottom-0 left-0 top-auto max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-[2rem] border-border bg-[color:var(--paper)] p-0 shadow-2xl sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[2rem]">
          {completed ? (
            <div className="grid min-h-[420px] place-items-center p-8 text-center md:p-12">
              <div>
                <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-7" />
                </span>
                <DialogTitle className="mt-6 font-display text-4xl font-medium">
                  Thank you for shaping Soru.
                </DialogTitle>
                <DialogDescription className="mx-auto mt-3 max-w-md text-base leading-7">
                  Your response becomes real evidence for the meals, tools, and opportunities people
                  genuinely want.
                </DialogDescription>
                <button
                  type="button"
                  onClick={finish}
                  className="mt-8 rounded-full bg-primary px-7 py-3 text-sm font-semibold text-primary-foreground"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="border-b border-border bg-white/65 px-6 py-5 pr-14 md:px-8">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-primary">
                  <Sparkles className="size-4" /> Help shape Soru
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2" aria-label={`Step ${step} of 3`}>
                  {[1, 2, 3].map((item) => (
                    <span
                      key={item}
                      className={`h-1.5 rounded-full ${item <= step ? "bg-primary" : "bg-border"}`}
                    />
                  ))}
                </div>
              </div>

              <div className="p-6 md:p-8">
                {step === 1 && (
                  <SurveyStep
                    title="Who are you?"
                    description="Choose the option that best reflects how you would use Soru."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      {AUDIENCES.map(({ value, label, icon: Icon }) => (
                        <label
                          key={value}
                          className={`flex cursor-pointer items-center gap-3 rounded-2xl border p-4 transition ${audience === value ? "border-primary bg-primary/8 shadow-sm" : "border-border bg-white hover:border-primary/40"}`}
                        >
                          <input
                            type="radio"
                            name="feedback-audience"
                            value={value}
                            checked={audience === value}
                            onChange={() => chooseAudience(value)}
                            className="sr-only"
                          />
                          <span
                            className={`grid size-10 shrink-0 place-items-center rounded-xl ${audience === value ? "bg-primary text-primary-foreground" : "bg-secondary text-primary"}`}
                          >
                            <Icon className="size-5" />
                          </span>
                          <span className="text-sm font-semibold">{label}</span>
                        </label>
                      ))}
                    </div>
                  </SurveyStep>
                )}

                {step === 2 && (
                  <SurveyStep
                    title="What feels true to you?"
                    description="Choose every statement you genuinely agree with."
                  >
                    <div className="grid gap-3">
                      {availableStatements.map(({ value, label }) => {
                        const checked = statements.includes(value);
                        return (
                          <label
                            key={value}
                            className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition ${checked ? "border-primary bg-primary/8" : "border-border bg-white hover:border-primary/40"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleStatement(value)}
                              className="sr-only"
                            />
                            <span
                              className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-md border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                            >
                              {checked && <Check className="size-3.5" />}
                            </span>
                            <span className="text-sm font-medium leading-6">{label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </SurveyStep>
                )}

                {step === 3 && (
                  <SurveyStep
                    title="A little more about what you need"
                    description="These answers help Soru build the right plans and chef support."
                  >
                    <div className="space-y-6">
                      {customerAudience && (
                        <div className="rounded-2xl border border-border bg-white p-4 md:p-5">
                          <Question label="How often would you order a Soru meal?">
                            <ChoiceGrid
                              name="order-frequency"
                              options={ORDER_FREQUENCIES}
                              value={orderFrequency}
                              onChange={setOrderFrequency}
                            />
                          </Question>
                          <Question
                            label="What monthly weekday-meal budget feels reasonable?"
                            className="mt-5"
                          >
                            <ChoiceGrid
                              name="monthly-budget"
                              options={BUDGETS}
                              value={budget}
                              onChange={setBudget}
                            />
                          </Question>
                        </div>
                      )}

                      {chefAudience && (
                        <div className="rounded-2xl border border-border bg-white p-4 md:p-5">
                          <Question label="When might you be ready to start selling?">
                            <ChoiceGrid
                              name="chef-timeline"
                              options={CHEF_TIMELINES}
                              value={chefTimeline}
                              onChange={setChefTimeline}
                            />
                          </Question>
                          <Question label="What support would help you most?" className="mt-5">
                            <div className="grid gap-2 sm:grid-cols-2">
                              {CHEF_SUPPORT.map(({ value, label }) => {
                                const checked = chefSupport.includes(value);
                                return (
                                  <label
                                    key={value}
                                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${checked ? "border-primary bg-primary/8 text-foreground" : "border-border text-muted-foreground hover:border-primary/40"}`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => toggleSupport(value)}
                                      className="sr-only"
                                    />
                                    <span
                                      className={`grid size-4 shrink-0 place-items-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                                    >
                                      {checked && <Check className="size-3" />}
                                    </span>
                                    {label}
                                  </label>
                                );
                              })}
                            </div>
                          </Question>
                        </div>
                      )}

                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className="text-sm font-semibold">
                          Full name
                          <input
                            value={fullName}
                            onChange={(event) => setFullName(event.target.value)}
                            maxLength={100}
                            autoComplete="name"
                            required
                            placeholder="Your name"
                            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                          />
                        </label>
                        <label className="text-sm font-semibold">
                          Mobile number
                          <input
                            value={contact}
                            onChange={(event) => setContact(event.target.value)}
                            maxLength={25}
                            inputMode="tel"
                            autoComplete="tel"
                            required
                            placeholder="+91 98765 43210"
                            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                          />
                        </label>
                        <label className="text-sm font-semibold sm:col-span-2">
                          City
                          <select
                            value={city}
                            onChange={(event) => setCity(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-border bg-white px-4 py-3 text-sm font-normal outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                          >
                            {["Bengaluru", "Chennai", "Hyderabad", "Other"].map((item) => (
                              <option key={item}>{item}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                      <label className="block text-sm font-semibold">
                        Anything else Soru should know?{" "}
                        <span className="font-normal text-muted-foreground">(optional)</span>
                        <textarea
                          value={comments}
                          onChange={(event) => setComments(event.target.value)}
                          maxLength={1500}
                          rows={3}
                          placeholder="Tell us what would make Soru genuinely useful to you."
                          className="mt-2 w-full resize-none rounded-xl border border-border bg-white px-4 py-3 text-sm font-normal outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15"
                        />
                      </label>
                      <p className="text-xs leading-5 text-muted-foreground">
                        Your response stays private and is used in aggregate for product research.
                        By submitting, you agree that Soru may contact you for early access and
                        research follow-up.
                      </p>
                    </div>
                  </SurveyStep>
                )}

                {error && (
                  <p
                    role="alert"
                    className="mt-5 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}

                <div className="mt-7 flex items-center justify-between gap-3 border-t border-border pt-5">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        setError("");
                        setStep((current) => current - 1);
                      }}
                      className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                    >
                      <ArrowLeft className="size-4" /> Back
                    </button>
                  ) : (
                    <span />
                  )}
                  {step < 3 ? (
                    <button
                      type="button"
                      onClick={continueSurvey}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105"
                    >
                      Continue <ArrowRight className="size-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submitSurvey}
                      disabled={loading}
                      className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:cursor-wait disabled:opacity-60"
                    >
                      {loading ? "Saving…" : "Share my view"}{" "}
                      {!loading && <ArrowRight className="size-4" />}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SurveyStep({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <DialogTitle className="font-display text-3xl font-medium md:text-4xl">{title}</DialogTitle>
      <DialogDescription className="mt-2 text-sm leading-6 md:text-base">
        {description}
      </DialogDescription>
      <div className="mt-6">{children}</div>
    </div>
  );
}

function Question({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-semibold">{label}</legend>
      <div className="mt-3">{children}</div>
    </fieldset>
  );
}

function ChoiceGrid({
  name,
  options,
  value,
  onChange,
}: {
  name: string;
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <label
          key={option.value}
          className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-semibold transition ${value === option.value ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:border-primary/40"}`}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
