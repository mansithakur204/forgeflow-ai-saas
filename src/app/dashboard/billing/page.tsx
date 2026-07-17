// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Billing Dashboard Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { BillingDashboard } from "./components/billing-dashboard";

export const metadata = {
  title: "Billing & Subscription — ForgeFlow AI",
  description: "Configure billing subscription parameters, verify consumption limits, and review payment history.",
};

export default async function BillingPage() {
  const user =
    process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
      ? ({
          firstName: "Jane",
          emailAddresses: [{ emailAddress: "jane.doe@example.com" }],
        } as any)
      : await currentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <RootLayoutShell>
      <BillingDashboard />
    </RootLayoutShell>
  );
}
