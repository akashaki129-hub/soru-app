import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent, type ReactNode } from "react";
import {
  ArrowRight,
  Bike,
  CalendarDays,
  Check,
  Clock3,
  GraduationCap,
  HeartHandshake,
  Instagram,
  Linkedin,
  MapPin,
  ShieldCheck,
  Sparkles,
  Store,
  Smartphone,
  Users,
  UtensilsCrossed,
  type LucideIcon,
} from "lucide-react";
import heroChef from "@/assets/hero-chef.jpg";
import healthyThali from "@/assets/healthy-thali.jpg";
import professionalLunch from "@/assets/professional-lunch.jpg";
import chefCooking from "@/assets/chef-cooking.jpg";
import { BrandLogo } from "@/components/brand-logo";
import { MarketFeedbackSurvey } from "@/components/market-feedback-survey";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Soru — Every chef’s special, closer to home." },
      {
        name: "description",
        content:
          "Soru is a chef-powered food services marketplace for affordable meals from verified chefs and income opportunities for skilled cooks.",
      },
    ],
  }),
  component: Landing,
});

type ServiceGroup = {
  icon: LucideIcon;
  number: string;
  title: string;
  copy: string;
  services: string[];
  image?: string;
};

const serviceGroups: ServiceGroup[] = [
  {
    icon: UtensilsCrossed,
    number: "01",
    title: "Everyday meals, made personal",
    copy: "Personalized nutrition plans and healthy home-style food, shaped around your goals, routine and preferences.",
    services: [
      "Healthy home-style meals",
      "Personalized nutrition plans",
      "Verified independent chefs",
      "Breakfast subscriptions",
      "Lunch subscriptions",
      "Dinner subscriptions",
      "Full-day plans",
    ],
    image: healthyThali,
  },
  {
    icon: Bike,
    number: "02",
    title: "Order your way",
    copy: "Commit to a routine or simply order what you need today — with delivery that works around you.",
    services: [
      "Single meals",
      "Chef combos",
      "Group orders",
      "Scheduled delivery",
      "Instant delivery",
    ],
  },
  {
    icon: GraduationCap,
    number: "03",
    title: "Student lunchboxes",
    copy: "Fresh, balanced food for individual students and complete programs for schools and colleges.",
    services: [
      "Weekly lunchbox",
      "Monthly saver",
      "Daily pick",
      "Allergy-aware options",
      "School & campus delivery",
      "Parent controls",
      "Institutional & bulk programs",
    ],
    image: professionalLunch,
  },
  {
    icon: Store,
    number: "04",
    title: "A launchpad for chefs",
    copy: "We guide independent chefs and home cooks through food registration, FSSAI licensing and the steps to launch with confidence.",
    services: [
      "Home chefs",
      "Homemakers",
      "Culinary students",
      "Professional chefs",
      "Caterers",
      "FSSAI & food license guidance",
      "Compliance checklists",
      "Kitchen verification support",
      "Onboarding resources",
    ],
    image: chefCooking,
  },
];

const isAppOnlyDeployment = import.meta.env.VITE_SORU_APP_ONLY === "true";

function Landing() {
  if (isAppOnlyDeployment) {
    return <AppGateway />;
  }

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      <Nav />
      <main>
        <Hero />
        <MissionVision />
        <WhatSoruIs />
        <FoodThatFits />
        <Services />
        <WhySoru />
        <Enrollment />
      </main>
      <Footer />
      <MarketFeedbackSurvey />
    </div>
  );
}

