import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { ArrowRight, ChefHat, Instagram, Linkedin, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import { ensureProfileForUser, type AppRole, upsertProfile } from "@/lib/soru-app";
import { getPhoneValidationError, normalizePhone } from "@/lib/validation";

export const Route = createFileRoute("/soru-auth")({
  ssr: false,
  validateSearch: (search: Record<string, unknown>) => ({
    role: search.role === "chef" ? "chef" : "customer",
  }),
  head: () => ({ meta: [{ title: "Enter Soru — Customer & Chef App" }] }),
  component: SoruAuthPage,
});

function SoruAuthPage() {
  const navigate = useNavigate();
  const search = useSearch({ from: "/soru-auth" });
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [role, setRole] = useState<AppRole>(search.role as AppRole);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [needsEmailCheck, setNeedsEmailCheck] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) return;
      void ensureProfileForUser(data.session.user, role).then(({ data: profile }) => {
        const preferredRole =
          profile?.default_role ||
          (data.session.user.user_metadata?.default_role as AppRole | undefined) ||
          role;
        navigate({ to: dashboardFor(preferredRole, role) });
      });
    });
  }, [navigate, role]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);

    if (mode === "signup") {
      if (fullName.trim().length < 2 || !city.trim()) {
        toast.error("Please add your name and city.");
        setLoading(false);
        return;
      }
      const phoneError = getPhoneValidationError(phone);
      if (phoneError) {
        toast.error(phoneError);
        setLoading(false);
        return;
      }
      const cleanPhone = normalizePhone(phone);

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}${dashboardFor(role, role)}`,
          data: {
            full_name: fullName.trim(),
            phone: cleanPhone,
            city: city.trim(),
            default_role: role,
          },
        },
      });

      if (error) {
        toast.error(
          error.message.toLowerCase().includes("rate limit")
            ? "Email sign-up is temporarily rate-limited. Please try again shortly."
            : error.message,
        );
        setLoading(false);
        return;
      }

      if (data.user && data.session) {
        await upsertProfile({
          userId: data.user.id,
          fullName,
          phone: cleanPhone,
          city,
          defaultRole: role,
        });
        toast.success("Welcome to Soru.");
        navigate({ to: dashboardFor(role, role) });
        return;
      }

      setNeedsEmailCheck(true);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    const preferredRole = (data.user?.user_metadata?.default_role as AppRole | undefined) || role;
    const profile = data.user ? await ensureProfileForUser(data.user, preferredRole) : null;
    toast.success("Signed in.");
    setLoading(false);
    navigate({
      to: dashboardFor(profile?.data?.default_role || preferredRole, role),
    });
  }

  return (
    <div className="mobile-app-screen min-h-screen bg-background">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" aria-label="Soru home">
            <BrandLogo />
          </Link>
          <div className="hidden items-center gap-4 text-sm text-muted-foreground sm:flex">
            <Link to="/app" className="hover:text-foreground">
              Customer app
            </Link>
            <Link to="/chef-studio" className="hover:text-foreground">
              Chef studio
            </Link>
            <a href="mailto:hello@soruindia.com" className="hover:text-foreground">
              hello@soruindia.com
            </a>
          </div>
        </div>
      </header>

      <main className="container-x grid gap-7 py-6 md:grid-cols-[1fr_28rem] md:gap-10 md:py-20">
        <section className="flex flex-col justify-center">
          <div className="max-w-2xl">
            <p className="inline-flex rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-foreground">
              Soru App
            </p>
            <h1 className="mt-6 text-balance text-4xl font-semibold leading-none tracking-tight md:text-6xl">
              Choose your dedicated Soru dashboard.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Customers discover verified chefs and personalised meal plans. Chefs apply, build
              menus, manage FSSAI readiness, and grow their food business.
            </p>

            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              <MiniCard
                icon={<UserRound className="size-5" />}
                title="Customers"
                text="Find chefs and meal plans."
              />
              <MiniCard
                icon={<ChefHat className="size-5" />}
                title="Chefs"
                text="Apply, list menus, receive orders."
              />
              <MiniCard
                icon={<ShieldCheck className="size-5" />}
                title="FSSAI"
                text="Guided license readiness."
              />
            </div>
            <div className="mt-5 rounded-3xl border border-primary/25 bg-primary/10 p-4 text-sm text-foreground md:hidden">
              <div className="font-extrabold">Install Soru on your phone</div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Open this page in Safari or Chrome, then use “Add to Home Screen” for the app-style
                experience.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-soft md:rounded-[2rem] md:p-8">
          {needsEmailCheck ? (
            <div className="py-8 text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/15">
                <Mail className="size-7" />
              </div>
              <h2 className="mt-5 text-2xl font-semibold">Check your email</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Confirm your email, then come back and sign in to enter Soru.
              </p>
              <button
                onClick={() => {
                  setNeedsEmailCheck(false);
                  setMode("signin");
                }}
                className="mt-6 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
              >
                Back to sign in
              </button>
            </div>
          ) : (
            <>
              <div className="flex rounded-full bg-muted p-1 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setMode("signin")}
                  className={`flex-1 rounded-full px-4 py-2 ${mode === "signin" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setMode("signup")}
                  className={`flex-1 rounded-full px-4 py-2 ${mode === "signup" ? "bg-card shadow-soft" : "text-muted-foreground"}`}
                >
                  Create account
                </button>
              </div>

              <form onSubmit={submit} className="mt-6 space-y-4">
                <Field label="I am joining as">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as AppRole)}
                    className="app-input"
                  >
                    <option value="customer">Customer</option>
                    <option value="chef">Chef / home cook</option>
                  </select>
                </Field>

                {mode === "signup" && (
                  <>
                    <Field label="Full name">
                      <input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="app-input"
                        placeholder="Your name"
                      />
                    </Field>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field label="Mobile">
                        <input
                          required
                          type="tel"
                          inputMode="tel"
                          autoComplete="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          className="app-input"
                          placeholder="+91 98765 43210"
                        />
                      </Field>
                      <Field label="City">
                        <input
                          required
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="app-input"
                          placeholder="Bengaluru"
                        />
                      </Field>
                    </div>
                  </>
                )}

                <Field label="Email">
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="app-input"
                    placeholder="you@email.com"
                  />
                </Field>
                <Field label="Password">
                  <input
                    required
                    type="password"
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="app-input"
                    placeholder="Minimum 6 characters"
                  />
                </Field>

                <button
                  type="submit"
                  disabled={loading}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-105 disabled:opacity-60"
                >
                  {loading
                    ? "Please wait…"
                    : mode === "signin"
                      ? "Enter Soru"
                      : "Create my account"}
                  <ArrowRight className="size-4" />
                </button>
              </form>
              <p className="mt-5 text-center text-xs text-muted-foreground">
                Need help?{" "}
                <a href="mailto:hello@soruindia.com" className="font-semibold text-foreground">
                  hello@soruindia.com
                </a>
              </p>
            </>
          )}
        </section>

        <AppContactCard />
      </main>

      <style>{inputStyles}</style>
    </div>
  );
}

