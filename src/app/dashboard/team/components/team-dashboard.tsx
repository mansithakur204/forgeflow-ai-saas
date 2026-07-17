"use client";

import React, { useState } from "react";
import type { TeamFilters, TeamMember, WorkspacePermissions } from "../types";
import { useTeam } from "../hooks/useTeam";
import {
  Users,
  Search,
  Filter,
  X,
  RefreshCw,
  Plus,
  ShieldCheck,
  ShieldAlert,
  UserPlus,
  Mail,
  Clock,
  Settings,
  Trash2,
  Lock,
  GitBranch,
  Cpu,
  Plug,
  Store,
  Layers,
  History,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Eye,
  Key,
} from "lucide-react";

export function TeamDashboard() {
  const [filters, setFilters] = useState<TeamFilters>({
    search: "",
    role: "",
    status: "",
  });

  const {
    data,
    loading,
    error,
    refetch,
    inviteMember,
    removeMember,
    deactivateMember,
    transferOwnership,
    updateMemberRole,
    saveRolePermissions,
  } = useTeam(filters);

  // Active Section Tab
  const [activeTab, setActiveTab] = useState("members");

  // Invite Modal
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"Admin" | "Developer" | "Viewer">("Developer");
  const [submittingInvite, setSubmittingInvite] = useState(false);

  // Detail Drawer
  const [drawerMember, setDrawerMember] = useState<TeamMember | null>(null);

  // Permission Matrix changes state
  const [editingPermissionsRole, setEditingPermissionsRole] = useState<string | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<WorkspacePermissions | null>(null);
  const [savingPermissions, setSavingPermissions] = useState(false);

  // Confirmation Overlays
  const [confirmAction, setConfirmAction] = useState<{
    type: "remove" | "deactivate" | "transfer";
    memberId: string;
  } | null>(null);

  // Toasts
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setSubmittingInvite(true);
    const res = await inviteMember(inviteEmail, inviteRole);
    setSubmittingInvite(false);

    if (res.success) {
      showToast(true, `Invitation dispatched successfully to ${inviteEmail}.`);
      setInviteEmail("");
      setShowInviteModal(false);
    } else {
      showToast(false, res.error || "Failed to dispatch invite.");
    }
  };

  const triggerConfirm = (type: "remove" | "deactivate" | "transfer", memberId: string) => {
    setConfirmAction({ type, memberId });
  };

  const handleConfirmAction = async () => {
    if (!confirmAction) return;
    const { type, memberId } = confirmAction;
    setConfirmAction(null);

    let res;
    if (type === "remove") {
      res = await removeMember(memberId);
    } else if (type === "deactivate") {
      res = await deactivateMember(memberId);
    } else {
      res = await transferOwnership(memberId);
    }

    if (res.success) {
      showToast(true, "Operation processed successfully!");
      setDrawerMember(null); // Close drawer if open
    } else {
      showToast(false, res.error || "Operation failed.");
    }
  };

  const handleRoleChange = async (memberId: string, role: string) => {
    const res = await updateMemberRole(memberId, role);
    if (res.success) {
      showToast(true, "Role successfully updated.");
      setDrawerMember(null);
    } else {
      showToast(false, res.error || "Role update failed.");
    }
  };

  // Permissions Matrix actions
  const openPermissionsEditor = (roleName: string, permissions: WorkspacePermissions) => {
    setEditingPermissionsRole(roleName);
    setEditingPermissions({ ...permissions });
  };

  const saveEditedPermissions = async () => {
    if (!editingPermissionsRole || !editingPermissions) return;

    setSavingPermissions(true);
    const res = await saveRolePermissions(editingPermissionsRole, editingPermissions);
    setSavingPermissions(false);

    if (res.success) {
      showToast(true, `Permissions matrices updated for ${editingPermissionsRole}.`);
      setEditingPermissionsRole(null);
      setEditingPermissions(null);
    } else {
      showToast(false, res.error || "Failed to overwrite role permissions.");
    }
  };

  const resetFilters = () => {
    setFilters({ search: "", role: "", status: "" });
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "owner":
        return "bg-rose-500/10 text-rose-600 border border-rose-500/20";
      case "admin":
        return "bg-amber-500/10 text-amber-600 border border-amber-500/20";
      case "developer":
        return "bg-sky-500/10 text-sky-600 border border-sky-500/20";
      default:
        return "bg-gray-500/10 text-gray-600 border border-gray-500/20";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    return status === "active"
      ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
      : "bg-rose-500/10 text-rose-600 border border-rose-500/20";
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Team</span>
      </nav>

      {/* Top Header */}
      {data && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
              {data.org.name}
              {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Active Plan: <span className="font-extrabold text-foreground">{data.org.billingTier}</span> • Owner: {data.org.ownerEmail}
            </p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="py-1.5 px-3 bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition shadow-xs text-xs font-bold flex items-center gap-1.5 self-start md:self-auto"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Invite Member
          </button>
        </div>
      )}

      {/* Toast popups */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border leading-normal shadow-md animate-fade-in ${
            toast.success
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
          }`}
        >
          {toast.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Tabs navigation options */}
      <div className="flex gap-2.5 border-b border-border/20 pb-1 flex-wrap text-xs font-bold">
        <button
          onClick={() => setActiveTab("members")}
          className={`py-2 px-3 hover:text-foreground border-b-2 cursor-pointer transition ${
            activeTab === "members" ? "border-brand-500 text-foreground font-black" : "border-transparent text-muted-foreground"
          }`}
        >
          Members ({data?.members.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("invites")}
          className={`py-2 px-3 hover:text-foreground border-b-2 cursor-pointer transition ${
            activeTab === "invites" ? "border-brand-500 text-foreground font-black" : "border-transparent text-muted-foreground"
          }`}
        >
          Pending Invites ({data?.invitations.length || 0})
        </button>
        <button
          onClick={() => setActiveTab("permissions")}
          className={`py-2 px-3 hover:text-foreground border-b-2 cursor-pointer transition ${
            activeTab === "permissions" ? "border-brand-500 text-foreground font-black" : "border-transparent text-muted-foreground"
          }`}
        >
          Role Permissions Matrix
        </button>
        <button
          onClick={() => setActiveTab("logs")}
          className={`py-2 px-3 hover:text-foreground border-b-2 cursor-pointer transition ${
            activeTab === "logs" ? "border-brand-500 text-foreground font-black" : "border-transparent text-muted-foreground"
          }`}
        >
          Audit logs ({data?.logs.length || 0})
        </button>
      </div>

      {/* loading skeleton grids */}
      {loading && !data && (
        <div className="flex flex-col gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-border/40 rounded-2xl" />
          ))}
        </div>
      )}

      {/* error banner */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-6">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold text-foreground">Organization Sync Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
          >
            Retry Load
          </button>
        </div>
      )}

      {/* TAB CONTEXT: MEMBERS */}
      {activeTab === "members" && data && (
        <div className="flex flex-col gap-4">
          {/* Members search filters */}
          <div className="bg-surface-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
              <div className="relative w-full md:w-64 text-xs">
                <input
                  type="text"
                  placeholder="Search members..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground"
                />
                <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
              </div>

              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
              >
                <option value="">All Roles</option>
                <option value="owner">Owner Only</option>
                <option value="admin">Admins</option>
                <option value="developer">Developers</option>
                <option value="viewer">Viewers</option>
              </select>

              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="suspended">Suspended Only</option>
              </select>
            </div>

            <button
              onClick={resetFilters}
              className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
            >
              Reset Filters
            </button>
          </div>

          {/* Members Table */}
          <div className="bg-surface-card border border-border/40 rounded-3xl shadow-sm overflow-hidden text-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-border/10 border-b border-border/40 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                    <th className="p-4 pl-6">Member Name</th>
                    <th className="p-4">Email</th>
                    <th className="p-4">Role</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 pr-6 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {data.members.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                        No team members matching criteria found.
                      </td>
                    </tr>
                  ) : (
                    data.members.map((member) => (
                      <tr
                        key={member.id}
                        onClick={() => setDrawerMember(member)}
                        className="hover:bg-border/10 cursor-pointer transition"
                      >
                        <td className="p-4 pl-6 font-bold text-foreground">
                          {member.firstName} {member.lastName}
                        </td>
                        <td className="p-4 text-muted-foreground">{member.email}</td>
                        <td className="p-4">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRoleBadgeColor(member.role)}`}>
                            {member.role}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-black ${getStatusBadgeColor(member.status)}`}>
                            {member.status}
                          </span>
                        </td>
                        <td className="p-4 pr-6 text-right text-muted-foreground">
                          <ChevronRight className="w-4 h-4 ml-auto" />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTEXT: PENDING INVITATIONS */}
      {activeTab === "invites" && data && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-card border border-border/40 rounded-3xl shadow-sm overflow-hidden text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-border/10 border-b border-border/40 text-muted-foreground font-black text-[10px] uppercase tracking-wider">
                  <th className="p-4 pl-6">Recipient Email</th>
                  <th className="p-4">Assigned Role</th>
                  <th className="p-4">Invited Date</th>
                  <th className="p-4">Expiration Bounds</th>
                  <th className="p-4 pr-6">Token Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {data.invitations.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted-foreground italic">
                      No active pending invitations.
                    </td>
                  </tr>
                ) : (
                  data.invitations.map((invite) => (
                    <tr key={invite.id} className="text-muted-foreground">
                      <td className="p-4 pl-6 font-bold text-foreground">{invite.email}</td>
                      <td className="p-4">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRoleBadgeColor(invite.role)}`}>
                          {invite.role}
                        </span>
                      </td>
                      <td className="p-4">{new Date(invite.invitedAt).toLocaleDateString()}</td>
                      <td className="p-4 text-rose-500 font-bold">{new Date(invite.expiresAt).toLocaleDateString()}</td>
                      <td className="p-4 pr-6 font-mono text-[10px] flex items-center gap-1.5 text-muted-foreground/60">
                        <Key className="w-3.5 h-3.5" /> Masked Payload
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTEXT: ROLE PERMISSIONS MATRIX */}
      {activeTab === "permissions" && data && (
        <div className="flex flex-col gap-4">
          <div className="bg-surface-card border border-border/40 rounded-3xl shadow-sm p-5 flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-border/20 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-foreground">Role-Based Access Matrix</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Toggle CRUD permission limits for system functional layers.</p>
              </div>
              {editingPermissionsRole && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPermissionsRole(null);
                      setEditingPermissions(null);
                    }}
                    className="py-1 px-2.5 text-xs font-semibold bg-border/40 hover:bg-border/60 rounded-xl transition text-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={savingPermissions}
                    onClick={saveEditedPermissions}
                    className="py-1 px-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl transition text-xs font-bold flex items-center gap-1.5"
                  >
                    {savingPermissions ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Save Changes"}
                  </button>
                </div>
              )}
            </div>

            <div className="overflow-x-auto text-xs">
              <table className="w-full border-collapse text-left text-muted-foreground">
                <thead>
                  <tr className="bg-border/10 text-[10px] font-black uppercase text-foreground border-b border-border/40">
                    <th className="p-4">Workspace Role</th>
                    <th className="p-4">Workflows</th>
                    <th className="p-4">AI Keys</th>
                    <th className="p-4">Integrations</th>
                    <th className="p-4">Marketplace</th>
                    <th className="p-4">Templates</th>
                    <th className="p-4">Settings</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {data.roles.map((role) => {
                    const isEditing = editingPermissionsRole === role.roleName && editingPermissions;
                    const permSource = isEditing ? editingPermissions : role.permissions;

                    return (
                      <tr key={role.roleName} className="hover:bg-border/5 transition">
                        <td className="p-4 font-bold text-foreground">{role.roleName}</td>
                        
                        {/* Workflows Cell */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={permSource.workflows}
                              onChange={(e) => setEditingPermissions({ ...editingPermissions, workflows: e.target.value as any })}
                              className="bg-background border border-border/60 rounded-lg p-1 text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </select>
                          ) : (
                            <span className="capitalize">{role.permissions.workflows}</span>
                          )}
                        </td>

                        {/* AI Keys Cell */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={permSource.ai}
                              onChange={(e) => setEditingPermissions({ ...editingPermissions, ai: e.target.value as any })}
                              className="bg-background border border-border/60 rounded-lg p-1 text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </select>
                          ) : (
                            <span className="capitalize">{role.permissions.ai}</span>
                          )}
                        </td>

                        {/* Integrations Cell */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={permSource.integrations}
                              onChange={(e) => setEditingPermissions({ ...editingPermissions, integrations: e.target.value as any })}
                              className="bg-background border border-border/60 rounded-lg p-1 text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </select>
                          ) : (
                            <span className="capitalize">{role.permissions.integrations}</span>
                          )}
                        </td>

                        {/* Marketplace Cell */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={permSource.marketplace}
                              onChange={(e) => setEditingPermissions({ ...editingPermissions, marketplace: e.target.value as any })}
                              className="bg-background border border-border/60 rounded-lg p-1 text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </select>
                          ) : (
                            <span className="capitalize">{role.permissions.marketplace}</span>
                          )}
                        </td>

                        {/* Templates Cell */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={permSource.templates}
                              onChange={(e) => setEditingPermissions({ ...editingPermissions, templates: e.target.value as any })}
                              className="bg-background border border-border/60 rounded-lg p-1 text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </select>
                          ) : (
                            <span className="capitalize">{role.permissions.templates}</span>
                          )}
                        </td>

                        {/* Settings Cell */}
                        <td className="p-4">
                          {isEditing ? (
                            <select
                              value={permSource.settings}
                              onChange={(e) => setEditingPermissions({ ...editingPermissions, settings: e.target.value as any })}
                              className="bg-background border border-border/60 rounded-lg p-1 text-[11px] text-foreground focus:outline-none"
                            >
                              <option value="write">Write</option>
                              <option value="read">Read</option>
                              <option value="none">None</option>
                            </select>
                          ) : (
                            <span className="capitalize">{role.permissions.settings}</span>
                          )}
                        </td>

                        <td className="p-4 text-right">
                          {role.roleName !== "Owner" && !editingPermissionsRole && (
                            <button
                              type="button"
                              onClick={() => openPermissionsEditor(role.roleName, role.permissions)}
                              className="p-1.5 bg-border/40 hover:bg-border/60 rounded-xl transition text-[11px] font-bold text-foreground"
                            >
                              Edit Rules
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTEXT: AUDIT TIMELINE LOGS */}
      {activeTab === "logs" && data && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
            {data.logs.length === 0 ? (
              <div className="text-xs italic text-muted-foreground p-2">No organization audits logs available.</div>
            ) : (
              data.logs.map((log) => (
                <div key={log.id} className="p-3.5 bg-border/10 border border-border/20 rounded-2xl flex flex-col gap-1 text-xs text-muted-foreground leading-normal">
                  <div className="flex justify-between font-bold text-foreground">
                    <span>{log.action}</span>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground">{log.details}</p>
                  <div className="text-[9px] mt-1.5 border-t border-border/10 pt-1.5 flex justify-between items-center text-muted-foreground/60 font-semibold">
                    <span>Admin: {log.user}</span>
                    <span>{new Date(log.timestamp).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Member Details Drawer Slider */}
      {drawerMember && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            onClick={() => setDrawerMember(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          />

          <div className="relative w-full max-w-sm bg-background border-l border-border/40 h-full p-6 flex flex-col justify-between shadow-2xl z-10 animate-slide-in">
            {/* Drawer Body details */}
            <div className="flex flex-col gap-6 overflow-y-auto">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-foreground">{drawerMember.firstName} {drawerMember.lastName}</h3>
                    <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider block mt-0.5">
                      Roster Details Profile
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setDrawerMember(null)}
                  className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3.5 border-t border-border/20 pt-4 text-xs text-muted-foreground leading-normal">
                <div className="flex justify-between">
                  <span>Joined Workspace:</span>
                  <span className="text-foreground font-bold">{new Date(drawerMember.joinedAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span>Contact Email:</span>
                  <span className="text-foreground font-semibold">{drawerMember.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Current Role:</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${getRoleBadgeColor(drawerMember.role)}`}>
                    {drawerMember.role}
                  </span>
                </div>
              </div>

              {/* Modify Member parameters */}
              {drawerMember.role !== "Owner" && (
                <div className="border-t border-border/20 pt-4 flex flex-col gap-4">
                  <h4 className="text-xs font-black text-foreground uppercase tracking-wider">Account Operations</h4>
                  
                  {/* Role Update selector */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <label className="font-bold text-muted-foreground">Modify Role Assignment</label>
                    <select
                      value={drawerMember.role}
                      onChange={(e) => handleRoleChange(drawerMember.id, e.target.value)}
                      className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none"
                    >
                      <option value="Admin">Admin</option>
                      <option value="Developer">Developer</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  </div>

                  {/* Suspend Toggle */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => triggerConfirm("deactivate", drawerMember.id)}
                      className="flex-1 py-2 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/60 text-foreground rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      {drawerMember.status === "active" ? "Suspend Account" : "Activate Account"}
                    </button>
                    
                    {/* Transfer Ownership Button */}
                    <button
                      type="button"
                      onClick={() => triggerConfirm("transfer", drawerMember.id)}
                      className="flex-1 py-2 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/60 text-foreground rounded-xl transition flex items-center justify-center gap-1.5"
                    >
                      Transfer Owner
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Evict Roster Account Footer */}
            {drawerMember.role !== "Owner" && (
              <div className="border-t border-border/20 pt-4">
                <button
                  type="button"
                  onClick={() => triggerConfirm("remove", drawerMember.id)}
                  className="w-full py-2 bg-rose-600 hover:bg-rose-500 border border-rose-700 text-white text-xs font-black rounded-xl transition flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Evict Member Account
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Invite Member Modal Dialog */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setShowInviteModal(false)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-sm bg-background border border-border/40 rounded-3xl p-6 flex flex-col gap-5 z-10 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-500/10 text-brand-500 rounded-xl">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">Invite Team Member</h3>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    Creates an encrypted token invite link
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleInviteSubmit} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-muted-foreground">Recipient Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="w-full px-3 py-1.5 pr-8 bg-background border border-border/60 rounded-xl text-xs text-foreground focus:outline-none focus:border-brand-500"
                  />
                  <Mail className="w-3.5 h-3.5 text-muted-foreground absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-bold text-muted-foreground">Default Access Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs text-foreground font-semibold focus:outline-none"
                >
                  <option value="Admin">Admin (Full writes)</option>
                  <option value="Developer">Developer (Standard access)</option>
                  <option value="Viewer">Viewer (Read logs only)</option>
                </select>
              </div>

              <div className="border-t border-border/20 pt-4 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2 font-semibold bg-border/40 border border-border/60 hover:bg-border/60 text-foreground rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingInvite}
                  className="flex-1 py-2 font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1 shadow-sm"
                >
                  {submittingInvite ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Send Invitation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation overlays */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setConfirmAction(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />

          <div className="relative w-full max-w-sm bg-background border border-border/40 rounded-3xl p-5 flex flex-col gap-4 z-10 shadow-2xl">
            <div className="flex items-center gap-2 text-rose-500 font-extrabold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Confirm Team Mutation</span>
            </div>

            <p className="text-xs text-muted-foreground leading-normal">
              {confirmAction.type === "remove"
                ? "Are you sure you want to evict this member? They will lose access to workflows and settings immediately."
                : confirmAction.type === "deactivate"
                ? "This will suspend/suspend their workspace access keys and sessions. Toggled anytime."
                : "Ownership transfer is a final administrative change. You will be downgraded to the Admin role."}
            </p>

            <div className="flex gap-2 justify-end border-t border-border/20 pt-3 text-xs font-bold">
              <button
                type="button"
                onClick={() => setConfirmAction(null)}
                className="px-3 py-1.5 bg-border/40 hover:bg-border/60 text-foreground border border-border/60 rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmAction}
                className="px-3.5 py-1.5 bg-rose-600 text-white border border-rose-700 rounded-xl hover:bg-rose-500 transition"
              >
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
