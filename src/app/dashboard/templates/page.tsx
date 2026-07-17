// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Templates Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { TemplatesDashboard } from "./components/templates-dashboard";

export const metadata = {
  title: "Workflow Templates — ForgeFlow AI",
  description: "Browse, import, and duplicate pre-configured Multi-Agent workflow blueprints.",
};

export default async function TemplatesPage() {
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
      <TemplatesDashboard />
    </RootLayoutShell>
  );
}
