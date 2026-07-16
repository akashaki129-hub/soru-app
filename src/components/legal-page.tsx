import { Link } from "@tanstack/react-router";
import { BrandLogo } from "@/components/brand-logo";

export type LegalSection = {
  title: string;
  body: string[];
};

export function LegalPage({
  title,
  eyebrow,
  intro,
  sections,
}: {
  title: string;
  eyebrow: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-background/90 backdrop-blur">
        <div className="container-x flex h-16 items-center justify-between">
          <Link to="/" aria-label="Soru home">
            <BrandLogo />
          </Link>
          <Link
            to="/"
            className="text-sm font-semibold text-muted-foreground hover:text-foreground"
          >
            Back to Soru
          </Link>
        </div>
      </header>

      <main className="container-x py-14 md:py-20">
        <article className="mx-auto max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-primary">{eyebrow}</p>
          <h1 className="mt-4 text-balance font-display text-4xl font-medium tracking-tight md:text-6xl">
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
            {intro}
          </p>

          <div className="mt-10 space-y-5">
            {sections.map((section) => (
              <section
                key={section.title}
                className="rounded-3xl border border-border bg-card p-6 shadow-soft md:p-8"
              >
                <h2 className="font-display text-2xl font-medium">{section.title}</h2>
                <div className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
                  {section.body.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <p className="mt-8 text-xs leading-6 text-muted-foreground">
            Last updated: 16 July 2026. These pages are pilot-readiness documents and should be
            reviewed by counsel before large-scale commercial launch.
          </p>
        </article>
      </main>
    </div>
  );
}
