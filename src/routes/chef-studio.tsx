import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  BookOpenCheck,
  ChefHat,
  ClipboardCheck,
  FileText,
  LogOut,
  Mail,
  Plus,
  Store,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BrandLogo } from "@/components/brand-logo";
import { supabase } from "@/integrations/supabase/client";
import {
  chefTypeOptions,
  currency,
  db,
  ensureProfileForUser,
  fssaiDocumentOptions,
  fssaiSupportOptions,
  getCurrentUser,
  joinList,
  splitList,
  titleCase,
  type ChefProfile,
  type CustomerOrder,
  type MenuItem,
  type Profile,
  type Subscription,
} from "@/lib/soru-app";
import { getPhoneValidationError, normalizePhone } from "@/lib/validation";

export const Route = createFileRoute("/chef-studio")({
  ssr: false,
  head: () => ({ meta: [{ title: "Soru Chef Studio" }] }),
  component: ChefStudioPage,
});

type ChefApplication = {
  id: string;
  application_status: string;
  full_name: string;
  phone: string;
  email: string;
  city: string;
  cooking_role: string;
  experience: string | null;
  has_fssai_license: boolean;
  fssai_license_no: string | null;
  fssai_application_type: string;
  documents_ready: string[];
  support_needed: string[];
  current_step: number;
  submitted_at: string | null;
};

type Tab = "enrollment" | "profile" | "menu" | "orders";

function ChefStudioPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [application, setApplication] = useState<ChefApplication | null>(null);
  const [chefProfile, setChefProfile] = useState<ChefProfile | null>(null);
  const [menus, setMenus] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [tab, setTab] = useState<Tab>("enrollment");

  const load = useCallback(async () => {
    setLoading(true);
    const user = await getCurrentUser();
    if (!user) {
      navigate({ to: "/soru-auth", search: { role: "chef" } });
      return;
    }
    setUserId(user.id);
    setUserEmail(user.email || "");

    const [profileRes, applicationRes, chefProfileRes] = await Promise.all([
      db.from<Profile>("profiles").select("*").eq("user_id", user.id).maybeSingle(),
      db
        .from<ChefApplication>("chef_applications")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle(),
      db.from<ChefProfile>("chef_profiles").select("*").eq("user_id", user.id).maybeSingle(),
    ]);

    const chef = chefProfileRes.data || null;
    const [menusRes, ordersRes, subscriptionsRes] = await Promise.all([
      chef
        ? db
            .from<MenuItem>("chef_menu_items")
            .select("*")
            .eq("chef_profile_id", chef.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      chef
        ? db
            .from<CustomerOrder>("customer_orders")
            .select("*")
            .eq("chef_profile_id", chef.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
      chef
        ? db
            .from<Subscription>("customer_subscriptions")
            .select("*")
            .eq("chef_profile_id", chef.id)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profileRes.error) toast.error("Could not load your Soru profile.");
    const repairedProfile =
      !profileRes.error && !profileRes.data ? await ensureProfileForUser(user, "chef") : null;

    setProfile(profileRes.data || repairedProfile?.data || null);
    setApplication(applicationRes.data || null);
    setChefProfile(chef);
    setMenus(menusRes.data || []);
    setOrders(ordersRes.data || []);
    setSubscriptions(subscriptionsRes.data || []);
    setLoading(false);
  }, [navigate]);

  useEffect(() => {
    void load();
  }, [load]);

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/soru-auth", search: { role: "chef" } });
  }

  const progress = useMemo(() => {
    if (!application) return 0;
    return Math.round((application.current_step / 5) * 100);
  }, [application]);

  return (
    <div className="mobile-app-screen min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" aria-label="Soru home">
            <BrandLogo />
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="mailto:hello@soruindia.com"
              className="hidden items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted md:inline-flex"
            >
              <Mail className="size-4" /> Contact
            </a>
            <Link
              to="/app"
              className="hidden rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted sm:inline-flex"
            >
              Customer app
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-muted"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="container-x py-5 md:py-10">
        <section className="rounded-[1.6rem] border border-border bg-card p-5 shadow-soft md:rounded-[2rem] md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-muted-foreground">
                Chef Studio
              </p>
              <h1 className="mt-3 text-3xl font-semibold leading-none md:text-5xl">
                Build your chef business on Soru.
              </h1>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                Apply to work with Soru, prepare your FSSAI readiness, publish your menu, and manage
                customer interest from one place.
              </p>
            </div>
            <div className="rounded-2xl bg-primary/15 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Enrollment
              </p>
              <p className="mt-1 text-2xl font-extrabold">{progress}%</p>
            </div>
          </div>
        </section>

        <div className="mt-6 hidden gap-2 overflow-x-auto pb-2 md:flex">
          <TabButton
            active={tab === "enrollment"}
            onClick={() => setTab("enrollment")}
            icon={<ClipboardCheck />}
          >
            Enrollment
          </TabButton>
          <TabButton active={tab === "profile"} onClick={() => setTab("profile")} icon={<Store />}>
            Chef profile
          </TabButton>
          <TabButton active={tab === "menu"} onClick={() => setTab("menu")} icon={<Plus />}>
            Menu
          </TabButton>
          <TabButton
            active={tab === "orders"}
            onClick={() => setTab("orders")}
            icon={<BookOpenCheck />}
          >
            Orders
          </TabButton>
        </div>

        {loading ? (
          <EmptyCard title="Loading chef studio…" text="Getting your workspace ready." />
        ) : (
          <>
            {tab === "enrollment" && (
              <EnrollmentSection
                userId={userId}
                email={userEmail}
                profile={profile}
                application={application}
                afterSave={load}
              />
            )}
            {tab === "profile" && (
              <ChefProfileSection
                userId={userId}
                profile={profile}
                chefProfile={chefProfile}
                afterSave={load}
              />
            )}
            {tab === "menu" && (
              <MenuSection
                userId={userId}
                chefProfile={chefProfile}
                menus={menus}
                afterSave={load}
              />
            )}
            {tab === "orders" && (
              <ChefOrdersSection orders={orders} subscriptions={subscriptions} menus={menus} />
            )}
          </>
        )}
      </main>
      <ChefMobileTabBar active={tab} setTab={setTab} />
    </div>
  );
}

function ChefMobileTabBar({ active, setTab }: { active: Tab; setTab: (tab: Tab) => void }) {
  const items: Array<{ tab: Tab; label: string; icon: React.ReactElement }> = [
    { tab: "enrollment", label: "Apply", icon: <ClipboardCheck /> },
    { tab: "profile", label: "Profile", icon: <Store /> },
    { tab: "menu", label: "Menu", icon: <Plus /> },
    { tab: "orders", label: "Orders", icon: <BookOpenCheck /> },
  ];

  return (
    <nav className="mobile-tabbar fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 px-3 pt-2 backdrop-blur-xl md:hidden">
      <div className="mx-auto grid max-w-sm grid-cols-4 gap-1">
        {items.map((item) => {
          const selected = active === item.tab;
          return (
            <button
              key={item.tab}
              type="button"
              onClick={() => setTab(item.tab)}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[0.68rem] font-extrabold ${
                selected ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              <span className="[&_svg]:size-5">{item.icon}</span>
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function EnrollmentSection({
  userId,
  email,
  profile,
  application,
  afterSave,
}: {
  userId: string;
  email: string;
  profile: Profile | null;
  application: ChefApplication | null;
  afterSave: () => Promise<void>;
}) {
  const [documents, setDocuments] = useState<string[]>(application?.documents_ready || []);
  const [support, setSupport] = useState<string[]>(application?.support_needed || []);
  const [form, setForm] = useState({
    full_name: application?.full_name || profile?.full_name || "",
    phone: application?.phone || profile?.phone || "",
    email: application?.email || email,
    city: application?.city || profile?.city || "",
    cooking_role: application?.cooking_role || "home_cook",
    experience: application?.experience || "",
    has_fssai_license: application?.has_fssai_license || false,
    fssai_license_no: application?.fssai_license_no || "",
    fssai_application_type: application?.fssai_application_type || "unsure",
    current_step: application?.current_step || 1,
  });
  const [saving, setSaving] = useState(false);

  async function save(status: "draft" | "submitted") {
    if (!form.full_name.trim() || !form.phone.trim() || !form.email.trim() || !form.city.trim()) {
      toast.error("Please complete your name, phone, email, and city.");
      return;
    }
    const phoneError = getPhoneValidationError(form.phone);
    if (phoneError) {
      toast.error(phoneError);
      return;
    }
    setSaving(true);
    const payload = {
      user_id: userId,
      ...form,
      phone: normalizePhone(form.phone),
      documents_ready: documents,
      support_needed: support,
      application_status: status,
      submitted_at:
        status === "submitted" ? new Date().toISOString() : application?.submitted_at || null,
    };
    const { error } = await db
      .from<ChefApplication>("chef_applications")
      .upsert(payload, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      toast.error("Could not save your chef enrollment.");
      return;
    }
    toast.success(status === "submitted" ? "Chef application submitted." : "Enrollment saved.");
    await afterSave();
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_25rem]">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <SectionTitle
          icon={<ClipboardCheck />}
          title="Step-by-step chef enrollment"
          text="Complete the essentials Soru needs before your chef profile can be reviewed."
        />

        <div className="mt-6 grid gap-3 sm:grid-cols-5">
          {["Account", "Cooking", "FSSAI", "Documents", "Submit"].map((step, index) => (
            <button
              key={step}
              type="button"
              onClick={() => setForm({ ...form, current_step: index + 1 })}
              className={`rounded-2xl border p-3 text-left text-xs font-bold ${
                form.current_step === index + 1
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background"
              }`}
            >
              {index + 1}. {step}
            </button>
          ))}
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Full name">
            <input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="app-input"
            />
          </Field>
          <Field label="Mobile number">
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="app-input"
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="app-input"
            />
          </Field>
          <Field label="City">
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              className="app-input"
            />
          </Field>
          <Field label="Cooking role">
            <select
              value={form.cooking_role}
              onChange={(e) => setForm({ ...form, cooking_role: e.target.value })}
              className="app-input"
            >
              {chefTypeOptions.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="FSSAI application type">
            <select
              value={form.fssai_application_type}
              onChange={(e) => setForm({ ...form, fssai_application_type: e.target.value })}
              className="app-input"
            >
              <option value="unsure">Not sure — need guidance</option>
              <option value="basic_registration">Basic registration</option>
              <option value="state_license">State license</option>
              <option value="central_license">Central license</option>
            </select>
          </Field>
        </div>

        <Field label="Cooking experience and speciality">
          <textarea
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
            className="app-input min-h-28"
            placeholder="Tell us what you cook, who you cook for, and what makes your food special."
          />
        </Field>

        <div className="mt-5 rounded-3xl border border-border bg-background p-5">
          <div className="flex items-center gap-3">
            <input
              id="has-fssai"
              type="checkbox"
              checked={form.has_fssai_license}
              onChange={(e) => setForm({ ...form, has_fssai_license: e.target.checked })}
              className="size-4"
            />
            <label htmlFor="has-fssai" className="text-sm font-bold">
              I already have an FSSAI license / registration
            </label>
          </div>
          {form.has_fssai_license && (
            <Field label="FSSAI license / registration number">
              <input
                value={form.fssai_license_no}
                onChange={(e) => setForm({ ...form, fssai_license_no: e.target.value })}
                className="app-input"
              />
            </Field>
          )}
        </div>

        <Checklist
          title="Documents ready"
          options={fssaiDocumentOptions}
          selected={documents}
          setSelected={setDocuments}
        />
        <Checklist
          title="Support I need from Soru"
          options={fssaiSupportOptions}
          selected={support}
          setSelected={setSupport}
        />

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => save("draft")}
            className="rounded-full border border-border px-6 py-3 text-sm font-bold hover:bg-muted disabled:opacity-60"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save("submitted")}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
          >
            Submit application <ArrowRight className="size-4" />
          </button>
        </div>
      </div>

      <FssaiGuide status={application?.application_status || "not started"} />
      <style>{inputStyles}</style>
    </section>
  );
}

function ChefProfileSection({
  userId,
  profile,
  chefProfile,
  afterSave,
}: {
  userId: string;
  profile: Profile | null;
  chefProfile: ChefProfile | null;
  afterSave: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    display_name: chefProfile?.display_name || profile?.full_name || "",
    kitchen_name: chefProfile?.kitchen_name || "",
    chef_type: chefProfile?.chef_type || "home_cook",
    city: chefProfile?.city || profile?.city || "",
    area: chefProfile?.area || "",
    bio: chefProfile?.bio || "",
    specialties: chefProfile?.specialties?.join(", ") || "",
    cuisines: chefProfile?.cuisines?.join(", ") || "",
    service_radius_km: chefProfile?.service_radius_km || 5,
    fssai_status: chefProfile?.fssai_status || "not_started",
    fssai_license_no: chefProfile?.fssai_license_no || "",
    is_listed: chefProfile?.is_listed || false,
  });
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.display_name.trim() || !form.city.trim()) {
      toast.error("Please add display name and city.");
      return;
    }
    setSaving(true);
    const { error } = await db.from<ChefProfile>("chef_profiles").upsert(
      {
        user_id: userId,
        ...form,
        specialties: splitList(form.specialties),
        cuisines: splitList(form.cuisines),
        service_radius_km: Number(form.service_radius_km),
        fssai_license_no: form.fssai_license_no || null,
        kitchen_name: form.kitchen_name || null,
        area: form.area || null,
        bio: form.bio || null,
        verification_status: form.is_listed
          ? "submitted"
          : chefProfile?.verification_status || "draft",
      },
      { onConflict: "user_id" },
    );
    setSaving(false);
    if (error) {
      toast.error("Could not save chef profile.");
      return;
    }
    toast.success(form.is_listed ? "Chef profile submitted for listing." : "Chef profile saved.");
    await afterSave();
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <SectionTitle
        icon={<Store />}
        title="Chef profile and speciality"
        text="This is what customers will see once your profile is listed."
      />
      <form onSubmit={save} className="mt-6 grid gap-4 md:grid-cols-2">
        <Field label="Display name">
          <input
            required
            value={form.display_name}
            onChange={(e) => setForm({ ...form, display_name: e.target.value })}
            className="app-input"
          />
        </Field>
        <Field label="Kitchen / brand name">
          <input
            value={form.kitchen_name}
            onChange={(e) => setForm({ ...form, kitchen_name: e.target.value })}
            className="app-input"
          />
        </Field>
        <Field label="Chef type">
          <select
            value={form.chef_type}
            onChange={(e) => setForm({ ...form, chef_type: e.target.value })}
            className="app-input"
          >
            {chefTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="City">
          <input
            required
            value={form.city}
            onChange={(e) => setForm({ ...form, city: e.target.value })}
            className="app-input"
          />
        </Field>
        <Field label="Area">
          <input
            value={form.area}
            onChange={(e) => setForm({ ...form, area: e.target.value })}
            className="app-input"
          />
        </Field>
        <Field label="Service radius in km">
          <input
            type="number"
            min={1}
            max={50}
            value={form.service_radius_km}
            onChange={(e) => setForm({ ...form, service_radius_km: Number(e.target.value) })}
            className="app-input"
          />
        </Field>
        <Field label="Specialities">
          <input
            value={form.specialties}
            onChange={(e) => setForm({ ...form, specialties: e.target.value })}
            className="app-input"
            placeholder="Kerala meals, millet bowls, biryani"
          />
        </Field>
        <Field label="Cuisines">
          <input
            value={form.cuisines}
            onChange={(e) => setForm({ ...form, cuisines: e.target.value })}
            className="app-input"
            placeholder="South Indian, North Indian, vegan"
          />
        </Field>
        <Field label="FSSAI status">
          <select
            value={form.fssai_status}
            onChange={(e) => setForm({ ...form, fssai_status: e.target.value })}
            className="app-input"
          >
            <option value="not_started">Not started</option>
            <option value="in_progress">In progress</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
          </select>
        </Field>
        <Field label="FSSAI number, if available">
          <input
            value={form.fssai_license_no}
            onChange={(e) => setForm({ ...form, fssai_license_no: e.target.value })}
            className="app-input"
          />
        </Field>
        <label className="md:col-span-2">
          <span className="mb-1.5 block text-sm font-semibold text-foreground">Bio</span>
          <textarea
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            className="app-input min-h-28"
          />
        </label>
        <div className="md:col-span-2 rounded-2xl border border-border bg-background p-4">
          <label className="flex items-center gap-3 text-sm font-bold">
            <input
              type="checkbox"
              checked={form.is_listed}
              onChange={(e) => setForm({ ...form, is_listed: e.target.checked })}
              className="size-4"
            />
            Submit this profile to be visible in customer discovery
          </label>
          <p className="mt-2 text-xs text-muted-foreground">
            Soru can still review and verify chefs before marking them fully verified.
          </p>
        </div>
        <button
          disabled={saving}
          className="w-fit rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save chef profile"}
        </button>
      </form>
      <style>{inputStyles}</style>
    </section>
  );
}

function MenuSection({
  userId,
  chefProfile,
  menus,
  afterSave,
}: {
  userId: string;
  chefProfile: ChefProfile | null;
  menus: MenuItem[];
  afterSave: () => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "meal",
    price_inr: 99,
    meal_type: "lunch",
    dietary_tags: "",
    allergens: "",
    available_days: "Monday, Tuesday, Wednesday, Thursday, Friday",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!chefProfile) {
      toast.error("Create your chef profile before adding menu items.");
      return;
    }
    if (!form.name.trim() || Number(form.price_inr) < 1) {
      toast.error("Add menu name and valid price.");
      return;
    }
    setSaving(true);
    const { error } = await db.from<MenuItem>("chef_menu_items").insert({
      chef_profile_id: chefProfile.id,
      user_id: userId,
      ...form,
      price_inr: Number(form.price_inr),
      description: form.description || null,
      dietary_tags: splitList(form.dietary_tags),
      allergens: splitList(form.allergens),
      available_days: splitList(form.available_days),
    });
    setSaving(false);
    if (error) {
      toast.error("Could not add menu item.");
      return;
    }
    toast.success("Menu item added.");
    setForm({ ...form, name: "", description: "" });
    await afterSave();
  }

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_25rem]">
      <form onSubmit={save} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <SectionTitle
          icon={<Plus />}
          title="Add menu and speciality"
          text="Publish actual items customers can request."
        />
        {!chefProfile && (
          <div className="mt-5 rounded-2xl border border-dashed border-border bg-background p-4 text-sm text-muted-foreground">
            Create your chef profile first. Menu items need a chef profile to attach to.
          </div>
        )}
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="Menu item name">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="app-input"
              placeholder="Millet veg bowl"
            />
          </Field>
          <Field label="Price in ₹">
            <input
              type="number"
              min={1}
              value={form.price_inr}
              onChange={(e) => setForm({ ...form, price_inr: Number(e.target.value) })}
              className="app-input"
            />
          </Field>
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="app-input"
            >
              <option value="meal">Meal</option>
              <option value="lunchbox">Lunchbox</option>
              <option value="family_meal">Family meal</option>
              <option value="chef_special">Chef special</option>
              <option value="subscription">Subscription item</option>
            </select>
          </Field>
          <Field label="Meal type">
            <select
              value={form.meal_type}
              onChange={(e) => setForm({ ...form, meal_type: e.target.value })}
              className="app-input"
            >
              <option value="breakfast">Breakfast</option>
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
              <option value="snack">Snack</option>
              <option value="all_day">All day</option>
            </select>
          </Field>
          <Field label="Dietary tags">
            <input
              value={form.dietary_tags}
              onChange={(e) => setForm({ ...form, dietary_tags: e.target.value })}
              className="app-input"
              placeholder="High protein, vegetarian"
            />
          </Field>
          <Field label="Allergens">
            <input
              value={form.allergens}
              onChange={(e) => setForm({ ...form, allergens: e.target.value })}
              className="app-input"
              placeholder="Dairy, nuts"
            />
          </Field>
          <Field label="Available days">
            <input
              value={form.available_days}
              onChange={(e) => setForm({ ...form, available_days: e.target.value })}
              className="app-input"
            />
          </Field>
        </div>
        <Field label="Short description">
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="app-input min-h-24"
          />
        </Field>
        <label className="mt-4 flex items-center gap-3 text-sm font-bold">
          <input
            type="checkbox"
            checked={form.is_active}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
            className="size-4"
          />
          Active and available
        </label>
        <button
          disabled={saving || !chefProfile}
          className="mt-5 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground disabled:opacity-60"
        >
          {saving ? "Saving…" : "Add menu item"}
        </button>
      </form>

      <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-soft">
        <h2 className="text-xl font-semibold">Your menu</h2>
        <div className="mt-4 space-y-3">
          {menus.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No menu items yet.
            </p>
          ) : (
            menus.map((menu) => (
              <div key={menu.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{menu.name}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {titleCase(menu.category)} · {titleCase(menu.meal_type)}
                    </p>
                  </div>
                  <span className="text-sm font-extrabold">{currency(menu.price_inr)}</span>
                </div>
                <p className="mt-3 text-xs text-muted-foreground">
                  Tags: {joinList(menu.dietary_tags)}
                </p>
              </div>
            ))
          )}
        </div>
      </aside>
      <style>{inputStyles}</style>
    </section>
  );
}

