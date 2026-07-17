// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Pipelines Dashboard Server Entry
// ─────────────────────────────────────────────────────────────────────────────

import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { PipelinesDashboard } from "./components/pipelines-dashboard";

export const metadata = {
  title: "Pipelines Dashboard — ForgeFlow AI",
  description: "Monitor and control running, queued, completed, and failed pipeline workflows.",
};

export default async function PipelinesPage() {
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
      <PipelinesDashboard />
    </RootLayoutShell>
  );
}
