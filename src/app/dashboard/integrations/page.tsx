// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Integrations Dashboard Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { IntegrationsDashboard } from "./components/integrations-dashboard";

export const metadata = {
  title: "Integrations Manager — ForgeFlow AI",
  description: "Securely connect, configure, and monitor connection health metrics for AI and API integrations.",
};

export default async function IntegrationsPage() {
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
      <IntegrationsDashboard />
    </RootLayoutShell>
  );
}