function AppContactCard() {
  return (
    <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-soft md:col-span-2 md:rounded-[2rem] md:p-7">
      <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
            Contact us
          </p>
          <h2 className="mt-2 text-2xl font-semibold">Need help with Soru?</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Reach us for customer support, chef onboarding, partnerships, or feedback.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 md:min-w-[34rem]">
          <AppContactLink href="mailto:hello@soruindia.com" icon={<Mail />} label="Email" value="hello@soruindia.com" />
          <AppContactLink href="https://www.instagram.com/soru.india/" icon={<Instagram />} label="Instagram" value="@soru.india" />
          <AppContactLink href="https://www.linkedin.com/company/soru-india" icon={<Linkedin />} label="LinkedIn" value="Soru India" />
        </div>
      </div>
    </section>
  );
}

function AppContactLink({
  href,
  icon,
  label,
  value,
}: {
  href: string;
  icon: React.ReactElement;
  label: string;
  value: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noreferrer" : undefined}
      className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/40 hover:bg-muted/40"
    >
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </span>
      <span className="mt-3 block text-[0.68rem] font-bold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className="mt-1 block break-words text-xs font-semibold text-foreground">{value}</span>
    </a>
  );
}

function dashboardFor(preferredRole: AppRole, selectedRole: AppRole) {
  if (preferredRole === "chef" || (preferredRole === "both" && selectedRole === "chef")) {
    return "/chef-studio";
  }
  return "/app";
}

function MiniCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-4 shadow-soft">
      <div className="flex size-10 items-center justify-center rounded-xl bg-primary/15">
        {icon}
      </div>
      <div className="mt-3 text-sm font-bold">{title}</div>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{text}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

const inputStyles = `
  .app-input {
    width: 100%;
    border-radius: 0.9rem;
    border: 1px solid var(--border);
    background: var(--background);
    padding: 0.78rem 0.95rem;
    font-size: 16px;
    color: var(--foreground);
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
  }
  .app-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent);
  }
`;
