"use client";

import { motion } from "framer-motion";
import { Zap, ArrowRight, CheckCircle2, GitBranch, Bot, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RootLayoutShell } from "@/components/layout/root-layout";
import {
  CustomCard,
  CustomCardContent,
  CustomCardHeader,
  CustomCardTitle,
  CustomCardDescription,
} from "@/components/ui/custom-card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
};

const featureCards = [
  {
    icon: GitBranch,
    title: "Visual Workflow Builder",
    description:
      "Drag-and-drop interface for orchestrating complex AI pipelines with branching logic and conditional execution.",
    badge: "Core",
    color: "text-brand-500",
    bg: "bg-brand-500/10",
  },
  {
    icon: Bot,
    title: "Multi-Agent Coordination",
    description:
      "Deploy and coordinate multiple AI agents in parallel with automatic load balancing and fault tolerance.",
    badge: "AI-Native",
    color: "text-violet-500",
    bg: "bg-violet-500/10",
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description:
      "Monitor pipeline performance, token usage, latency, and error rates with live dashboards and alerting.",
    badge: "Observability",
    color: "text-chart-3",
    bg: "bg-chart-3/10",
  },
];

const readyItems = [
  "TypeScript + Next.js 15 App Router",
  "shadcn/ui + Tailwind CSS v4",
  "Framer Motion animations",
  "Dark / Light theme system",
  "⌘K Command palette",
  "Toast notification system",
  "Responsive sidebar navigation",
  "Error boundary + 404 pages",
  "Loading skeleton components",
  "Production-grade folder architecture",
];

export default function Home() {
  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-10 p-6 max-w-6xl mx-auto">
        {/* Page header */}
        <PageHeader
          title="Foundation"
          description="ForgeFlow AI frontend foundation is ready. All core systems configured."
        >
          <Badge
            variant="secondary"
            className="bg-brand-500/10 text-brand-500 border-brand-500/20 gap-1.5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
            System Ready
          </Badge>
        </PageHeader>

        {/* Hero section */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-8"
        >
          {/* Hero card */}
          <motion.div variants={itemVariants}>
            <CustomCard
              variant="gradient"
              className="relative overflow-hidden"
            >
              {/* Background decoration */}
              <div
                className="absolute -top-24 -right-24 w-64 h-64 rounded-full opacity-20 dark:opacity-10 blur-3xl pointer-events-none"
                style={{
                  background: "radial-gradient(circle, oklch(0.62 0.24 265) 0%, transparent 70%)",
                }}
                aria-hidden="true"
              />

              <CustomCardHeader className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-gradient flex items-center justify-center shadow-lg shadow-brand-500/30">
                    <Zap className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <div>
                    <CustomCardTitle className="text-xl">
                      ForgeFlow AI
                    </CustomCardTitle>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      v0.1.0 — Foundation Release
                    </p>
                  </div>
                </div>
                <CustomCardDescription className="text-base leading-relaxed max-w-2xl">
                  Orchestrate Intelligence. Automate Everything. The production-grade frontend
                  foundation is live — design system, navigation, providers, components, and layout
                  are all configured and ready for feature development.
                </CustomCardDescription>
              </CustomCardHeader>

              <CustomCardContent className="flex flex-wrap gap-3 relative">
                <Button variant="glow" size="lg" className="gap-2">
                  <Zap className="w-4 h-4" />
                  Start Building
                  <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="glass" size="lg">
                  View Documentation
                </Button>
              </CustomCardContent>
            </CustomCard>
          </motion.div>

          {/* Feature cards */}
          <motion.div
            variants={containerVariants}
            className="grid grid-cols-1 md:grid-cols-3 gap-4"
          >
            {featureCards.map((card) => {
              const Icon = card.icon;
              return (
                <motion.div key={card.title} variants={itemVariants}>
                  <CustomCard variant="interactive" className="h-full">
                    <CustomCardHeader>
                      <div className="flex items-start justify-between mb-3">
                        <div
                          className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
                        >
                          <Icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <Badge
                          variant="secondary"
                          className="text-[10px] font-medium"
                        >
                          {card.badge}
                        </Badge>
                      </div>
                      <CustomCardTitle>{card.title}</CustomCardTitle>
                      <CustomCardDescription>
                        {card.description}
                      </CustomCardDescription>
                    </CustomCardHeader>
                  </CustomCard>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Ready checklist */}
          <motion.div variants={itemVariants}>
            <CustomCard variant="muted">
              <CustomCardHeader>
                <CustomCardTitle className="text-base">
                  Foundation Checklist
                </CustomCardTitle>
                <CustomCardDescription>
                  All core systems initialized and configured.
                </CustomCardDescription>
              </CustomCardHeader>
              <CustomCardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {readyItems.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2.5 text-sm"
                    >
                      <CheckCircle2 className="w-4 h-4 text-brand-500 shrink-0" />
                      <span className="text-foreground/80">{item}</span>
                    </div>
                  ))}
                </div>
              </CustomCardContent>
            </CustomCard>
          </motion.div>
        </motion.div>
      </div>
    </RootLayoutShell>
  );
}
