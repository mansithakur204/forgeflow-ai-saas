import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/common/page-header";
import { Badge } from "@/components/ui/badge";
import { MetricCards } from "@/components/dashboard/metric-cards";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { ProjectsTable } from "@/components/dashboard/projects-table";
import { MOCK_ACTIVITY, MOCK_PROJECTS } from "@/lib/dashboard-data";
import { forgeFlowService } from "@/lib/forgeflow-service";
import type { DashboardMetric } from "@/lib/dashboard-data";

export const metadata = {
  title: "Dashboard — ForgeFlow AI",
  description: "Your ForgeFlow AI workspace overview and key metrics.",
};

export default async function DashboardPage() {
  const user = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
    ? ({
        firstName: "Jane",
        emailAddresses: [{ emailAddress: "jane.doe@example.com" }],
      } as any)
    : await currentUser();

  if (!user) {
    redirect("/login");
  }

  const displayName =
    user.firstName ??
    user.emailAddresses[0]?.emailAddress?.split("@")[0] ??
    "there";

  // Fetch Live Statistics from the Backend Service layer
  const memoryStats = await forgeFlowService.memorySystem.getStats();
  const docCount = (await forgeFlowService.docRepository.list()).length;
  const chunkCount = forgeFlowService.chunkRepository.getAll().length;
  const vectorCount = (await forgeFlowService.vectorStore.statistics()).totalRecords;
  const registeredAgents = forgeFlowService.agentRegistry.list().length;
  const registeredTools = forgeFlowService.toolRegistry.list().length;
  const activeExecutions = forgeFlowService.toolCoordinator.getMetrics().activeExecutions;

  const knowledgeMetrics: DashboardMetric[] = [
    { id: "documents", label: "Documents", value: String(docCount), delta: "+2", trend: "up", deltaLabel: "active", iconVariant: "brand" },
    { id: "indexed_chunks", label: "Indexed Chunks", value: String(chunkCount), delta: "+3", trend: "up", deltaLabel: "parsed", iconVariant: "brand" },
    { id: "embeddings", label: "Embeddings", value: String(vectorCount), delta: "+3", trend: "up", deltaLabel: "stored", iconVariant: "brand" },
    { id: "retrieval_count", label: "Retrieval Count", value: String(forgeFlowService.retrievalCount), delta: "+8", trend: "up", deltaLabel: "queries", iconVariant: "brand" },
  ];

  const agentMetrics: DashboardMetric[] = [
    { id: "registered_agents", label: "Registered Agents", value: String(registeredAgents), delta: "+5", trend: "up", deltaLabel: "available", iconVariant: "brand" },
    { id: "active_sessions", label: "Active Sessions", value: "1", delta: "0", trend: "neutral", deltaLabel: "running", iconVariant: "brand" },
    { id: "running_workflows", label: "Running Workflows", value: "0", delta: "0", trend: "neutral", deltaLabel: "executing", iconVariant: "brand" },
    { id: "active_executions", label: "Active Executions", value: String(activeExecutions), delta: "0", trend: "neutral", deltaLabel: "running", iconVariant: "brand" },
  ];

  const toolMetrics: DashboardMetric[] = [
    { id: "registered_tools", label: "Registered Tools", value: String(registeredTools), delta: "+2", trend: "up", deltaLabel: "ready", iconVariant: "brand" },
    { id: "tool_executions", label: "Running Executions", value: String(activeExecutions), delta: "0", trend: "neutral", deltaLabel: "active", iconVariant: "brand" },
  ];

  const memoryMetrics: DashboardMetric[] = [
    { id: "working_memory", label: "Working Memory", value: String(memoryStats.entriesByType["working"] || 0), delta: "0", trend: "neutral", deltaLabel: "volatile", iconVariant: "brand" },
    { id: "long_term_memory", label: "Long Term Memory", value: String(memoryStats.entriesByType["long-term"] || 0), delta: "0", trend: "neutral", deltaLabel: "persisted", iconVariant: "brand" },
    { id: "semantic_memory", label: "Semantic Memory", value: String(memoryStats.entriesByType["semantic"] || 0), delta: "+1", trend: "up", deltaLabel: "facts", iconVariant: "brand" },
    { id: "episodic_memory", label: "Episodic Memory", value: String(memoryStats.entriesByType["episodic"] || 0), delta: "+1", trend: "up", deltaLabel: "logs", iconVariant: "brand" },
  ];

  const systemMetrics: DashboardMetric[] = [
    { id: "build_version", label: "Build Version", value: "1.0.0", delta: "v1.0.0", trend: "neutral", deltaLabel: "build", iconVariant: "default" },
    { id: "runtime_status", label: "Runtime Status", value: "active", delta: "online", trend: "up", deltaLabel: "status", iconVariant: "success" },
    { id: "queue_status", label: "Queue Status", value: "idle", delta: "empty", trend: "neutral", deltaLabel: "queue", iconVariant: "default" },
    { id: "health_status", label: "Health Status", value: "healthy", delta: "ok", trend: "up", deltaLabel: "health", iconVariant: "success" },
  ];

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-8 p-4 md:p-6 max-w-screen-xl mx-auto">

        {/* Page Header */}
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

        {/* Live Metrics Grid sections */}
        <div className="flex flex-col gap-8">
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Knowledge Engine</h3>
            <MetricCards metrics={knowledgeMetrics} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Agent Runtime</h3>
            <MetricCards metrics={agentMetrics} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Tool Execution</h3>
            <MetricCards metrics={toolMetrics} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">Memory Subsystem</h3>
            <MetricCards metrics={memoryMetrics} />
          </div>
          <div>
            <h3 className="text-md font-semibold text-foreground mb-3">System Health & Diagnostics</h3>
            <MetricCards metrics={systemMetrics} />
          </div>
        </div>

        {/* Activity & Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <section aria-labelledby="activity-heading" className="lg:col-span-3">
            <h2 id="activity-heading" className="sr-only">
              Recent activity
            </h2>
            <RecentActivity items={MOCK_ACTIVITY} />
          </section>

          <section aria-labelledby="quick-actions-heading" className="lg:col-span-2">
            <h2 id="quick-actions-heading" className="sr-only">
              Quick actions
            </h2>
            <QuickActions />
          </section>
        </div>

        {/* Projects Table */}
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
