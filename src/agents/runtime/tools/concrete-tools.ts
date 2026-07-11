import { BaseTool } from "./base-tool";
import type { ToolExecutionContext } from "../../types/tool";

export class HTTPTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "http-tool",
        name: "HTTP Request Tool",
        description: "Performs web fetches.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: true,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: false,
      },
      permission: { scopes: ["network:read", "network:write"], requiresApproval: false },
      schema: { required: ["url"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[HTTP Fetch] Successfully fetched response from URL: ${params.url}`;
  }
}

export class FileTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "file-tool",
        name: "Local File System Tool",
        description: "Reads and writes files locally.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: false,
        requiresFileSystem: true,
        requiresDatabase: false,
        requiresAuthentication: false,
      },
      permission: { scopes: ["fs:read", "fs:write"], requiresApproval: true },
      schema: { required: ["path"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[File IO] Executed operation on file path: ${params.path}`;
  }
}

export class DatabaseTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "db-tool",
        name: "Database Operations Tool",
        description: "Executes database queries.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: false,
        requiresFileSystem: false,
        requiresDatabase: true,
        requiresAuthentication: true,
      },
      permission: { scopes: ["db:query"], requiresApproval: true },
      schema: { required: ["query"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[Database] Query executed successfully: ${params.query}`;
  }
}

export class SearchTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "search-tool",
        name: "Web Search Tool",
        description: "Queries external search engine indexes.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: true,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: false,
      },
      permission: { scopes: ["search"], requiresApproval: false },
      schema: { required: ["query"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[Search] Search query results mapped for term: ${params.query}`;
  }
}

export class KnowledgeTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "knowledge-tool",
        name: "Knowledge Search Tool",
        description: "Performs RAG retrievals against vector stores.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: false,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: false,
      },
      permission: { scopes: ["knowledge:retrieve"], requiresApproval: false },
      schema: { required: ["query"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[Knowledge RAG] Chunks context retrieved for query: ${params.query}`;
  }
}

export class GitHubTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "github-tool",
        name: "GitHub Integration Tool",
        description: "Updates repos and creates pull requests.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: true,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: true,
      },
      permission: { scopes: ["github:pr"], requiresApproval: true },
      schema: { required: ["repo", "title"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[GitHub API] Created pull request "${params.title}" in repository: ${params.repo}`;
  }
}

export class AzureTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "azure-tool",
        name: "Azure Services Tool",
        description: "Provisions Azure cloud resources.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: true,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: true,
      },
      permission: { scopes: ["azure:resource"], requiresApproval: true },
      schema: { required: ["resourceType"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[Azure SDK] Resource of type "${params.resourceType}" provisioned successfully.`;
  }
}

export class EmailTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "email-tool",
        name: "Email Sending Tool",
        description: "Sends notification emails to users.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: true,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: true,
      },
      permission: { scopes: ["email:send"], requiresApproval: true },
      schema: { required: ["recipient", "subject"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[SMTP Client] Email subject "${params.subject}" sent to recipient: ${params.recipient}`;
  }
}

export class CalendarTool extends BaseTool {
  constructor() {
    super({
      metadata: {
        id: "calendar-tool",
        name: "Calendar Scheduling Tool",
        description: "Books meeting events.",
        version: "1.0.0",
      },
      capability: {
        requiresNetwork: true,
        requiresFileSystem: false,
        requiresDatabase: false,
        requiresAuthentication: true,
      },
      permission: { scopes: ["calendar:book"], requiresApproval: true },
      schema: { required: ["title", "time"] },
    });
  }

  async execute(params: Record<string, unknown>, context: ToolExecutionContext): Promise<string> {
    this.validateParams(params);
    return `[Calendar API] Booking scheduled for event "${params.title}" at time: ${params.time}`;
  }
}
