// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Observability Page Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { ObservabilityDashboardClient } from "./components/dashboard-client";

export const metadata = {
  title: "Observability Dashboard — ForgeFlow AI",
  description: "Real-time trace details, token tracking, provider cost estimator, and timeline charts.",
};

export default async function ObservabilityPage() {
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
      <ObservabilityDashboardClient />
    </RootLayoutShell>
  );
}
