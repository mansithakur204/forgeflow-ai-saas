// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workspace Settings Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { SettingsDashboard } from "./components/settings-dashboard";

export const metadata = {
  title: "Workspace Settings — ForgeFlow AI",
  description: "Configure workspace parameters, AI model keys, security rules, and alert triggers.",
};

export default async function SettingsPage() {
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
      <SettingsDashboard />
    </RootLayoutShell>
  );
}
