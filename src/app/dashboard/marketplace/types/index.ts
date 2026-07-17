// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workflow Marketplace Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MarketplaceFilters {
  search: string;
  category: string;
  license: string; // all, MIT, Apache 2.0, Commercial
  minRating: number;
  sortBy: "downloads" | "rating" | "name" | "lastUpdated";
  sortOrder: "asc" | "desc";
}

export interface VersionRecord {
  version: string;
  updatedAt: string;
  changeLog: string;
}

export interface ReviewRecord {
  id: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  category: string;
  author: string;
  downloads: number;
  rating: number;
  license: string;
  lastUpdated: string;
  previewImage: string;
  latestVersion: string;
  versions: VersionRecord[];
  reviews: ReviewRecord[];
  nodes: any[];
  connections: any[];
  isFavorite: boolean;
  installed: boolean;
  updateAvailable: boolean;
  installedVersion: string | null;
}

export interface MarketplaceResponse {
  success: boolean;
  marketplace: MarketplaceItem[];
  error?: string;
}
