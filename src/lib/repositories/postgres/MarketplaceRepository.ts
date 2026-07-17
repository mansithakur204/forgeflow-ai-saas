import { getDb } from "@/lib/db/connection";
import type { IMarketplaceRepository } from "../interfaces";
import type { MarketplaceEntry } from "@/lib/forgeflow-service";

export class PostgresMarketplaceRepository implements IMarketplaceRepository {
  async findAll(): Promise<MarketplaceEntry[]> {
    const db = getDb();
    const rows = await db`SELECT * FROM marketplace_entries WHERE deleted_at IS NULL ORDER BY downloads DESC`;
    return rows.map((r: any) => this.mapRow(r));
  }

  async findById(id: string): Promise<MarketplaceEntry | undefined> {
    const db = getDb();
    const [row] = await db`SELECT * FROM marketplace_entries WHERE id = ${id} AND deleted_at IS NULL`;
    if (!row) return undefined;
    return this.mapRow(row);
  }

  async save(entry: MarketplaceEntry): Promise<MarketplaceEntry> {
    const db = getDb();
    const existing = await this.findById(entry.id);

    const latestVersion = entry.versions[entry.versions.length - 1]?.version || "1.0.0";

    if (existing) {
      const [updated] = await db`
        UPDATE marketplace_entries
        SET name = ${entry.name},
            description = ${entry.description},
            author = ${entry.author},
            category = ${entry.category},
            downloads = ${entry.downloads},
            rating = ${entry.rating},
            version = ${latestVersion},
            last_updated = ${entry.lastUpdated},
            license = ${entry.license},
            nodes = ${db.json(entry.nodes as any)},
            connections = ${db.json(entry.connections as any)},
            is_favorite = ${entry.isFavorite ?? false},
            reviews = ${db.json((entry.reviews ?? []) as any)},
            version_history = ${db.json((entry.versions ?? []) as any)},
            preview_image = ${entry.previewImage || ""},
            updated_at = NOW(),
            version_lock = version_lock + 1
        WHERE id = ${entry.id}
        RETURNING *
      `;
      return this.mapRow(updated);
    } else {
      const [inserted] = await db`
        INSERT INTO marketplace_entries (
          id, name, description, author, category, downloads, rating, version, last_updated, license,
          nodes, connections, is_favorite, reviews, version_history, preview_image, updated_at
        ) VALUES (
          ${entry.id}, ${entry.name}, ${entry.description}, ${entry.author}, ${entry.category}, ${entry.downloads},
          ${entry.rating}, ${latestVersion}, ${entry.lastUpdated}, ${entry.license},
          ${db.json(entry.nodes as any)}, ${db.json(entry.connections as any)}, ${entry.isFavorite ?? false},
          ${db.json((entry.reviews ?? []) as any)}, ${db.json((entry.versions ?? []) as any)}, ${entry.previewImage || ""}, NOW()
        )
        RETURNING *
      `;
      return this.mapRow(inserted);
    }
  }

  async delete(id: string): Promise<boolean> {
    const db = getDb();
    const result = await db`UPDATE marketplace_entries SET deleted_at = NOW() WHERE id = ${id} AND deleted_at IS NULL`;
    return result.count > 0;
  }

  private mapRow(r: any): MarketplaceEntry {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      author: r.author,
      category: r.category,
      downloads: Number(r.downloads),
      rating: Number(r.rating),
      lastUpdated: r.lastUpdated,
      license: r.license,
      nodes: typeof r.nodes === "string" ? JSON.parse(r.nodes) : r.nodes,
      connections: typeof r.connections === "string" ? JSON.parse(r.connections) : r.connections,
      isFavorite: Boolean(r.isFavorite),
      reviews: typeof r.reviews === "string" ? JSON.parse(r.reviews) : r.reviews || [],
      versions: typeof r.versionHistory === "string" ? JSON.parse(r.versionHistory) : r.versionHistory || [],
      previewImage: r.previewImage || "",
    };
  }
}
