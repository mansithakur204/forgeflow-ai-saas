// Mock Data for AI Agents Module

export interface Provider {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color class or hex
  gradient: string; // Tailwind gradient class
}

export interface Model {
  id: string;
  name: string;
  providerId: string;
  maxTokens: number;
  temperatureRange: [number, number];
  tags: string[];
}

export interface Tool {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string; // Icon name matching Lucide
  enabled: boolean;
  permissions: string[];
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  userPrompt: string;
  variables: string[];
  category: string;
}

export interface UploadedFile {
  id: string;
  name: string;
  size: string;
  chunks: number;
  embeddings: number;
  status: "processing" | "embedded" | "failed";
  uploadedAt: string;
}

export interface Agent {
  id: string;
  name: string;
  avatar: string; // initials or emoji or img url
  color: string; // primary color hex/class
  description: string;
  providerId: string;
  modelId: string;
  status: "active" | "paused" | "archived";
  lastRun: string;
  version: string;
  createdBy: string;
  runCount: number;
  successRate: number;
  tags: string[];
  // LLM Configs
  temperature: number;
  topP: number;
  maxTokens: number;
  streaming: boolean;
  jsonMode: boolean;
  systemPrompt: string;
  developerPrompt?: string;
  // Memory Configs
  memoryEnabled?: boolean;
  memoryType?: "conversation" | "vector" | "both" | "none";
  memoryWindow?: number; // in turns
  retentionDays?: number;
  // Tools enabled IDs
  tools: string[];
  // Permissions
  permissions: {
    internet: boolean;
    fileAccess: boolean;
    webhooks: boolean;
  };
}

export interface AnalyticsRecord {
  timestamp: string;
  requests: number;
  tokensUsed: number;
  latency: number; // in ms
  errors: number;
  cost: number; // in USD
}

