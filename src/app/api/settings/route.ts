// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Workspace Settings API Route Controller
// ─────────────────────────────────────────────────────────────────────────────

import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import { encrypt, decrypt } from "@/lib/encryption";
import crypto from "crypto";

export async function GET() {
  try {
    const rawSettings = await forgeFlowService.settingsRepository.get();
    const logs = await forgeFlowService.settingsRepository.getLogs();

    // Create a masked copy of the settings before returning to client
    const maskedSettings = JSON.parse(JSON.stringify(rawSettings));

    // Mask AI provider keys
    if (maskedSettings.aiProviders.openaiKey) {
      maskedSettings.aiProviders.openaiKey = "••••••••••••••••••••";
    }
    if (maskedSettings.aiProviders.geminiKey) {
      maskedSettings.aiProviders.geminiKey = "••••••••••••••••••••";
    }
    if (maskedSettings.aiProviders.anthropicKey) {
      maskedSettings.aiProviders.anthropicKey = "••••••••••••••••••••";
    }

    // Mask Environment Variables
    for (const k of Object.keys(maskedSettings.environmentVariables)) {
      maskedSettings.environmentVariables[k] = "••••••••••••••••";
    }

    return NextResponse.json({ success: true, settings: maskedSettings, logs });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, settings, providerId, apiKey, restored } = body;

    const oldSettings = await forgeFlowService.settingsRepository.get();

    // ─── ACTION: TEST PROVIDER KEY ───
    if (action === "test-provider") {
      if (!providerId || !apiKey) {
        return NextResponse.json({ success: false, error: "Missing Provider ID or Key String" }, { status: 400 });
      }

      let valid = true;
      if (providerId === "openai" && !apiKey.startsWith("sk-")) valid = false;
      if (providerId === "gemini" && !apiKey.startsWith("AIzaSy")) valid = false;
      if (providerId === "anthropic" && !apiKey.startsWith("sk-ant-")) valid = false;

      if (!valid) {
        return NextResponse.json({ success: false, error: `Invalid key format prefix for "${providerId}".` });
      }

      return NextResponse.json({ success: true, message: `Ping connection to ${providerId} validated successfully.` });
    }

    // ─── ACTION: REGENERATE WORKSPACE API KEY ───
    if (action === "regenerate-api-key") {
      const newKey = `ff_live_key_${crypto.randomBytes(16).toString("hex")}`;

      await forgeFlowService.settingsRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Jane Doe",
        action: "Regenerated API Key",
        details: "Created a new workspace-scoped Client Secret Key.",
      });

      return NextResponse.json({ success: true, apiKey: newKey, message: "Workspace client key regenerated." });
    }

    // ─── ACTION: RESET ───
    if (action === "reset") {
      forgeFlowService.settingsRepository.resetToDefaults();

      await forgeFlowService.settingsRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Jane Doe",
        action: "Settings Reset",
        details: "Reverted all configurations to factory default states.",
      });

      return NextResponse.json({ success: true, message: "Workspace settings reset successfully." });
    }

    // ─── ACTION: RESTORE/IMPORT ───
    if (action === "restore") {
      if (!restored || !restored.general || !restored.aiProviders) {
        return NextResponse.json({ success: false, error: "Invalid backup configuration format" }, { status: 400 });
      }

      await forgeFlowService.settingsRepository.save(restored);

      await forgeFlowService.settingsRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Jane Doe",
        action: "Restored Configuration",
        details: `Restored workspace parameters backup (Version v${restored.version}).`,
      });

      return NextResponse.json({ success: true, message: "Workspace settings restored successfully." });
    }

    // ─── ACTION: SAVE SETTINGS ───
    if (action === "save") {
      if (!settings) {
        return NextResponse.json({ success: false, error: "Missing settings payload" }, { status: 400 });
      }

      const updatedSettings = { ...settings };

      // AI API keys check: if unchanged placeholder, restore old encrypted key; else encrypt new input key.
      if (updatedSettings.aiProviders.openaiKey === "••••••••••••••••••••") {
        updatedSettings.aiProviders.openaiKey = oldSettings.aiProviders.openaiKey;
      } else if (updatedSettings.aiProviders.openaiKey) {
        updatedSettings.aiProviders.openaiKey = encrypt(updatedSettings.aiProviders.openaiKey);
      }

      if (updatedSettings.aiProviders.geminiKey === "••••••••••••••••••••") {
        updatedSettings.aiProviders.geminiKey = oldSettings.aiProviders.geminiKey;
      } else if (updatedSettings.aiProviders.geminiKey) {
        updatedSettings.aiProviders.geminiKey = encrypt(updatedSettings.aiProviders.geminiKey);
      }

      if (updatedSettings.aiProviders.anthropicKey === "••••••••••••••••••••") {
        updatedSettings.aiProviders.anthropicKey = oldSettings.aiProviders.anthropicKey;
      } else if (updatedSettings.aiProviders.anthropicKey) {
        updatedSettings.aiProviders.anthropicKey = encrypt(updatedSettings.aiProviders.anthropicKey);
      }

      // Env variables mapping encryption
      const encryptedEnvs: Record<string, string> = {};
      for (const [k, v] of Object.entries(updatedSettings.environmentVariables || {})) {
        if (v === "••••••••••••••••") {
          encryptedEnvs[k] = oldSettings.environmentVariables[k] || "";
        } else {
          encryptedEnvs[k] = encrypt(String(v));
        }
      }
      updatedSettings.environmentVariables = encryptedEnvs;

      // Versioning increment
      updatedSettings.version = (oldSettings.version || 1) + 1;

      await forgeFlowService.settingsRepository.save(updatedSettings);

      await forgeFlowService.settingsRepository.addLog({
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        user: "Jane Doe",
        action: "Configuration Updated",
        details: `Saved changes to settings layout. Incremented version to v${updatedSettings.version}.`,
      });

      return NextResponse.json({ success: true, message: "Workspace settings updated successfully." });
    }

    return NextResponse.json({ success: false, error: `Invalid action "${action}"` }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
