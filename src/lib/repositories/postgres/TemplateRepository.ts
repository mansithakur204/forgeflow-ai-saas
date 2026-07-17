import { getDb } from "@/lib/db/connection";
import type { ITemplateRepository } from "../interfaces";
import type { WorkflowTemplate } from "@/lib/forgeflow-service";

export class PostgresTemplateRepository implements ITemplateRepository {
  async findAll(): Promise<WorkflowTemplate[]> {
    const db = getDb();
    const rows = await db`SELECT * FROM workflow_templates WHERE deleted_at IS NULL ORDER BY name ASC`;
    return rows.map((r: any) => this.mapRow(r));
  }

  async findById(id: string): Promise<WorkflowTemplate | undefined> {
    const db = getDb();
    const [row] = await db`SELECT * FROM workflow_templates WHERE id = ${id} AND deleted_at IS NULL`;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async save(template: WorkflowTemplate): Promise<WorkflowTemplate> {
    const db = getDb();
    const existing = await this.findById(template.id);

    if (existing) {
      const [updated] = await db`
        UPDATE workflow_templates
        SET name = ${template.name},
            description = ${template.description},
            category = ${template.category},
            difficulty = ${template.difficulty},
            tags = ${db.json(template.tags)},
            estimated_runtime = ${template.estimatedRuntime},
            required_integrations = ${db.json(template.requiredIntegrations)},
            preview_image = ${template.previewImage},
            version = ${template.version},
            author = ${template.author},
            downloads = ${template.downloads},
            rating = ${template.rating},
            nodes = ${db.json(template.nodes)},
            connections = ${db.json(template.connections)},
            is_favorite = ${template.isFavorite ?? false},
            updated_at = NOW(),
            version_lock = version_lock + 1
        WHERE id = ${template.id}
        RETURNING *
      `;
      return this.mapRow(updated);
    } else {
      const [inserted] = await db`
        INSERT INTO workflow_templates (
          id, name, description, category, difficulty, tags, estimated_runtime, required_integrations,
          preview_image, version, author, downloads, rating, nodes, connections, is_favorite, updated_at
        ) VALUES (
          ${template.id}, ${template.name}, ${template.description}, ${template.category}, ${template.difficulty},
          ${db.json(template.tags)}, ${template.estimatedRuntime}, ${db.json(template.requiredIntegrations)},
          ${template.previewImage}, ${template.version}, ${template.author}, ${template.downloads}, ${template.rating},
          ${db.json(template.nodes)}, ${db.json(template.connections)}, ${template.isFavorite ?? false}, NOW()
        )
        RETURNING *
      `;
      return this.mapRow(inserted);
    }
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db`UPDATE workflow_templates SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`;
    return result.count > 0;
  }

  private mapRow(r: any): WorkflowTemplate {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      difficulty: r.difficulty,
      tags: typeof r.tags === "string" ? JSON.parse(r.tags) : r.tags,
      estimatedRuntime: r.estimatedRuntime,
      requiredIntegrations: typeof r.requiredIntegrations === "string" ? JSON.parse(r.requiredIntegrations) : r.requiredIntegrations,
      previewImage: r.previewImage,
      version: r.version,
      author: r.author,
      downloads: Number(r.downloads),
      rating: Number(r.rating),
      nodes: typeof r.nodes === "string" ? JSON.parse(r.nodes) : r.nodes,
      connections: typeof r.connections === "string" ? JSON.parse(r.connections) : r.connections,
      isFavorite: Boolean(r.isFavorite),
    };
  }
}
