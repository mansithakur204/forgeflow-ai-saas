// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Repository Interfaces
// Single source of truth for all repository contracts.
// Both InMemory (dev/test) and PostgreSQL (production) implementations
// must satisfy these interfaces.
// ─────────────────────────────────────────────────────────────────────────────

import type {
  WorkspaceSettings,
  AuditLogRecord,
  OrganizationRole,
  TeamMember,
  OrganizationInvitation,
  Organization,
  OrganizationAuditRecord,
  BillingPlan,
  SubscriptionRecord,
  UsageRecord,
  InvoiceRecord,
  SecretRecord,
  SecretVersionRecord,
  SecretAuditRecord,
  IntegrationCredentialsRecord,
  WorkflowTemplate,
  MarketplaceEntry,
  PublicApiTokenRecord,
  ApiRequestLogRecord,
} from "@/lib/forgeflow-service";
import type { Workflow } from "@/lib/workflow-data";
import type { WorkflowRunRecord, AgentRunRecord, ActivityEvent } from "@/lib/execution-history";

// ─── Settings ─────────────────────────────────────────────────────────────────

export interface ISettingsRepository {
  get(): Promise<WorkspaceSettings>;
  save(settings: WorkspaceSettings): Promise<WorkspaceSettings>;
  addLog(log: AuditLogRecord): Promise<void>;
  getLogs(): Promise<AuditLogRecord[]>;
  resetToDefaults(): Promise<void> | void;
}

// ─── Organization ──────────────────────────────────────────────────────────────

export interface IOrganizationRepository {
  getOrganization(): Promise<Organization>;
  saveOrganization(org: Organization): Promise<Organization>;
  getMembers(): Promise<TeamMember[]>;
  findMemberById(id: string): Promise<TeamMember | undefined>;
  findMemberByEmail(email: string): Promise<TeamMember | undefined>;
  saveMember(member: TeamMember): Promise<TeamMember>;
  removeMember(id: string): Promise<boolean>;
  getInvitations(): Promise<OrganizationInvitation[]>;
  findInvitationById(id: string): Promise<OrganizationInvitation | undefined>;
  saveInvitation(invite: OrganizationInvitation): Promise<OrganizationInvitation>;
  removeInvitation(id: string): Promise<boolean>;
  getRoles(): Promise<OrganizationRole[]>;
  getRole(roleName: string): Promise<OrganizationRole | undefined>;
  saveRole(role: OrganizationRole): Promise<OrganizationRole>;
  getLogs(): Promise<OrganizationAuditRecord[]>;
  addLog(log: OrganizationAuditRecord): Promise<void>;
}

// ─── Billing ──────────────────────────────────────────────────────────────────

export interface IBillingRepository {
  getPlans(): Promise<BillingPlan[]>;
  getSubscription(): Promise<SubscriptionRecord>;
  saveSubscription(sub: SubscriptionRecord): Promise<SubscriptionRecord>;
  getUsage(): Promise<UsageRecord>;
  saveUsage(usage: UsageRecord): Promise<UsageRecord>;
  getInvoices(): Promise<InvoiceRecord[]>;
  addInvoice(inv: InvoiceRecord): Promise<void>;
}

// ─── Secrets ──────────────────────────────────────────────────────────────────

export interface ISecretsRepository {
  getAll(): Promise<SecretRecord[]>;
  findById(id: string): Promise<SecretRecord | undefined>;
  save(secret: SecretRecord): Promise<SecretRecord>;
  delete(id: string): Promise<boolean>;
  getVersions(secretId: string): Promise<SecretVersionRecord[]>;
  addVersion(v: SecretVersionRecord): Promise<void>;
  getLogs(secretId?: string): Promise<SecretAuditRecord[]>;
  addLog(log: SecretAuditRecord): Promise<void>;
}

// ─── Integrations ─────────────────────────────────────────────────────────────

export interface IIntegrationRepository {
  findAll(): Promise<IntegrationCredentialsRecord[]>;
  findById(providerId: string): Promise<IntegrationCredentialsRecord | undefined>;
  findByProvider(providerId: string): Promise<IntegrationCredentialsRecord | undefined>;
  save(record: IntegrationCredentialsRecord): Promise<IntegrationCredentialsRecord>;
  delete(providerId: string): Promise<boolean>;
}

// ─── Templates ────────────────────────────────────────────────────────────────

export interface ITemplateRepository {
  findAll(): Promise<WorkflowTemplate[]>;
  findById(id: string): Promise<WorkflowTemplate | undefined>;
  save(template: WorkflowTemplate): Promise<WorkflowTemplate>;
  delete(id: string): Promise<boolean>;
}

// ─── Marketplace ──────────────────────────────────────────────────────────────

export interface IMarketplaceRepository {
  findAll(): Promise<MarketplaceEntry[]>;
  findById(id: string): Promise<MarketplaceEntry | undefined>;
  save(entry: MarketplaceEntry): Promise<MarketplaceEntry>;
  delete(id: string): Promise<boolean>;
}

// ─── API Tokens ───────────────────────────────────────────────────────────────

export interface IApiTokenRepository {
  getAll(): Promise<PublicApiTokenRecord[]>;
  findById(id: string): Promise<PublicApiTokenRecord | undefined>;
  findByToken(token: string): Promise<PublicApiTokenRecord | undefined>;
  save(tok: PublicApiTokenRecord): Promise<PublicApiTokenRecord>;
  delete(id: string): Promise<boolean>;
  getLogs(tokenId?: string): Promise<ApiRequestLogRecord[]>;
  addLog(log: ApiRequestLogRecord): Promise<void>;
}

// ─── Workflows ────────────────────────────────────────────────────────────────

export interface IWorkflowRepository {
  findAll(): Promise<Workflow[]>;
  findById(id: string): Promise<Workflow | undefined>;
  save(workflow: Workflow): Promise<Workflow>;
  delete(id: string): Promise<boolean>;
}

// ─── Execution History ────────────────────────────────────────────────────────

export interface IExecutionHistoryRepository {
  getWorkflowRuns(workflowId?: string): Promise<WorkflowRunRecord[]>;
  recordWorkflowRun(run: WorkflowRunRecord): Promise<WorkflowRunRecord>;
  updateWorkflowRun(id: string, update: Partial<WorkflowRunRecord>): Promise<WorkflowRunRecord | null>;
  getAgentRuns(agentId?: string): Promise<AgentRunRecord[]>;
  recordAgentRun(run: AgentRunRecord): Promise<AgentRunRecord>;
  getActivity(limit?: number): Promise<ActivityEvent[]>;
  recordActivity(event: ActivityEvent): Promise<ActivityEvent>;
}

// ─── Composite ────────────────────────────────────────────────────────────────

/** The complete set of repositories injected into ForgeFlowService */
export interface RepositorySet {
  settingsRepository:         ISettingsRepository;
  organizationRepository:     IOrganizationRepository;
  billingRepository:          IBillingRepository;
  secretsRepository:          ISecretsRepository;
  integrationsRepository:     IIntegrationRepository;
  templatesRepository:        ITemplateRepository;
  marketplaceRepository:      IMarketplaceRepository;
  apiTokenRepository:         IApiTokenRepository;
  workflowRepository:         IWorkflowRepository;
  executionHistoryRepository: IExecutionHistoryRepository;
}