function AppGateway() {
  return (
    <div className="min-h-screen overflow-hidden bg-[color:var(--ink)] text-white">
      <div className="hero-mesh pointer-events-none fixed inset-0 opacity-80" />
      <main className="container-x relative flex min-h-screen items-center py-10">
        <section className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1fr_.82fr]">
          <div>
            <BrandLogo className="brightness-0 invert" />
            <Pill dark>
              <Smartphone className="size-3.5" /> Soru mobile app
            </Pill>
            <h1 className="mt-7 max-w-3xl text-balance font-display text-[clamp(3rem,8vw,6.2rem)] font-medium leading-[.9] tracking-[-0.055em]">
              Every chef’s special,
              <span className="block italic text-[color:var(--saffron)]">closer to home.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-balance text-base leading-7 text-white/68 md:text-lg">
              Sign in to discover verified chefs, customize subscriptions, request AI-assisted
              nutrition plans, or build your chef business on Soru.
            </p>
            <div className="mt-8 grid gap-3 sm:max-w-xl sm:grid-cols-2">
              <CTA href="/soru-auth?role=customer">Join as a customer</CTA>
              <CTA href="/soru-auth?role=chef" secondary>
                Build your chef business
              </CTA>
            </div>
            <div className="mt-6 flex flex-wrap gap-2 text-xs text-white/70">
              {[
                "Personalized meal plans",
                "Student lunchboxes",
                "Chef menus",
                "FSSAI guidance",
              ].map((item) => (
                <span
                  key={item}
                  className="rounded-full border border-white/12 bg-white/5 px-3 py-1.5"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.07] p-4 shadow-2xl backdrop-blur-xl">
            <div className="rounded-[1.5rem] bg-white p-4 text-[color:var(--ink)]">
              <div className="rounded-[1.25rem] bg-[color:var(--cream)] p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[.18em] text-muted-foreground">
                      Today on Soru
                    </p>
                    <h2 className="mt-2 font-display text-3xl tracking-[-0.04em]">
                      Food that fits your life.
                    </h2>
                  </div>
                  <div className="grid size-12 place-items-center rounded-2xl bg-[color:var(--saffron)]">
                    <UtensilsCrossed className="size-6" />
                  </div>
                </div>
                <div className="mt-6 grid gap-3">
                  {[
                    ["Explore chefs", "Find nearby verified chefs and home cooks."],
                    ["Meal plans", "Request nutrition-aware subscriptions."],
                    ["Lunchbox", "Customize healthier meals for kids and students."],
                    ["Chef Studio", "Apply, add menus, manage orders, and grow."],
                  ].map(([title, copy]) => (
                    <div key={title} className="rounded-2xl border border-border bg-white p-4">
                      <div className="font-semibold">{title}</div>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{copy}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <a
                  href="/app"
                  className="rounded-2xl bg-[color:var(--ink)] px-4 py-3 text-center text-sm font-semibold text-white"
                >
                  Customer dashboard
                </a>
                <a
                  href="/chef-studio"
                  className="rounded-2xl border border-border px-4 py-3 text-center text-sm font-semibold"
                >
                  Chef Studio
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function Nav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-border bg-white/95 text-foreground backdrop-blur-xl">
      <div className="container-x flex h-16 items-center justify-between">
        <a href="#top" aria-label="Soru home">
          <BrandLogo />
        </a>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#mission" className="transition hover:text-foreground">
            Mission
          </a>
          <a href="#vision" className="transition hover:text-foreground">
            Vision
          </a>
          <a href="/chef-studio" className="transition hover:text-foreground">
            For chefs
          </a>
          <a href="/app" className="transition hover:text-foreground">
            Soru app
          </a>
        </nav>
        <a
          href="/soru-auth"
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:-translate-y-0.5 hover:brightness-105"
        >
          Get started <ArrowRight className="size-4" />
        </a>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section id="top" className="relative bg-[color:var(--ink)] pt-16 text-white">
      <div className="hero-mesh pointer-events-none absolute inset-0 opacity-80" />
      <div className="container-x relative grid min-h-[760px] items-center gap-12 py-16 lg:grid-cols-[1.1fr_.9fr] lg:py-20">
        <div className="max-w-3xl">
          <Pill dark>
            <MapPin className="size-3.5" /> Bengaluru · Chennai · Hyderabad
          </Pill>
          <h1 className="mt-7 max-w-4xl text-balance font-display text-[clamp(3.1rem,7vw,6.6rem)] font-medium leading-[.9] tracking-[-0.055em]">
            Every chef’s special,
            <span className="block italic text-[color:var(--saffron)]">closer to home.</span>
          </h1>
          <p className="mt-7 max-w-2xl text-balance text-base leading-7 text-white/68 md:text-lg">
            Soru is a chef-powered food services marketplace where customers discover affordable,
            trusted meals from verified chefs — and skilled cooks turn their cooking ability into
            income.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <CTA href="/soru-auth?role=customer">Join as a customer</CTA>
            <CTA href="/soru-auth?role=chef" secondary>
              Build your chef business
            </CTA>
          </div>
          <div className="mt-5">
            <p className="font-display text-lg font-medium text-white md:text-xl">
              Meals from <span className="text-[color:var(--saffron)]">₹99/order</span>
              <span className="mx-2 text-white/25">·</span>
              Monthly plans from <span className="text-[color:var(--saffron)]">₹2,999*</span>
            </p>
            <p className="mt-1.5 max-w-xl text-xs leading-5 text-white/42">
              *Starting prices vary by chef, menu, meal frequency, and delivery location.
            </p>
          </div>
          <div className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-white/12 pt-6 text-sm text-white/60">
            <TrustLine icon={Sparkles}>Personalized nutrition plans</TrustLine>
            <TrustLine icon={ShieldCheck}>Food license guidance for chefs</TrustLine>
            <TrustLine icon={Clock3}>Flexible ordering & delivery</TrustLine>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[520px] lg:mx-0 lg:ml-auto">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2.25rem] border border-white/15 bg-white/5">
            <img
              src={heroChef}
              alt="A chef thoughtfully plating a fresh meal"
              width={1024}
              height={1280}
              className="size-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/15 bg-black/30 p-5 backdrop-blur-xl">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[.18em] text-white/55">
                    Today’s match
                  </div>
                  <div className="mt-1 font-display text-xl">Priya · South Indian</div>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1 text-sm text-[color:var(--saffron)]">
                  ★ 4.9
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/75">
                {["High protein", "Home-style", "Diabetic-friendly"].map((item) => (
                  <span key={item} className="rounded-full border border-white/12 px-3 py-1.5">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="absolute -left-8 top-16 hidden rounded-2xl border border-white/15 bg-[color:var(--paper)] p-4 text-[color:var(--ink)] shadow-2xl md:block">
            <div className="flex items-center gap-3">
              <span className="grid size-10 place-items-center rounded-full bg-[color:var(--sage)]/15">
                <ShieldCheck className="size-5 text-[color:var(--sage)]" />
              </span>
              <div>
                <div className="text-sm font-semibold">Kitchen verified</div>
                <div className="text-xs text-muted-foreground">FSSAI guidance included</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function MissionVision() {
  return (
    <section id="mission" className="grain-bg scroll-mt-24 py-20 md:py-28">
      <div className="container-x">
        <div className="mx-auto max-w-4xl text-center">
          <Pill>Our purpose</Pill>
          <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-[.98] tracking-[-.045em] md:text-6xl">
            Our Mission <span className="italic text-primary">&amp; Vision</span>
          </h2>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-muted-foreground md:text-lg">
            Soru is not just a food delivery platform. It is a marketplace for food talent,
            affordable everyday meals, and chef-led food services.
          </p>
        </div>

        <div className="mt-12 grid gap-5 lg:grid-cols-2">
          <article className="relative overflow-hidden rounded-[2rem] bg-[color:var(--ink)] p-7 text-white shadow-[var(--shadow-soft)] md:p-10">
            <div className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[color:var(--saffron)]/15 blur-2xl" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[.68rem] font-semibold uppercase tracking-[.18em] text-[color:var(--saffron)]">
                01 · Mission
              </span>
              <h3 className="mt-7 font-display text-4xl font-medium md:text-5xl">Mission</h3>
              <div className="mt-6 space-y-4 text-sm leading-7 text-white/65 md:text-base">
                <p>
                  Soru’s mission is to make good food more affordable and accessible while creating
                  income opportunities for anyone with verified cooking skill.
                </p>
                <p>
                  We are building a platform where home chefs, homemakers, culinary students,
                  professional cooks, caterers, and emerging food entrepreneurs can turn their
                  cooking ability into a real business. At the same time, customers get access to
                  affordable, trustworthy, home-style meals without the heavy cost usually
                  associated with restaurants and hotels.
                </p>
                <p className="font-medium text-white">
                  Soru is not only a food platform. It is an income-generation platform for skilled
                  cooks and a better everyday food solution for customers.
                </p>
              </div>
            </div>
          </article>

          <article
            id="vision"
            className="relative scroll-mt-24 overflow-hidden rounded-[2rem] border border-border bg-card p-7 shadow-[var(--shadow-soft)] md:p-10"
          >
            <div className="pointer-events-none absolute -bottom-20 -right-12 size-64 rounded-full bg-primary/15 blur-3xl" />
            <div className="relative">
              <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1.5 text-[.68rem] font-semibold uppercase tracking-[.18em] text-muted-foreground">
                02 · Vision
              </span>
              <h3 className="mt-7 font-display text-4xl font-medium md:text-5xl">Vision</h3>
              <div className="mt-6 space-y-4 text-sm leading-7 text-muted-foreground md:text-base">
                <p>
                  Our vision is to become India’s most trusted food services marketplace — a
                  platform where the best cooking talent, from home kitchens to nationally
                  recognised chefs, can be discovered, trusted, and chosen by customers.
                </p>
                <p>
                  Soru aims to create access for food talent the way major marketplaces created
                  access for products and sellers. Anyone with the right cooking skill, quality
                  standards, and consistency should be able to build a livelihood and grow through
                  Soru.
                </p>
                <p className="font-medium text-foreground">
                  In the future, Soru will become the destination where customers find affordable
                  daily meals, personalised food plans, student lunchboxes, family subscriptions,
                  corporate meals, chef specials, make-your-own-menu options, and chef-led food
                  experiences.
                </p>
              </div>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}

function WhatSoruIs() {
  const audiences = [
    {
      icon: Users,
      title: "For customers",
      copy: "Affordable, trusted meals from verified chefs — built around taste, health goals, routine, family needs, and budget.",
    },
    {
      icon: Store,
      title: "For chefs",
      copy: "A platform to earn, build a food identity, publish menus, receive orders, grow subscriptions, and get discovered.",
    },
    {
      icon: GraduationCap,
      title: "For families & students",
      copy: "Fresh lunchboxes, monthly meal plans, allergy-aware options, and dependable food without restaurant-style costs.",
    },
    {
      icon: Sparkles,
      title: "For the future of food",
      copy: "A chef-led marketplace where people explore chef specials, regional dishes, make-your-own menus, and recognised chefs from across India.",
    },
  ];

  return (
    <section className="border-y border-border bg-secondary/55 py-16 md:py-20">
      <div className="container-x">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Pill>The marketplace</Pill>
            <h2 className="mt-5 text-balance font-display text-4xl font-medium leading-none md:text-5xl">
              What Soru <span className="italic text-primary">really is</span>
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-muted-foreground">
            One trusted platform serving the people who eat, the people who cook, and the food
            culture they create together.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {audiences.map(({ icon: Icon, title, copy }) => (
            <article
              key={title}
              className="rounded-3xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-7"
            >
              <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-6 font-display text-2xl font-medium">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function FoodThatFits() {
  const needs = [
    "Everyday eating",
    "Fitness goals",
    "Vegan lifestyles",
    "Office lunches",
    "Student meals",
    "Family meals",
    "Personalized nutrition plans",
  ];

  return (
    <section
      id="food-that-fits"
      className="relative overflow-hidden bg-[color:var(--ink)] py-20 text-white md:py-28"
    >
      <div className="hero-mesh pointer-events-none absolute inset-0 opacity-45" />
      <div className="container-x relative">
        <div className="grid gap-12 lg:grid-cols-[.9fr_1.1fr] lg:gap-20">
          <div>
            <Pill dark>Made for real life</Pill>
            <h2 className="mt-6 max-w-2xl text-balance font-display text-5xl font-medium leading-[.95] tracking-[-.045em] md:text-6xl">
              Food that fits your life.{" "}
              <span className="italic text-[color:var(--saffron)]">Not just your cravings.</span>
            </h2>
          </div>

          <div className="lg:border-l lg:border-white/12 lg:pl-16">
            <p className="max-w-xl font-display text-2xl leading-snug text-white md:text-3xl">
              Restaurant menus are built for everyone.{" "}
              <span className="text-white/58">
                Your body, goals, and food choices are personal.
              </span>
            </p>
            <div className="mt-8 max-w-2xl space-y-5 text-base leading-7 text-white/65 md:text-lg md:leading-8">
              <p>
                Soru helps you discover chef-made meals for everyday eating, fitness goals, vegan
                lifestyles, office lunches, student meals, family meals, and personalized nutrition
                plans.
              </p>
              <p>
                Whether you want high-protein meals, clean vegetarian food, vegan bowls,
                calorie-conscious lunches, or comforting regional specials — Soru brings every
                chef’s special closer to home.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap gap-2 border-t border-white/12 pt-8">
          {needs.map((need) => (
            <span
              key={need}
              className="rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-xs font-semibold text-white/72 backdrop-blur"
            >
              {need}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

function Services() {
  return (
    <section id="services" className="py-20 md:py-28">
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
          <div>
            <Pill>Everything Soru</Pill>
            <h2 className="mt-5 max-w-xl text-balance font-display text-4xl font-medium leading-[.98] tracking-[-.045em] md:text-6xl">
              One platform. <span className="italic text-primary">Every way to eat better.</span>
            </h2>
          </div>
          <p className="max-w-xl text-base leading-7 text-muted-foreground lg:ml-auto lg:text-lg">
            A complete food ecosystem for customers, students, institutions and culinary
            entrepreneurs — organized simply, without hiding the details.
          </p>
        </div>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {serviceGroups.map((group, index) => (
            <ServiceCard key={group.title} group={group} featured={index === 0 || index === 3} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ServiceCard({ group, featured }: { group: ServiceGroup; featured?: boolean }) {
  const Icon = group.icon;
  return (
    <article className={`service-card group ${featured ? "lg:min-h-[540px]" : "lg:min-h-[430px]"}`}>
      {group.image && (
        <div className="absolute inset-0">
          <img
            src={group.image}
            alt=""
            loading="lazy"
            className="size-full object-cover opacity-[.13] grayscale transition duration-700 group-hover:scale-[1.02] group-hover:opacity-[.19]"
          />
          <div className="absolute inset-0 bg-gradient-to-br from-card via-card/95 to-card/70" />
        </div>
      )}
      <div className="relative flex h-full flex-col">
        <div className="flex items-center justify-between">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Icon className="size-5" />
          </span>
          <span className="font-display text-sm italic text-muted-foreground">{group.number}</span>
        </div>
        <h3 className="mt-8 max-w-md font-display text-3xl font-medium leading-tight md:text-4xl">
          {group.title}
        </h3>
        <p className="mt-4 max-w-lg leading-7 text-muted-foreground">{group.copy}</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-8">
          {group.services.map((service) => {
            const highlighted =
              service === "Personalized nutrition plans" ||
              service === "FSSAI & food license guidance";
            return (
              <span
                key={service}
                className={`rounded-full border px-3 py-2 text-xs font-semibold backdrop-blur ${
                  highlighted
                    ? "border-transparent bg-[color:var(--saffron)] text-[color:var(--ink)] shadow-sm"
                    : "border-border bg-background/75 text-foreground/80"
                }`}
              >
                {highlighted && <Sparkles className="mr-1.5 inline size-3" />}
                {service}
              </span>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function WhySoru() {
  const points = [
    {
      icon: ShieldCheck,
      title: "Trust, built in",
      copy: "Verified chef profiles, kitchen checks and transparent standards.",
    },
    {
      icon: Sparkles,
      title: "Made for you",
      copy: "Personalized nutrition plans shaped around goals, preferences and family needs.",
    },
    {
      icon: CalendarDays,
      title: "Flexible by design",
      copy: "Subscribe, order once, schedule ahead or choose instant delivery.",
    },
    {
      icon: HeartHandshake,
      title: "Chefs grow too",
      copy: "Food license and FSSAI guidance for independent chefs and home cooks.",
    },
    {
      icon: Store,
      title: "Income for skilled cooks",
      copy: "Soru helps verified cooks, homemakers, culinary students, and chefs turn their cooking skill into a real earning opportunity.",
    },
  ];
  return (
    <section
      id="why"
      className="border-y border-border bg-[color:var(--ink)] py-20 text-white md:py-24"
    >
      <div className="container-x">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Pill dark>Why Soru</Pill>
            <h2 className="mt-5 max-w-2xl text-balance font-display text-4xl font-medium leading-none md:text-5xl">
              More than delivery.{" "}
              <span className="italic text-[color:var(--saffron)]">
                A better food relationship.
              </span>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-6 text-white/55">
            Thoughtful choices for customers. Sustainable opportunity for the people who cook.
          </p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 md:grid-cols-2 lg:grid-cols-5">
          {points.map(({ icon: Icon, title, copy }) => (
            <div key={title} className="bg-[color:var(--ink)] p-7 md:p-8">
              <Icon className="size-6 text-[color:var(--saffron)]" />
              <h3 className="mt-8 font-display text-2xl">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/55">{copy}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Enrollment() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const payload = {
      name: String(data.get("name") || "").trim(),
      email: String(data.get("email") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      city: String(data.get("city") || "").trim(),
      role: String(data.get("role") || "").trim(),
      comments: String(data.get("comments") || "").trim() || null,
    };

    setLoading(true);
    const { error } = await supabase.from("waitlist_entries").insert(payload);
    setLoading(false);
    if (error) {
      console.error("Waitlist submission failed", error);
      toast.error("We couldn't save your waitlist entry. Please try again.");
      return;
    }
    setSubmitted(true);
    toast.success("You're on the Soru waitlist!");
  };

  return (
    <section id="waitlist" className="pb-20 md:pb-28">
      <div className="container-x">
        <div className="relative overflow-hidden rounded-[2.5rem] bg-[color:var(--terracotta)] text-white">
          <div className="absolute right-0 top-0 hidden h-full w-2/5 lg:block">
            <img
              src={chefCooking}
              alt="Chef preparing a fresh meal"
              loading="lazy"
              className="size-full object-cover opacity-25 mix-blend-luminosity"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[color:var(--terracotta)] to-transparent" />
          </div>
          <div className="relative grid gap-10 p-7 md:p-12 lg:grid-cols-[.85fr_1.15fr] lg:p-16">
            <div>
              <Pill dark>Come to the table</Pill>
              <h2 className="mt-5 max-w-lg text-balance font-display text-4xl font-medium leading-[.98] md:text-6xl">
                Better food starts with{" "}
                <span className="italic text-[color:var(--saffron)]">one good choice.</span>
              </h2>
              <p className="mt-6 max-w-md leading-7 text-white/70">
                Join as a customer or become a founding chef. We’ll reach out as Soru opens in your
                city.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/enroll"
                  className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[color:var(--terracotta)] transition hover:-translate-y-0.5"
                >
                  Full customer enrollment
                </a>
                <a
                  href="/join-as-chef"
                  className="rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  Founding chef application
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-white/15 bg-black/10 p-5 backdrop-blur-md md:p-7">
              {submitted ? (
                <div className="grid min-h-80 place-items-center text-center">
                  <div>
                    <span className="mx-auto grid size-14 place-items-center rounded-full bg-white text-[color:var(--terracotta)]">
                      <Check className="size-6" />
                    </span>
                    <h3 className="mt-5 font-display text-3xl">You’re on the list.</h3>
                    <p className="mt-2 text-sm text-white/65">
                      We’ll be in touch when Soru opens in your city.
                    </p>
                  </div>
                </div>
              ) : (
                <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
                  <Field label="Name" name="name" placeholder="Your name" required />
                  <Field
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                  <Field label="Mobile" name="phone" type="tel" placeholder="+91" required />
                  <Select
                    label="City"
                    name="city"
                    options={["Bengaluru", "Chennai", "Hyderabad", "Other"]}
                  />
                  <div className="sm:col-span-2">
                    <Select
                      label="I am a…"
                      name="role"
                      options={[
                        "Customer",
                        "Chef",
                        "Culinary Student",
                        "Homemaker",
                        "Caterer",
                        "Nutrition Enthusiast",
                      ]}
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea
                      label="What would you like Soru to know? (optional)"
                      name="comments"
                      placeholder="Customers: tell us what you need. Chefs: share your goals, ideas, or support you’re looking for."
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[color:var(--saffron)] px-5 py-3.5 text-sm font-semibold text-[color:var(--ink)] transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-60 sm:col-span-2"
                  >
                    {loading ? "Saving…" : "Join the waitlist"} <ArrowRight className="size-4" />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border py-10">
      <div className="container-x flex flex-col gap-7 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <BrandLogo />
          <div>
            <div className="text-xs text-muted-foreground">
              Every chef’s special, closer to home.
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-5">
          <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <a href="#services" className="hover:text-foreground">
              Services
            </a>
            <a href="/join-as-chef" className="hover:text-foreground">
              For chefs
            </a>
            <a href="/app" className="hover:text-foreground">
              Soru app
            </a>
            <a href="/chef-studio" className="hover:text-foreground">
              Chef studio
            </a>
            <a href="/enroll" className="hover:text-foreground">
              For customers
            </a>
            <a href="#" className="hover:text-foreground">
              Privacy
            </a>
            <a href="#" className="hover:text-foreground">
              Terms
            </a>
          </nav>
          <div className="flex items-center gap-2" aria-label="Follow Soru">
            <SocialLink href="https://www.instagram.com/soru.india/" label="Soru on Instagram">
              <Instagram className="size-4" />
            </SocialLink>
            <SocialLink href="https://www.linkedin.com/company/soru-india" label="Soru on LinkedIn">
              <Linkedin className="size-4" />
            </SocialLink>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} Soru · Made in India
        </div>
      </div>
    </footer>
  );
}

function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="inline-flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:-translate-y-0.5 hover:border-[color:var(--saffron)] hover:text-foreground"
    >
      {children}
    </a>
  );
}

function Pill({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[.68rem] font-semibold uppercase tracking-[.18em] ${dark ? "border-white/15 bg-white/5 text-white/65" : "border-border bg-card text-muted-foreground"}`}
    >
      {children}
    </div>
  );
}

function CTA({
  children,
  href,
  secondary = false,
}: {
  children: ReactNode;
  href: string;
  secondary?: boolean;
}) {
  return (
    <a
      href={href}
      className={`inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-sm font-semibold transition hover:-translate-y-0.5 ${secondary ? "border border-white/18 bg-white/5 text-white hover:bg-white/10" : "bg-[color:var(--saffron)] text-[color:var(--ink)] hover:bg-white"}`}
    >
      {children} <ArrowRight className="size-4" />
    </a>
  );
}

function TrustLine({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Icon className="size-4 text-[color:var(--saffron)]" />
      {children}
    </span>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/55">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        maxLength={120}
        className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[color:var(--saffron)] focus:ring-2 focus:ring-[color:var(--saffron)]/20"
      />
    </label>
  );
}

function Select({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/55">
        {label}
      </span>
      <select
        name={name}
        className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none focus:border-[color:var(--saffron)] focus:ring-2 focus:ring-[color:var(--saffron)]/20"
      >
        {options.map((option) => (
          <option key={option} value={option} className="text-foreground">
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({
  label,
  name,
  placeholder,
}: {
  label: string;
  name: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[.68rem] font-semibold uppercase tracking-[.16em] text-white/55">
        {label}
      </span>
      <textarea
        name={name}
        placeholder={placeholder}
        maxLength={1500}
        className="min-h-28 w-full resize-y rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[color:var(--saffron)] focus:ring-2 focus:ring-[color:var(--saffron)]/20"
      />
    </label>
  );
}
