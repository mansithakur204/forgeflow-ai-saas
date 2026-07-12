import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { WorkflowGrid } from "@/components/workflow-builder/workflow-grid";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { Plus } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflows List Page
//
// Server component — displays a grid of all workflow cards.
// Auth-gated via currentUser().
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Workflows — ForgeFlow AI",
  description: "View and manage all your AI automation workflows.",
};

export default async function WorkflowsPage() {
  const user = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
    ? ({
        firstName: "Jane",
        emailAddresses: [{ emailAddress: "jane.doe@example.com" }],
      } as any)
    : await currentUser();
  if (!user) redirect("/login");

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-8 p-4 md:p-6 max-w-screen-xl mx-auto">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <PageHeader
          title="Workflows"
          description="Build, manage, and monitor your AI automation workflows."
        >
          <Link href="/workflows/new">
            <Button variant="glow" size="sm" className="gap-2">
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Workflow
            </Button>
          </Link>
        </PageHeader>

        {/* ── Workflow Grid ─────────────────────────────────────────────── */}
        <section aria-labelledby="workflows-heading">
          <h2 id="workflows-heading" className="sr-only">
            All workflows
          </h2>
          <WorkflowGrid workflows={forgeFlowService.workflows} />
        </section>

      </div>
    </RootLayoutShell>
  );
}
