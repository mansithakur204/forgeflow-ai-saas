import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { MOCK_METRICS, MOCK_ACTIVITY, MOCK_PROJECTS } from "@/lib/dashboard-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Dashboard Page
//
// Production-grade authenticated dashboard.
// Server component — user data fetched via currentUser().
// All widget data comes from MOCK_* constants (no API calls).
//
// Layout:
//   1. Page Header (greeting + status badge)
//   2. 6-card KPI Metric Grid
//   3. Two-column: Recent Activity (3/5) + Quick Actions (2/5)
//   4. Recent Projects table (full width)
// ─────────────────────────────────────────────────────────────────────────────

export const metadata = {
  title: "Dashboard — ForgeFlow AI",
  description: "Your ForgeFlow AI workspace overview and key metrics.",
};

export default async function DashboardPage() {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.firstName ??
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "there";

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-8 p-4 md:p-6 max-w-screen-xl mx-auto">

        {/* ── 1. Page Header ─────────────────────────────────────────────── */}
        <PageHeader
          title={`Welcome back, ${displayName} 👋`}
          description="Here's what's happening across your ForgeFlow AI workspace today."
        >
          <Badge
            variant="secondary"
            className="bg-brand-500/10 text-brand-500 border-brand-500/20 gap-1.5"
          >
            <span
              className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"
              aria-hidden="true"
            />
            All systems operational
          </Badge>
        </PageHeader>

        {/* ── 2. KPI Metric Cards ────────────────────────────────────────── */}
        <section aria-labelledby="metrics-heading">
          <h2 id="metrics-heading" className="sr-only">
            Key performance metrics
          </h2>
          <MetricCards metrics={MOCK_METRICS} />
        </section>

        {/* ── 3. Two-column: Activity + Quick Actions ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Recent Activity — 3/5 columns on large screens */}
          <section
            aria-labelledby="activity-heading"
            className="lg:col-span-3"
          >
            <h2 id="activity-heading" className="sr-only">
              Recent activity
            </h2>
            <RecentActivity items={MOCK_ACTIVITY} />
          </section>

          {/* Quick Actions — 2/5 columns on large screens */}
          <section
            aria-labelledby="quick-actions-heading"
            className="lg:col-span-2"
          >
            <h2 id="quick-actions-heading" className="sr-only">
              Quick actions
            </h2>
            <QuickActions />
          </section>
        </div>

        {/* ── 4. Recent Projects Table ───────────────────────────────────── */}
        <section aria-labelledby="projects-heading">
          <h2 id="projects-heading" className="sr-only">
            Recent projects
          </h2>
          <ProjectsTable projects={MOCK_PROJECTS} />
        </section>

      </div>
    </RootLayoutShell>
  );
}