function ChefOrdersSection({
  orders,
  subscriptions,
  menus,
}: {
  orders: CustomerOrder[];
  subscriptions: Subscription[];
  menus: MenuItem[];
}) {
  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-2">
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <SectionTitle
          icon={<BookOpenCheck />}
          title="Incoming orders"
          text="Real order requests from customers."
        />
        <div className="mt-5 space-y-3">
          {orders.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No order requests yet.
            </p>
          ) : (
            orders.map((order) => {
              const menu = menus.find((item) => item.id === order.menu_item_id);
              return (
                <div key={order.id} className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold">{menu?.name || titleCase(order.order_type)}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {order.delivery_city} · Qty {order.quantity}
                      </p>
                    </div>
                    <StatusPill status={order.status} />
                  </div>
                  {order.notes && (
                    <p className="mt-3 text-sm text-muted-foreground">{order.notes}</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      <div className="rounded-3xl border border-border bg-card p-6 shadow-soft">
        <SectionTitle
          icon={<BadgeCheck />}
          title="Subscription interest"
          text="Customers who selected your kitchen for recurring meals."
        />
        <div className="mt-5 space-y-3">
          {subscriptions.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border p-4 text-sm text-muted-foreground">
              No subscription requests yet.
            </p>
          ) : (
            subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-bold">{sub.plan_type}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sub.meals_per_week} meals/week · {sub.budget_range}
                    </p>
                  </div>
                  <StatusPill status={sub.status} />
                </div>
                {sub.notes && <p className="mt-3 text-sm text-muted-foreground">{sub.notes}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </section>
  );
}

function FssaiGuide({ status }: { status: string }) {
  return (
    <aside className="h-fit rounded-3xl border border-border bg-card p-5 shadow-soft">
      <div className="flex items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-2xl bg-primary/15">
          <FileText className="size-5" />
        </div>
        <div>
          <h2 className="text-xl font-semibold">FSSAI readiness</h2>
          <p className="text-xs text-muted-foreground">Status: {titleCase(status)}</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-muted-foreground">
        Soru can guide chefs and independent home cooks through the license/registration readiness
        process. Final application should be done through the official FoSCoS portal.
      </p>
      <a
        href="https://foscos.fssai.gov.in/"
        target="_blank"
        rel="noreferrer"
        className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-bold text-primary-foreground"
      >
        Open official FoSCoS <ArrowRight className="size-3.5" />
      </a>
      <div className="mt-5 rounded-2xl border border-border bg-background p-4">
        <h3 className="text-sm font-bold">Common documents to prepare</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {fssaiDocumentOptions.slice(0, 6).map((item) => (
            <li key={item} className="flex gap-2">
              <span className="mt-1 size-1.5 rounded-full bg-primary" /> {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Requirements can vary by business type, turnover, food category, and location. Soru’s
        checklist is guidance, not a legal approval.
      </p>
    </aside>
  );
}

function Checklist({
  title,
  options,
  selected,
  setSelected,
}: {
  title: string;
  options: string[];
  selected: string[];
  setSelected: (value: string[]) => void;
}) {
  return (
    <div className="mt-5 rounded-3xl border border-border bg-background p-5">
      <h3 className="text-sm font-bold">{title}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <button
              key={option}
              type="button"
              onClick={() =>
                setSelected(
                  active ? selected.filter((item) => item !== option) : [...selected, option],
                )
              }
              className={`rounded-full border px-3 py-2 text-xs font-bold ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4">
      <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-foreground">
        {icon}
      </div>
      <div>
        <h2 className="text-2xl font-semibold">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">{text}</p>
      </div>
    </div>
  );
}

function TabButton({
  children,
  icon,
  active,
  onClick,
}: {
  children: React.ReactNode;
  icon: React.ReactElement;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold ${
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon && <span className="[&_svg]:size-4">{icon}</span>}
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mt-4 block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
    </label>
  );
}

function EmptyCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="mt-6 rounded-3xl border border-dashed border-border bg-card p-8 text-center shadow-soft">
      <h2 className="text-2xl font-semibold">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold capitalize text-foreground">
      {status.replace(/_/g, " ")}
    </span>
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
  }
  .app-input:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in oklab, var(--primary) 18%, transparent);
  }
`;
