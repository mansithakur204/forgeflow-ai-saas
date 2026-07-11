"use client";

import React from "react";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReplayController } from "./replay-controller";

interface ReplayToolbarProps {
  controller: ReplayController;
  onExitReplay: () => void;
}

export function ReplayToolbar({ controller, onExitReplay }: ReplayToolbarProps) {
  const state = controller.getState();
  const currentStep = controller.getCurrentStep();
  const totalSteps = controller.getTotalSteps();
  const speed = controller.getSpeed();

  const isPlaying = state === "playing";

  const handlePlayPause = () => {
    if (isPlaying) {
      controller.pause();
    } else {
      controller.play();
    }
  };

  const handleRestart = () => {
    controller.setStep(0);
    controller.play();
  };

  return (
    <div className="h-12 border-b border-border/40 bg-brand-500/5 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Playback action items */}
      <div className="flex items-center gap-1.5">
        <button
          onClick={handlePlayPause}
          className={cn(
            "p-1.5 rounded-md hover:bg-brand-500/10 hover:text-brand-500 text-foreground transition-all cursor-pointer",
            isPlaying && "text-brand-500"
          )}
          title={isPlaying ? "Pause" : "Play"}
          aria-label={isPlaying ? "Pause replay" : "Play replay"}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={() => controller.prev()}
          disabled={currentStep <= 0}
          className="p-1.5 rounded-md hover:bg-brand-500/10 hover:text-brand-500 disabled:opacity-40 disabled:hover:bg-transparent text-foreground transition-all cursor-pointer"
          title="Previous Step"
          aria-label="Previous step"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <button
          onClick={() => controller.next()}
          disabled={currentStep >= totalSteps}
          className="p-1.5 rounded-md hover:bg-brand-500/10 hover:text-brand-500 disabled:opacity-40 disabled:hover:bg-transparent text-foreground transition-all cursor-pointer"
          title="Next Step"
          aria-label="Next step"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        <button
          onClick={handleRestart}
          className="p-1.5 rounded-md hover:bg-brand-500/10 hover:text-brand-500 text-foreground transition-all cursor-pointer"
          title="Restart Replay"
          aria-label="Restart replay"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={onExitReplay}
          className="p-1.5 rounded-md hover:bg-destructive/10 hover:text-destructive text-foreground transition-all cursor-pointer"
          title="Stop & Exit Replay"
          aria-label="Exit replay mode"
        >
          <Square className="w-4 h-4" />
        </button>
      </div>

      {/* Progress slider & step numbers */}
      <div className="flex-1 max-w-xl mx-8 flex items-center gap-4">
        <span className="text-[10px] font-mono text-muted-foreground w-16 shrink-0">
          Step {currentStep} / {totalSteps}
        </span>
        <input
          type="range"
          min={0}
          max={totalSteps}
          value={currentStep}
          onChange={(e) => controller.setStep(Number(e.target.value))}
          className="flex-1 accent-brand-500 h-1 bg-border rounded-lg appearance-none cursor-pointer"
          aria-label="Replay progress"
        />
      </div>

      {/* Playback speed & exit status banner */}
      <div className="flex items-center gap-4">
        {/* Speed selectors */}
        <div className="flex items-center gap-1 border border-border/40 bg-background/50 p-0.5 rounded-md">
          <Gauge className="w-3.5 h-3.5 text-muted-foreground ml-1.5 mr-1" />
          {([0.5, 1.0, 2.0, 5.0] as const).map((s) => (
            <button
              key={s}
              onClick={() => controller.setSpeed(s)}
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 rounded transition-all cursor-pointer",
                speed === s
                  ? "bg-brand-500 text-brand-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        {/* Mode tag */}
        <div className="flex items-center gap-1 bg-brand-500/10 text-brand-500 border border-brand-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">
          Replay Mode
        </div>
      </div>
    </div>
  );
}
