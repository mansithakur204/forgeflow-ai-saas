// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Marketplace Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { MarketplaceDashboard } from "./components/marketplace-dashboard";

export const metadata = {
  title: "Workflow Marketplace — ForgeFlow AI",
  description: "Download, rate, and verify secure third-party templates and plugins for Multi-Agent runtimes.",
};

export default async function MarketplacePage() {
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
      <MarketplaceDashboard />
    </RootLayoutShell>
  );
}
