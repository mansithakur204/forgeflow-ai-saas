import { getDb } from "@/lib/db/connection";
import type { IWorkflowRepository } from "../interfaces";
import type { Workflow } from "@/lib/workflow-data";

export class PostgresWorkflowRepository implements IWorkflowRepository {
  async findAll(): Promise<Workflow[]> {
    const db = getDb();
    const rows = await db`SELECT * FROM workflows WHERE deleted_at IS NULL ORDER BY created_at DESC`;
    return rows.map((r: any) => this.mapRow(r));
  }

  async findById(id: string): Promise<Workflow | undefined> {
    const db = getDb();
    const [row] = await db`SELECT * FROM workflows WHERE id = ${id} AND deleted_at IS NULL`;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async save(workflow: Workflow): Promise<Workflow> {
    const db = getDb();
    const existing = await this.findById(workflow.id);

    if (existing) {
      // Optimistic Locking Check
      if (existing.version !== workflow.version) {
        throw new Error(`Optimistic locking conflict: Workflow "${workflow.name}" version has changed from ${workflow.version} to ${existing.version}.`);
      }

      const nextVer = (workflow.version ?? 1) + 1;
      const [updated] = await db`
        UPDATE workflows
        SET name = ${workflow.name},
            description = ${workflow.description},
            status = ${workflow.status},
            node_count = ${workflow.nodeCount},
            run_count = ${workflow.runCount},
            last_run = ${workflow.lastRun},
            tags = ${db.json(workflow.tags as any)},
            nodes = ${workflow.nodes ? db.json(workflow.nodes as any) : null},
            connections = ${workflow.connections ? db.json(workflow.connections as any) : null},
            version = ${nextVer},
            updated_at = NOW()
        WHERE id = ${workflow.id} AND version = ${workflow.version ?? 1}
        RETURNING *
      `;

      if (!updated) {
        throw new Error("Optimistic locking conflict or workflow was concurrently updated/deleted.");
      }

      return this.mapRow(updated);
    } else {
      const [inserted] = await db`
        INSERT INTO workflows (
          id, name, description, status, node_count, run_count, last_run, tags, nodes, connections, version, created_at, updated_at
        ) VALUES (
          ${workflow.id}, ${workflow.name}, ${workflow.description}, ${workflow.status}, ${workflow.nodeCount},
          ${workflow.runCount}, ${workflow.lastRun}, ${db.json(workflow.tags as any)},
          ${workflow.nodes ? db.json(workflow.nodes as any) : null}, ${workflow.connections ? db.json(workflow.connections as any) : null},
          1, ${workflow.createdAt || new Date().toISOString()}, NOW()
        )
        RETURNING *
      `;
      return this.mapRow(inserted);
    }
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db`UPDATE workflows SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`;
    return result.count > 0;
  }

  private mapRow(r: any): Workflow {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      status: r.status,
      nodeCount: Number(r.nodeCount),
      runCount: Number(r.runCount),
      lastRun: r.lastRun,
      createdAt: new Date(r.createdAt).toISOString(),
      tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags,
      nodes: r.nodes ? (typeof r.nodes === "string" ? JSON.parse(r.nodes) : r.nodes) : undefined,
      connections: r.connections ? (typeof r.connections === "string" ? JSON.parse(r.connections) : r.connections) : undefined,
      version: Number(r.version),
    } as any;
  }
}
