import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { submitPublicLead } from "@/lib/leads";
import { isValidPhoneNumber } from "@/lib/validation";

export const Route = createFileRoute("/enroll")({
  head: () => ({
    meta: [
      { title: "Join Soru — Customer Enrollment" },
      { name: "description", content: "Sign up for healthy chef-made meals delivered to you." },
    ],
  }),
  component: EnrollPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .refine(isValidPhoneNumber, "Please enter a real mobile number, not a placeholder."),
  email: z.string().trim().email("Valid email required").max(255),
  preferred_service: z.string().min(1, "Please select a service"),
  comments: z.string().trim().max(1500, "Please keep your note under 1,500 characters").optional(),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please agree to Soru’s Privacy Policy before submitting." }),
  }),
});

const services = [
  "Daily Meals",
  "Weekly Lunchbox Subscription",
  "Monthly Meal Plan",
  "Student Lunchbox",
  "Family Meals",
  "Personalized Diet Plan",
];

function EnrollPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    preferred_service: "",
    comments: "",
    consent: false,
  });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setLoading(true);
    let saveError = "";
    try {
      await submitPublicLead({
        full_name: parsed.data.name,
        phone: parsed.data.phone,
        email: parsed.data.email,
        role: "customer",
        source: "customer_enrollment",
        preferred_service: parsed.data.preferred_service,
        notes: parsed.data.comments || null,
        consent: parsed.data.consent,
      });
    } catch (error) {
      saveError = error instanceof Error ? error.message : "Could not submit.";
    }
    setLoading(false);
    if (saveError) {
      toast.error(saveError);
      return;
    }
    setDone(true);
    toast.success("You're in! We'll be in touch soon.");
    setForm({
      name: "",
      phone: "",
      email: "",
      preferred_service: "",
      comments: "",
      consent: false,
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" aria-label="Soru home">
            <BrandLogo />
          </Link>
          <Link to="/join-as-chef" className="text-sm text-muted-foreground hover:text-foreground">
            Are you a chef? →
          </Link>
        </div>
      </header>

      <main className="container-x py-16 md:py-24">
        <div className="mx-auto max-w-xl">
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Join as a customer
          </h1>
          <p className="mt-3 text-muted-foreground">
            Tell us about you and we'll match you with the right chef and meal plan.
          </p>

          {done ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
              <div className="text-4xl">🎉</div>
              <h2 className="mt-3 text-xl font-semibold">Thanks for signing up!</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Our team will reach out to you on the details you provided.
              </p>
              <button
                onClick={() => setDone(false)}
                className="mt-6 text-sm font-medium text-primary hover:underline"
              >
                Submit another response
              </button>
            </div>
          ) : (
            <form
              onSubmit={onSubmit}
              className="mt-10 space-y-5 rounded-2xl border border-border bg-card p-6 md:p-8"
            >
              <Field label="Full name">
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="input"
                  placeholder="Your name"
                />
              </Field>
              <Field label="Phone number">
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="input"
                  placeholder="+91 98765 43210"
                />
              </Field>
              <Field label="Email address">
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="input"
                  placeholder="you@email.com"
                />
              </Field>
              <Field label="Preferred service">
                <select
                  required
                  value={form.preferred_service}
                  onChange={(e) => setForm({ ...form, preferred_service: e.target.value })}
                  className="input"
                >
                  <option value="">Select a service…</option>
                  {services.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="What do you need from Soru? (optional)">
                <textarea
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  className="input min-h-28 resize-y"
                  maxLength={1500}
                  placeholder="Share your food goals, dietary needs, delivery preferences, or anything you'd like us to build."
                />
              </Field>
              <ConsentBox
                checked={form.consent}
                onChange={(checked) => setForm({ ...form, consent: checked })}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Submitting…" : "Submit enrollment"}
              </button>
            </form>
          )}
        </div>
      </main>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--background);
          padding: 0.7rem 0.9rem;
          font-size: 0.95rem;
          color: var(--foreground);
          outline: none;
          transition: border-color .15s ease, box-shadow .15s ease;
        }
        .input:focus { border-color: var(--primary); box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent); }
      `}</style>
    </div>
  );
}

function ConsentBox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
      <input
        required
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 size-4"
      />
      <span>
        I agree to Soru’s{" "}
        <Link to="/privacy" className="font-semibold text-foreground underline">
          Privacy Policy
        </Link>{" "}
        and consent to being contacted regarding the pilot.
      </span>
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
