import {
  LayoutDashboard,
  GitBranch,
  Bot,
  Workflow,
  BarChart3,
  Plug,
  Layers,
  Store,
  Settings2,
  BookOpen,
  Users,
  CreditCard,
  Key,
  Code2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface NavItem {
  title: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
  disabled?: boolean;
  external?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      {
        title: "Overview",
        href: "/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Workflows",
        href: "/workflows",
        icon: GitBranch,
        badge: "New",
      },
      {
        title: "Agents",
        href: "/agents",
        icon: Bot,
      },
      {
        title: "Knowledge",
        href: "/knowledge",
        icon: BookOpen,
      },
      {
        title: "Pipelines",
        href: "/pipelines",
        icon: Workflow,
        disabled: true,
      },
      {
        title: "Analytics",
        href: "/dashboard/observability",
        icon: BarChart3,
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        title: "Integrations",
        href: "/dashboard/integrations",
        icon: Plug,
      },
      {
        title: "Templates",
        href: "/templates",
        icon: Layers,
        disabled: true,
      },
      {
        title: "Marketplace",
        href: "/dashboard/marketplace",
        icon: Store,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Team",
        href: "/dashboard/team",
        icon: Users,
      },
      {
        title: "Billing",
        href: "/dashboard/billing",
        icon: CreditCard,
      },
      {
        title: "Secrets",
        href: "/dashboard/secrets",
        icon: Key,
      },
      {
        title: "API",
        href: "/dashboard/api",
        icon: Code2,
      },
      {
        title: "Settings",
        href: "/dashboard/settings",
        icon: Settings2,
      },
      {
        title: "Docs",
        href: "/docs",
        icon: BookOpen,
        external: true,
      },
    ],
  },
];

export const commandPaletteNav: NavItem[] = navGroups.flatMap(
  (group) => group.items
);
