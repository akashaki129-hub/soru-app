import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  ChefHat,
  ClipboardList,
  Download,
  Eye,
  PackageCheck,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BrandLogo } from "@/components/brand-logo";
import { db } from "@/lib/soru-app";
import { getPhoneValidationError } from "@/lib/validation";

export const Route = createFileRoute("/admin")({
  ssr: false,
  head: () => ({ meta: [{ title: "Admin — Soru" }] }),
  component: AdminPage,
});

type ChefRow = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  role: string;
  comments: string | null;
};

type CustRow = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  preferred_service: string;
  comments: string | null;
};

type WaitlistRow = {
  id: string;
  created_at: string;
  name: string;
  phone: string;
  email: string;
  city: string;
  role: string;
  comments: string | null;
};

type ResearchRow = {
  id: string;
  created_at: string;
  client_submission_id: string;
  audience: string;
  statements: string[];
  customer_order_frequency: string | null;
  customer_monthly_budget: string | null;
  chef_start_timeline: string | null;
  chef_support_needs: string[];
  city: string;
  full_name: string | null;
  contact: string | null;
  comments: string | null;
  source: string;
};

type SiteVisitRow = {
  id: string;
  visitor_id: string;
  session_id: string;
  path: string;
  visited_at: string;
};

type NotificationEventRow = {
  id: string;
  event_type: string;
  email_status: string;
  whatsapp_status: string;
  processed_at: string | null;
  created_at: string;
};

