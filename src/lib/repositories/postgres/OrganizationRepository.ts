import { getDb } from "@/lib/db/connection";
import type { IOrganizationRepository } from "../interfaces";
import type { Organization, TeamMember, OrganizationInvitation, OrganizationRole, OrganizationAuditRecord } from "@/lib/forgeflow-service";

export class PostgresOrganizationRepository implements IOrganizationRepository {
  private async ensureSeeded() {
    const db = getDb();
    const [row] = await db`SELECT COUNT(*)::integer FROM organizations`;
    if (row.count > 0) return;

    // Seed default organization
    await db`
      INSERT INTO organizations (id, name, billing_tier, owner_email)
      VALUES ('org-tenant-001', 'ForgeFlow Enterprise Org', 'Enterprise Plan', 'jane.doe@example.com')
      ON CONFLICT DO NOTHING
    `;

    // Seed roles
    const roles = [
      { name: "Owner", permissions: { workflows: "write", ai: "write", integrations: "write", marketplace: "write", templates: "write", settings: "write" } },
      { name: "Admin", permissions: { workflows: "write", ai: "write", integrations: "write", marketplace: "write", templates: "write", settings: "write" } },
      { name: "Developer", permissions: { workflows: "write", ai: "write", integrations: "write", marketplace: "read", templates: "write", settings: "none" } },
      { name: "Viewer", permissions: { workflows: "read", ai: "read", integrations: "none", marketplace: "read", templates: "read", settings: "none" } },
    ];

    for (const r of roles) {
      await db`
        INSERT INTO org_roles (org_id, role_name, permissions)
        VALUES ('org-tenant-001', ${r.name}, ${db.json(r.permissions)})
        ON CONFLICT (org_id, role_name) DO NOTHING
      `;
    }

    // Seed members
    const members = [
      { id: "mem-1", email: "jane.doe@example.com", first: "Jane", last: "Doe", role: "Owner", status: "active", joined: new Date(Date.now() - 30 * 24 * 3600 * 1000) },
      { id: "mem-2", email: "bob.smith@example.com", first: "Bob", last: "Smith", role: "Developer", status: "active", joined: new Date(Date.now() - 15 * 24 * 3600 * 1000) },
      { id: "mem-3", email: "alice.johnson@example.com", first: "Alice", last: "Johnson", role: "Viewer", status: "active", joined: new Date(Date.now() - 5 * 24 * 3600 * 1000) },
    ];

    for (const m of members) {
      await db`
        INSERT INTO org_members (id, org_id, email, first_name, last_name, role, status, joined_at)
        VALUES (${m.id}, 'org-tenant-001', ${m.email}, ${m.first}, ${m.last}, ${m.role}, ${m.status}, ${m.joined})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  async getOrganization(): Promise<Organization> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM organizations WHERE id = 'org-tenant-001'`;
    return {
      id: row.id,
      name: row.name,
      billingTier: row.billingTier,
      ownerEmail: row.ownerEmail,
    };
  }

  async saveOrganization(org: Organization): Promise<Organization> {
    await this.ensureSeeded();
    const db = getDb();
    await db`
      UPDATE organizations
      SET name = ${org.name},
          billing_tier = ${org.billingTier},
          owner_email = ${org.ownerEmail},
          updated_at = NOW(),
          version_lock = version_lock + 1
      WHERE id = 'org-tenant-001'
    `;
    return org;
  }

  async getMembers(): Promise<TeamMember[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM org_members WHERE org_id = 'org-tenant-001' ORDER BY joined_at ASC`;
    return rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      firstName: r.firstName,
      lastName: r.lastName,
      role: r.role,
      status: r.status,
      joinedAt: new Date(r.joinedAt).toISOString(),
    }));
  }

  async findMemberById(id: string): Promise<TeamMember | undefined> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM org_members WHERE id = ${id}`;
    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      status: row.status,
      joinedAt: new Date(row.joinedAt).toISOString(),
    };
  }

