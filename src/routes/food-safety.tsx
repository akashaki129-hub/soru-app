import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/food-safety")({
  head: () => ({ meta: [{ title: "Food Safety — Soru" }] }),
  component: FoodSafetyPage,
});

function FoodSafetyPage() {
  return (
    <LegalPage
      eyebrow="Trust"
      title="Food Safety & Chef Verification"
      intro="Soru is building a verification framework for chef-led food services. Public trust labels must reflect completed Soru review, not only self-reported information."
      sections={[
        {
          title: "Verification framework",
          body: [
            "Chef profiles may collect identity, kitchen, profile photo, food-safety, FSSAI-readiness, and menu information for admin review.",
            "Sensitive documents are intended for private storage and authorised admin review only. They should not be exposed on public chef profiles.",
          ],
        },
        {
          title: "FSSAI and licensing guidance",
          body: [
            "Soru can guide chefs and independent home cooks through food license and FSSAI-readiness steps, but the official application and approval process remains with the relevant government portal and authorities.",
            "A chef’s self-reported FSSAI status must not be displayed as Soru verification unless reviewed and approved by Soru operations.",
          ],
        },
        {
          title: "Allergies and dietary needs",
          body: [
            "Customers should disclose allergies and dietary restrictions clearly before ordering. Chefs and Soru operations should treat allergy notes as safety-critical information.",
            "Soru is a marketplace and pilot operations layer, not a medical service or clinical nutrition provider.",
          ],
        },
      ]}
    />
  );
}
