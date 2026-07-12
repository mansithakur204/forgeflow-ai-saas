import { NextResponse } from "next/server";
import { forgeFlowService } from "@/lib/forgeflow-service";
import type { IAgent } from "@/agents/runtime/agent.interface";
import type { AgentConfig } from "@/agents/types/agent";

class CustomAgent implements IAgent {
  private config: AgentConfig;

  constructor(config: AgentConfig) {
    this.config = config;
  }

  getConfig(): AgentConfig {
    return this.config;
  }

  async executeStep() {
    return { output: "Custom agent execution step complete." };
  }
}

export async function GET() {
  const list = forgeFlowService.agentRegistry.list();

  const mapped = list.map((a) => {
    const config = a.getConfig();
    const configAny = config as any;
    return {
      id: config.id,
      name: config.metadata.name,
      avatar: "🤖",
      color: "bg-blue-500",
      description: config.metadata.description,
      providerId: configAny.providerId || "google",
      modelId: configAny.modelId || "gemini-1.5-pro",
      status: configAny.status || ("active" as const),
      lastRun: configAny.lastRun || new Date().toISOString(),
      version: config.metadata.version || "v1.0.0",
      createdBy: config.metadata.author || "System",
      runCount: configAny.runCount || 0,
      successRate: configAny.successRate || 100,
      tags: Object.keys(config.capabilities).filter((k) => (config.capabilities as any)[k] === true),
      temperature: configAny.temperature !== undefined ? configAny.temperature : 0.2,
      topP: configAny.topP !== undefined ? configAny.topP : 0.95,
      maxTokens: configAny.maxTokens || 4096,
      streaming: configAny.streaming !== undefined ? configAny.streaming : true,
      jsonMode: configAny.jsonMode !== undefined ? configAny.jsonMode : false,
      systemPrompt: configAny.systemPrompt || "You are an autonomous helper agent.",
      tools: configAny.tools || [],
      permissions: configAny.permissions || { internet: true, fileAccess: true, webhooks: true },
    };
  });

  return NextResponse.json(mapped);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const agentId = body.id || `agent-${Date.now()}`;
    
    const newAgent = new CustomAgent({
      id: agentId,
      metadata: {
        id: agentId,
        name: body.name || "Custom Agent",
        description: body.description || "",
        version: body.version || "v1.0.0",
        author: body.createdBy || "User",
      },
      capabilities: {
        canPlan: true,
        canExecute: true,
        canSearchCode: true,
        canEditCode: true,
        canAccessMemory: true,
        canUseTools: true,
      },
      ...body
    } as any);

    forgeFlowService.agentRegistry.register(newAgent);
    return NextResponse.json({ success: true, agentId: newAgent.getConfig().id });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, name, description, status, temperature, topP, tools } = body;
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing agent ID" }, { status: 400 });
    }
    
    const agentInstance = forgeFlowService.agentRegistry.resolve(id);
    if (!agentInstance) {
      return NextResponse.json({ success: false, error: "Agent not found" }, { status: 404 });
    }
    
    // Update config fields
    const config = agentInstance.getConfig();
    if (name) config.metadata.name = name;
    if (description !== undefined) config.metadata.description = description;
    
    const configAny = config as any;
    if (status) configAny.status = status;
    if (temperature !== undefined) configAny.temperature = temperature;
    if (topP !== undefined) configAny.topP = topP;
    if (tools) configAny.tools = tools;
    
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ success: false, error: "Missing agent ID" }, { status: 400 });
    }
    
    forgeFlowService.agentRegistry.unregister(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export const dynamic = "force-dynamic";