// ─────────────────────────────────────────────────────────────────────────────
// 10 Mock Providers
// ─────────────────────────────────────────────────────────────────────────────
export const mockProviders: Provider[] = [
  { id: "openai", name: "OpenAI", description: "Industry leader in general reasoning and conversation models.", color: "bg-emerald-500", gradient: "from-emerald-600 to-teal-500" },
  { id: "anthropic", name: "Anthropic", description: "Steerable, honest, and robust models with large context windows.", color: "bg-orange-500", gradient: "from-orange-600 to-amber-500" },
  { id: "google", name: "Google Gemini", description: "Multimodal powerhouse with massive context windows.", color: "bg-blue-500", gradient: "from-blue-600 to-indigo-500" },
  { id: "azure", name: "Azure OpenAI", description: "Enterprise-grade OpenAI models with strict compliance.", color: "bg-cyan-500", gradient: "from-cyan-600 to-blue-500" },
  { id: "deepseek", name: "DeepSeek", description: "High-performance coding and mathematical reasoning models.", color: "bg-indigo-500", gradient: "from-indigo-600 to-violet-500" },
  { id: "groq", name: "Groq", description: "Ultra-low latency LPU inference service.", color: "bg-pink-500", gradient: "from-pink-600 to-rose-500" },
  { id: "huggingface", name: "HuggingFace", description: "Open-source community models repository.", color: "bg-yellow-500", gradient: "from-yellow-600 to-amber-500" },
  { id: "ollama", name: "Ollama", description: "Run powerful models locally on your consumer hardware.", color: "bg-slate-500", gradient: "from-slate-600 to-zinc-500" },
  { id: "mistral", name: "Mistral AI", description: "European state-of-the-art open models.", color: "bg-red-500", gradient: "from-red-600 to-orange-500" },
  { id: "cohere", name: "Cohere", description: "Enterprise search, retrieval, and classification experts.", color: "bg-purple-500", gradient: "from-purple-600 to-pink-500" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 15 Mock Models
// ─────────────────────────────────────────────────────────────────────────────
export const mockModels: Model[] = [
  { id: "gpt-4o", name: "gpt-4o", providerId: "openai", maxTokens: 4096, temperatureRange: [0, 2], tags: ["flagship", "reasoning", "multimodal"] },
  { id: "gpt-4-turbo", name: "gpt-4-turbo", providerId: "openai", maxTokens: 4096, temperatureRange: [0, 2], tags: ["reasoning", "agentic"] },
  { id: "gpt-3.5-turbo", name: "gpt-3.5-turbo", providerId: "openai", maxTokens: 2048, temperatureRange: [0, 2], tags: ["fast", "cost-effective"] },
  { id: "claude-3-5-sonnet", name: "claude-3-5-sonnet", providerId: "anthropic", maxTokens: 8192, temperatureRange: [0, 1], tags: ["flagship", "coding", "agentic"] },
  { id: "claude-3-opus", name: "claude-3-opus", providerId: "anthropic", maxTokens: 4096, temperatureRange: [0, 1], tags: ["reasoning", "complex"] },
  { id: "claude-3-haiku", name: "claude-3-haiku", providerId: "anthropic", maxTokens: 4096, temperatureRange: [0, 1], tags: ["fast", "cheap"] },
  { id: "gemini-1.5-pro", name: "gemini-1.5-pro", providerId: "google", maxTokens: 8192, temperatureRange: [0, 2], tags: ["1M context", "multimodal", "flagship"] },
  { id: "gemini-1.5-flash", name: "gemini-1.5-flash", providerId: "google", maxTokens: 4096, temperatureRange: [0, 2], tags: ["ultra-fast", "multimodal"] },
  { id: "azure-gpt-4o", name: "gpt-4o (Azure)", providerId: "azure", maxTokens: 4096, temperatureRange: [0, 2], tags: ["enterprise", "compliant"] },
  { id: "deepseek-v3", name: "deepseek-chat (V3)", providerId: "deepseek", maxTokens: 8192, temperatureRange: [0, 1.5], tags: ["cheap", "smart"] },
  { id: "deepseek-coder", name: "deepseek-coder", providerId: "deepseek", maxTokens: 8192, temperatureRange: [0, 1.5], tags: ["coding", "smart"] },
  { id: "llama-3-70b-groq", name: "llama3-70b-8192", providerId: "groq", maxTokens: 8192, temperatureRange: [0, 2], tags: ["instant-speed", "llama3"] },
  { id: "mixtral-8x7b-hf", name: "mixtral-8x7b-instruct", providerId: "huggingface", maxTokens: 4096, temperatureRange: [0, 1.5], tags: ["open-source", "mixture-of-experts"] },
  { id: "llama-3-local", name: "llama3:8b", providerId: "ollama", maxTokens: 2048, temperatureRange: [0, 2], tags: ["local", "private"] },
  { id: "mistral-large", name: "mistral-large-latest", providerId: "mistral", maxTokens: 8192, temperatureRange: [0, 1.5], tags: ["multilingual", "reasoning"] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 15 Tools
// ─────────────────────────────────────────────────────────────────────────────
export const mockTools: Tool[] = [
  { id: "tool-http", name: "HTTP Request", description: "Performs outbound HTTP calls (GET, POST, etc.) to fetch API responses.", category: "Network", icon: "Globe", enabled: true, permissions: ["Internet Access"] },
  { id: "tool-code", name: "Code Executor", description: "Runs sandboxed Javascript/Python code to manipulate data or perform math.", category: "System", icon: "Code", enabled: true, permissions: ["File Access"] },
  { id: "tool-db", name: "Database Router", description: "Queries and fetches tabular schema information or records from relational databases.", category: "Storage", icon: "Database", enabled: true, permissions: ["File Access"] },
  { id: "tool-email", name: "Email Sender", description: "Automates composition and dispatch of alert emails or system notifications.", category: "Communication", icon: "Mail", enabled: false, permissions: [] },
  { id: "tool-calendar", name: "Calendar Manager", description: "Reads, updates, and creates schedules or appointment events.", category: "Communication", icon: "Calendar", enabled: false, permissions: [] },
  { id: "tool-drive", name: "Google Drive", description: "Lists, downloads, and syncs cloud document metadata.", category: "Storage", icon: "FolderOpen", enabled: false, permissions: ["File Access"] },
  { id: "tool-slack", name: "Slack integration", description: "Pushes system notifications, logs, and interactive summaries to Slack channels.", category: "Communication", icon: "MessageSquare", enabled: true, permissions: ["Internet Access"] },
  { id: "tool-discord", name: "Discord webhook", description: "Pipes alert payload records directly into server webhook feeds.", category: "Communication", icon: "MessageCircle", enabled: false, permissions: ["Internet Access"] },
  { id: "tool-github", name: "GitHub Reader", description: "Pulls pull request and issue records from designated open source repos.", category: "DevTools", icon: "Github", enabled: false, permissions: ["Internet Access"] },
  { id: "tool-webhook", name: "Incoming Webhook", description: "Listens for incoming payloads and triggers workflows.", category: "Network", icon: "Webhook", enabled: true, permissions: ["Internet Access", "Webhook Access"] },
  { id: "tool-rest", name: "REST API Agent", description: "Discovers and calls Swagger/OpenAPI compliant REST services automatically.", category: "Network", icon: "Cpu", enabled: true, permissions: ["Internet Access"] },
  { id: "tool-search", name: "Google Search", description: "Crawls search results to solve real-time information lookups.", category: "Network", icon: "Search", enabled: true, permissions: ["Internet Access"] },
  { id: "tool-calc", name: "Advanced Calculator", description: "Solves algebraic and mathematical equations precisely.", category: "Utility", icon: "Calculator", enabled: true, permissions: [] },
  { id: "tool-file", name: "File Reader", description: "Reads local PDF, JSON, TXT, CSV logs and extracts string slices.", category: "Utility", icon: "FileText", enabled: true, permissions: ["File Access"] },
  { id: "tool-parser", name: "JSON Parser", description: "Formats and lint-validates structured JSON payloads.", category: "Utility", icon: "Binary", enabled: true, permissions: [] },
];

// ─────────────────────────────────────────────────────────────────────────────
// 20 Prompt Templates
// ─────────────────────────────────────────────────────────────────────────────
export const mockPrompts: PromptTemplate[] = [
  { id: "prompt-1", name: "Software Engineer Co-Pilot", description: "Specialized in generating optimized React & Next.js code structures.", systemPrompt: "You are an expert React and TypeScript senior developer. Write clean, accessible, and high-performance components.", userPrompt: "Build an interactive dashboard card component displaying metric: {{metric}}.", variables: ["metric"], category: "Coding" },
  { id: "prompt-2", name: "SQL Query Generator", description: "Formulates complex PostgreSQL queries based on schemas.", systemPrompt: "You are a database administrator. Translate the user's natural language request into clean, optimized SQL.", userPrompt: "Extract the top 10 users by purchase total, matching schema: {{schema}}.", variables: ["schema"], category: "Database" },
  { id: "prompt-3", name: "Customer Support Agent", description: "Empathetic support agent responding to common ticket queues.", systemPrompt: "You are an assistant for customer care. Maintain an empathetic, professional tone. Keep responses under 3 paragraphs.", userPrompt: "Draft a reply to a user complaining about late delivery. Details: {{details}}.", variables: ["details"], category: "Support" },
  { id: "prompt-4", name: "Data Extraction Specialist", description: "Extracts structured schema models from messy text lists.", systemPrompt: "Act as a JSON extractor. Output ONLY valid JSON containing key entities. Do not add markdown blocks.", userPrompt: "Extract names and emails from: {{text}}.", variables: ["text"], category: "Data Mining" },
  { id: "prompt-5", name: "SEO Copywriter", description: "Generates rich ranking copy including strategic keywords.", systemPrompt: "You are an expert copywriter. Optimize for readability and organic search rankings.", userPrompt: "Write a short blog section about {{topic}} focusing on keywords: {{keywords}}.", variables: ["topic", "keywords"], category: "Marketing" },
  { id: "prompt-6", name: "Resume Screener", description: "Evaluates candidates against specified job descriptions.", systemPrompt: "You are a recruiting coordinator. Assess resumes on standard competencies: Tech Stack, Leadership, and Communication.", userPrompt: "Review resume {{resume}} against job requirements: {{job}}.", variables: ["resume", "job"], category: "HR" },
  { id: "prompt-7", name: "Financial Risk Analyst", description: "Evaluates standard risk profiles from ledger extracts.", systemPrompt: "Analyze the financial transactions for anomalies, high leverage, or suspicious transfers. Highlight flags.", userPrompt: "Analyze this transaction batch: {{batch}}.", variables: ["batch"], category: "Finance" },
  { id: "prompt-8", name: "Language Translator", description: "Fluent localized translations with cultural context.", systemPrompt: "Translate the user query while preserving regional idioms, professional tone, and clarity.", userPrompt: "Translate '{{text}}' to {{language}}.", variables: ["text", "language"], category: "Translation" },
  { id: "prompt-9", name: "Creative Storyteller", description: "Generates plot twists and descriptive fiction models.", systemPrompt: "You are a fiction novelist. Focus on visual metaphors, suspense, and dynamic pacing.", userPrompt: "Write a sci-fi introduction about {{character}} finding a {{object}}.", variables: ["character", "object"], category: "Creative" },
  { id: "prompt-10", name: "UI Copywriter", description: "Sleek and clear micro-copy strings for application notifications.", systemPrompt: "You write UI buttons, empty states, and modal alerts. Keep text punchy, positive, and clear.", userPrompt: "Create a descriptive error notification for a failed transfer: {{error}}.", variables: ["error"], category: "UI/UX" },
  { id: "prompt-11", name: "Security Auditor", description: "Flags OWASP top-10 bugs in code repositories.", systemPrompt: "Analyze code structures for SQL injection, CSRF, insecure libraries, or XSS vulnerabilities.", userPrompt: "Audit: {{code}}.", variables: ["code"], category: "Security" },
  { id: "prompt-12", name: "Medical Term Translator", description: "Simplifies complex medical terminology for layperson users.", systemPrompt: "Translate complex diagnostic terms into easy-to-understand, reassuring patient summaries.", userPrompt: "Explain: {{diagnosis}}.", variables: ["diagnosis"], category: "Healthcare" },
  { id: "prompt-13", name: "Meeting Minutes Generator", description: "Summarizes video meeting transcripts into clear checklists.", systemPrompt: "Extract meeting decisions, key discussions, assignees, and deadlines in markdown lists.", userPrompt: "Summarize: {{transcript}}.", variables: ["transcript"], category: "Utility" },
  { id: "prompt-14", name: "Product Spec Planner", description: "Drafts detailed technical product requirement specs.", systemPrompt: "You are a principal PM. Detail the scope, user personas, success criteria, and system bounds.", userPrompt: "Create a PRD for {{feature}}.", variables: ["feature"], category: "Product" },
  { id: "prompt-15", name: "Regex Helper", description: "Translates matching patterns into valid regular expressions.", systemPrompt: "Formulate matching regex patterns. Include explanation of flags and capture groups.", userPrompt: "Match: {{pattern}}.", variables: ["pattern"], category: "Coding" },
  { id: "prompt-16", name: "Legal Document Summarizer", description: "Extracts key clauses and termination dates from NDAs.", systemPrompt: "Highlight governing law, liability limitations, payment terms, and notice periods.", userPrompt: "Summarize: {{document}}.", variables: ["document"], category: "Legal" },
  { id: "prompt-17", name: "Social Media Strategist", description: "Curates engaging visual thread prompts for Twitter.", systemPrompt: "Write a high-hook 5-tweet thread template. Keep within character bounds. Inject relevant hashtags.", userPrompt: "Topic: {{topic}}.", variables: ["topic"], category: "Marketing" },
  { id: "prompt-18", name: "Product Review Sentiment Analyzer", description: "Categorizes customer feedback logs by sentiment.", systemPrompt: "Evaluate user ratings and testimonials. Group output by Sentiment: Positive, Neutral, Negative.", userPrompt: "Feedback: {{feedback}}.", variables: ["feedback"], category: "Support" },
  { id: "prompt-19", name: "Git Commit Formatter", description: "Generates clean semantic commit messages.", systemPrompt: "Compose formatted commit messages adhering strictly to conventional commits specification.", userPrompt: "Changes: {{diff}}.", variables: ["diff"], category: "DevTools" },
  { id: "prompt-20", name: "API Request Planner", description: "Constructs correct request bodies for API calls.", systemPrompt: "Generate formatted JSON bodies or curl lines from unstructured description fields.", userPrompt: "Build curl for: {{description}}.", variables: ["description"], category: "Network" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 10 Uploaded Files (Knowledge Base)
// ─────────────────────────────────────────────────────────────────────────────
export const mockFiles: UploadedFile[] = [
  { id: "file-1", name: "company_handbook_2026.pdf", size: "4.2 MB", chunks: 124, embeddings: 124, status: "embedded", uploadedAt: "2026-05-10T14:32:00Z" },
  { id: "file-2", name: "customer_churn_q1.csv", size: "18.5 MB", chunks: 542, embeddings: 542, status: "embedded", uploadedAt: "2026-06-02T09:12:00Z" },
  { id: "file-3", name: "product_spec_draft.docx", size: "840 KB", chunks: 28, embeddings: 28, status: "embedded", uploadedAt: "2026-06-15T11:05:00Z" },
  { id: "file-4", name: "api_endpoints_v2.json", size: "1.2 MB", chunks: 85, embeddings: 85, status: "embedded", uploadedAt: "2026-06-20T16:40:00Z" },
  { id: "file-5", name: "support_faq_template.txt", size: "230 KB", chunks: 14, embeddings: 14, status: "embedded", uploadedAt: "2026-06-25T13:19:00Z" },
  { id: "file-6", name: "billing_invoices_archived.zip", size: "45 MB", chunks: 0, embeddings: 0, status: "failed", uploadedAt: "2026-06-28T10:00:00Z" },
  { id: "file-7", name: "legal_terms_update.pdf", size: "1.8 MB", chunks: 42, embeddings: 30, status: "processing", uploadedAt: "2026-07-01T15:22:00Z" },
  { id: "file-8", name: "sales_targets_fy27.csv", size: "4.1 MB", chunks: 110, embeddings: 110, status: "embedded", uploadedAt: "2026-07-03T08:45:00Z" },
  { id: "file-9", name: "engineering_standards.txt", size: "115 KB", chunks: 8, embeddings: 8, status: "embedded", uploadedAt: "2026-07-05T17:12:00Z" },
  { id: "file-10", name: "marketing_strategy_summary.pdf", size: "2.9 MB", chunks: 64, embeddings: 64, status: "embedded", uploadedAt: "2026-07-07T11:30:00Z" },
];

// ─────────────────────────────────────────────────────────────────────────────
// 20 Mock Agents
// ─────────────────────────────────────────────────────────────────────────────
export const mockAgents: Agent[] = [
  {
    id: "agent-1",
    name: "ForgeFlow Code Architect",
    avatar: "💻",
    color: "bg-blue-500",
    description: "Generates scalable backend code layouts and resolves complex compiler issues in TypeScript.",
    providerId: "anthropic",
    modelId: "claude-3-5-sonnet",
    status: "active",
    lastRun: "2026-07-07T22:30:00Z",
    version: "v2.4.1",
    createdBy: "Devon S.",
    runCount: 1432,
    successRate: 98.4,
    tags: ["Development", "Coding"],
    temperature: 0.2,
    topP: 0.95,
    maxTokens: 4096,
    streaming: true,
    jsonMode: false,
    systemPrompt: "You are a lead compiler engineer. Provide robust, type-safe solutions with clean patterns.",
    tools: ["tool-code", "tool-file", "tool-parser"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-2",
    name: "Customer Support Assister",
    avatar: "🤝",
    color: "bg-emerald-500",
    description: "Drafts empathetic response options to customers and manages tickets.",
    providerId: "openai",
    modelId: "gpt-4o",
    status: "active",
    lastRun: "2026-07-07T21:45:00Z",
    version: "v1.2.0",
    createdBy: "Sarah K.",
    runCount: 2840,
    successRate: 94.6,
    tags: ["Customer Success", "Support"],
    temperature: 0.7,
    topP: 0.9,
    maxTokens: 1024,
    streaming: true,
    jsonMode: false,
    systemPrompt: "You represent customer support. Answer queries professionally and empathetically.",
    tools: ["tool-email", "tool-slack"],
    permissions: { internet: true, fileAccess: false, webhooks: true }
  },
  {
    id: "agent-3",
    name: "Database Query Optimizer",
    avatar: "🛢️",
    color: "bg-indigo-500",
    description: "Analyzes table layouts and structures optimal SQL queries to avoid index bloat.",
    providerId: "deepseek",
    modelId: "deepseek-coder",
    status: "active",
    lastRun: "2026-07-07T20:10:00Z",
    version: "v1.1.2",
    createdBy: "Marcus T.",
    runCount: 843,
    successRate: 99.1,
    tags: ["Database", "SQL"],
    temperature: 0.1,
    topP: 0.85,
    maxTokens: 2048,
    streaming: false,
    jsonMode: false,
    systemPrompt: "You are a Postgres wizard. Analyze query plans and suggest correct indexes.",
    tools: ["tool-db", "tool-calc"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-4",
    name: "Real-time Google Researcher",
    avatar: "🔍",
    color: "bg-purple-500",
    description: "Performs web queries to construct summarized bulletins regarding tech industry updates.",
    providerId: "groq",
    modelId: "llama-3-70b-groq",
    status: "active",
    lastRun: "2026-07-07T23:05:00Z",
    version: "v3.0.0",
    createdBy: "Elena R.",
    runCount: 4210,
    successRate: 92.1,
    tags: ["Research", "Marketing"],
    temperature: 0.5,
    topP: 0.95,
    maxTokens: 3000,
    streaming: true,
    jsonMode: false,
    systemPrompt: "You are a research copywriter. Retrieve internet articles and synthesize concise bulletins.",
    tools: ["tool-search", "tool-http", "tool-file"],
    permissions: { internet: true, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-5",
    name: "Local Offline Code Reviewer",
    avatar: "🏡",
    color: "bg-slate-500",
    description: "Runs fully locally via Ollama to evaluate code diffs for compliance and credentials leakage.",
    providerId: "ollama",
    modelId: "llama-3-local",
    status: "paused",
    lastRun: "2026-07-06T15:20:00Z",
    version: "v1.0.1",
    createdBy: "Devon S.",
    runCount: 310,
    successRate: 97.8,
    tags: ["Security", "Local"],
    temperature: 0.0,
    topP: 0.9,
    maxTokens: 2048,
    streaming: false,
    jsonMode: false,
    systemPrompt: "You are a security linter. Identify plain text keys, credentials leakage, or hardcoded passwords.",
    tools: ["tool-file"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-6",
    name: "Sales Pipeline Predictor",
    avatar: "📈",
    color: "bg-cyan-500",
    description: "Evaluates CRM CSV data and outputs projections using high-fidelity modeling.",
    providerId: "google",
    modelId: "gemini-1.5-pro",
    status: "active",
    lastRun: "2026-07-07T18:30:00Z",
    version: "v2.0.0",
    createdBy: "Elena R.",
    runCount: 512,
    successRate: 95.8,
    tags: ["Finance", "Sales"],
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 4096,
    streaming: true,
    jsonMode: true,
    systemPrompt: "Analyze CRM files and generate structured JSON quarterly sales projections.",
    tools: ["tool-file", "tool-calc", "tool-parser"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-7",
    name: "Enterprise Compliance Reviewer",
    avatar: "⚖️",
    color: "bg-blue-600",
    description: "Utilizes compliant Azure frameworks to verify legal NDAs against organizational rules.",
    providerId: "azure",
    modelId: "azure-gpt-4o",
    status: "active",
    lastRun: "2026-07-07T11:15:00Z",
    version: "v1.0.0",
    createdBy: "Legal Dept",
    runCount: 198,
    successRate: 99.5,
    tags: ["Compliance", "Legal"],
    temperature: 0.1,
    topP: 0.95,
    maxTokens: 2048,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Audit document text for problematic indemnity clauses or liability terms.",
    tools: ["tool-file"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-8",
    name: "Social Media Auto-Poster",
    avatar: "🐦",
    color: "bg-pink-500",
    description: "Translates product specs into short viral hooks and coordinates webhook posts.",
    providerId: "openai",
    modelId: "gpt-3.5-turbo",
    status: "active",
    lastRun: "2026-07-07T16:20:00Z",
    version: "v2.1.0",
    createdBy: "Sarah K.",
    runCount: 1450,
    successRate: 96.2,
    tags: ["Marketing", "Communication"],
    temperature: 0.8,
    topP: 0.95,
    maxTokens: 512,
    streaming: false,
    jsonMode: false,
    systemPrompt: "Compose interactive tweets about new product releases. Include emojis.",
    tools: ["tool-webhook", "tool-slack"],
    permissions: { internet: true, fileAccess: false, webhooks: true }
  },
  {
    id: "agent-9",
    name: "Mistral French translator",
    avatar: "🇫🇷",
    color: "bg-red-500",
    description: "Performs highly accurate French translations keeping local business terminology intact.",
    providerId: "mistral",
    modelId: "mistral-large",
    status: "active",
    lastRun: "2026-07-07T10:00:00Z",
    version: "v1.0.5",
    createdBy: "Elena R.",
    runCount: 689,
    successRate: 97.4,
    tags: ["Translation", "French"],
    temperature: 0.4,
    topP: 0.9,
    maxTokens: 1024,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Translate input strings to native French using professional business style.",
    tools: ["tool-parser"],
    permissions: { internet: false, fileAccess: false, webhooks: false }
  },
  {
    id: "agent-10",
    name: "Technical Writer & Documenter",
    avatar: "📝",
    color: "bg-yellow-500",
    description: "Scans markdown structures to build documentation index summaries.",
    providerId: "huggingface",
    modelId: "mixtral-8x7b-hf",
    status: "active",
    lastRun: "2026-07-07T09:40:00Z",
    version: "v1.4.0",
    createdBy: "Marcus T.",
    runCount: 412,
    successRate: 95.0,
    tags: ["Documentation", "Writing"],
    temperature: 0.6,
    topP: 0.9,
    maxTokens: 2048,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Structure clear README frameworks with examples, installations, and settings tables.",
    tools: ["tool-file"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-11",
    name: "HR Talent Screener",
    avatar: "👤",
    color: "bg-orange-500",
    description: "Screens and scores resumes against job specifications.",
    providerId: "openai",
    modelId: "gpt-4o",
    status: "active",
    lastRun: "2026-07-07T14:10:00Z",
    version: "v1.3.0",
    createdBy: "Sarah K.",
    runCount: 1220,
    successRate: 98.1,
    tags: ["HR", "Recruiting"],
    temperature: 0.3,
    topP: 0.9,
    maxTokens: 1536,
    streaming: true,
    jsonMode: true,
    systemPrompt: "Evaluate candidate attributes and output a JSON risk, match score, and pros list.",
    tools: ["tool-file"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-12",
    name: "Multi-Language Support Guide",
    avatar: "🌍",
    color: "bg-teal-500",
    description: "Detects user language and answers based on localized handbook records.",
    providerId: "google",
    modelId: "gemini-1.5-pro",
    status: "active",
    lastRun: "2026-07-07T12:05:00Z",
    version: "v2.1.0",
    createdBy: "Marcus T.",
    runCount: 982,
    successRate: 96.5,
    tags: ["Customer Success", "Translation"],
    temperature: 0.5,
    topP: 0.9,
    maxTokens: 2048,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Identify user language, locate corresponding customer guidance, and draft instructions.",
    tools: ["tool-file", "tool-search"],
    permissions: { internet: true, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-13",
    name: "Financial Anomaly Detector",
    avatar: "🛡️",
    color: "bg-rose-500",
    description: "Scans corporate transaction tables to flag weird charge amounts.",
    providerId: "deepseek",
    modelId: "deepseek-v3",
    status: "active",
    lastRun: "2026-07-07T19:50:00Z",
    version: "v1.0.0",
    createdBy: "Legal Dept",
    runCount: 305,
    successRate: 99.7,
    tags: ["Finance", "Security"],
    temperature: 0.1,
    topP: 0.8,
    maxTokens: 4096,
    streaming: true,
    jsonMode: true,
    systemPrompt: "Flag transaction amounts that exceed three standard deviations from average user spending logs.",
    tools: ["tool-db", "tool-calc"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-14",
    name: "Google Calendar Coordinator",
    avatar: "📅",
    color: "bg-blue-400",
    description: "Checks availability across teams and generates invite payloads.",
    providerId: "openai",
    modelId: "gpt-3.5-turbo",
    status: "paused",
    lastRun: "2026-07-05T13:40:00Z",
    version: "v1.1.0",
    createdBy: "Sarah K.",
    runCount: 560,
    successRate: 93.4,
    tags: ["Utility", "Calendar"],
    temperature: 0.5,
    topP: 0.9,
    maxTokens: 512,
    streaming: false,
    jsonMode: false,
    systemPrompt: "Analyze calendar availabilities and construct conflict-free schedule invites.",
    tools: ["tool-calendar", "tool-email"],
    permissions: { internet: true, fileAccess: false, webhooks: true }
  },
  {
    id: "agent-15",
    name: "Semantic Code Searcher",
    avatar: "🔎",
    color: "bg-emerald-600",
    description: "Indexes active repositories to locate function footprints.",
    providerId: "anthropic",
    modelId: "claude-3-haiku",
    status: "active",
    lastRun: "2026-07-07T22:15:00Z",
    version: "v1.0.2",
    createdBy: "Devon S.",
    runCount: 1540,
    successRate: 98.9,
    tags: ["Development", "Search"],
    temperature: 0.2,
    topP: 0.9,
    maxTokens: 1024,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Parse source structures and match function declarations to query expressions.",
    tools: ["tool-file", "tool-search"],
    permissions: { internet: true, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-16",
    name: "Release Note Automator",
    avatar: "🚀",
    color: "bg-purple-600",
    description: "Evaluates pull requests and builds comprehensive developer updates.",
    providerId: "groq",
    modelId: "llama-3-70b-groq",
    status: "active",
    lastRun: "2026-07-07T15:30:00Z",
    version: "v2.2.0",
    createdBy: "Elena R.",
    runCount: 240,
    successRate: 96.5,
    tags: ["Documentation", "DevTools"],
    temperature: 0.6,
    topP: 0.95,
    maxTokens: 2048,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Draft high-level change listings grouped by Features, Performance, and Bug Fixes.",
    tools: ["tool-github", "tool-slack"],
    permissions: { internet: true, fileAccess: false, webhooks: true }
  },
  {
    id: "agent-17",
    name: "SQL Anonymizer",
    avatar: "🎭",
    color: "bg-slate-600",
    description: "Rewrites raw database logs to scrub PII fields.",
    providerId: "ollama",
    modelId: "llama-3-local",
    status: "active",
    lastRun: "2026-07-07T16:55:00Z",
    version: "v1.2.0",
    createdBy: "Devon S.",
    runCount: 450,
    successRate: 99.4,
    tags: ["Security", "Local"],
    temperature: 0.1,
    topP: 0.9,
    maxTokens: 2048,
    streaming: false,
    jsonMode: false,
    systemPrompt: "Recognize names, social IDs, and physical addresses, replacing them with generic tags.",
    tools: ["tool-file", "tool-parser"],
    permissions: { internet: false, fileAccess: true, webhooks: false }
  },
  {
    id: "agent-18",
    name: "API Spec Validator",
    avatar: "📡",
    color: "bg-cyan-600",
    description: "Performs diagnostic validation checks against Swagger specifications.",
    providerId: "azure",
    modelId: "azure-gpt-4o",
    status: "active",
    lastRun: "2026-07-07T10:45:00Z",
    version: "v1.1.0",
    createdBy: "Legal Dept",
    runCount: 185,
    successRate: 98.7,
    tags: ["Compliance", "Network"],
    temperature: 0.2,
    topP: 0.95,
    maxTokens: 3000,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Validate schema inputs to identify missing parameters or type mismatches.",
    tools: ["tool-rest", "tool-parser"],
    permissions: { internet: true, fileAccess: false, webhooks: false }
  },
  {
    id: "agent-19",
    name: "SEO Competitor Scout",
    avatar: "🕵️",
    color: "bg-rose-600",
    description: "Crawls rival sites to gather high-ranking keyword targets.",
    providerId: "groq",
    modelId: "llama-3-70b-groq",
    status: "archived",
    lastRun: "2026-06-30T14:15:00Z",
    version: "v1.0.0",
    createdBy: "Sarah K.",
    runCount: 780,
    successRate: 89.6,
    tags: ["Research", "Marketing"],
    temperature: 0.8,
    topP: 0.9,
    maxTokens: 2048,
    streaming: true,
    jsonMode: false,
    systemPrompt: "Identify primary header items and summarize SEO keywords used by competitor URLs.",
    tools: ["tool-search", "tool-http"],
    permissions: { internet: true, fileAccess: false, webhooks: false }
  },
  {
    id: "agent-20",
    name: "Google Drive File Sync",
    avatar: "📦",
    color: "bg-amber-600",
    description: "Monitors custom cloud folders to sync content drafts locally.",
    providerId: "cohere",
    modelId: "gpt-4o",
    status: "active",
    lastRun: "2026-07-07T21:10:00Z",
    version: "v2.0.1",
    createdBy: "Marcus T.",
    runCount: 610,
    successRate: 95.9,
    tags: ["Utility", "Storage"],
    temperature: 0.4,
    topP: 0.9,
    maxTokens: 1024,
    streaming: false,
    jsonMode: false,
    systemPrompt: "Verify file extensions, download PDF drafts, and write plain text file copies.",
    tools: ["tool-drive", "tool-file"],
    permissions: { internet: true, fileAccess: true, webhooks: false }
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Analytics Data
// ─────────────────────────────────────────────────────────────────────────────
export const mockAnalytics: AnalyticsRecord[] = [
  { timestamp: "09:00", requests: 120, tokensUsed: 145000, latency: 450, errors: 2, cost: 0.72 },
  { timestamp: "10:00", requests: 180, tokensUsed: 220000, latency: 490, errors: 4, cost: 1.10 },
  { timestamp: "11:00", requests: 250, tokensUsed: 310000, latency: 520, errors: 5, cost: 1.55 },
  { timestamp: "12:00", requests: 310, tokensUsed: 420000, latency: 610, errors: 12, cost: 2.10 },
  { timestamp: "13:00", requests: 290, tokensUsed: 390000, latency: 580, errors: 8, cost: 1.95 },
  { timestamp: "14:00", requests: 340, tokensUsed: 460000, latency: 550, errors: 3, cost: 2.30 },
  { timestamp: "15:00", requests: 420, tokensUsed: 590000, latency: 640, errors: 9, cost: 2.95 },
  { timestamp: "16:00", requests: 390, tokensUsed: 510000, latency: 590, errors: 11, cost: 2.55 },
  { timestamp: "17:00", requests: 310, tokensUsed: 430000, latency: 530, errors: 6, cost: 2.15 },
  { timestamp: "18:00", requests: 220, tokensUsed: 290000, latency: 480, errors: 4, cost: 1.45 },
  { timestamp: "19:00", requests: 150, tokensUsed: 180000, latency: 460, errors: 1, cost: 0.90 },
  { timestamp: "20:00", requests: 110, tokensUsed: 130000, latency: 430, errors: 2, cost: 0.65 },
];

export const mockRuns = [
  { id: "run-101", agentId: "agent-1", status: "success", duration: "1.8s", tokens: 2450, cost: "$0.036", timestamp: "2026-07-07T22:30:00Z", prompt: "Build interactive dashboard cards.", response: "```tsx\nexport const MetricCard = ...\n```" },
  { id: "run-102", agentId: "agent-1", status: "success", duration: "2.1s", tokens: 3120, cost: "$0.046", timestamp: "2026-07-07T22:12:00Z", prompt: "Explain Next.js 15 routing rules.", response: "Next.js uses folder-based routing where page.tsx defines the endpoint..." },
  { id: "run-103", agentId: "agent-1", status: "error", duration: "0.5s", tokens: 140, cost: "$0.002", timestamp: "2026-07-07T21:55:00Z", prompt: "Compile this code: let x: number = 'hello';", response: "Type 'string' is not assignable to type 'number'." },
  { id: "run-104", agentId: "agent-2", status: "success", duration: "1.2s", tokens: 850, cost: "$0.012", timestamp: "2026-07-07T21:45:00Z", prompt: "Compose standard late arrival reply.", response: "Hello, we apologize for the shipment delay. Your order will arrive..." },
  { id: "run-105", agentId: "agent-2", status: "success", duration: "0.9s", tokens: 680, cost: "$0.010", timestamp: "2026-07-07T21:30:00Z", prompt: "Acknowledge billing ticket.", response: "Dear customer, we received your invoice inquiry. Our billing team is reviewing..." },
  { id: "run-106", agentId: "agent-3", status: "success", duration: "3.2s", tokens: 4500, cost: "$0.067", timestamp: "2026-07-07T20:10:00Z", prompt: "Optimize nested SELECT on users table.", response: "Replaced nested scan with a JOIN and created index: idx_users_total..." },
  { id: "run-107", agentId: "agent-4", status: "success", duration: "5.4s", tokens: 6200, cost: "$0.093", timestamp: "2026-07-07T23:05:00Z", prompt: "Summarize AI agent startup news this week.", response: "Startup funding totals $340M across agentic startups. Core developments..." },
  { id: "run-108", agentId: "agent-4", status: "error", duration: "4.1s", tokens: 180, cost: "$0.002", timestamp: "2026-07-07T22:45:00Z", prompt: "Search target info for private company.", response: "Connection timed out fetching results from search index." },
];
