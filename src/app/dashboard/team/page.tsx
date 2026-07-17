// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Team Dashboard Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { TeamDashboard } from "./components/team-dashboard";

export const metadata = {
  title: "Team Management — ForgeFlow AI",
  description: "Manage team member roles, permissions, invitations, and access constraints.",
};

export default async function TeamPage() {
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
      <TeamDashboard />
    </RootLayoutShell>
  );
}
