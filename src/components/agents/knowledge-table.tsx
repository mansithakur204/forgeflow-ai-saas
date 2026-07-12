"use client";

import React, { useState } from "react";
import { UploadedFile, mockFiles } from "@/lib/agents-data";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  File,
  UploadCloud,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface KnowledgeTableProps {
  initialFiles?: UploadedFile[];
}

export function KnowledgeTable({ initialFiles }: KnowledgeTableProps = {}) {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  React.useEffect(() => {
    fetch("/api/knowledge")
      .then((res) => res.json())
      .then((data) => {
        setFiles(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load knowledge files");
        setLoading(false);
      });
  }, []);

  // File type icon resolver
  const getFileIcon = (fileName: string) => {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return <FileText className="w-4 h-4 text-rose-500" />;
    if (ext === "csv" || ext === "xlsx") return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
    if (ext === "json") return <FileCode className="w-4 h-4 text-yellow-500" />;
    return <File className="w-4 h-4 text-blue-500" />;
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const uploadRealFile = async (fileName: string, fileSize: number) => {
    setIsUploading(true);
    toast.success(`Uploading and parsing ${fileName}...`);
    try {
      const res = await fetch("/api/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fileName,
          sizeBytes: fileSize,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Ingestion failed");
      }
      setFiles((prev) => [data.file, ...prev]);
      setIsUploading(false);
      toast.success(`Successfully vectorized and embedded ${fileName}!`);
    } catch (err: any) {
      toast.error(`Ingestion failed: ${err.message}`);
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const validTypes = ["pdf", "docx", "txt", "csv", "json"];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";
      
      if (!validTypes.includes(ext)) {
        toast.error("Unsupported file format! Please upload PDF, DOCX, TXT, CSV, or JSON.");
        return;
      }
      
      uploadRealFile(file.name, file.size);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      uploadRealFile(file.name, file.size);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    try {
      const res = await fetch(`/api/knowledge?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to remove document");
      }
      setFiles(files.filter((f) => f.id !== id));
      toast.error(`Removed ${name} from Knowledge Base.`);
    } catch (err: any) {
      toast.error(`Failed to remove document: ${err.message}`);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Upload Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 text-center transition-all duration-200 cursor-pointer relative",
          isDragging 
            ? "border-brand-500 bg-brand-500/5 shadow-inner" 
            : "border-border/60 bg-card hover:bg-muted/10 hover:border-brand-500/30"
        )}
      >
        <input
          type="file"
          id="file-input"
          accept=".pdf,.docx,.txt,.csv,.json"
          onChange={handleFileSelect}
          className="absolute inset-0 opacity-0 cursor-pointer"
          disabled={isUploading}
        />
        <div className="p-3 bg-brand-500/10 rounded-full text-brand-500">
          <UploadCloud className="w-7 h-7" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            Drag and drop your knowledge source, or <span className="text-brand-500 underline">browse files</span>
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Supported formats: PDF, DOCX, TXT, CSV, JSON (Max 50MB)
          </p>
        </div>
      </div>

      {/* Files Table */}
      <div className="rounded-xl border border-border/60 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse" role="table" aria-label="Knowledge source list">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <th scope="col" className="px-5 py-3">File Name</th>
                <th scope="col" className="px-5 py-3">Chunks</th>
                <th scope="col" className="px-5 py-3 text-center">Status</th>
                <th scope="col" className="px-5 py-3">Embeddings</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {files.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-xs text-muted-foreground italic">
                    No documents uploaded. Drag in a PDF or JSON file to seed this agent's knowledge base.
                  </td>
                </tr>
              ) : (
                files.map((file) => (
                  <tr key={file.id} className="hover:bg-muted/5 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-foreground">
                      <div className="flex items-center gap-2.5 min-w-[200px]">
                        {getFileIcon(file.name)}
                        <div className="truncate">
                          <p className="truncate text-xs font-semibold text-foreground leading-normal">{file.name}</p>
                          <p className="text-[10px] text-muted-foreground leading-none mt-0.5">{file.size}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground font-mono">
                      {file.chunks > 0 ? file.chunks : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="inline-flex justify-center">
                        {file.status === "embedded" && (
                          <Badge variant="success" className="gap-1 text-[10px] font-medium px-2 py-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Embedded</span>
                          </Badge>
                        )}
                        {file.status === "processing" && (
                          <Badge variant="info" className="gap-1 text-[10px] font-medium px-2 py-0.5 animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Vectorizing</span>
                          </Badge>
                        )}
                        {file.status === "failed" && (
                          <Badge variant="destructive" className="gap-1 text-[10px] font-medium px-2 py-0.5">
                            <AlertCircle className="w-3 h-3" />
                            <span>Failed</span>
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-muted-foreground">
                      {file.status === "embedded" && (
                        <span className="font-mono text-foreground font-medium text-[11px]">
                          {file.embeddings} / {file.embeddings} vectors (1536d)
                        </span>
                      )}
                      {file.status === "processing" && (
                        <span className="font-mono text-muted-foreground text-[11px] animate-pulse">
                          Generating embedding blocks...
                        </span>
                      )}
                      {file.status === "failed" && (
                        <span className="text-[10px] text-destructive font-medium leading-none">
                          Parsing error / unsupported codec
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.id, file.name)}
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        aria-label={`Remove file ${file.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
