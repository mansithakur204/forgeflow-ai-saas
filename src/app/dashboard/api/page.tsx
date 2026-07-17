import type { Metadata } from "next";
import { ApiDashboard } from "./components/api-dashboard";

export const metadata: Metadata = {
  title: "Public API – ForgeFlow AI",
  description: "Manage Personal Access Tokens, explore the ForgeFlow REST API v1, view usage statistics and request history.",
};

export default function ApiPage() {
  return <ApiDashboard />;
}
