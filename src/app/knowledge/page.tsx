// ─────────────────────────────────────────────────────────────────────────────
// ForgeFlow AI — Knowledge Management Panel
// ─────────────────────────────────────────────────────────────────────────────

"use client";

import React, { useState, useEffect } from "react";
import { RootLayoutShell } from "@/components/layout/root-layout";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BookOpen,
  Plus,
  Search,
  Trash2,
  Database,
  Cpu,
  FileText,
  CheckCircle,
  Clock,
  FileUp,
} from "lucide-react";

interface DocumentItem {
  id: string;
  name: string;
  size: string;
  chunks: number;
  embeddings: number;
  status: "embedded" | "processing";
  uploadedAt: string;
}

interface CollectionItem {
  id: string;
  name: string;
  documentCount: number;
  createdAt: string;
}

export default function KnowledgePage() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [collections, setCollections] = useState<CollectionItem[]>([
    { id: "col-default", name: "Default collection", documentCount: 2, createdAt: new Date().toISOString() },
    { id: "col-seeded", name: "Seeded Knowledge Base", documentCount: 3, createdAt: new Date().toISOString() },
  ]);
  const [newColName, setNewColName] = useState("");
  const [newDocName, setNewDocName] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  // Search Test States
  const [queryText, setQueryText] = useState("");
  const [searchCollection, setSearchCollection] = useState("col-default");
  const [topK, setTopK] = useState(5);
  const [threshold, setThreshold] = useState(0.0);
  const [metric, setMetric] = useState("cosine");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any>(null);

  // Stats Counters
  const [stats, setStats] = useState({
    totalDocs: 0,
    totalChunks: 0,
    totalVectors: 0,
  });

  const fetchDocs = async () => {
    try {
      const res = await fetch("/api/knowledge");
      const data = await res.json();
      if (Array.isArray(data)) {
        setDocuments(data);
        const totalChunks = data.reduce((acc, doc) => acc + (doc.chunks || 0), 0);
        setStats({
          totalDocs: data.length,
          totalChunks,
          totalVectors: totalChunks, // uniform map
        });
      }
    } catch (err) {
      console.error("Failed to load documents", err);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleCreateCollection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    const newCol: CollectionItem = {
      id: `col-${Date.now()}`,
      name: newColName,
      documentCount: 0,
      createdAt: new Date().toISOString(),
    };
    setCollections([...collections, newCol]);
    setNewColName("");
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;
    setIsUploading(true);

    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newDocName, sizeBytes: Math.floor(Math.random() * 50000) + 10000 }),
      });
      const data = await res.json();
      if (data.success) {
        setNewDocName("");
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchDocs();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearchTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queryText.trim()) return;
    setIsSearching(true);
    setSearchResults(null);

    try {
      const res = await fetch("/api/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queryText,
          collection: searchCollection,
          limit: topK,
          minScore: threshold,
          metric,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <RootLayoutShell>
      <div className="flex flex-col gap-8 p-4 md:p-6 max-w-screen-xl mx-auto">
        <PageHeader
          title="Knowledge Panel"
          description="Build RAG search indexers, ingest text files, and test vector similarity matches."
        />

        {/* Live Counters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-card border border-border/60 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Documents</p>
              <h4 className="text-2xl font-bold mt-0.5">{stats.totalDocs}</h4>
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Chunks</p>
              <h4 className="text-2xl font-bold mt-0.5">{stats.totalChunks}</h4>
            </div>
          </div>
          <div className="bg-card border border-border/60 rounded-xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-500">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Vector Index Records</p>
              <h4 className="text-2xl font-bold mt-0.5">{stats.totalVectors}</h4>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Side Panel: Collections & Document Upload */}
          <div className="flex flex-col gap-8 lg:col-span-1">
            {/* Collections Card */}
            <div className="bg-card border border-border/60 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-md font-semibold text-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-500" />
                Collections
              </h3>
              <ul className="flex flex-col gap-2">
                {collections.map((col) => (
                  <li
                    key={col.id}
                    className="flex justify-between items-center px-3 py-2 bg-muted/30 border border-border/40 rounded-lg text-sm"
                  >
                    <span className="font-medium text-foreground">{col.name}</span>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {col.documentCount} docs
                    </span>
                  </li>
                ))}
              </ul>
              <form onSubmit={handleCreateCollection} className="flex gap-2 mt-2">
                <Input
                  placeholder="New collection name..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button type="submit" variant="outline" size="sm" className="h-9 px-3">
                  <Plus className="w-4 h-4" />
                </Button>
              </form>
            </div>

            {/* Document Ingester */}
            <div className="bg-card border border-border/60 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-md font-semibold text-foreground flex items-center gap-2">
                <FileUp className="w-4 h-4 text-brand-500" />
                Ingest Document
              </h3>
              <form onSubmit={handleUploadDocument} className="flex flex-col gap-3">
                <Input
                  placeholder="Enter document title or file.txt..."
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="h-9 text-xs"
                />
                <Button type="submit" variant="glow" size="sm" disabled={isUploading || !newDocName.trim()}>
                  {isUploading ? "Uploading..." : "Index Document"}
                </Button>
              </form>
            </div>
          </div>

          {/* Main Panel: Documents List & Search Test */}
          <div className="flex flex-col gap-8 lg:col-span-2">
            {/* Documents List */}
            <div className="bg-card border border-border/60 rounded-xl p-6 flex flex-col gap-4">
              <h3 className="text-md font-semibold text-foreground">Ingested Documents</h3>
              {documents.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">No documents indexed in this workspace yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-border/50 text-muted-foreground font-medium pb-2">
                        <th className="py-2">Title</th>
                        <th className="py-2">Size</th>
                        <th className="py-2">Chunks</th>
                        <th className="py-2">Status</th>
                        <th className="py-2 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {documents.map((doc) => (
                        <tr key={doc.id} className="border-b border-border/40 hover:bg-muted/10">
                          <td className="py-2.5 font-medium text-foreground truncate max-w-[180px]">{doc.name}</td>
                          <td className="py-2.5 text-muted-foreground">{doc.size}</td>
                          <td className="py-2.5 text-muted-foreground">{doc.chunks}</td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-brand-500 bg-brand-500/10 px-2 py-0.5 rounded-full">
                              {doc.status === "embedded" ? (
                                <>
                                  <CheckCircle className="w-3 h-3" /> Ready
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3 h-3 animate-spin" /> Ingesting
                                </>
                              )}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <button
                              onClick={() => handleDeleteDocument(doc.id)}
                              className="text-muted-foreground hover:text-destructive p-1 rounded transition-colors"
                              aria-label="Delete document"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RAG / Vector Similarity Search Test */}
            <div className="bg-card border border-border/60 rounded-xl p-6 flex flex-col gap-6">
              <h3 className="text-md font-semibold text-foreground flex items-center gap-2">
                <Search className="w-4 h-4 text-brand-500" />
                RAG Simulator / Search Test
              </h3>
              <form onSubmit={handleSearchTest} className="flex flex-col gap-4">
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter query term (e.g., OAuth configuration guide)..."
                    value={queryText}
                    onChange={(e) => setQueryText(e.target.value)}
                    className="h-10 text-xs"
                  />
                  <Button type="submit" variant="glow" size="sm" className="h-10 px-6" disabled={isSearching || !queryText.trim()}>
                    {isSearching ? "Searching..." : "Search"}
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Top K Chunks</label>
                    <select
                      value={topK}
                      onChange={(e) => setTopK(Number(e.target.value))}
                      className="bg-background border border-border/60 text-xs rounded-lg px-3 py-2 outline-none"
                    >
                      <option value={3}>3 Chunks</option>
                      <option value={5}>5 Chunks</option>
                      <option value={10}>10 Chunks</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Similarity Metric</label>
                    <select
                      value={metric}
                      onChange={(e) => setMetric(e.target.value)}
                      className="bg-background border border-border/60 text-xs rounded-lg px-3 py-2 outline-none"
                    >
                      <option value="cosine">Cosine Similarity</option>
                      <option value="dot-product">Dot Product</option>
                      <option value="euclidean">Euclidean Distance</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Min Score Threshold</label>
                    <Input
                      type="number"
                      step="0.05"
                      min="0"
                      max="1"
                      value={threshold}
                      onChange={(e) => setThreshold(Number(e.target.value))}
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </form>

              {/* Ranked Search Results */}
              {searchResults && (
                <div className="border-t border-border/50 pt-4 flex flex-col gap-4">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Generated RAG Answer</h4>
                    <div className="bg-muted/20 border border-border/45 rounded-lg p-4 text-xs leading-relaxed text-foreground whitespace-pre-line">
                      {searchResults.answer}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2">Retrieved Sources Citations ({searchResults.citations.length})</h4>
                    <div className="flex flex-col gap-3">
                      {searchResults.citations.map((c: any, index: number) => (
                        <div key={index} className="bg-card border border-border/40 rounded-lg p-3 text-xs flex flex-col gap-2">
                          <div className="flex justify-between items-center border-b border-border/30 pb-1.5">
                            <span className="font-semibold text-brand-500">Source {index + 1}</span>
                            <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded">
                              Score: {c.score.toFixed(4)}
                            </span>
                          </div>
                          <p className="text-muted-foreground leading-relaxed italic">"{c.content}"</p>
                          <div className="flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                            <span>Doc ID: {c.documentId}</span>
                            <span>•</span>
                            <span>Chunk ID: {c.chunkId}</span>
                            <span>•</span>
                            <span>Section: {c.metadata.section}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </RootLayoutShell>
  );
}
