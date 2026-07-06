# ForgeFlow AI

> **Orchestrate Intelligence. Automate Everything.**

ForgeFlow AI is a production-grade AI workflow orchestration platform. Build, deploy, and monitor intelligent pipelines at scale — with a beautifully crafted frontend foundation ready for rapid feature development.

---

## ✨ Features

- 🔀 **Visual Workflow Builder** — Drag-and-drop interface for orchestrating complex AI pipelines with branching logic and conditional execution
- 🤖 **Multi-Agent Coordination** — Deploy and coordinate multiple AI agents in parallel with automatic load balancing and fault tolerance
- 📊 **Real-time Analytics** — Monitor pipeline performance, token usage, latency, and error rates with live dashboards and alerting
- 🎨 **Design System** — Custom component library built on shadcn/ui with a fully themed dark/light mode
- ⌘ **Command Palette** — Keyboard-first navigation with `⌘K` / `Ctrl+K` command palette
- 🔔 **Toast Notifications** — System-level feedback powered by Sonner
- 🧭 **Responsive Sidebar** — Collapsible sidebar navigation with grouped sections
- 🌊 **Framer Motion Animations** — Smooth, physics-based micro-animations throughout the UI

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui + Base UI |
| Animations | Framer Motion |
| Icons | Lucide React |
| Theming | next-themes |
| Notifications | Sonner |
| Utilities | clsx, tailwind-merge, class-variance-authority |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Home / Foundation page
│   ├── globals.css         # Global styles & design tokens
│   ├── loading.tsx         # Global loading state
│   ├── error.tsx           # Error boundary
│   └── not-found.tsx       # 404 page
├── components/
│   ├── common/             # Shared UI components
│   │   ├── command-palette.tsx
│   │   ├── logo.tsx
│   │   ├── page-header.tsx
│   │   └── theme-toggle.tsx
│   ├── layout/             # App shell components
│   │   ├── root-layout.tsx
│   │   ├── sidebar.tsx
│   │   └── topbar.tsx
│   ├── skeletons/          # Loading skeleton components
│   └── ui/                 # Base design system primitives
├── config/
│   ├── nav.ts              # Navigation structure & route definitions
│   └── site.ts             # Global site metadata & links
├── hooks/                  # Custom React hooks
├── lib/                    # Utility functions
├── providers/              # React context providers
└── types/                  # Shared TypeScript types
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org) 18.17 or later
- npm, yarn, pnpm, or bun

### Installation

```bash
# Clone the repository
git clone https://github.com/forgeflow-ai/forgeflow-ai.git
cd forgeflow-ai

# Install dependencies
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Other Commands

```bash
npm run build   # Build for production
npm run start   # Start the production server
npm run lint    # Run ESLint
```

---

## 🧭 Navigation

The sidebar is organized into three groups:

| Group | Routes |
|---|---|
| **Main** | Overview, Workflows *(New)*, Agents, Pipelines, Analytics |
| **Resources** | Integrations, Templates, Marketplace |
| **System** | Settings, Docs |

---

## 🎨 Design Tokens

The design system is built on Tailwind CSS v4 custom properties defined in `globals.css`. Key tokens include:

- **`brand-*`** — Primary accent color scale (indigo-blue)
- **`bg-brand-gradient`** — Brand gradient for hero elements
- **`muted-foreground`** — Subdued text and secondary content
- **`chart-*`** — Semantic colors for data visualization

### Component Variants

Custom card variants: `default` · `gradient` · `interactive` · `muted`
Button variants: `default` · `glow` · `glass` · `destructive` · `outline` · `ghost` · `link`

---

## 📖 Links

- 📚 [Documentation](https://docs.forgeflow.ai)
- 🐙 [GitHub](https://github.com/forgeflow-ai)
- 🐦 [Twitter / X](https://twitter.com/forgeflowai)
- 🌐 [Website](https://forgeflow.ai)

---

## 📄 License

This project is private. All rights reserved © ForgeFlow AI Team.
