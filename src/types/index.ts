// ─────────────────────────────────────────────
// Shared TypeScript types for ForgeFlow AI
// ─────────────────────────────────────────────

export type WithChildren<T = object> = T & { children: React.ReactNode };

export type WithClassName<T = object> = T & { className?: string };

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

export type ValueOf<T> = T[keyof T];

// ─── Status ───────────────────────────────────
export type Status =
  | "idle"
  | "loading"
  | "success"
  | "error"
  | "warning";

// ─── Size ─────────────────────────────────────
export type Size = "xs" | "sm" | "md" | "lg" | "xl";

// ─── Theme ────────────────────────────────────
export type Theme = "light" | "dark" | "system";

// ─── Navigation ───────────────────────────────
export interface Breadcrumb {
  label: string;
  href?: string;
}

// ─── API Response ─────────────────────────────
export interface ApiResponse<T = unknown> {
  data: T;
  message?: string;
  status: number;
  success: boolean;
}

export interface PaginatedResponse<T = unknown> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ─── User ─────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: "admin" | "editor" | "viewer";
}

/**
 * Typed representation of an authenticated Clerk user.
 * Matches the shape returned by currentUser() in Server Components
 * and useUser() in Client Components.
 */
export interface AuthUser {
  id: string;
  firstName: string | null;
  lastName: string | null;
  /** Primary email address string */
  email: string | null;
  /** Clerk-hosted profile image URL */
  imageUrl: string;
  /** ISO 8601 timestamp of account creation */
  createdAt: number | null;
  /** Convenience: first name or email username */
  displayName: string;
}
