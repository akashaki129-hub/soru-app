import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/terms")({
  head: () => ({ meta: [{ title: "Terms — Soru" }] }),
  component: TermsPage,
});

function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of Use"
      intro="Soru is currently operated as a controlled pilot marketplace for chef-powered meals, subscriptions, lunchboxes, and food-service discovery."
      sections={[
        {
          title: "Pilot availability",
          body: [
            "Soru features, chef availability, delivery support, pricing, menus, and payment methods may vary by city, chef, and operational readiness.",
            "Any sample profiles, illustrative prices, or launch-city references must be treated as pilot information unless clearly confirmed during checkout or by the Soru team.",
          ],
        },
        {
          title: "Customer responsibilities",
          body: [
            "Customers must provide accurate contact, address, delivery timing, allergy, and payment-reference information.",
            "Customers are responsible for reviewing allergy information and confirming suitability before ordering. Soru can help route information to chefs but cannot guarantee that every meal fits every medical or dietary need.",
          ],
        },
        {
          title: "Chef responsibilities",
          body: [
            "Chefs and food creators must provide accurate identity, menu, food-safety, kitchen, FSSAI-readiness, and availability information.",
            "A self-reported license or registration status is not the same as Soru verification. Public verified status is controlled by Soru’s admin review workflow.",
          ],
        },
      ]}
    />
  );
}
