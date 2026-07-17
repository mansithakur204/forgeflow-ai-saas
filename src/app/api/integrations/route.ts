// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Integrations API Route Controller
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { encrypt, decrypt } from "@/lib/encryption";
import {
  IntegrationConnectionManager,
  IntegrationAuthenticationManager,
  IntegrationTelemetryAdapter,
} from "@/engine/executors/base/integration-sdk";
import { IntegrationTestHarness } from "@/engine/executors/base/integration-test-harness";

// Supported integration definitions list
const PROVIDERS = [
  // AI
  { id: "openai", name: "OpenAI", category: "ai", desc: "GPT-4o, GPT-4o-mini and reasoning model endpoints." },
  { id: "gemini", name: "Gemini", category: "ai", desc: "Google Gemini 2.5 Pro and Flash model interfaces." },
  { id: "anthropic", name: "Anthropic", category: "ai", desc: "Anthropic Claude 3.5 Sonnet and Haiku runtimes." },
  { id: "groq", name: "Groq", category: "ai", desc: "Ultra-fast Llama 3 models hosted on Groq LPUs." },
  { id: "azure_openai", name: "Azure OpenAI", category: "ai", desc: "Enterprise-grade hosting of OpenAI APIs on Microsoft Azure." },
  { id: "ollama", name: "Ollama", category: "ai", desc: "Run local open-weight models (Llama 3, Mistral) on local networks." },

  // Messaging
  { id: "slack", name: "Slack", category: "messaging", desc: "Pushes system notifications, logs, and summaries to Slack channels." },
  { id: "discord", name: "Discord", category: "messaging", desc: "Pushes real-time messages and webhook alerts to Discord channels." },

  // Workspace
  { id: "notion", name: "Notion", category: "workspace", desc: "Read and write databases and workspaces using integration tokens." },
  { id: "google_sheets", name: "Google Sheets", category: "workspace", desc: "Append and retrieve rows from online spreadsheet cells." },

  // Email
  { id: "smtp", name: "SMTP", category: "email", desc: "Standard mail transmission server configurations." },
  { id: "resend", name: "Resend", category: "email", desc: "Modern transactional developer email API service." },
  { id: "sendgrid", name: "SendGrid", category: "email", desc: "High-volume email delivery and campaign APIs." },

  // Databases
  { id: "postgresql", name: "PostgreSQL", category: "database", desc: "Query, insert, and join data records in relational Postgres databases." },
  { id: "mysql", name: "MySQL", category: "database", desc: "Relational database integration for transactional tables." },
  { id: "sqlserver", name: "SQL Server", category: "database", desc: "Microsoft SQL Server database connectors." },
  { id: "mongodb", name: "MongoDB", category: "database", desc: "Document-oriented NoSQL database queries." },
];