type AppProfileRow = {
  user_id: string;
  created_at: string;
  full_name: string;
  phone: string | null;
  city: string | null;
  default_role: string;
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

type AppChefProfileRow = {
  id: string;
  created_at: string;
  display_name: string;
  kitchen_name: string | null;
  chef_type: string;
  city: string;
  fssai_status: string;
  verification_status: string;
  is_listed: boolean;
};

type AppMenuItemRow = {
  id: string;
  created_at: string;
  chef_profile_id: string;
  name: string;
  category: string;
  price_inr: number;
  is_active: boolean;
};

type AppOrderRow = {
  id: string;
  created_at: string;
  order_type: string;
  quantity: number;
  delivery_city: string;
  status: string;
};

type AppSubscriptionRow = {
  id: string;
  created_at: string;
  plan_type: string;
  meals_per_week: number;
  budget_range: string;
  status: string;
};

type AppMealPlanRow = {
  id: string;
  created_at: string;
  goal: string;
  diet_type: string;
  city: string;
  status: string;
};

type AppLunchboxRow = {
  id: string;
  created_at: string;
  child_age: string | null;
  city: string;
  status: string;
};

type OperationRow = {
  id: string;
  created_at: string;
  type: string;
  title: string;
  detail: string;
  status: string;
};

type AdminTab = "chefs" | "customers" | "waitlist" | "research" | "operations";
type EnrollmentRow = ChefRow | CustRow | WaitlistRow;

const STATEMENT_LABELS: Record<string, string> = {
  monthly_plan: "Monthly plan ready",
  direct_from_chefs: "Buy direct from chefs",
  refer_a_cook: "Would refer a cook",
  earn_from_cooking: "Earn from cooking",
  personalized_nutrition: "Personalized nutrition",
  routine_meals: "Routine meals",
};

const AUDIENCE_LABELS: Record<string, string> = {
  customer: "Customer",
  home_cook: "Home cook / homemaker",
  professional_chef: "Professional chef / caterer",
  culinary_student: "Culinary student",
  both: "Customer + cook",
};

const FREQUENCY_LABELS: Record<string, string> = {
  "1_2_weekly": "1–2 meals/week",
  "3_5_weekly": "3–5 meals/week",
  "6_plus_weekly": "6+ meals/week",
};

const BUDGET_LABELS: Record<string, string> = {
  "2999_3999": "₹2,999–₹3,999",
  "4000_5999": "₹4,000–₹5,999",
  "6000_plus": "₹6,000+",
  unsure: "Unsure",
};

const TIMELINE_LABELS: Record<string, string> = {
  ready_now: "Ready now",
  "1_3_months": "Within 1–3 months",
  exploring: "Exploring",
};

const SUPPORT_LABELS: Record<string, string> = {
  customers_orders: "Customers & orders",
  food_license: "FSSAI & licensing",
  menu_pricing: "Menu & pricing",
  subscriptions: "Subscriptions",
  kitchen_verification: "Kitchen verification",
  delivery: "Delivery",
};

function AdminPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"checking" | "noauth" | "notadmin" | "ok">("checking");
  const [tab, setTab] = useState<AdminTab>("chefs");
  const [chefs, setChefs] = useState<ChefRow[]>([]);
  const [customers, setCustomers] = useState<CustRow[]>([]);
  const [waitlist, setWaitlist] = useState<WaitlistRow[]>([]);
  const [research, setResearch] = useState<ResearchRow[]>([]);
  const [visits, setVisits] = useState<SiteVisitRow[]>([]);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEventRow[]>([]);
  const [appProfiles, setAppProfiles] = useState<AppProfileRow[]>([]);
  const [chefApplications, setChefApplications] = useState<ChefApplicationRow[]>([]);
  const [appChefProfiles, setAppChefProfiles] = useState<AppChefProfileRow[]>([]);
  const [menuItems, setMenuItems] = useState<AppMenuItemRow[]>([]);
  const [orders, setOrders] = useState<AppOrderRow[]>([]);
  const [subscriptions, setSubscriptions] = useState<AppSubscriptionRow[]>([]);
  const [mealPlans, setMealPlans] = useState<AppMealPlanRow[]>([]);
  const [lunchboxes, setLunchboxes] = useState<AppLunchboxRow[]>([]);
  const [q, setQ] = useState("");
  const [audienceFilter, setAudienceFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("noauth");
        return;
      }
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (!roleRow) {
        setStatus("notadmin");
        return;
      }

      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [c, cu, w, r, v, n, p, ca, cp, m, o, s, mp, lb] = await Promise.all([
        supabase.from("chef_enrollments").select("*").order("created_at", { ascending: false }),
        supabase.from("customer_enrollments").select("*").order("created_at", { ascending: false }),
        supabase.from("waitlist_entries").select("*").order("created_at", { ascending: false }),
        supabase
          .from("market_research_responses")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("site_visits")
          .select("id,visitor_id,session_id,path,visited_at")
          .gte("visited_at", thirtyDaysAgo)
          .order("visited_at", { ascending: false }),
        supabase
          .from("notification_events")
          .select("id,event_type,email_status,whatsapp_status,processed_at,created_at")
          .order("created_at", { ascending: false })
          .limit(100),
        db
          .from("profiles")
          .select("user_id,created_at,full_name,phone,city,default_role")
          .order("created_at", { ascending: false }),
        db
          .from("chef_applications")
          .select(
            "id,created_at,submitted_at,application_status,full_name,phone,email,city,cooking_role,current_step",
          )
          .order("created_at", { ascending: false }),
        db
          .from("chef_profiles")
          .select(
            "id,created_at,display_name,kitchen_name,chef_type,city,fssai_status,verification_status,is_listed",
          )
          .order("created_at", { ascending: false }),
        db
          .from("chef_menu_items")
          .select("id,created_at,chef_profile_id,name,category,price_inr,is_active")
          .order("created_at", { ascending: false }),
        db
          .from("customer_orders")
          .select("id,created_at,order_type,quantity,delivery_city,status")
          .order("created_at", { ascending: false }),
        db
          .from("customer_subscriptions")
          .select("id,created_at,plan_type,meals_per_week,budget_range,status")
          .order("created_at", { ascending: false }),
        db
          .from("meal_plan_requests")
          .select("id,created_at,goal,diet_type,city,status")
          .order("created_at", { ascending: false }),
        db
          .from("lunchbox_requests")
          .select("id,created_at,child_age,city,status")
          .order("created_at", { ascending: false }),
      ]);
      setStatus("ok");
      if (c.error) toast.error(c.error.message);
      else setChefs(c.data as ChefRow[]);
      if (cu.error) toast.error(cu.error.message);
      else setCustomers(cu.data as CustRow[]);
      if (w.error) toast.error(w.error.message);
      else setWaitlist(w.data as WaitlistRow[]);
      if (r.error) toast.error(r.error.message);
      else setResearch(r.data as ResearchRow[]);
      if (v.error) toast.error(v.error.message);
      else setVisits(v.data as SiteVisitRow[]);
      if (n.error) toast.error(n.error.message);
      else setNotificationEvents(n.data as NotificationEventRow[]);
      if (p.error) toast.error(p.error.message);
      else setAppProfiles(p.data as AppProfileRow[]);
      if (ca.error) toast.error(ca.error.message);
      else setChefApplications(ca.data as ChefApplicationRow[]);
      if (cp.error) toast.error(cp.error.message);
      else setAppChefProfiles(cp.data as AppChefProfileRow[]);
      if (m.error) toast.error(m.error.message);
      else setMenuItems(m.data as AppMenuItemRow[]);
      if (o.error) toast.error(o.error.message);
      else setOrders(o.data as AppOrderRow[]);
      if (s.error) toast.error(s.error.message);
      else setSubscriptions(s.data as AppSubscriptionRow[]);
      if (mp.error) toast.error(mp.error.message);
      else setMealPlans(mp.data as AppMealPlanRow[]);
      if (lb.error) toast.error(lb.error.message);
      else setLunchboxes(lb.data as AppLunchboxRow[]);
    })();
  }, []);

  const standardRows: EnrollmentRow[] =
    tab === "chefs" ? chefs : tab === "customers" ? customers : tab === "waitlist" ? waitlist : [];
  const filteredStandardRows = standardRows.filter(
    (row) =>
      !q ||
      [
        row.name,
        row.email,
        row.phone,
        row.comments,
        "role" in row ? row.role : null,
        "preferred_service" in row ? row.preferred_service : null,
        "city" in row ? row.city : null,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q.toLowerCase()),
  );

  const filteredResearch = useMemo(() => {
    const query = q.trim().toLowerCase();
    return research.filter((row) => {
      const matchesAudience = audienceFilter === "all" || row.audience === audienceFilter;
      const matchesCity = cityFilter === "all" || row.city === cityFilter;
      const matchesQuery =
        !query ||
        [
          AUDIENCE_LABELS[row.audience],
          row.city,
          row.full_name,
          row.contact,
          row.comments,
          ...row.statements.map((item) => STATEMENT_LABELS[item]),
          ...row.chef_support_needs.map((item) => SUPPORT_LABELS[item]),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(query);
      return matchesAudience && matchesCity && matchesQuery;
    });
  }, [audienceFilter, cityFilter, q, research]);

  const operationRows = useMemo<OperationRow[]>(() => {
    const rows: OperationRow[] = [
      ...chefApplications.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Chef application",
        title: row.full_name,
        detail: `${formatLabel(row.cooking_role)} · ${row.city} · Step ${row.current_step}/5`,
        status: row.application_status,
      })),
      ...appChefProfiles.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Chef profile",
        title: row.kitchen_name || row.display_name,
        detail: `${formatLabel(row.chef_type)} · ${row.city} · FSSAI ${formatLabel(row.fssai_status)}`,
        status: row.is_listed ? row.verification_status : "not listed",
      })),
      ...menuItems.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Menu item",
        title: row.name,
        detail: `${formatLabel(row.category)} · ₹${row.price_inr.toLocaleString("en-IN")}`,
        status: row.is_active ? "active" : "inactive",
      })),
      ...orders.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Order",
        title: formatLabel(row.order_type),
        detail: `${row.delivery_city} · Qty ${row.quantity}`,
        status: row.status,
      })),
      ...subscriptions.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Subscription",
        title: row.plan_type,
        detail: `${row.meals_per_week} meals/week · ${row.budget_range}`,
        status: row.status,
      })),
      ...mealPlans.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Meal plan",
        title: row.goal,
        detail: `${formatLabel(row.diet_type)} · ${row.city}`,
        status: row.status,
      })),
      ...lunchboxes.map((row) => ({
        id: row.id,
        created_at: row.created_at,
        type: "Lunchbox",
        title: row.child_age ? `Age ${row.child_age}` : "Lunchbox request",
        detail: row.city,
        status: row.status,
      })),
      ...appProfiles.map((row) => ({
        id: row.user_id,
        created_at: row.created_at,
        type: "Account",
        title: row.full_name,
        detail: `${formatLabel(row.default_role)} · ${row.city || "City not added"}`,
        status: row.phone ? "profile contact added" : "profile contact missing",
      })),
    ];
    const query = q.trim().toLowerCase();
    return rows
      .filter(
        (row) =>
          !query ||
          [row.type, row.title, row.detail, row.status].join(" ").toLowerCase().includes(query),
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [
    appChefProfiles,
    appProfiles,
    chefApplications,
    lunchboxes,
    mealPlans,
    menuItems,
    orders,
    q,
    subscriptions,
  ]);

  const cities = Array.from(new Set(research.map((row) => row.city))).sort();
  const todayKey = indiaDateKey(new Date());
  const todayVisits = visits.filter(
    (visit) => indiaDateKey(new Date(visit.visited_at)) === todayKey,
  );
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const sevenDayVisits = visits.filter(
    (visit) => new Date(visit.visited_at).getTime() >= sevenDaysAgo,
  );
  const queuedNotifications = notificationEvents.filter((event) => !event.processed_at).length;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  function changeTab(nextTab: AdminTab) {
    setTab(nextTab);
    setQ("");
  }

  function exportCsv() {
    if (tab === "operations") {
      const headers: Array<keyof OperationRow> = [
        "created_at",
        "type",
        "title",
        "detail",
        "status",
      ];
      downloadCsv(
        headers,
        operationRows.map((row) => headers.map((header) => String(row[header] ?? ""))),
        "app-operations",
      );
      return;
    }

    if (tab === "research") {
      const headers: Array<keyof ResearchRow> = [
        "created_at",
        "audience",
        "statements",
        "customer_order_frequency",
        "customer_monthly_budget",
        "chef_start_timeline",
        "chef_support_needs",
        "city",
        "full_name",
        "contact",
        "comments",
      ];
      downloadCsv(
        headers,
        filteredResearch.map((row) =>
          headers.map((header) => {
            const value = row[header];
            return Array.isArray(value) ? value.join(" | ") : String(value ?? "");
          }),
        ),
        "market-research",
      );
      return;
    }

    const headers =
      tab === "chefs"
        ? ["created_at", "name", "phone", "email", "role", "comments"]
        : tab === "customers"
          ? ["created_at", "name", "phone", "email", "preferred_service", "comments"]
          : ["created_at", "name", "phone", "email", "city", "role", "comments"];
    downloadCsv(
      headers,
      filteredStandardRows.map((row) => headers.map((header) => getEnrollmentValue(row, header))),
      tab,
    );
  }

  if (status === "checking") return <Centered>Loading…</Centered>;
  if (status === "noauth")
    return (
      <Centered>
        <p>Please sign in to access admin.</p>
        <Link
          to="/auth"
          className="mt-4 inline-block rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Sign in
        </Link>
      </Centered>
    );
  if (status === "notadmin")
    return (
      <Centered>
        <p className="text-lg font-medium">Not authorized</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your account is signed in but doesn’t have admin access.
        </p>
        <button
          onClick={signOut}
          className="mt-4 rounded-full border border-border px-4 py-2 text-sm"
        >
          Sign out
        </button>
      </Centered>
    );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-white/80 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <BrandLogo />
            <span className="hidden text-sm text-muted-foreground sm:inline">Admin</span>
          </Link>
          <button onClick={signOut} className="text-sm text-muted-foreground hover:text-foreground">
            Sign out
          </button>
        </div>
      </header>

      <main className="container-x py-10">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.18em] text-primary">
              Soru admin
            </p>
            <h1 className="mt-2 font-display text-4xl font-medium tracking-tight">
              Enrollments, app operations & market signals
            </h1>
          </div>
          {tab === "research" && (
            <p className="max-w-md text-sm leading-6 text-muted-foreground">
              Private, aggregated evidence from people who chose to share their view.
            </p>
          )}
        </div>

        <section
          className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"
          aria-label="Traffic overview"
        >
          <TrafficCard
            icon={Users}
            label="Visitors today"
            value={new Set(todayVisits.map((visit) => visit.visitor_id)).size}
            detail="Privacy-safe unique browsers"
          />
          <TrafficCard
            icon={Activity}
            label="Visits today"
            value={new Set(todayVisits.map((visit) => visit.session_id)).size}
            detail="Distinct browsing sessions"
          />
          <TrafficCard
            icon={Eye}
            label="Page views today"
            value={todayVisits.length}
            detail="Across public Soru pages"
          />
          <TrafficCard
            icon={BarChart3}
            label="7-day visitors"
            value={new Set(sevenDayVisits.map((visit) => visit.visitor_id)).size}
            detail={`${sevenDayVisits.length} page views`}
          />
          <TrafficCard
            icon={Bell}
            label="Alerts queued"
            value={queuedNotifications}
            detail={queuedNotifications ? "Awaiting delivery" : "Notification queue is clear"}
          />
        </section>

        <div className="mt-7 flex flex-wrap items-center gap-1 border-b border-border">
          <TabBtn active={tab === "chefs"} onClick={() => changeTab("chefs")}>
            Chefs ({chefs.length})
          </TabBtn>
          <TabBtn active={tab === "customers"} onClick={() => changeTab("customers")}>
            Customers ({customers.length})
          </TabBtn>
          <TabBtn active={tab === "waitlist"} onClick={() => changeTab("waitlist")}>
            Waitlist ({waitlist.length})
          </TabBtn>
          <TabBtn active={tab === "operations"} onClick={() => changeTab("operations")}>
            App live ({operationRows.length})
          </TabBtn>
          <TabBtn active={tab === "research"} onClick={() => changeTab("research")}>
            Research ({research.length})
          </TabBtn>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {tab === "research" && (
            <>
              <select
                value={audienceFilter}
                onChange={(event) => setAudienceFilter(event.target.value)}
                aria-label="Filter research by audience"
                className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="all">All audiences</option>
                {Object.entries(AUDIENCE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
                aria-label="Filter research by city"
                className="rounded-full border border-border bg-background px-4 py-2 text-sm outline-none focus:border-primary"
              >
                <option value="all">All cities</option>
                {cities.map((city) => (
                  <option key={city}>{city}</option>
                ))}
              </select>
            </>
          )}
          <label className="relative ml-auto min-w-56 flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <span className="sr-only">Search</span>
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              placeholder="Search…"
              className="w-full rounded-full border border-border bg-background py-2 pl-9 pr-4 text-sm outline-none focus:border-primary"
            />
          </label>
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <Download className="size-4" /> Export CSV
          </button>
        </div>

        {tab === "research" ? (
          <ResearchDashboard rows={filteredResearch} />
        ) : tab === "operations" ? (
          <OperationsDashboard
            profiles={appProfiles}
            chefApplications={chefApplications}
            chefProfiles={appChefProfiles}
            menuItems={menuItems}
            orders={orders}
            subscriptions={subscriptions}
            mealPlans={mealPlans}
            lunchboxes={lunchboxes}
            rows={operationRows}
          />
        ) : (
          <EnrollmentTable tab={tab} rows={filteredStandardRows} />
        )}
      </main>
    </div>
  );
}

function TrafficCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="mt-4 font-display text-4xl font-medium">{value.toLocaleString("en-IN")}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function OperationsDashboard({
  profiles,
  chefApplications,
  chefProfiles,
  menuItems,
  orders,
  subscriptions,
  mealPlans,
  lunchboxes,
  rows,
}: {
  profiles: AppProfileRow[];
  chefApplications: ChefApplicationRow[];
  chefProfiles: AppChefProfileRow[];
  menuItems: AppMenuItemRow[];
  orders: AppOrderRow[];
  subscriptions: AppSubscriptionRow[];
  mealPlans: AppMealPlanRow[];
  lunchboxes: AppLunchboxRow[];
  rows: OperationRow[];
}) {
  const customerAccounts = profiles.filter((row) => row.default_role === "customer").length;
  const chefAccounts = profiles.filter((row) => row.default_role === "chef").length;
  const submittedChefApplications = chefApplications.filter(
    (row) => row.application_status !== "draft",
  ).length;
  const visibleChefs = chefProfiles.filter((row) => row.is_listed).length;
  const activeMenus = menuItems.filter((row) => row.is_active).length;
  const openOrders = orders.filter(
    (row) => !["delivered", "cancelled"].includes(row.status),
  ).length;
  const openSubscriptions = subscriptions.filter((row) =>
    ["pending", "matched", "active"].includes(row.status),
  ).length;

  return (
    <div className="mt-7 space-y-6">
      <div className="rounded-3xl bg-[color:var(--ink)] p-6 text-white md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[color:var(--saffron)]">
              <PackageCheck className="size-4" /> Live app operations
            </div>
            <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">
              Real activity inside Soru
            </h2>
          </div>
          <p className="max-w-lg text-sm leading-6 text-white/55">
            This dashboard only shows records stored in Supabase. Empty sections mean no live data
            has been submitted yet.
          </p>
        </div>
        <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <DarkStat label="Total app accounts" value={profiles.length} />
          <DarkStat label="Customer accounts" value={customerAccounts} />
          <DarkStat label="Chef accounts" value={chefAccounts} />
          <DarkStat label="Chef applications" value={chefApplications.length} />
        </div>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <OperationMetric
          icon={ChefHat}
          label="Submitted applications"
          value={submittedChefApplications}
          detail={`${chefApplications.length - submittedChefApplications} draft applications`}
        />
        <OperationMetric
          icon={Users}
          label="Listed chef profiles"
          value={visibleChefs}
          detail={`${chefProfiles.length} chef profiles total`}
        />
        <OperationMetric
          icon={ClipboardList}
          label="Active menu items"
          value={activeMenus}
          detail={`${menuItems.length} menu items total`}
        />
        <OperationMetric
          icon={PackageCheck}
          label="Open order requests"
          value={openOrders}
          detail={`${orders.length} order requests total`}
        />
        <OperationMetric
          icon={BarChart3}
          label="Open subscriptions"
          value={openSubscriptions}
          detail={`${subscriptions.length} subscription requests total`}
        />
        <OperationMetric
          icon={Sparkles}
          label="Meal-plan requests"
          value={mealPlans.length}
          detail="Personalised nutrition intake"
        />
        <OperationMetric
          icon={Activity}
          label="Lunchbox requests"
          value={lunchboxes.length}
          detail="Kids lunchbox customisation"
        />
        <OperationMetric
          icon={Bell}
          label="Latest live records"
          value={rows.length}
          detail="Accounts + operational activity"
        />
      </section>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl font-medium">Live activity log</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Newest accounts, applications, profiles, menus, orders, subscriptions, and requests.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Record</th>
                <th className="px-4 py-3">Detail</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                    No live app activity matches this view yet.
                  </td>
                </tr>
              ) : (
                rows.slice(0, 120).map((row) => (
                  <tr key={`${row.type}-${row.id}`} className="border-t border-border">
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-medium">{row.type}</td>
                    <td className="max-w-xs px-4 py-4">{row.title}</td>
                    <td className="max-w-sm px-4 py-4 text-muted-foreground">{row.detail}</td>
                    <td className="px-4 py-4">
                      <StatusBadge>{formatLabel(row.status)}</StatusBadge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function DarkStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-[color:var(--ink)] p-5 md:p-6">
      <div className="font-display text-4xl text-[color:var(--saffron)]">
        {value.toLocaleString("en-IN")}
      </div>
      <div className="mt-2 text-sm font-semibold">{label}</div>
    </div>
  );
}

function OperationMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Users;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">
          {label}
        </span>
        <Icon className="size-4 text-primary" />
      </div>
      <div className="mt-4 font-display text-4xl font-medium">{value.toLocaleString("en-IN")}</div>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </article>
  );
}

