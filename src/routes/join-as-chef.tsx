import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { z } from "zod";
import { BrandLogo } from "@/components/brand-logo";
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
  role: z.enum(["chef", "homemaker", "culinary_student", "professional_chef", "freelancer"]),
  comments: z.string().trim().max(1500, "Please keep your note under 1,500 characters").optional(),
});

function ChefEnrollPage() {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    role: "" as "" | (typeof roleOptions)[number]["value"],
    comments: "",
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
    const { error } = await supabase.from("chef_enrollments").insert({
      ...parsed.data,
      phone: normalizePhone(parsed.data.phone),
      comments: parsed.data.comments || null,
    });
    setLoading(false);
    if (error) {
      toast.error("Could not submit. Please try again.");
      return;
    }
    setDone(true);
    toast.success("Welcome aboard! We'll reach out shortly.");
    setForm({ name: "", phone: "", email: "", role: "", comments: "" });
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
            Become a Soru chef
          </h1>
          <p className="mt-3 text-muted-foreground">
            Whether you're a home cook, student, or seasoned pro — we'd love to have you.
          </p>

          {done ? (
            <div className="mt-10 rounded-2xl border border-border bg-card p-8 text-center">
              <div className="text-4xl">👩‍🍳</div>
              <h2 className="mt-3 text-xl font-semibold">Application received</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Our team will get back to you within a few days.
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
              <Field label="What would you like to share with Soru? (optional)">
                <textarea
                  value={form.comments}
                  onChange={(e) => setForm({ ...form, comments: e.target.value })}
                  className="input min-h-28 resize-y"
                  maxLength={1500}
                  placeholder="Tell us about your cooking, goals, support you need, or anything else you'd like us to know."
                />
              </Field>
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
              >
                {loading ? "Submitting…" : "Apply to join"}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">{label}</span>
      {children}
    </label>
  );
}
