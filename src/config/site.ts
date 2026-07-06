export const siteConfig = {
  name: "ForgeFlow AI",
  tagline: "Orchestrate Intelligence. Automate Everything.",
  description:
    "ForgeFlow AI is a production-grade AI workflow orchestration platform. Build, deploy, and monitor intelligent pipelines at scale.",
  url: "https://forgeflow.ai",
  ogImage: "https://forgeflow.ai/og.png",
  version: "0.1.0",
  authors: [
    {
      name: "ForgeFlow AI Team",
      url: "https://forgeflow.ai",
    },
  ],
  links: {
    docs: "https://docs.forgeflow.ai",
    github: "https://github.com/forgeflow-ai",
    twitter: "https://twitter.com/forgeflowai",
  },
} as const;

export type SiteConfig = typeof siteConfig;
