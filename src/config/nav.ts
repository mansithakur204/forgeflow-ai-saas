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
        title: "Pipelines",
        href: "/pipelines",
        icon: Workflow,
        disabled: true,
      },
      {
        title: "Analytics",
        href: "/analytics",
        icon: BarChart3,
        disabled: true,
      },
    ],
  },
  {
    label: "Resources",
    items: [
      {
        title: "Integrations",
        href: "/integrations",
        icon: Plug,
        disabled: true,
      },
      {
        title: "Templates",
        href: "/templates",
        icon: Layers,
        disabled: true,
      },
      {
        title: "Marketplace",
        href: "/marketplace",
        icon: Store,
        disabled: true,
      },
    ],
  },
  {
    label: "System",
    items: [
      {
        title: "Settings",
        href: "/settings",
        icon: Settings2,
        disabled: true,
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
