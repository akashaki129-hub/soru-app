import { createFileRoute } from "@tanstack/react-router";
import { LegalPage } from "@/components/legal-page";

export const Route = createFileRoute("/refund-policy")({
  head: () => ({ meta: [{ title: "Refund Policy — Soru" }] }),
  component: RefundPolicyPage,
});

function RefundPolicyPage() {
  return (
    <LegalPage
      eyebrow="Payments"
      title="Refund & Cancellation Policy"
      intro="During the pilot, Soru uses manual payment confirmation and operational review. Payment success is not shown until evidence is verified by the team."
      sections={[
        {
          title: "Manual payment confirmation",
          body: [
            "Customers may be asked to submit a UPI reference or payment note. Soru will mark payment as verified only after operational review.",
            "Submitting a payment reference does not by itself mean the payment has been verified or the order has been accepted by a chef.",
          ],
        },
        {
          title: "Cancellations",
          body: [
            "Cancellation eligibility depends on chef acceptance, preparation status, cut-off time, and whether ingredients or delivery have already been committed.",
            "Customers may request cancellation before preparation begins. Soru or the chef may reject an order when availability, payment, address, or food-safety constraints require it.",
          ],
        },
        {
          title: "Refund review",
          body: [
            "Refunds, when applicable, are reviewed by Soru operations and may depend on payment verification, order state, chef preparation status, and delivery outcome.",
            "Automated payouts and automated refunds are not enabled unless a payment provider is explicitly configured.",
          ],
        },
      ]}
    />
  );
}
