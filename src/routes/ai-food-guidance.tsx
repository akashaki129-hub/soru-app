import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/ai-food-guidance")({
  head: () => ({ meta: [{ title: "AI Food Guidance — Soru" }] }),
  component: AiFoodGuidancePage,
});

function AiFoodGuidancePage() {
  return (
    <LegalPage
      eyebrow="AI safety"
      title="AI Food Guidance"
      intro="Soru’s AI suggestions are assistive food-planning briefs for customers and chefs. They are not medical, diagnostic, or clinical nutrition advice."
      sections={[
        {
          title: "What AI can help with",
          body: [
            "AI can help summarize preferences, allergies, budget, food goals, lunchbox needs, and chef-ready meal ideas.",
            "AI outputs should be reviewed by the customer, chef, and Soru operations before being treated as part of an order or subscription.",
          ],
        },
        {
          title: "What AI must not do",
          body: [
            "AI must not diagnose conditions, prescribe treatment, promise medical outcomes, or replace advice from qualified healthcare professionals.",
            "For allergies, diabetes, pregnancy, child nutrition, severe dietary restrictions, or medical conditions, customers should consult qualified professionals.",
          ],
        },
        {
          title: "Cost and safety controls",
          body: [
            "Soru’s v2 roadmap includes per-user quotas, request logging, provider/model logging, timeout handling, feature flags, and graceful non-AI fallbacks.",
            "API keys must never be exposed to the client. AI calls should remain behind authenticated Supabase Edge Functions.",
          ],
        },
      ]}
    />
  );
}
