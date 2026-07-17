"use client";

import React, { useState, useRef } from "react";
import type { TemplateFilters, WorkflowTemplate } from "../types";
import { useTemplates } from "../hooks/useTemplates";
import { useRouter } from "next/navigation";
import {
  Layers,
  Search,
  Filter,
  X,
  RefreshCw,
  Star,
  Download,
  Upload,
  Copy,
  Plus,
  Play,
  User,
  Clock,
  Eye,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  GitBranch,
  Info,
} from "lucide-react";

export function TemplatesDashboard() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [filters, setFilters] = useState<TemplateFilters>({
    search: "",
    category: "",
    difficulty: "",
    sortBy: "downloads",
    sortOrder: "desc",
  });

  const {
    data,
    loading,
    error,
    refetch,
    createWorkflow,
    toggleFavorite,
    duplicateTemplate,
    importTemplate,
    exportTemplate,
  } = useTemplates(filters);

  // Preview Modal
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  // UI Notification State
  const [notification, setNotification] = useState<{ success: boolean; message: string } | null>(null);

  const triggerNotification = (success: boolean, message: string) => {
    setNotification({ success, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleCreateWorkflow = async (templateId: string) => {
    const res = await createWorkflow(templateId);
    if (res.success && res.workflowId) {
      triggerNotification(true, "Canvas workflow successfully instantiated!");
      router.push(`/workflows/${res.workflowId}`);
    } else {
      triggerNotification(false, res.error || "Failed to clone template.");
    }
  };

  const handleDuplicate = async (id: string) => {
    const ok = await duplicateTemplate(id);
    if (ok) {
      triggerNotification(true, "Template cloned successfully.");
    }
  };

  const handleFavorite = async (id: string) => {
    await toggleFavorite(id);
  };

  // JSON Export Handler
  const handleExport = async (template: WorkflowTemplate) => {
    const payload = await exportTemplate(template.id);
    if (!payload) return;

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${template.id}-export.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    triggerNotification(true, `Exported "${template.name}" template JSON.`);
  };

  // JSON Import Handler
  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (typeof text !== "string") return;
        const parsed = JSON.parse(text);

        const res = await importTemplate(parsed);
        if (res.success) {
          triggerNotification(true, "Template JSON successfully imported!");
        } else {
          triggerNotification(false, res.error || "Invalid template schema format.");
        }
      } catch (err: any) {
        triggerNotification(false, "Failed to parse template JSON file.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = ""; // Clear input
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      difficulty: "",
      sortBy: "downloads",
      sortOrder: "desc",
    });
    setPreviewTemplate(null);
  };

  const getDifficultyColor = (diff: string) => {
    switch (diff.toLowerCase()) {
      case "beginner":
        return "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";
      case "intermediate":
        return "bg-sky-500/10 text-sky-600 border border-sky-500/20";
      case "advanced":
        return "bg-orange-500/10 text-orange-600 border border-orange-500/20";
      default:
        return "bg-neutral-500/10 text-neutral-600 border border-neutral-500/20";
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Templates</span>
      </nav>

      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Workflow Templates Library
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Instantiate pre-configured agent orchestration sequences or import custom JSON canvas flows.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Hidden Import Input */}
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleImportFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-border/40 border border-border/60 rounded-lg hover:bg-border/60 transition text-foreground"
          >
            <Upload className="w-3.5 h-3.5" />
            Import JSON
          </button>
        </div>
      </div>

      {/* Action status notification popups */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border leading-normal shadow-md animate-fade-in ${
            notification.success
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
          }`}
        >
          {notification.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}

      {/* Controls Filters form */}
      <div className="bg-surface-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Keyword Search */}
          <div className="relative w-full md:w-64 text-xs">
            <input
              type="text"
              placeholder="Search templates..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="w-full pl-8 pr-3 py-1.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground"
            />
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-2.5" />
          </div>

          {/* Category selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.category}
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Categories</option>
              <option value="ai">AI Solutions</option>
              <option value="automation">Automation</option>
              <option value="support">Support</option>
              <option value="devops">DevOps</option>
              <option value="crm">CRM Operations</option>
            </select>
          </div>

          {/* Difficulty selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.difficulty}
              onChange={(e) => setFilters({ ...filters, difficulty: e.target.value })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Difficulties</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>

          {/* Sort order parameter selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="downloads">Downloads Count</option>
              <option value="rating">Rating Levels</option>
              <option value="name">Template Name</option>
            </select>
          </div>

          {/* Sort order toggler */}
          <button
            onClick={() => setFilters((f) => ({ ...f, sortOrder: f.sortOrder === "asc" ? "desc" : "asc" }))}
            className="px-3 py-1.5 text-xs font-semibold bg-background border border-border/60 rounded-xl hover:bg-border/20 text-foreground"
          >
            {filters.sortOrder.toUpperCase()}
          </button>
        </div>

        <button
          onClick={resetFilters}
          className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* loading skeleton card list */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-44 bg-border/40 rounded-2xl" />
          ))}
        </div>
      )}

      {/* error state banner */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-6">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold text-foreground">Templates Synchronization Fail</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
          >
            Retry Fetching
          </button>
        </div>
      )}

      {/* empty results indicators */}
      {data && data.templates.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border/40 rounded-3xl shadow-sm text-center gap-3">
          <Layers className="w-12 h-12 text-border" />
          <h3 className="text-md font-bold text-foreground">No Templates Match Filters</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Upload custom JSON flow arrays or clear filters to locate predefined blueprints.
          </p>
        </div>
      )}

      {/* Main Templates cards grid */}
      {data && data.templates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {data.templates.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-surface-card border border-border/40 rounded-3xl shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition relative group overflow-hidden"
            >
              {/* Card Main Properties */}
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-brand-500 uppercase tracking-widest leading-none mb-1">
                      {item.category}
                    </span>
                    <h3 className="text-sm font-extrabold text-foreground">{item.name}</h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${getDifficultyColor(item.difficulty)}`}>
                      {item.difficulty}
                    </span>
                    
                    {/* Favorite toggle star */}
                    <button
                      onClick={() => handleFavorite(item.id)}
                      className="p-1 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-amber-500 transition"
                      aria-label="Add to favorites"
                    >
                      <Star className={`w-4 h-4 ${item.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                  </div>
                </div>

                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  {item.description}
                </p>

                {/* Tags and estimated runtime row */}
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground mr-1.5 font-semibold">
                    <Clock className="w-3.5 h-3.5" />
                    Est: {item.estimatedRuntime}
                  </span>
                  {item.tags.map((tag) => (
                    <span key={tag} className="px-1.5 py-0.5 rounded bg-border/20 text-muted-foreground text-[9px] font-bold">
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer sync options */}
              <div className="border-t border-border/20 pt-4 flex flex-col gap-3">
                {/* Dependency integrations tags */}
                <div className="flex flex-wrap items-center justify-between text-[10px] text-muted-foreground font-semibold">
                  <div className="flex items-center gap-1">
                    <span>Dependencies:</span>
                    <div className="flex gap-1.5 items-center">
                      {item.requiredIntegrations.map((dep) => (
                        <span key={dep} className="text-[9px] uppercase font-bold text-foreground bg-border/40 px-1.5 py-0.2 rounded border border-border/40">
                          {dep}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span>⭐ {item.rating.toFixed(1)}</span>
                    <span>📥 {item.downloads.toLocaleString()}</span>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center justify-between gap-2.5">
                  <button
                    onClick={() => setPreviewTemplate(item)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/60 text-foreground rounded-xl transition flex items-center justify-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview Flow
                  </button>

                  <button
                    onClick={() => handleCreateWorkflow(item.id)}
                    className="flex-1 py-1.5 text-xs font-bold bg-brand-500 text-white border border-brand-600 rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Create Workflow
                  </button>

                  {/* Actions Dropdown buttons */}
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleDuplicate(item.id)}
                      className="p-2 bg-border/40 border border-border/60 hover:bg-border/60 rounded-xl transition"
                      title="Duplicate Template"
                    >
                      <Copy className="w-3.5 h-3.5 text-foreground" />
                    </button>
                    <button
                      onClick={() => handleExport(item)}
                      className="p-2 bg-border/40 border border-border/60 hover:bg-border/60 rounded-xl transition"
                      title="Export Template JSON"
                    >
                      <Download className="w-3.5 h-3.5 text-foreground" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Dialog Modal */}
      {previewTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setPreviewTemplate(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-lg bg-background border border-border/40 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto z-10">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{previewTemplate.name}</h3>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    Flow Blueprint Preview
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewTemplate(null)}
                className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Template specs grid */}
            <div className="p-3 bg-border/10 border border-border/20 rounded-2xl grid grid-cols-2 gap-2 text-xs text-muted-foreground leading-normal">
              <div>
                Author: <span className="text-foreground font-bold">{previewTemplate.author}</span>
              </div>
              <div>
                Version: <span className="text-foreground font-bold">{previewTemplate.version}</span>
              </div>
              <div>
                Downloads: <span className="text-foreground font-bold">{previewTemplate.downloads.toLocaleString()}</span>
              </div>
              <div>
                Rating: <span className="text-foreground font-bold">⭐ {previewTemplate.rating.toFixed(1)}</span>
              </div>
            </div>

            {/* Flow Blueprint Sequence visualization */}
            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                <GitBranch className="w-4 h-4 text-brand-500" />
                <span>Node Execution Blueprint ({previewTemplate.nodes.length} Steps)</span>
              </h4>
              
              <div className="flex flex-col gap-2 pl-2">
                {previewTemplate.nodes.map((node, idx) => (
                  <div key={node.id} className="flex items-center gap-3 relative pr-1">
                    <div className="flex flex-col items-center">
                      <span className="w-5 h-5 rounded-full bg-brand-500/10 text-brand-500 flex items-center justify-center font-black text-[9px] border border-brand-500/20 relative z-10">
                        {idx + 1}
                      </span>
                      {idx < previewTemplate.nodes.length - 1 && (
                        <div className="w-0.5 h-7 bg-border/40 my-0.5" />
                      )}
                    </div>
                    <div className="flex-1 p-2.5 bg-surface-card border border-border/40 rounded-xl flex items-center justify-between shadow-xs">
                      <div>
                        <div className="text-xs font-bold text-foreground leading-none">{node.label}</div>
                        <div className="text-[9px] text-muted-foreground uppercase mt-1">type: {node.typeId}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="border-t border-border/20 pt-4 flex gap-2">
              <button
                type="button"
                onClick={() => setPreviewTemplate(null)}
                className="flex-1 py-2 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/60 text-foreground rounded-xl transition"
              >
                Close Preview
              </button>
              <button
                type="button"
                onClick={() => handleCreateWorkflow(previewTemplate.id)}
                className="flex-1 py-2 text-xs font-bold bg-brand-500 text-white border border-brand-600 rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1 shadow-sm font-extrabold"
              >
                <Plus className="w-3.5 h-3.5" /> Instantiate Workflow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
