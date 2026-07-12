"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentCard } from "@/components/agents/agent-card";
import { mockAgents, Agent, mockProviders, mockModels } from "@/lib/agents-data";
import { Plus, Search, Grid, List, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";

export default function AgentsPage() {
  const router = useRouter();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [modelFilter, setModelFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("name-asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  React.useEffect(() => {
    if (isAuthLoaded && !isSignedIn) {
      router.push("/login");
      return;
    }
    if (!isSignedIn) return;

    fetch("/api/agents")
      .then((res) => res.json())
      .then((data) => {
        setAgents(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to fetch registered agents");
        setLoading(false);
      });
  }, [isAuthLoaded, isSignedIn, router]);

  // Actions
  const handleDuplicate = async (id: string) => {
    const original = agents.find((a) => a.id === id);
    if (!original) return;
    
    const newId = `${original.id}-copy-${Date.now()}`;
    const duplicate = {
      ...original,
      id: newId,
      name: `${original.name} Copy`,
    };

    try {
      const res = await fetch("/api/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(duplicate),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to duplicate agent");
      }
      setAgents([{ ...original, id: newId, name: `${original.name} Copy`, runCount: 0, successRate: 100, status: "paused" }, ...agents]);
      toast.success(`Duplicated agent: ${original.name}`);
    } catch (err: any) {
      toast.error(`Failed to duplicate agent: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    const original = agents.find((a) => a.id === id);
    if (!confirm(`Are you sure you want to delete agent "${original?.name || id}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/agents?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to delete agent");
      }
      setAgents(agents.filter((a) => a.id !== id));
      toast.error(`Deleted agent: ${original?.name || id}`);
    } catch (err: any) {
      toast.error(`Failed to delete agent: ${err.message}`);
    }
  };

  const handleArchive = async (id: string) => {
    const original = agents.find((a) => a.id === id);
    try {
      const res = await fetch("/api/agents", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          status: "archived",
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to archive agent");
      }
      setAgents(
        agents.map((a) => (a.id === id ? { ...a, status: "archived" as const } : a))
      );
      toast.success(`Archived agent: ${original?.name}`);
    } catch (err: any) {
      toast.error(`Failed to archive agent: ${err.message}`);
    }
  };

  const handleResetFilters = () => {
    setSearch("");
    setProviderFilter("all");
    setModelFilter("all");
    setStatusFilter("all");
    setSortBy("name-asc");
    toast.success("Filters reset to default.");
  };

  // Filtered & Sorted agents list
  const filteredAndSortedAgents = useMemo(() => {
    return agents
      .filter((a) => {
        const matchesSearch =
          a.name.toLowerCase().includes(search.toLowerCase()) ||
          a.description.toLowerCase().includes(search.toLowerCase()) ||
          a.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
          a.modelId.toLowerCase().includes(search.toLowerCase());
          
        const matchesProvider =
          providerFilter === "all" || a.providerId === providerFilter;
          
        const matchesModel =
          modelFilter === "all" || a.modelId === modelFilter;
          
        const matchesStatus =
          statusFilter === "all" || a.status === statusFilter;

        return matchesSearch && matchesProvider && matchesModel && matchesStatus;
      })
      .sort((a, b) => {
        if (sortBy === "name-asc") return a.name.localeCompare(b.name);
        if (sortBy === "name-desc") return b.name.localeCompare(a.name);
        if (sortBy === "runs-desc") return b.runCount - a.runCount;
        if (sortBy === "success-desc") return b.successRate - a.successRate;
        if (sortBy === "last-run-desc") return new Date(b.lastRun).getTime() - new Date(a.lastRun).getTime();
        return 0;
      });
  }, [agents, search, providerFilter, modelFilter, statusFilter, sortBy]);

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto h-full">
        {/* Page Header */}
        <PageHeader
          title="AI Agents"
          description="Deploy and manage modern intelligent agents, configure core parameters, and inspect workflow actions."
        >
          <Link href="/agents/new">
            <Button className="h-9 gap-2 bg-brand-500 hover:bg-brand-600 text-white font-medium">
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Create Agent</span>
            </Button>
          </Link>
        </PageHeader>

        {/* Search & Filters Controls */}
        <div className="flex flex-col gap-4 p-4 rounded-xl border border-border/50 bg-card/60 backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative w-full sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, tags, model..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 w-full bg-muted/30 focus-visible:ring-brand-500/20 border-border/60"
              />
            </div>
            
            {/* Grid/List toggle & Reset */}
            <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0 justify-between">
              <div className="flex items-center gap-1 bg-muted/40 p-0.5 rounded-lg border border-border/50">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 p-0"
                  aria-label="Grid view"
                >
                  <Grid className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 p-0"
                  aria-label="List view"
                >
                  <List className="w-4 h-4" />
                </Button>
              </div>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="h-8 text-xs gap-1.5"
                title="Reset filters"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Reset</span>
              </Button>
            </div>
          </div>

          {/* Advanced filters selectors */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-border/30 pt-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="provider-filter" className="text-[10px] uppercase font-semibold text-muted-foreground">Provider</label>
              <select
                id="provider-filter"
                value={providerFilter}
                onChange={(e) => setProviderFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-foreground focus-visible:outline-brand-500 focus-visible:ring-1"
              >
                <option value="all">All Providers</option>
                {mockProviders.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="model-filter" className="text-[10px] uppercase font-semibold text-muted-foreground">Model</label>
              <select
                id="model-filter"
                value={modelFilter}
                onChange={(e) => setModelFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-foreground focus-visible:outline-brand-500 focus-visible:ring-1"
              >
                <option value="all">All Models</option>
                {mockModels.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="status-filter" className="text-[10px] uppercase font-semibold text-muted-foreground">Status</label>
              <select
                id="status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-foreground focus-visible:outline-brand-500 focus-visible:ring-1"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="archived">Archived</option>
              </select>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="sort-by" className="text-[10px] uppercase font-semibold text-muted-foreground">Sort By</label>
              <select
                id="sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="h-8 text-xs rounded-lg border border-border/60 bg-muted/30 px-2 py-1 text-foreground focus-visible:outline-brand-500 focus-visible:ring-1"
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="runs-desc">Total Runs</option>
                <option value="success-desc">Success Rate</option>
                <option value="last-run-desc">Last Active</option>
              </select>
            </div>
          </div>
        </div>

        {/* Agents Rendering */}
        <section aria-label="Agents List" className="flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl border-border/60 bg-card">
              <span className="text-4xl animate-spin">🔄</span>
              <h3 className="font-semibold text-base text-foreground mt-3">Loading Agents...</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Retrieving live agent registries from the production engine.
              </p>
            </div>
          ) : filteredAndSortedAgents.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-xl border-border/60 bg-card">
              <span className="text-4xl">🤖</span>
              <h3 className="font-semibold text-base text-foreground mt-3">No Agents Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                We couldn't locate any agents matching your query parameters. Try widening your criteria.
              </p>
              <Button onClick={handleResetFilters} variant="outline" size="sm" className="mt-4">
                Clear Filters
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {filteredAndSortedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  viewMode="grid"
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredAndSortedAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  viewMode="list"
                  onDuplicate={handleDuplicate}
                  onDelete={handleDelete}
                  onArchive={handleArchive}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </RootLayoutShell>
  );
}
