import type { PlanningTask } from "../../types/planning";

export interface CollaborationLink {
  fromTaskId: string;
  toTaskId: string;
  fromAgentId: string;
  toAgentId: string;
  variables: string[];
}

export class AgentCollaborationPlanner {
  /**
   * Formulates cooperation links between tasks in a plan.
   * Scans dependencies and matches outputVariables to inputVariables.
   */
  planCollaboration(tasks: PlanningTask[]): CollaborationLink[] {
    const links: CollaborationLink[] = [];

    for (const task of tasks) {
      if (!task.dependencies || task.dependencies.length === 0) continue;

      for (const depId of task.dependencies) {
        const parent = tasks.find((t) => t.id === depId);
        if (!parent) continue;

        // Determine shared variables between parent and child
        // If child specifies no inputVariables, we assume it consumes parent's outputVariables
        const sharedVars =
          task.inputVariables.length > 0
            ? parent.outputVariables.filter((v) => task.inputVariables.includes(v))
            : [...parent.outputVariables];

        // Ensure we record a connection link if they have dependency relation
        links.push({
          fromTaskId: parent.id,
          toTaskId: task.id,
          fromAgentId: parent.assignedAgentId || "unknown",
          toAgentId: task.assignedAgentId || "unknown",
          variables: sharedVars.length > 0 ? sharedVars : ["generic_result"],
        });

        // Set inputs in child task if they are empty
        if (task.inputVariables.length === 0 && sharedVars.length > 0) {
          task.inputVariables = [...sharedVars];
        }
      }
    }

    return links;
  }
}
