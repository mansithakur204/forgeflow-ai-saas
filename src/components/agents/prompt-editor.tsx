"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Play, Plus, Trash2, History, RotateCcw, Save, ShieldAlert, Sparkles, Check, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface PromptVersion {
  version: string;
  timestamp: string;
  systemPrompt: string;
  developerPrompt: string;
  author: string;
}

interface PromptEditorProps {
  initialSystemPrompt?: string;
  initialDeveloperPrompt?: string;
  initialVariables?: string[];
  initialExamples?: { input: string; output: string }[];
  onSave?: (systemPrompt: string, developerPrompt: string) => void;
}

export function PromptEditor({
  initialSystemPrompt = "You are a professional assistant.",
  initialDeveloperPrompt = "Keep replies clear and technical.",
  initialVariables = ["user_query", "context"],
  initialExamples = [
    { input: "Explain React 19.", output: "React 19 introduces React Server Components, Server Actions..." }
  ],
  onSave
}: PromptEditorProps) {
  const [systemPrompt, setSystemPrompt] = useState(initialSystemPrompt);
  const [developerPrompt, setDeveloperPrompt] = useState(initialDeveloperPrompt);
  const [examples, setExamples] = useState(initialExamples);
  const [variables, setVariables] = useState<string[]>(initialVariables);
  const [newVar, setNewVar] = useState("");
  
  // Versions
  const [currentVersion, setCurrentVersion] = useState("v2.4");
  const [versionHistory, setVersionHistory] = useState<PromptVersion[]>([
    {
      version: "v2.4",
      timestamp: "2026-07-07T21:30:00Z",
      systemPrompt: "You are a professional assistant. Help the user optimize operations.",
      developerPrompt: "Keep replies clear and technical.",
      author: "Devon S."
    },
    {
      version: "v2.3",
      timestamp: "2026-07-06T18:15:00Z",
      systemPrompt: "You are an AI assistant. Answer queries directly.",
      developerPrompt: "Answer concisely in less than 3 sentences.",
      author: "Sarah K."
    },
    {
      version: "v2.2",
      timestamp: "2026-07-05T12:00:00Z",
      systemPrompt: "You are a general agent.",
      developerPrompt: "No constraints.",
      author: "Elena R."
    }
  ]);

  // Saving states
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>("Saved just now");

  // Live Token & Char Count
  const charCount = systemPrompt.length + developerPrompt.length;
  const tokenCount = Math.round(charCount / 4); // Standard approximation

  // Parse variables from input prompts dynamically: e.g. {{variable}}
  useEffect(() => {
    const regex = /\{\{([^}]+)\}\}/g;
    const foundVars: string[] = [];
    let match;
    
    // Scan system prompt
    while ((match = regex.exec(systemPrompt)) !== null) {
      const varName = match[1].trim();
      if (!foundVars.includes(varName)) foundVars.push(varName);
    }
    
    // Scan developer prompt
    regex.lastIndex = 0; // reset regex
    while ((match = regex.exec(developerPrompt)) !== null) {
      const varName = match[1].trim();
      if (!foundVars.includes(varName)) foundVars.push(varName);
    }

    // Merge with existing manual variables
    const merged = Array.from(new Set([...initialVariables, ...foundVars]));
    setVariables(merged);
  }, [systemPrompt, developerPrompt, initialVariables]);

  // Mock autosave triggers 1.5s after editing
  useEffect(() => {
    setIsSaving(true);
    const timer = setTimeout(() => {
      setIsSaving(false);
      setLastSaved(`Auto-saved at ${new Date().toLocaleTimeString()}`);
    }, 1200);

    return () => clearTimeout(timer);
  }, [systemPrompt, developerPrompt, examples]);

  const handleAddExample = () => {
    setExamples([...examples, { input: "", output: "" }]);
  };

  const handleUpdateExample = (index: number, field: "input" | "output", val: string) => {
    const updated = [...examples];
    updated[index][field] = val;
    setExamples(updated);
  };

  const handleRemoveExample = (index: number) => {
    setExamples(examples.filter((_, i) => i !== index));
  };

  const handleAddVariable = (e: React.FormEvent) => {
    e.preventDefault();
    if (newVar.trim() && !variables.includes(newVar.trim())) {
      setVariables([...variables, newVar.trim()]);
      setNewVar("");
    }
  };

  const handleRemoveVariable = (varName: string) => {
    setVariables(variables.filter((v) => v !== varName));
  };

  const handleRestoreVersion = (version: PromptVersion) => {
    setSystemPrompt(version.systemPrompt);
    setDeveloperPrompt(version.developerPrompt);
    setCurrentVersion(version.version);
    setLastSaved(`Restored ${version.version}`);
  };

  const handleManualSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      const nextVersionNum = (parseFloat(currentVersion.replace("v", "")) + 0.1).toFixed(1);
      const nextVer = `v${nextVersionNum}`;
      
      const newVersionRecord: PromptVersion = {
        version: nextVer,
        timestamp: new Date().toISOString(),
        systemPrompt,
        developerPrompt,
        author: "Current User"
      };

      setVersionHistory([newVersionRecord, ...versionHistory]);
      setCurrentVersion(nextVer);
      setLastSaved(`Manually saved as ${nextVer}`);
      if (onSave) {
        onSave(systemPrompt, developerPrompt);
      }
    }, 800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Editor Main Content */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">System Prompt</CardTitle>
              <p className="text-xs text-muted-foreground">Sets the persona, baseline behavior, and security restrictions.</p>
            </div>
            
            <div className="flex items-center gap-2 text-xs font-medium">
              {isSaving ? (
                <span className="flex items-center gap-1 text-muted-foreground animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-success">
                  <Check className="w-3.5 h-3.5" />
                  <span className="text-[11px] font-mono">{lastSaved}</span>
                </span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="You are an AI assistant..."
                className="min-h-[220px] font-mono text-sm leading-relaxed border-border/50 focus-visible:ring-brand-500/20"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted/80 text-muted-foreground font-mono">
                System
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Developer Instruction Prompt</CardTitle>
            <p className="text-xs text-muted-foreground">Developer-provided system constraints hidden from final application layers.</p>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Textarea
                value={developerPrompt}
                onChange={(e) => setDeveloperPrompt(e.target.value)}
                placeholder="Keep outputs restricted to JSON or specific lists..."
                className="min-h-[100px] font-mono text-sm leading-relaxed border-border/50 focus-visible:ring-brand-500/20"
              />
              <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-muted/80 text-muted-foreground font-mono">
                Developer
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Examples (Few-shot prompting) */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Examples (Few-Shot Prompting)</CardTitle>
              <p className="text-xs text-muted-foreground">Provide input/output pairs to steer formatting style.</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleAddExample} className="h-8 gap-1">
              <Plus className="w-3.5 h-3.5" />
              <span>Add Example</span>
            </Button>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {examples.length === 0 ? (
              <div className="text-center py-6 border border-dashed rounded-lg border-border/60 text-xs text-muted-foreground">
                No examples provided yet. Click "Add Example" to build guidance structures.
              </div>
            ) : (
              examples.map((ex, index) => (
                <div key={index} className="flex flex-col gap-2.5 p-3 rounded-lg border border-border/40 bg-muted/10 relative group/example">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-brand-500 uppercase tracking-wider">Example #{index + 1}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveExample(index)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover/example:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-mono">Input Example</Label>
                      <Textarea
                        value={ex.input}
                        onChange={(e) => handleUpdateExample(index, "input", e.target.value)}
                        placeholder="User prompt context..."
                        className="min-h-[60px] text-xs font-mono mt-1"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-muted-foreground font-mono">Output Example</Label>
                      <Textarea
                        value={ex.output}
                        onChange={(e) => handleUpdateExample(index, "output", e.target.value)}
                        placeholder="Expected agent reply..."
                        className="min-h-[60px] text-xs font-mono mt-1"
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sidebar: Metadata, Variables, History */}
      <div className="flex flex-col gap-6">
        {/* Token and Version Details */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              <span>Configuration Details</span>
              <span className="text-xs font-mono bg-brand-500/10 text-brand-500 px-2 py-0.5 rounded-full">{currentVersion}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg border bg-muted/10 text-center">
                <span className="text-[10px] text-muted-foreground block uppercase">Est. Tokens</span>
                <span className="text-lg font-bold font-mono text-foreground">{tokenCount}</span>
              </div>
              <div className="p-3 rounded-lg border bg-muted/10 text-center">
                <span className="text-[10px] text-muted-foreground block uppercase">Characters</span>
                <span className="text-lg font-bold font-mono text-foreground">{charCount}</span>
              </div>
            </div>

            <Button onClick={handleManualSave} className="w-full gap-2 h-9">
              <Save className="w-4 h-4" />
              <span>Create New Version</span>
            </Button>
          </CardContent>
        </Card>

        {/* Dynamic Variable list */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold">Detected Variables</CardTitle>
            <p className="text-xs text-muted-foreground">Variables declared with `{"{{name}}"}` will expand at run time.</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <form onSubmit={handleAddVariable} className="flex items-center gap-1.5">
              <Input
                value={newVar}
                onChange={(e) => setNewVar(e.target.value)}
                placeholder="var_name"
                className="h-8 text-xs font-mono"
              />
              <Button type="submit" variant="outline" size="sm" className="h-8">Add</Button>
            </form>

            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {variables.length === 0 ? (
                <span className="text-xs text-muted-foreground italic">No variables referenced.</span>
              ) : (
                variables.map((v) => (
                  <span
                    key={v}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-mono bg-brand-500/10 text-brand-500 border border-brand-500/15"
                  >
                    <span>{v}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveVariable(v)}
                      className="hover:text-destructive text-muted-foreground"
                    >
                      ×
                    </button>
                  </span>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* History timeline */}
        <Card className="border-border/60 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
              <History className="w-4 h-4 text-muted-foreground" />
              <span>Prompt Version History</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-3 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-border/60">
              {versionHistory.map((v, i) => (
                <div key={v.version} className="flex gap-3 relative">
                  <div className={cn(
                    "w-6 h-6 rounded-full shrink-0 flex items-center justify-center text-[10px] font-bold font-mono z-10 border",
                    v.version === currentVersion 
                      ? "bg-brand-500 text-white border-brand-500" 
                      : "bg-background text-muted-foreground border-border/80"
                  )}>
                    {v.version.replace("v", "")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-xs font-semibold text-foreground">{v.version}</span>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(v.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-1.5">Author: {v.author}</p>
                    
                    {v.version !== currentVersion && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRestoreVersion(v)}
                        className="h-6 text-[10px] px-2 py-0"
                      >
                        <RotateCcw className="w-2.5 h-2.5 mr-1" />
                        <span>Restore</span>
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
