"use client";

import React, { useState } from "react";
import type { MarketplaceFilters, MarketplaceItem } from "../types";
import { useMarketplace } from "../hooks/useMarketplace";
import {
  Store,
  Search,
  Filter,
  X,
  RefreshCw,
  Star,
  Download,
  AlertTriangle,
  CheckCircle,
  Plus,
  GitBranch,
  ShieldCheck,
  User,
  Clock,
  ExternalLink,
  MessageSquare,
  History,
  Flag,
} from "lucide-react";

export function MarketplaceDashboard() {
  const [filters, setFilters] = useState<MarketplaceFilters>({
    search: "",
    category: "",
    license: "",
    minRating: 0,
    sortBy: "downloads",
    sortOrder: "desc",
  });

  const {
    data,
    loading,
    error,
    refetch,
    installTemplate,
    updateTemplate,
    toggleFavorite,
    submitReview,
    reportTemplate,
  } = useMarketplace(filters);

  // Install Progress State
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [installProgress, setInstallProgress] = useState(0);

  // Modal State
  const [previewItem, setPreviewItem] = useState<MarketplaceItem | null>(null);

  // Review Form state
  const [reviewAuthor, setReviewAuthor] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Report Form state
  const [reportReason, setReportReason] = useState("");
  const [reportingId, setReportingId] = useState<string | null>(null);

  // Toasts
  const [toast, setToast] = useState<{ success: boolean; message: string } | null>(null);

  const showToast = (success: boolean, message: string) => {
    setToast({ success, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleInstallOrUpdate = async (id: string, isUpdate = false) => {
    if (installingId) return;

    setInstallingId(id);
    setInstallProgress(0);

    // Simulate installation progress bar incrementation
    const duration = 1500;
    const intervalTime = 150;
    const steps = duration / intervalTime;
    let currentStep = 0;

    const timer = setInterval(async () => {
      currentStep++;
      const progressPercent = Math.min(Math.round((currentStep / steps) * 100), 95);
      setInstallProgress(progressPercent);

      if (currentStep >= steps) {
        clearInterval(timer);
        const res = isUpdate ? await updateTemplate(id) : await installTemplate(id);
        setInstallingId(null);
        setInstallProgress(0);

        if (res.success) {
          showToast(true, isUpdate ? "Template updated successfully!" : "Template installed successfully!");
          // Close modal preview if open to refresh status
          if (previewItem && previewItem.id === id) {
            setPreviewItem(null);
          }
        } else {
          showToast(false, res.error || "Installation handshake rejected.");
        }
      }
    }, intervalTime);
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewItem || !reviewAuthor.trim() || !reviewComment.trim()) return;

    setSubmittingReview(true);
    const res = await submitReview(previewItem.id, reviewAuthor, reviewRating, reviewComment);
    setSubmittingReview(false);

    if (res.success) {
      showToast(true, "Review submitted successfully!");
      setReviewAuthor("");
      setReviewComment("");
      setReviewRating(5);
      // Refresh preview modal item state by querying the updated list item
      refetch();
      setPreviewItem(null);
    } else {
      showToast(false, res.error || "Failed to post review.");
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingId || !reportReason.trim()) return;

    const res = await reportTemplate(reportingId, reportReason);
    setReportingId(null);
    setReportReason("");

    if (res.success) {
      showToast(true, "Report submitted. Moderation teams alerted.");
    } else {
      showToast(false, res.error || "Failed to submit report.");
    }
  };

  const resetFilters = () => {
    setFilters({
      search: "",
      category: "",
      license: "",
      minRating: 0,
      sortBy: "downloads",
      sortOrder: "desc",
    });
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-screen-xl mx-auto relative overflow-hidden">
      
      {/* Navigation Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-1">
        <span className="hover:text-foreground cursor-pointer transition">Dashboard</span>
        <span>/</span>
        <span className="text-foreground">Marketplace</span>
      </nav>

      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            Workflow Marketplace
            {loading && <RefreshCw className="w-4 h-4 text-muted-foreground animate-spin" />}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Browse and download open-source workflow pipelines directly into your local templates registry.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-brand-500/10 text-brand-500 border border-brand-500/20 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-brand-500 fill-current" />
          <span>Verified Publisher Signatures</span>
        </div>
      </div>

      {/* Action Toast popups */}
      {toast && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 border leading-normal shadow-md animate-fade-in ${
            toast.success
              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
              : "bg-rose-500/10 text-rose-600 border-rose-500/20"
          }`}
        >
          {toast.success ? (
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          )}
          <span className="font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Control panel filters */}
      <div className="bg-surface-card border border-border/40 p-4 rounded-2xl shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
          {/* Keyword Search */}
          <div className="relative w-full md:w-64 text-xs">
            <input
              type="text"
              placeholder="Search marketplace..."
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
              <option value="ai">AI</option>
              <option value="automation">Automation</option>
              <option value="devops">DevOps</option>
              <option value="crm">CRM</option>
              <option value="productivity">Productivity</option>
            </select>
          </div>

          {/* License selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.license}
              onChange={(e) => setFilters({ ...filters, license: e.target.value })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="">All Licenses</option>
              <option value="mit">MIT License</option>
              <option value="apache 2.0">Apache 2.0</option>
              <option value="commercial">Commercial</option>
            </select>
          </div>

          {/* Sorting parameter Selection */}
          <div className="flex flex-col text-[10px] gap-0.5">
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters({ ...filters, sortBy: e.target.value as any })}
              className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
            >
              <option value="downloads">Downloads</option>
              <option value="rating">Highest Rating</option>
              <option value="name">Blueprint Name</option>
              <option value="lastUpdated">Last Updated</option>
            </select>
          </div>
        </div>

        <button
          onClick={resetFilters}
          className="text-xs font-bold text-muted-foreground hover:text-foreground underline underline-offset-4 cursor-pointer"
        >
          Reset Filters
        </button>
      </div>

      {/* loading skeleton grids */}
      {loading && !data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-pulse">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-border/40 rounded-2xl" />
          ))}
        </div>
      )}

      {/* error state alert */}
      {error && (
        <div className="flex flex-col items-center justify-center p-8 max-w-lg mx-auto bg-rose-500/10 border border-rose-500/20 rounded-2xl shadow-sm text-center gap-4 mt-6">
          <AlertTriangle className="w-12 h-12 text-rose-500" />
          <h2 className="text-lg font-bold text-foreground">Marketplace Connect Failed</h2>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-500 transition"
          >
            Retry Catalog
          </button>
        </div>
      )}

      {/* empty catalog indicator */}
      {data && data.marketplace.length === 0 && (
        <div className="flex flex-col items-center justify-center p-12 bg-surface-card border border-border/40 rounded-3xl shadow-sm text-center gap-3">
          <Store className="w-12 h-12 text-border" />
          <h3 className="text-md font-bold text-foreground">No Marketplace Results</h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Modify filtering queries or clear keywords to sync templates available in the catalog.
          </p>
        </div>
      )}

      {/* Marketplace grid catalog */}
      {data && data.marketplace.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {data.marketplace.map((item) => (
            <div
              key={item.id}
              className="p-5 bg-surface-card border border-border/40 rounded-3xl shadow-xs flex flex-col justify-between gap-4 hover:shadow-md transition relative group overflow-hidden"
            >
              {/* Card Header title */}
              <div className="flex flex-col gap-2">
                <div className="flex items-start justify-between">
                  <span className="text-[9px] font-black text-brand-500 uppercase tracking-widest leading-none">
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleFavorite(item.id)}
                      className="p-1 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-amber-500 transition"
                    >
                      <Star className={`w-4 h-4 ${item.isFavorite ? "fill-amber-500 text-amber-500" : ""}`} />
                    </button>
                    {item.updateAvailable ? (
                      <span className="inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20 animate-pulse">
                        Update Available
                      </span>
                    ) : item.installed ? (
                      <span className="inline-flex items-center text-[9px] px-1.5 py-0.2 rounded-full font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                        Installed
                      </span>
                    ) : null}
                  </div>
                </div>

                <h3 className="text-sm font-extrabold text-foreground">{item.name}</h3>
                <p className="text-[11px] text-muted-foreground leading-relaxed h-12 overflow-hidden text-ellipsis">
                  {item.description}
                </p>
              </div>

              {/* Progress loader banner if target card is installing */}
              {installingId === item.id && (
                <div className="flex flex-col gap-1.5 bg-border/20 p-2.5 rounded-xl border border-border/40">
                  <div className="flex justify-between text-[10px] text-foreground font-black">
                    <span>Synchronizing Blueprint...</span>
                    <span>{installProgress}%</span>
                  </div>
                  <div className="w-full bg-border/40 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-brand-500 h-full transition-all duration-150"
                      style={{ width: `${installProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Card Footer details */}
              <div className="border-t border-border/20 pt-4 flex flex-col gap-3">
                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                  <span>Author: {item.author}</span>
                  <span>{item.license} License</span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-muted-foreground font-semibold">
                  <span>⭐ {item.rating.toFixed(1)} ({item.reviews.length} reviews)</span>
                  <span>📥 {item.downloads.toLocaleString()} downloads</span>
                </div>

                {/* Operations */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewItem(item)}
                    className="flex-1 py-1.5 text-xs font-semibold bg-border/40 border border-border/60 hover:bg-border/60 text-foreground rounded-xl transition flex items-center justify-center gap-1"
                  >
                    Details & Reviews
                  </button>

                  {installingId !== item.id && (
                    item.updateAvailable ? (
                      <button
                        onClick={() => handleInstallOrUpdate(item.id, true)}
                        className="py-1.5 px-3 text-xs font-bold bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition shadow-xs flex items-center gap-1"
                      >
                        Update
                      </button>
                    ) : item.installed ? (
                      <button
                        disabled
                        className="py-1.5 px-3 text-xs font-bold bg-border/20 text-muted-foreground rounded-xl border border-border/40"
                      >
                        Installed
                      </button>
                    ) : (
                      <button
                        onClick={() => handleInstallOrUpdate(item.id, false)}
                        className="py-1.5 px-3 text-xs font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition shadow-xs flex items-center gap-1"
                      >
                        Install
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Details & Reviews Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setPreviewItem(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity duration-300"
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-xl bg-background border border-border/40 rounded-3xl shadow-2xl p-6 flex flex-col gap-5 max-h-[90vh] overflow-y-auto z-10">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-brand-500/10 rounded-xl text-brand-500">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-foreground">{previewItem.name}</h3>
                  <span className="text-[10px] text-muted-foreground font-semibold block uppercase">
                    v{previewItem.latestVersion} • {previewItem.category} • Published by {previewItem.author}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setPreviewItem(null)}
                className="p-1.5 rounded-lg hover:bg-border/40 text-muted-foreground hover:text-foreground transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nodes execution blueprint list */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                <GitBranch className="w-4 h-4 text-brand-500" />
                <span>Node Blueprint Blueprint ({previewItem.nodes.length} nodes)</span>
              </h4>
              <div className="flex flex-wrap gap-2">
                {previewItem.nodes.map((node) => (
                  <span key={node.id} className="text-[10px] font-bold px-2 py-1 bg-border/20 rounded-lg text-foreground border border-border/40">
                    {node.label} ({node.typeId})
                  </span>
                ))}
              </div>
            </div>

            {/* Version History Changelog */}
            <div className="flex flex-col gap-2">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                <History className="w-4 h-4 text-brand-500" />
                <span>Version Release Changelogs</span>
              </h4>
              <div className="flex flex-col gap-2 pl-2">
                {previewItem.versions.map((ver) => (
                  <div key={ver.version} className="flex gap-2 text-xs border-l-2 border-border/60 pl-3 py-0.5 leading-normal text-muted-foreground">
                    <span className="font-extrabold text-foreground font-mono">v{ver.version}</span>
                    <span>•</span>
                    <span className="italic">{new Date(ver.updatedAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>{ver.changeLog}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Reviews Section */}
            <div className="flex flex-col gap-3.5 border-t border-border/40 pt-4">
              <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1">
                <MessageSquare className="w-4 h-4 text-brand-500" />
                <span>Reviews & Ratings ({previewItem.reviews.length})</span>
              </h4>

              {/* Review list */}
              <div className="flex flex-col gap-2.5 max-h-40 overflow-y-auto pr-1">
                {previewItem.reviews.length === 0 ? (
                  <div className="text-xs italic text-muted-foreground pl-1">No reviews yet. Be the first to leave comments!</div>
                ) : (
                  previewItem.reviews.map((rev) => (
                    <div key={rev.id} className="p-3 bg-border/10 border border-border/20 rounded-2xl flex flex-col gap-1.5 leading-normal text-xs">
                      <div className="flex justify-between font-semibold text-foreground text-[11px]">
                        <span>{rev.author}</span>
                        <span>⭐ {rev.rating} stars</span>
                      </div>
                      <p className="text-muted-foreground text-[10px]">{rev.comment}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Write a review form */}
              <form onSubmit={handleReviewSubmit} className="flex flex-col gap-3 bg-border/10 border border-border/20 p-3 rounded-2xl">
                <h5 className="text-[11px] font-black text-foreground uppercase tracking-wider">Leave a Review</h5>
                <div className="grid grid-cols-2 gap-2.5">
                  <input
                    type="text"
                    placeholder="Your Name..."
                    required
                    value={reviewAuthor}
                    onChange={(e) => setReviewAuthor(e.target.value)}
                    className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground"
                  />
                  <select
                    value={reviewRating}
                    onChange={(e) => setReviewRating(Number(e.target.value))}
                    className="px-2 py-1.5 bg-background border border-border/60 rounded-xl text-xs font-semibold focus:outline-none text-foreground"
                  >
                    <option value="5">⭐⭐⭐⭐⭐ 5 Stars</option>
                    <option value="4">⭐⭐⭐⭐ 4 Stars</option>
                    <option value="3">⭐⭐⭐ 3 Stars</option>
                    <option value="2">⭐⭐ 2 Stars</option>
                    <option value="1">⭐ 1 Star</option>
                  </select>
                </div>
                <textarea
                  placeholder="Leave details review feedback comment..."
                  required
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-2 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-brand-500 text-foreground h-16 resize-none"
                />
                <div className="flex justify-between items-center gap-4">
                  {/* Incident Report Button */}
                  <button
                    type="button"
                    onClick={() => setReportingId(previewItem.id)}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    <Flag className="w-3.5 h-3.5" />
                    Report Blueprint
                  </button>

                  <button
                    type="submit"
                    disabled={submittingReview}
                    className="px-3.5 py-1.5 text-[11px] font-bold bg-brand-500 text-white rounded-xl hover:bg-brand-600 transition flex items-center justify-center gap-1 shadow-sm"
                  >
                    {submittingReview ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Submit Review"
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Incident Report Reason Modal */}
      {reportingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setReportingId(null)}
            className="absolute inset-0 bg-black/40 backdrop-blur-xs"
          />
          <div className="relative w-full max-w-sm bg-background border border-border/40 rounded-3xl p-5 flex flex-col gap-4 z-10 shadow-2xl">
            <h3 className="text-sm font-extrabold text-foreground flex items-center gap-1 text-rose-500">
              <AlertTriangle className="w-4 h-4" /> Report Marketplace Template
            </h3>
            <form onSubmit={handleReportSubmit} className="flex flex-col gap-3">
              <textarea
                placeholder="Explain the security issue, node execution bug, or copy violation..."
                required
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full p-2.5 bg-background border border-border/60 rounded-xl text-xs focus:outline-none focus:border-rose-500 text-foreground h-20 resize-none"
              />
              <div className="flex gap-2 justify-end border-t border-border/20 pt-3">
                <button
                  type="button"
                  onClick={() => setReportingId(null)}
                  className="px-3 py-1.5 text-xs font-semibold bg-border/40 rounded-xl hover:bg-border/60 text-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 text-xs font-bold bg-rose-600 text-white rounded-xl hover:bg-rose-500"
                >
                  File Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
