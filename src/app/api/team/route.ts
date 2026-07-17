// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Team & Organization API Route Controller
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { encrypt, decrypt } from "@/lib/encryption";
import crypto from "crypto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.toLowerCase() || "";
    const role = searchParams.get("role") || "";
    const status = searchParams.get("status") || "";

    const org = await forgeFlowService.organizationRepository.getOrganization();
    const rawMembers = await forgeFlowService.organizationRepository.getMembers();
    const rawInvites = await forgeFlowService.organizationRepository.getInvitations();
    const roles = await forgeFlowService.organizationRepository.getRoles();
    const logs = await forgeFlowService.organizationRepository.getLogs();

    // 1. Auto-expire invitations
    const now = new Date();
    const activeInvites = [];
    for (const inv of rawInvites) {
      if (new Date(inv.expiresAt) < now) {
        await forgeFlowService.organizationRepository.removeInvitation(inv.id);
      } else {
        // Return masked token for security, but flag presence
        activeInvites.push({
          ...inv,
          token: "••••••••••••••••",
        });
      }
    }

    // 2. Filter Members
    let members = [...rawMembers];
    if (search) {
      members = members.filter(
        (m) =>
          m.email.toLowerCase().includes(search) ||
          m.firstName.toLowerCase().includes(search) ||
          m.lastName.toLowerCase().includes(search)
      );
    }
    if (role) {
      members = members.filter((m) => m.role.toLowerCase() === role.toLowerCase());
    }
    if (status) {
      members = members.filter((m) => m.status.toLowerCase() === status.toLowerCase());
    }

    return NextResponse.json({
      success: true,
      org,
      members,
      invitations: activeInvites,
      roles,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, memberId, role, status, email, token, permissions } = body;

    const org = await forgeFlowService.organizationRepository.getOrganization();

    // ─── ACTION: INVITE MEMBER ───
    if (action === "invite") {
      if (!email) {
        return NextResponse.json({ success: false, error: "Recipient email is required" }, { status: 400 });
      }

      // Check duplicate membership
      const existingMember = await forgeFlowService.organizationRepository.findMemberByEmail(email);
      if (existingMember) {
        return NextResponse.json({ success: false, error: "Email is already a registered member" }, { status: 400 });
      }

      const cleanRole = role || "Developer";
      const rawToken = `inv_token_${crypto.randomBytes(16).toString("hex")}`;
      const encryptedToken = encrypt(rawToken);
      const expires = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(); // 7 days expiration

      await forgeFlowService.organizationRepository.saveInvitation({
        id: `inv-${Date.now()}`,
        email,
        role: cleanRole,
        token: encryptedToken,
        expiresAt: expires,
        invitedAt: new Date().toISOString(),
      });

      await forgeFlowService.organizationRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Jane Doe",
        action: "Invite Dispatched",
        details: `Dispatched encrypted invitation token to ${email} (Role: ${cleanRole}).`,
      });

      return NextResponse.json({
        success: true,
        message: `Invitation successfully sent to ${email}.`,
      });
    }

    // ─── ACTION: ACCEPT INVITATION ───
    if (action === "accept-invite") {
      if (!token) {
        return NextResponse.json({ success: false, error: "Invitation token is required" }, { status: 400 });
      }

      const invites = await forgeFlowService.organizationRepository.getInvitations();
      const match = invites.find((inv) => {
        try {
          return decrypt(inv.token) === token;
        } catch {
          return false;
        }
      });

      if (!match) {
        return NextResponse.json({ success: false, error: "Invalid or expired invitation token link" }, { status: 400 });
      }

      if (new Date(match.expiresAt) < new Date()) {
        await forgeFlowService.organizationRepository.removeInvitation(match.id);
        return NextResponse.json({ success: false, error: "This invitation link has expired" }, { status: 400 });
      }

      // Create member
      const newMember = {
        id: `mem-${Date.now()}`,
        email: match.email,
        firstName: match.email.split("@")[0] || "New",
        lastName: "Member",
        role: match.role,
        status: "active" as const,
        joinedAt: new Date().toISOString(),
      };

      await forgeFlowService.organizationRepository.saveMember(newMember);
      await forgeFlowService.organizationRepository.removeInvitation(match.id);

      await forgeFlowService.organizationRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: newMember.firstName,
        action: "Invitation Accepted",
        details: `Joined Workspace Team roster via invite token registration.`,
      });

      return NextResponse.json({ success: true, message: `Successfully joined organization team!` });
    }

    // Member-specific operations
    if (action === "remove-member" || action === "deactivate-member" || action === "update-role") {
      if (!memberId) {
        return NextResponse.json({ success: false, error: "Member ID is required" }, { status: 400 });
      }
      const member = await forgeFlowService.organizationRepository.findMemberById(memberId);
      if (!member) {
        return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
      }

      // ─── ACTION: REMOVE MEMBER ───
      if (action === "remove-member") {
        if (member.role === "Owner") {
          return NextResponse.json({ success: false, error: "Cannot remove the Organization Owner. Transfer ownership first." }, { status: 400 });
        }

        await forgeFlowService.organizationRepository.removeMember(memberId);
        await forgeFlowService.organizationRepository.addLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: "Jane Doe",
          action: "Member Removed",
          details: `Evicted ${member.firstName} ${member.lastName} (${member.email}) from workspace.`,
        });

        return NextResponse.json({ success: true, message: "Member removed from organization." });
      }

      // ─── ACTION: DEACTIVATE / SUSPEND ───
      if (action === "deactivate-member") {
        if (member.role === "Owner") {
          return NextResponse.json({ success: false, error: "Cannot suspend the Owner account." }, { status: 400 });
        }

        member.status = member.status === "active" ? "suspended" : "active";
        await forgeFlowService.organizationRepository.saveMember(member);

        await forgeFlowService.organizationRepository.addLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: "Jane Doe",
          action: member.status === "suspended" ? "Member Suspended" : "Member Re-activated",
          details: `Changed membership active status of ${member.firstName} to "${member.status}".`,
        });

        return NextResponse.json({ success: true, message: `Member account is now ${member.status}.` });
      }

      // ─── ACTION: UPDATE MEMBER ROLE ───
      if (action === "update-role") {
        if (member.role === "Owner") {
          return NextResponse.json({ success: false, error: "Cannot modify Owner role. Use Transfer Ownership." }, { status: 400 });
        }

        const oldRole = member.role;
        member.role = role;
        await forgeFlowService.organizationRepository.saveMember(member);

        await forgeFlowService.organizationRepository.addLog({
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user: "Jane Doe",
          action: "Role Modified",
          details: `Changed role of ${member.firstName} from ${oldRole} to ${role}.`,
        });

        return NextResponse.json({ success: true, message: `Role successfully updated to ${role}.` });
      }
    }

    // ─── ACTION: TRANSFER OWNERSHIP ───
    if (action === "transfer-ownership") {
      if (!memberId) {
        return NextResponse.json({ success: false, error: "Target Member ID is required" }, { status: 400 });
      }
      const target = await forgeFlowService.organizationRepository.findMemberById(memberId);
      if (!target) {
        return NextResponse.json({ success: false, error: "Target member not found" }, { status: 404 });
      }

      const members = await forgeFlowService.organizationRepository.getMembers();
      const currentOwner = members.find((m) => m.role === "Owner");

      if (currentOwner) {
        currentOwner.role = "Admin";
        await forgeFlowService.organizationRepository.saveMember(currentOwner);
      }

      target.role = "Owner";
      await forgeFlowService.organizationRepository.saveMember(target);

      // Update org owner email
      org.ownerEmail = target.email;
      await forgeFlowService.organizationRepository.saveOrganization(org);

      await forgeFlowService.organizationRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: currentOwner ? currentOwner.firstName : "Jane Doe",
        action: "Ownership Transferred",
        details: `Transferred Organization Ownership to ${target.firstName} ${target.lastName} (${target.email}).`,
      });

      return NextResponse.json({ success: true, message: `Ownership successfully transferred to ${target.firstName}.` });
    }

    // ─── ACTION: SAVE CUSTOM ROLE PERMISSIONS ───
    if (action === "save-permissions") {
      if (!role || !permissions) {
        return NextResponse.json({ success: false, error: "Role Name and Permissions Grid are required" }, { status: 400 });
      }

      const roleRecord = await forgeFlowService.organizationRepository.getRole(role);
      if (!roleRecord) {
        return NextResponse.json({ success: false, error: "Role profile not found" }, { status: 404 });
      }

      roleRecord.permissions = permissions;
      await forgeFlowService.organizationRepository.saveRole(roleRecord);

      await forgeFlowService.organizationRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Jane Doe",
        action: "Permissions Matrix Updated",
        details: `Saved new permission policies overrides for role "${role}".`,
      });

      return NextResponse.json({ success: true, message: `Permissions for ${role} successfully updated.` });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
