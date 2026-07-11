import type { WorkflowRunSnapshot, ExecutionLogEntry } from "@/engine";

export type ReplayState = "idle" | "playing" | "paused" | "finished";

export class ReplayController {
  private snapshot: WorkflowRunSnapshot;
  private logs: ExecutionLogEntry[];
  private currentStep = 0;
  private state: ReplayState = "idle";
  private speed = 1.0; // 0.5, 1.0, 2.0, 5.0
  private intervalId: NodeJS.Timeout | null = null;
  private onStateChange: () => void;

  constructor(
    snapshot: WorkflowRunSnapshot,
    logs: ExecutionLogEntry[],
    onStateChange: () => void
  ) {
    this.snapshot = snapshot;
    this.logs = logs;
    this.onStateChange = onStateChange;
  }

  getSortedExecutions() {
    return [...this.snapshot.nodeExecutions].sort((a, b) => {
      const timeA = new Date(a.startedAt || 0).getTime();
      const timeB = new Date(b.startedAt || 0).getTime();
      return timeA - timeB;
    });
  }

  getTotalSteps() {
    return this.getSortedExecutions().length;
  }

  getCurrentStep() {
    return this.currentStep;
  }

  getState() {
    return this.state;
  }

  getSpeed() {
    return this.speed;
  }

  setSpeed(speed: number) {
    this.speed = speed;
    this.onStateChange();
    if (this.state === "playing") {
      this.pause();
      this.play();
    }
  }

  setStep(step: number) {
    const total = this.getTotalSteps();
    this.currentStep = Math.max(0, Math.min(step, total));
    if (this.currentStep === total) {
      this.state = "finished";
    } else if (this.state === "finished" && this.currentStep < total) {
      this.state = "paused";
    }
    this.onStateChange();
  }

  play() {
    if (this.state === "playing") return;
    const total = this.getTotalSteps();
    if (this.currentStep >= total) {
      this.currentStep = 0;
    }
    this.state = "playing";
    this.onStateChange();
    this.runLoop();
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.onStateChange();
  }

  stop() {
    this.state = "idle";
    this.currentStep = 0;
    if (this.intervalId) {
      clearTimeout(this.intervalId);
      this.intervalId = null;
    }
    this.onStateChange();
  }

  next() {
    this.pause();
    this.setStep(this.currentStep + 1);
  }

  prev() {
    this.pause();
    this.setStep(this.currentStep - 1);
  }

  getReplayedSnapshot(): WorkflowRunSnapshot {
    const sorted = this.getSortedExecutions();
    const visibleExecs = sorted.slice(0, this.currentStep);
    const visibleNodeIds = new Set(visibleExecs.map((e) => e.nodeId));

    const replayedNodeExecutions = this.snapshot.nodeExecutions.map((exec) => {
      if (visibleNodeIds.has(exec.nodeId)) {
        return exec; // show actual final execution details
      }
      // If it's the node currently executing at the active step, show as running
      if (this.currentStep < sorted.length && sorted[this.currentStep].nodeId === exec.nodeId) {
        return {
          ...exec,
          status: "running" as const,
          completedAt: null,
          errorMessage: null,
          outputs: null,
        };
      }
      // Otherwise, show as pending
      return {
        ...exec,
        status: "pending" as const,
        startedAt: null,
        completedAt: null,
        outputs: null,
        errorMessage: null,
      };
    });

    return {
      ...this.snapshot,
      nodeExecutions: replayedNodeExecutions,
    };
  }

  getReplayedLogs(): ExecutionLogEntry[] {
    const sorted = this.getSortedExecutions();
    if (this.currentStep === 0) {
      // Only show starting non-node lifecycle logs
      return this.logs.filter((l) => !l.nodeId);
    }
    const lastExec = sorted[this.currentStep - 1];
    const maxTime = lastExec.completedAt
      ? new Date(lastExec.completedAt).getTime()
      : new Date(lastExec.startedAt || 0).getTime();
    return this.logs.filter((log) => {
      const logTime = new Date(log.timestamp).getTime();
      return logTime <= maxTime;
    });
  }

  private runLoop() {
    const total = this.getTotalSteps();
    if (this.currentStep >= total) {
      this.state = "finished";
      this.onStateChange();
      return;
    }

    const delay = 1000 / this.speed;
    this.intervalId = setTimeout(() => {
      this.currentStep++;
      if (this.currentStep >= total) {
        this.state = "finished";
        this.intervalId = null;
      } else {
        this.runLoop();
      }
      this.onStateChange();
    }, delay);
  }

  destroy() {
    if (this.intervalId) {
      clearTimeout(this.intervalId);
    }
  }
}
