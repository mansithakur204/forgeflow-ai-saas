"use client";

import React, { useState } from "react";
import { Tool } from "@/lib/agents-data";
import { Badge } from "@/components/ui/badge";
import { CustomCard, CustomCardHeader, CustomCardContent } from "@/components/ui/custom-card";
import { SwitchField } from "@/components/ui/form-controls";
import * as Icons from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ToolCardProps {
  tool: Tool;
  onToggle?: (id: string, enabled: boolean) => void;
}

export function ToolCard({ tool, onToggle }: ToolCardProps) {
  const [enabled, setEnabled] = useState(tool.enabled);

  // Dynamic Lucide Icon Resolver
  const getIconComponent = (iconName: string) => {
    const IconComponent = (Icons as any)[iconName];
    if (IconComponent) {
      return <IconComponent className="w-5 h-5" />;
    }
    return <Icons.HelpCircle className="w-5 h-5" />;
  };

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    if (onToggle) {
      onToggle(tool.id, checked);
    }
    if (checked) {
      toast.success(`Enabled tool: ${tool.name}`);
    } else {
      toast.error(`Disabled tool: ${tool.name}`);
    }
  };

  return (
    <CustomCard
      variant="default"
      className={cn(
        "flex flex-col justify-between h-full border transition-all duration-200",
        enabled 
          ? "border-brand-500/20 bg-card hover:border-brand-500/30" 
          : "border-border/50 bg-muted/10 opacity-75 hover:opacity-100"
      )}
    >
      <CustomCardHeader className="flex-row items-start justify-between gap-4 p-5 pb-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "p-2 rounded-lg shrink-0",
              enabled 
                ? "bg-brand-500/10 text-brand-500" 
                : "bg-muted text-muted-foreground"
            )}
          >
            {getIconComponent(tool.icon)}
          </div>
          <div>
            <h4 className="font-semibold text-sm text-foreground leading-normal">{tool.name}</h4>
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
              {tool.category}
            </span>
          </div>
        </div>

        {/* Toggle Switch */}
        <SwitchField
          checked={enabled}
          onCheckedChange={handleToggle}
          aria-label={`Toggle ${tool.name}`}
        />
      </CustomCardHeader>

      <CustomCardContent className="px-5 pb-5 pt-0 flex-1 flex flex-col justify-between gap-4">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {tool.description}
        </p>

        {tool.permissions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-auto">
            {tool.permissions.map((perm) => (
              <Badge
                key={perm}
                variant="outline"
                className="text-[9px] font-medium py-0.5 px-1.5 border-border/60 bg-muted/40 text-muted-foreground"
              >
                {perm}
              </Badge>
            ))}
          </div>
        )}
      </CustomCardContent>
    </CustomCard>
  );
}