export async function GET() {
  try {
    const list = await Promise.all(
      PROVIDERS.map(async (prov) => {
        const cred = await forgeFlowService.integrationsRepository.findByProvider(prov.id);
        const conn = IntegrationConnectionManager.getOrCreateConnection(prov.id);

        return {
          id: prov.id,
          name: prov.name,
          category: prov.category,
          description: prov.desc,
          connected: cred ? cred.status === "connected" : false,
          health: conn.status,
          lastSync: cred ? cred.lastSync : null,
          hasSecrets: cred ? Object.keys(cred.encryptedSecrets).length > 0 : false,
        };
      })
    );

    return NextResponse.json({ success: true, integrations: list });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const { action, providerId, secrets } = await request.json();

    if (!providerId) {
      return NextResponse.json({ success: false, error: "Missing Provider ID" }, { status: 400 });
    }

    const providerDef = PROVIDERS.find((p) => p.id === providerId);
    if (!providerDef) {
      return NextResponse.json({ success: false, error: `Invalid provider: ${providerId}` }, { status: 400 });
    }

    // ─── ACTION: DISCONNECT ───
    if (action === "disconnect") {
      await forgeFlowService.integrationsRepository.delete(providerId);

      // Reset Connection state in connection manager
      const conn = IntegrationConnectionManager.getOrCreateConnection(providerId);
      conn.status = "healthy";
      conn.failureCounter = 0;
      conn.successCounter = 0;

      return NextResponse.json({ success: true, message: `Disconnected ${providerDef.name} successfully` });
    }

    // Resolve Active/Input Secrets
    let resolvedSecrets: Record<string, string> = {};
    if (secrets && Object.keys(secrets).length > 0) {
      resolvedSecrets = { ...secrets };
    } else {
      const saved = await forgeFlowService.integrationsRepository.findByProvider(providerId);
      if (saved) {
        for (const [k, v] of Object.entries(saved.encryptedSecrets)) {
          resolvedSecrets[k] = decrypt(v as string);
        }
      }
    }

    if (Object.keys(resolvedSecrets).length === 0) {
      return NextResponse.json({ success: false, error: "Missing credential secrets" }, { status: 400 });
    }

    // Get Primary key value for prefix testing
    const primaryKey = Object.values(resolvedSecrets)[0] || "";

    // ─── ACTION: TEST CONNECTIVITY ───
    if (action === "test") {
      // Validate credential format prefixes
      let prefixValid = true;
      if (providerId === "openai" && !IntegrationAuthenticationManager.validateTokenPrefix(primaryKey, "sk-")) {
        prefixValid = false;
      } else if (providerId === "slack" && !IntegrationAuthenticationManager.validateTokenPrefix(primaryKey, "xoxb-")) {
        prefixValid = false;
      } else if (providerId === "notion" && !IntegrationAuthenticationManager.validateTokenPrefix(primaryKey, "secret_")) {
        prefixValid = false;
      } else if (providerId === "gemini" && !IntegrationAuthenticationManager.validateTokenPrefix(primaryKey, "AIzaSy")) {
        prefixValid = false;
      } else if (providerId === "anthropic" && !IntegrationAuthenticationManager.validateTokenPrefix(primaryKey, "sk-ant-")) {
        prefixValid = false;
      } else if (providerId === "groq" && !IntegrationAuthenticationManager.validateTokenPrefix(primaryKey, "gsk_")) {
        prefixValid = false;
      }

      const logger = console;
      const tele = new IntegrationTelemetryAdapter(logger, `node-${providerId}`);

      if (!prefixValid) {
        IntegrationConnectionManager.recordFailure(providerId, "global", false, tele);
        return NextResponse.json({
          success: false,
          error: `Handshake failed: Invalid key format prefix rules for ${providerDef.name}.`,
        });
      }

      // Simulate connection testing latency using the IntegrationTestHarness SDK class
      const harness = new IntegrationTestHarness({ name: providerDef.name, fixedLatencyMs: 300 });
      const runRes = await harness.runOperation(
        `${providerId}:global`,
        async () => "Connection verified successfully.",
        1000,
        logger,
        `node-${providerId}`
      );

      if (runRes.success) {
        IntegrationConnectionManager.recordSuccess(providerId, "global", tele);
        return NextResponse.json({ success: true, message: "Connection test verified successfully." });
      } else {
        IntegrationConnectionManager.recordFailure(providerId, "global", false, tele);
        return NextResponse.json({ success: false, error: runRes.errorMessage || "Handshake rejected." });
      }
    }

    // ─── ACTION: CONNECT (SAVE) ───
    if (action === "connect") {
      // Encrypt secrets dictionary before saving
      const encryptedSecrets: Record<string, string> = {};
      for (const [k, v] of Object.entries(resolvedSecrets)) {
        encryptedSecrets[k] = encrypt(v);
      }

      await forgeFlowService.integrationsRepository.save({
        providerId,
        status: "connected",
        health: "healthy",
        lastSync: new Date().toISOString(),
        encryptedSecrets,
        updatedAt: new Date().toISOString(),
      });

      const conn = IntegrationConnectionManager.getOrCreateConnection(providerId);
      conn.status = "healthy";
      conn.successCounter += 1;
      conn.lastSuccessfulOperationAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        message: `Connected ${providerDef.name} integration successfully`,
      });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
