import type { Metadata } from "next";
import { SecretsDashboard } from "./components/secrets-dashboard";

export const metadata: Metadata = {
  title: "Secrets Vault – ForgeFlow AI",
  description: "Enterprise-grade AES-256-CBC encrypted secrets vault. Manage API keys, credentials, and environment variables securely.",
};

export default function SecretsPage() {
  return <SecretsDashboard />;
}