function ResearchDashboard({ rows }: { rows: ResearchRow[] }) {
  const customerRows = rows.filter(isCustomer);
  const chefRows = rows.filter(isChef);
  const monthlyPlan = metric(customerRows, (row) => row.statements.includes("monthly_plan"));
  const directChefs = metric(rows, (row) => row.statements.includes("direct_from_chefs"));
  const referrals = metric(rows, (row) => row.statements.includes("refer_a_cook"));
  const chefEarning = metric(chefRows, (row) => row.statements.includes("earn_from_cooking"));
  const dates = rows.map((row) => new Date(row.created_at).getTime()).filter(Number.isFinite);
  const dateRange = dates.length
    ? `${new Date(Math.min(...dates)).toLocaleDateString()} – ${new Date(Math.max(...dates)).toLocaleDateString()}`
    : "No responses in this view";

  return (
    <div className="mt-7 space-y-6">
      <div className="rounded-3xl bg-[color:var(--ink)] p-6 text-white md:p-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[.16em] text-[color:var(--saffron)]">
              <BarChart3 className="size-4" /> Investor evidence
            </div>
            <h2 className="mt-3 font-display text-3xl font-medium md:text-4xl">
              What people are telling Soru
            </h2>
          </div>
          <p className="text-sm text-white/55">
            Visible sample: <strong className="text-white">{rows.length}</strong> · {dateRange}
          </p>
        </div>
        <div className="mt-7 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Monthly-plan intent" metric={monthlyPlan} />
          <MetricCard label="Excited to buy from chefs" metric={directChefs} />
          <MetricCard label="Would refer a great cook" metric={referrals} />
          <MetricCard label="Chef earning intent" metric={chefEarning} />
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <DistributionCard
          title="Expected order frequency"
          rows={customerRows}
          values={Object.entries(FREQUENCY_LABELS)}
          getValue={(row) => row.customer_order_frequency}
        />
        <DistributionCard
          title="Comfortable monthly budget"
          rows={customerRows}
          values={Object.entries(BUDGET_LABELS)}
          getValue={(row) => row.customer_monthly_budget}
        />
        <DistributionCard
          title="Chef readiness"
          rows={chefRows}
          values={Object.entries(TIMELINE_LABELS)}
          getValue={(row) => row.chef_start_timeline}
        />
        <MultiDistributionCard
          title="Support chefs need most"
          rows={chefRows}
          values={Object.entries(SUPPORT_LABELS)}
        />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-display text-2xl font-medium">Individual responses</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Private responses for follow-up and qualitative research.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Audience</th>
                <th className="px-4 py-3">Signals</th>
                <th className="px-4 py-3">Validation</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Name & contact</th>
                <th className="px-4 py-3">Comment</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No research responses match these filters yet.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-muted-foreground">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-4 font-medium">{AUDIENCE_LABELS[row.audience]}</td>
                    <td className="max-w-sm px-4 py-4">
                      <div className="flex flex-wrap gap-1.5">
                        {row.statements.map((item) => (
                          <span
                            key={item}
                            className="rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary"
                          >
                            {STATEMENT_LABELS[item]}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="max-w-xs px-4 py-4 text-xs leading-6 text-muted-foreground">
                      {row.customer_order_frequency && (
                        <div>{FREQUENCY_LABELS[row.customer_order_frequency]}</div>
                      )}
                      {row.customer_monthly_budget && (
                        <div>{BUDGET_LABELS[row.customer_monthly_budget]} monthly</div>
                      )}
                      {row.chef_start_timeline && (
                        <div>{TIMELINE_LABELS[row.chef_start_timeline]}</div>
                      )}
                      {row.chef_support_needs.length > 0 && (
                        <div>
                          {row.chef_support_needs.map((item) => SUPPORT_LABELS[item]).join(", ")}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-4">{row.city}</td>
                    <td className="max-w-sm px-4 py-4">
                      <div className="font-medium">
                        {row.full_name || "Not captured in earlier response"}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {row.contact || "Not captured in earlier response"}
                      </div>
                    </td>
                    <td className="max-w-sm px-4 py-4">
                      {row.comments && (
                        <div className="whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                          {row.comments}
                        </div>
                      )}
                      {!row.comments && <span className="text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function EnrollmentTable({
  tab,
  rows,
}: {
  tab: Exclude<AdminTab, "research" | "operations">;
  rows: EnrollmentRow[];
}) {
  return (
    <div className="mt-6 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Name</th>
            <th className="px-4 py-3">Phone</th>
            <th className="px-4 py-3">Email</th>
            <th className="px-4 py-3">
              {tab === "chefs" ? "Role" : tab === "customers" ? "Preferred Service" : "City · Role"}
            </th>
            <th className="px-4 py-3">Comments</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                No live submissions match this view yet.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(row.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-medium">{row.name}</td>
                <td className="px-4 py-3">
                  <div>{row.phone}</div>
                  {getPhoneValidationError(row.phone) && (
                    <span className="mt-1 inline-flex rounded-full bg-destructive/10 px-2 py-0.5 text-[0.68rem] font-semibold text-destructive">
                      Review phone
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">{row.email}</td>
                <td className="px-4 py-3">{getEnrollmentCategory(row, tab)}</td>
                <td className="max-w-sm px-4 py-3 text-muted-foreground">{row.comments || "—"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
      {children}
    </span>
  );
}

function MetricCard({ label, metric: value }: { label: string; metric: Metric }) {
  return (
    <div className="bg-[color:var(--ink)] p-5 md:p-6">
      <div className="font-display text-4xl text-[color:var(--saffron)]">{value.percent}%</div>
      <div className="mt-2 text-sm font-semibold">{label}</div>
      <div className="mt-1 text-xs text-white/45">
        {value.count} of {value.sample} eligible responses
      </div>
    </div>
  );
}

function DistributionCard({
  title,
  rows,
  values,
  getValue,
}: {
  title: string;
  rows: ResearchRow[];
  values: Array<[string, string]>;
  getValue: (row: ResearchRow) => string | null;
}) {
  return (
    <DistributionShell title={title} sample={rows.length}>
      {values.map(([value, label]) => {
        const count = rows.filter((row) => getValue(row) === value).length;
        return <DistributionBar key={value} label={label} count={count} sample={rows.length} />;
      })}
    </DistributionShell>
  );
}

function MultiDistributionCard({
  title,
  rows,
  values,
}: {
  title: string;
  rows: ResearchRow[];
  values: Array<[string, string]>;
}) {
  return (
    <DistributionShell title={title} sample={rows.length}>
      {values.map(([value, label]) => {
        const count = rows.filter((row) => row.chef_support_needs.includes(value)).length;
        return <DistributionBar key={value} label={label} count={count} sample={rows.length} />;
      })}
    </DistributionShell>
  );
}

function DistributionShell({
  title,
  sample,
  children,
}: {
  title: string;
  sample: number;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-2xl font-medium">{title}</h3>
        <span className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">
          n={sample}
        </span>
      </div>
      <div className="mt-5 space-y-4">{children}</div>
    </section>
  );
}

function DistributionBar({
  label,
  count,
  sample,
}: {
  label: string;
  count: number;
  sample: number;
}) {
  const percent = sample ? Math.round((count / sample) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between gap-3 text-xs">
        <span className="font-medium">{label}</span>
        <span className="text-muted-foreground">
          {count} · {percent}%
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
        <div className="h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

type Metric = { count: number; sample: number; percent: number };

function metric(rows: ResearchRow[], predicate: (row: ResearchRow) => boolean): Metric {
  const count = rows.filter(predicate).length;
  return {
    count,
    sample: rows.length,
    percent: rows.length ? Math.round((count / rows.length) * 100) : 0,
  };
}

function isCustomer(row: ResearchRow) {
  return row.audience === "customer" || row.audience === "both";
}

function isChef(row: ResearchRow) {
  return row.audience !== "customer";
}

function downloadCsv(headers: readonly string[], rows: string[][], filename: string) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const lines = [headers.map(escape).join(","), ...rows.map((row) => row.map(escape).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getEnrollmentValue(row: EnrollmentRow, header: string) {
  if (header === "created_at") return row.created_at;
  if (header === "name") return row.name;
  if (header === "phone") return row.phone;
  if (header === "email") return row.email;
  if (header === "comments") return row.comments ?? "";
  if (header === "role" && "role" in row) return row.role;
  if (header === "preferred_service" && "preferred_service" in row) return row.preferred_service;
  if (header === "city" && "city" in row) return row.city;
  return "";
}

function getEnrollmentCategory(
  row: EnrollmentRow,
  tab: Exclude<AdminTab, "research" | "operations">,
) {
  if (tab === "chefs" && "role" in row) return formatLabel(row.role);
  if (tab === "customers" && "preferred_service" in row) return row.preferred_service;
  if (tab === "waitlist" && "city" in row && "role" in row)
    return `${row.city} · ${formatLabel(row.role)}`;
  return "—";
}

function formatLabel(value: string) {
  return value
    ?.split("_")
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(" ");
}

function indiaDateKey(value: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative px-4 py-2 text-sm font-medium transition ${active ? "text-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
      {active && <span className="absolute inset-x-2 -bottom-px h-0.5 bg-primary" />}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-sm text-center">{children}</div>
    </div>
  );
}
