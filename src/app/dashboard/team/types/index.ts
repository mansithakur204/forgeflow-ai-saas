// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Team Dashboard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkspacePermissions {
  workflows: "read" | "write" | "none";
  ai: "read" | "write" | "none";
  integrations: "read" | "write" | "none";
  marketplace: "read" | "write" | "none";
  templates: "read" | "write" | "none";
  settings: "read" | "write" | "none";
}

export interface OrganizationRole {
  roleName: "Owner" | "Admin" | "Developer" | "Viewer";
  permissions: WorkspacePermissions;
}

export interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "Owner" | "Admin" | "Developer" | "Viewer";
  status: "active" | "suspended";
  joinedAt: string;
}

export interface OrganizationInvitation {
  id: string;
  email: string;
  role: "Owner" | "Admin" | "Developer" | "Viewer";
  token: string;
  expiresAt: string;
  invitedAt: string;
  status?: string;
  invitedBy?: string;
}

export interface Organization {
  id: string;
  name: string;
  billingTier: string;
  ownerEmail: string;
}

export interface OrganizationAuditRecord {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  details: string;
}

export interface TeamFilters {
  search: string;
  role: string;
  status: string;
}

export interface TeamResponse {
  success: boolean;
  org: Organization;
  members: TeamMember[];
  invitations: OrganizationInvitation[];
  roles: OrganizationRole[];
  logs: OrganizationAuditRecord[];
  error?: string;
}
