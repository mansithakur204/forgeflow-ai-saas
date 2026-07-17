import { isDatabaseConfigured } from "@/lib/db/connection";
import type { RepositorySet, IWorkflowRepository } from "./interfaces";
import { PostgresSettingsRepository } from "./postgres/SettingsRepository";
import { PostgresOrganizationRepository } from "./postgres/OrganizationRepository";
import { PostgresBillingRepository } from "./postgres/BillingRepository";
import { PostgresSecretsRepository } from "./postgres/SecretsRepository";
import { PostgresIntegrationRepository } from "./postgres/IntegrationRepository";
import { PostgresTemplateRepository } from "./postgres/TemplateRepository";
import { PostgresMarketplaceRepository } from "./postgres/MarketplaceRepository";
import { PostgresApiTokenRepository } from "./postgres/ApiTokenRepository";
import { PostgresWorkflowRepository } from "./postgres/WorkflowRepository";
import { PostgresExecutionHistoryRepository } from "./postgres/ExecutionHistoryRepository";

import {
  InMemorySettingsRepository,
  InMemoryOrganizationRepository,
  InMemoryBillingRepository,
  InMemorySecretsRepository,
  InMemoryIntegrationRepository,
  InMemoryTemplateRepository,
  InMemoryMarketplaceRepository,
  InMemoryPublicApiTokenRepository,
} from "@/lib/forgeflow-service";
import { InMemoryWorkflowRepository, InMemoryExecutionHistoryRepository } from "./in-memory";
import type { Workflow } from "@/lib/workflow-data";

export function createRepositorySet(workflowsArray: Workflow[]): RepositorySet {
  if (isDatabaseConfigured()) {
    console.log("[ForgeFlow] Initializing PostgreSQL Persistence Layer...");
    return {
      settingsRepository:         new PostgresSettingsRepository(),
      organizationRepository:     new PostgresOrganizationRepository(),
      billingRepository:          new PostgresBillingRepository(),
      secretsRepository:          new PostgresSecretsRepository(),
      integrationsRepository:     new PostgresIntegrationRepository(),
      templatesRepository:        new PostgresTemplateRepository(),
      marketplaceRepository:      new PostgresMarketplaceRepository(),
      apiTokenRepository:         new PostgresApiTokenRepository(),
      workflowRepository:         new PostgresWorkflowRepository(),
      executionHistoryRepository: new PostgresExecutionHistoryRepository(),
    };
  } else {
    console.log("[ForgeFlow] Falling back to In-Memory Persistence Layer...");
    return {
      settingsRepository:         new InMemorySettingsRepository(),
      organizationRepository:     new InMemoryOrganizationRepository(),
      billingRepository:          new InMemoryBillingRepository(),
      secretsRepository:          new InMemorySecretsRepository(),
      integrationsRepository:     new InMemoryIntegrationRepository(),
      templatesRepository:        new InMemoryTemplateRepository(),
      marketplaceRepository:      new InMemoryMarketplaceRepository(),
      apiTokenRepository:         new InMemoryPublicApiTokenRepository(),
      workflowRepository:         new InMemoryWorkflowRepository(workflowsArray),
      executionHistoryRepository: new InMemoryExecutionHistoryRepository(),
    };
  }
}

function createWorkflowProxy(wf: any, repo: IWorkflowRepository): any {
  if (!wf || wf.__isProxy) return wf;
  return new Proxy(wf, {
    set(target, prop, value, receiver) {
      const res = Reflect.set(target, prop, value, receiver);
      if (typeof prop === "string" && prop !== "__isProxy") {
        repo.save(target).catch((err: any) =>
          console.error("[PostgresWorkflowArrayProxy] Failed to update workflow property in DB:", err)
        );
      }
      return res;
    },
    get(target, prop, receiver) {
      if (prop === "__isProxy") return true;
      return Reflect.get(target, prop, receiver);
    }
  });
}

export function wrapWorkflowsArray(workflows: Workflow[], repo: IWorkflowRepository): Workflow[] {
  // Wrap existing items
  for (let i = 0; i < workflows.length; i++) {
    workflows[i] = createWorkflowProxy(workflows[i], repo);
  }

  return new Proxy(workflows, {
    set(target, prop, value, receiver) {
      let valToSet = value;
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        valToSet = createWorkflowProxy(value, repo);
      }
      const res = Reflect.set(target, prop, valToSet, receiver);
      if (typeof prop === "string" && /^\d+$/.test(prop)) {
        if (valToSet && valToSet.id) {
          repo.save(valToSet).catch((err: any) =>
            console.error("[PostgresWorkflowArrayProxy] Failed to save workflow to DB via index set:", err)
          );
        }
      }
      return res;
    },
    get(target, prop, receiver) {
      const val = Reflect.get(target, prop, receiver);
      if (typeof val === "function") {
        if (prop === "push") {
          return function (...args: any[]) {
            const proxiedArgs = args.map(arg => createWorkflowProxy(arg, repo));
            const res = target.push(...proxiedArgs);
            for (const wf of proxiedArgs) {
              repo.save(wf).catch((err: any) =>
                console.error("[PostgresWorkflowArrayProxy] Failed to save workflow to DB via push:", err)
              );
            }
            return res;
          };
        }
        if (prop === "splice") {
          return function (start: number, deleteCount?: number, ...items: any[]) {
            const deleted = target.slice(start, start + (deleteCount ?? 0));
            const proxiedItems = items.map(item => createWorkflowProxy(item, repo));
            const res = target.splice(start, deleteCount ?? 0, ...proxiedItems);
            for (const wf of deleted) {
              repo.delete(wf.id).catch((err: any) =>
                console.error("[PostgresWorkflowArrayProxy] Failed to delete workflow from DB via splice:", err)
              );
            }
            for (const wf of proxiedItems) {
              repo.save(wf).catch((err: any) =>
                console.error("[PostgresWorkflowArrayProxy] Failed to save workflow to DB via splice insert:", err)
              );
            }
            return res;
          };
        }
      }
      return val;
    }
  });
}
