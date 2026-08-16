import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { PILOT_CONSENT_VERSION } from "@/lib/attribution";
import { isValidPhoneNumber, normalizePhone } from "@/lib/validation";

export const Route = createFileRoute("/join-as-chef")({
  head: () => ({
    meta: [
      { title: "Become a Soru Chef — Chef Enrollment" },
      {
        name: "description",
        content: "Join Soru as a chef, homemaker, culinary student, or professional cook.",
      },
    ],
  }),
  component: ChefEnrollPage,
});

const roleOptions = [
  { value: "chef", label: "Chef" },
  { value: "homemaker", label: "Homemaker" },
  { value: "culinary_student", label: "Culinary Student" },
  { value: "professional_chef", label: "Professional Chef" },
  { value: "freelancer", label: "Freelancing Cook" },
] as const;

const schema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z
    .string()
    .trim()
    .refine(isValidPhoneNumber, "Please enter a real mobile number, not a placeholder."),
  email: z.string().trim().email("Valid email required").max(255),
  kitchen_name: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2, "City is required").max(120),
  area: z.string().trim().max(120).optional(),
  role: z.enum(["chef", "homemaker", "culinary_student", "professional_chef", "freelancer"]),
  specialties: z.string().trim().min(2, "Speciality is required").max(500),
  cuisines: z.string().trim().min(2, "Cuisine is required").max(500),
  signature_dish: z.string().trim().min(2, "Signature dish is required").max(160),
  sample_menu: z.string().trim().max(600).optional(),
  expected_price_range: z.string().trim().min(2, "Expected price range is required").max(120),
  fssai_status: z.enum(["not_started", "need_guidance", "in_progress", "submitted", "approved"]),
  comments: z.string().trim().max(1500, "Please keep your note under 1,500 characters").optional(),
  public_listing_consent: z.literal(true, {
    errorMap: () => ({
      message: "Please agree to show your chef profile in the Soru app list.",
    }),
  }),
  consent: z.literal(true, {
    errorMap: () => ({ message: "Please agree to Soru’s Privacy Policy before submitting." }),
  }),
});

function ChefEnrollPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    kitchen_name: "",
    city: "",
    area: "",
    role: "" as "" | (typeof roleOptions)[number]["value"],
    specialties: "",
    cuisines: "",
    signature_dish: "",
    sample_menu: "",
    expected_price_range: "",
    fssai_status: "need_guidance" as const,
    comments: "",
    public_listing_consent: false,
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
      const { data, error } = await supabase.functions.invoke<{
        ok: boolean;
        listing_id?: string;
        message?: string;
      }>("soru-register-chef", {
        body: {
          full_name: parsed.data.name,
          phone: normalizePhone(parsed.data.phone),
          email: parsed.data.email,
          city: parsed.data.city,
          area: parsed.data.area || null,
          chef_role: parsed.data.role,
          kitchen_name: parsed.data.kitchen_name || null,
          specialties: parsed.data.specialties,
          cuisines: parsed.data.cuisines,
          signature_dish: parsed.data.signature_dish,
          sample_menu: parsed.data.sample_menu || null,
          expected_price_range: parsed.data.expected_price_range,
          fssai_status: parsed.data.fssai_status,
          public_listing_consent: parsed.data.public_listing_consent,
          notes: parsed.data.comments || null,
          consent: parsed.data.consent,
          consent_version: PILOT_CONSENT_VERSION,
        },
      });
      if (error) throw new Error(error.message);
      if (!data?.ok) throw new Error(data?.message || "Could not submit.");
    } catch (error) {
      saveError = error instanceof Error ? error.message : "Could not submit.";
    }
    setLoading(false);
    if (saveError) {
      toast.error(saveError);
      return;
    }
    setDone(true);
    toast.success("Chef registration received and added to the Soru app list.");
    setForm({
      name: "",
      phone: "",
      email: "",
      kitchen_name: "",
      city: "",
      area: "",
      role: "",
      specialties: "",
      cuisines: "",
      signature_dish: "",
      sample_menu: "",
      expected_price_range: "",
      fssai_status: "need_guidance",
      comments: "",
      public_listing_consent: false,
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
          <Link to="/enroll" className="text-sm text-muted-foreground hover:text-foreground">
            Are you a customer? →
          </Link>
        </div>
      </header>

      <main className="container-x py-16 md:py-24">
        <div className="mx-auto max-w-xl">
          <h1 className="text-balance text-3xl font-semibold tracking-tight md:text-4xl">
            Register your chef profile
          </h1>
          <p className="mt-3 text-muted-foreground">
            Fill this one-page form to join Soru’s chef pipeline and appear in the customer app as a
            new chef registration while we review verification.
          </p>

          {done ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
              <div className="text-4xl">👩‍🍳</div>
              <h2 className="mt-3 text-xl font-semibold">Application received</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Your public chef profile has been added to the Soru app list as a new registration.
                Our team will follow up for verification and onboarding.
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
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Kitchen / brand name">
                  <input
                    value={form.kitchen_name}
                    onChange={(e) => setForm({ ...form, kitchen_name: e.target.value })}
                    className="input"
                    placeholder="Asha's Kitchen"
                  />
                </Field>
                <Field label="City">
                  <input
                    required
                    value={form.city}
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                    className="input"
                    placeholder="Bengaluru"
                  />
                </Field>
              </div>
              <Field label="Area / locality">
                <input
                  value={form.area}
                  onChange={(e) => setForm({ ...form, area: e.target.value })}
                  className="input"
                  placeholder="Indiranagar, Anna Nagar, HSR Layout…"
                />
              </Field>
              <Field label="I am a…">
                <select
                  required
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as typeof form.role })}
                  className="input"
                >
                  <option value="">Select your role…</option>
                  {roleOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Specialities">
                <input
                  required
                  value={form.specialties}
                  onChange={(e) => setForm({ ...form, specialties: e.target.value })}
                  className="input"
                  placeholder="Kerala meals, healthy bowls, biryani, millet food"
                />
              </Field>
              <Field label="Cuisines">
                <input
                  required
                  value={form.cuisines}
                  onChange={(e) => setForm({ ...form, cuisines: e.target.value })}
                  className="input"
                  placeholder="South Indian, North Indian, vegan, Jain"
                />
              </Field>
              <div className="grid gap-5 md:grid-cols-2">
                <Field label="Signature dish">
                  <input
                    required
                    value={form.signature_dish}
                    onChange={(e) => setForm({ ...form, signature_dish: e.target.value })}
                    className="input"
                    placeholder="Homestyle sambar rice"
                  />
                </Field>
                <Field label="Expected price range">
                  <input
                    required
                    value={form.expected_price_range}
                    onChange={(e) => setForm({ ...form, expected_price_range: e.target.value })}
                    className="input"
                    placeholder="₹99–₹180 per meal"
                  />
                </Field>
              </div>
              <Field label="Sample menu / meal plan">
                <textarea
                  value={form.sample_menu}
                  onChange={(e) => setForm({ ...form, sample_menu: e.target.value })}
                  className="input min-h-24 resize-y"
                  maxLength={600}
                  placeholder="Example: Monday lunch — dal, rice, sabzi, curd. Monthly veg lunch plan available."
                />
              </Field>
              <Field label="FSSAI / food license status">
                <select
                  required
                  value={form.fssai_status}
                  onChange={(e) =>
                    setForm({ ...form, fssai_status: e.target.value as typeof form.fssai_status })
                  }
                  className="input"
                >
                  <option value="need_guidance">Need Soru guidance</option>
                  <option value="not_started">Not started</option>
                  <option value="in_progress">In progress</option>
                  <option value="submitted">Submitted</option>
                  <option value="approved">Approved</option>
                </select>
              </Field>
              <Field label="What would you like to share with Soru? (optional)">
                <textarea
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  className="input min-h-28 resize-y"
                  maxLength={1500}
                  placeholder="Tell us about your cooking, goals, support you need, or anything else you'd like us to know."
                />
              </Field>
              <ConsentBox
                checked={form.public_listing_consent}
                onChange={(checked) => setForm({ ...form, public_listing_consent: checked })}
                label="I agree that Soru can show my chef/kitchen name, city, area, speciality, cuisine, signature dish, sample menu, and price range in the customer app list as a new chef registration. My phone and email will stay private."
              />
              <ConsentBox
                checked={form.consent}
                onChange={(checked) => setForm({ ...form, consent: checked })}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Submitting…" : "Register and appear in app"}
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
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
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
      {label ? (
        <span>{label}</span>
      ) : (
        <span>
          I agree to Soru’s{" "}
          <Link to="/privacy" className="font-semibold text-foreground underline">
            Privacy Policy
          </Link>{" "}
          and consent to being contacted regarding the pilot.
        </span>
      )}
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
