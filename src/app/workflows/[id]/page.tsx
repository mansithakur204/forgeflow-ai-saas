import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BuilderShell } from "@/components/workflow-builder/builder-shell";
import {
  MOCK_WORKFLOWS,
  MOCK_WORKFLOW_NODES,
  MOCK_CONNECTIONS,
} from "@/lib/workflow-data";

// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Builder Page
//
// Full-screen builder — no sidebar scroll offset, no footer.
// Server component shell; client state lives inside BuilderShell.
// ─────────────────────────────────────────────────────────────────────────────

interface WorkflowBuilderPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: WorkflowBuilderPageProps) {
  const { id } = await params;
  const workflow = MOCK_WORKFLOWS.find((w) => w.id === id);
  return {
    title: workflow
      ? `${workflow.name} — ForgeFlow AI`
      : "Workflow Builder — ForgeFlow AI",
    description: "Visual drag-and-drop AI workflow builder.",
  };
}

export default async function WorkflowBuilderPage({
  params,
}: WorkflowBuilderPageProps) {
  const user = process.env.NEXT_PUBLIC_MOCK_AUTH === "true"
    ? ({
        firstName: "Jane",
        emailAddresses: [{ emailAddress: "jane.doe@example.com" }],
      } as any)
    : await currentUser();
  if (!user) redirect("/login");

  const { id } = await params;

  // Resolve initial state for this workflow
  const workflow = MOCK_WORKFLOWS.find((w) => w.id === id) ?? null;
  const isNew = id === "new";

  const initialNodes = isNew ? [] : id === "wf-demo" ? MOCK_WORKFLOW_NODES : [];
  const initialConnections = isNew ? [] : id === "wf-demo" ? MOCK_CONNECTIONS : [];
  const workflowName = isNew ? "Untitled Workflow" : (workflow?.name ?? "Untitled Workflow");

  return (
    <BuilderShell
      workflowId={id}
      workflowName={workflowName}
      initialNodes={initialNodes}
      initialConnections={initialConnections}
    />
  );
}