  async findMemberByEmail(email: string): Promise<TeamMember | undefined> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM org_members WHERE email = ${email}`;
    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      status: row.status,
      joinedAt: new Date(row.joinedAt).toISOString(),
    };
  }

  async saveMember(member: TeamMember): Promise<TeamMember> {
    await this.ensureSeeded();
    const db = getDb();
    const existing = await this.findMemberById(member.id);

    if (existing) {
      await db`
        UPDATE org_members
        SET email = ${member.email},
            first_name = ${member.firstName},
            last_name = ${member.lastName},
            role = ${member.role},
            status = ${member.status},
            updated_at = NOW()
        WHERE id = ${member.id}
      `;
    } else {
      await db`
        INSERT INTO org_members (id, org_id, email, first_name, last_name, role, status, joined_at)
        VALUES (${member.id}, 'org-tenant-001', ${member.email}, ${member.firstName}, ${member.lastName}, ${member.role}, ${member.status}, ${member.joinedAt})
      `;
    }
    return member;
  }

  async removeMember(id: string): Promise<boolean> {
    await this.ensureSeeded();
    const db = getDb();
    const result = await db`DELETE FROM org_members WHERE id = ${id}`;
    return result.count > 0;
  }
  async getInvitations(): Promise<OrganizationInvitation[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM org_invitations WHERE org_id = 'org-tenant-001'`;
    return rows.map((r: any) => ({
      id: r.id,
      email: r.email,
      role: r.role,
      token: r.token,
      status: r.status,
      expiresAt: new Date(r.expiresAt).toISOString(),
      invitedBy: r.invitedBy,
      invitedAt: r.invitedAt ? new Date(r.invitedAt).toISOString() : new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    }));
  }

  async findInvitationById(id: string): Promise<OrganizationInvitation | undefined> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM org_invitations WHERE id = ${id}`;
    if (!row) return undefined;
    return {
      id: row.id,
      email: row.email,
      role: row.role,
      token: row.token,
      status: row.status,
      expiresAt: new Date(row.expiresAt).toISOString(),
      invitedBy: row.invitedBy,
      invitedAt: row.invitedAt ? new Date(row.invitedAt).toISOString() : new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    };
  }

  async saveInvitation(invite: OrganizationInvitation): Promise<OrganizationInvitation> {
    await this.ensureSeeded();
    const db = getDb();
    const existing = await this.findInvitationById(invite.id);

    const status = invite.status || "pending";
    const invitedBy = invite.invitedBy || "admin";

    if (existing) {
      await db`
        UPDATE org_invitations
        SET email = ${invite.email},
            role = ${invite.role},
            token = ${invite.token},
            status = ${status},
            expires_at = ${invite.expiresAt},
            invited_by = ${invitedBy},
            invited_at = ${invite.invitedAt}
        WHERE id = ${invite.id}
      `;
    } else {
      await db`
        INSERT INTO org_invitations (id, org_id, email, role, token, status, expires_at, invited_by, invited_at)
        VALUES (${invite.id}, 'org-tenant-001', ${invite.email}, ${invite.role}, ${invite.token}, ${status}, ${invite.expiresAt}, ${invitedBy}, ${invite.invitedAt})
      `;
    }
    return invite;
  }

  async removeInvitation(id: string): Promise<boolean> {
    await this.ensureSeeded();
    const db = getDb();
    const result = await db`DELETE FROM org_invitations WHERE id = ${id}`;
    return result.count > 0;
  }

  async getRoles(): Promise<OrganizationRole[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM org_roles WHERE org_id = 'org-tenant-001'`;
    return rows.map((r: any) => ({
      roleName: r.roleName,
      permissions: typeof r.permissions === "string" ? JSON.parse(r.permissions) : r.permissions,
    }));
  }

  async getRole(roleName: string): Promise<OrganizationRole | undefined> {
    await this.ensureSeeded();
    const db = getDb();
    const [row] = await db`SELECT * FROM org_roles WHERE org_id = 'org-tenant-001' AND role_name = ${roleName}`;
    if (!row) return undefined;
    return {
      roleName: row.roleName,
      permissions: typeof row.permissions === "string" ? JSON.parse(row.permissions) : row.permissions,
    };
  }

  async saveRole(role: OrganizationRole): Promise<OrganizationRole> {
    await this.ensureSeeded();
    const db = getDb();
    const existing = await this.getRole(role.roleName);

    if (existing) {
      await db`
        UPDATE org_roles
        SET permissions = ${db.json(role.permissions as any)}
        WHERE org_id = 'org-tenant-001' AND role_name = ${role.roleName}
      `;
    } else {
      await db`
        INSERT INTO org_roles (org_id, role_name, permissions)
        VALUES ('org-tenant-001', ${role.roleName}, ${db.json(role.permissions as any)})
      `;
    }
    return role;
  }

  async getLogs(): Promise<OrganizationAuditRecord[]> {
    await this.ensureSeeded();
    const db = getDb();
    const rows = await db`SELECT * FROM org_audit_logs ORDER BY timestamp DESC`;
    return rows.map((r: any) => ({
      id: r.id,
      timestamp: new Date(r.timestamp).toISOString(),
      user: r.userName,
      action: r.action,
      details: r.details,
    }));
  }

  async addLog(log: OrganizationAuditRecord): Promise<void> {
    await this.ensureSeeded();
    const db = getDb();
    await db`
      INSERT INTO org_audit_logs (id, timestamp, user_name, action, details)
      VALUES (${log.id}, ${log.timestamp}, ${log.user}, ${log.action}, ${log.details})
    `;
  }
}
