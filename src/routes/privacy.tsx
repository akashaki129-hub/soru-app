import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/privacy")({
  head: () => ({ meta: [{ title: "Privacy Policy — Soru" }] }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy Policy"
      intro="Soru collects only the information needed to run a controlled food-services pilot, contact interested customers and chefs, and operate authenticated marketplace features."
      sections={[
        {
          title: "Information we collect",
          body: [
            "We may collect name, phone number, email, city, locality, food preferences, allergies, chef application details, menu information, order requests, subscription requests, and customer support messages.",
            "When you use Soru’s AI food guidance features, we store the request details needed to generate and review a chef-ready food brief.",
          ],
        },
        {
          title: "How we use information",
          body: [
            "We use information to contact pilot users, review chef applications, support FSSAI-readiness workflows, manage orders, improve product safety, and understand early market demand.",
            "We do not display private contact details, identity documents, FSSAI documents, or sensitive chef verification materials publicly.",
          ],
        },
        {
          title: "Consent and contact",
          body: [
            "Public forms ask for consent before submission. By submitting a form, you agree that Soru may contact you about the pilot, onboarding, food plans, chef verification, or market research.",
            "You may ask Soru to stop contacting you or request deletion review by contacting the Soru team through the support channel listed in the product.",
          ],
        },
      ]}
    />
  );
}
