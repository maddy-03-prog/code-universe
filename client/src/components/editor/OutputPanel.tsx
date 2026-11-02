import { ScrollArea } from "@/components/ui/scroll-area";
import type { ExecutionResult } from "../../../../shared/types";
import { CheckCircle, XCircle, Clock, AlertTriangle, Terminal, CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  output: ExecutionResult | null;
  isRunning: boolean;
}

export default function OutputPanel({ output, isRunning }: Props) {
  if (isRunning) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-[var(--cu-text-muted)]">
          <div className="w-6 h-6 border-2 border-[var(--cu-amber)] border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono">Executing...</span>
        </div>
      </div>
    );
  }

  if (!output) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex flex-col items-center gap-2 text-[var(--cu-text-muted)]">
          <Terminal className="h-8 w-8 opacity-30" />
          <p className="text-xs font-mono">Press Ctrl+Enter or click Run to execute</p>
        </div>
      </div>
    );
  }

  const statusIcon = {
    success: <CheckCircle className="h-4 w-4 text-[var(--cu-green)]" />,
    error: <XCircle className="h-4 w-4 text-[var(--cu-red)]" />,
    timeout: <Clock className="h-4 w-4 text-[var(--cu-amber)]" />,
    compile_error: <AlertTriangle className="h-4 w-4 text-[var(--cu-amber)]" />,
    memory_limit: <AlertTriangle className="h-4 w-4 text-[var(--cu-red)]" />,
    configuration_error: <AlertTriangle className="h-4 w-4 text-[var(--cu-amber)]" />,
    service_error: <AlertTriangle className="h-4 w-4 text-[var(--cu-red)]" />,
    unsupported: <CircleHelp className="h-4 w-4 text-[var(--cu-amber)]" />,
  }[output.status];

  const statusColor = {
    success: "text-[var(--cu-green)]",
    error: "text-[var(--cu-red)]",
    timeout: "text-[var(--cu-amber)]",
    compile_error: "text-[var(--cu-amber)]",
    memory_limit: "text-[var(--cu-red)]",
    configuration_error: "text-[var(--cu-amber)]",
    service_error: "text-[var(--cu-red)]",
    unsupported: "text-[var(--cu-amber)]",
  }[output.status];

  const statusLabels: Record<ExecutionResult["status"], string> = {
    success: "Execution successful",
    error: output.errorType || "Runtime error",
    timeout: "Time limit exceeded",
    compile_error: "Compilation error",
    memory_limit: "Memory limit exceeded",
    configuration_error: "Execution configuration required",
    service_error: "Execution service error",
    unsupported: "Unsupported language or runtime",
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-3 font-mono text-xs space-y-3">
        {/* Status header */}
        <div className="flex items-center gap-2 pb-2 border-b border-[var(--cu-border)]">
          {statusIcon}
          <span className={cn("font-semibold", statusColor)}>
            {output.errorType || statusLabels[output.status]}
          </span>
          {output.executionTime > 0 && (
            <span className="ml-auto text-[var(--cu-text-muted)]">{output.executionTime}ms</span>
          )}
          {output.memory !== undefined && (
            <span className="text-[var(--cu-text-muted)]">{output.memory} KB</span>
          )}
        </div>
        {(output.runtime || output.runtimeVersion) && (
          <div className="text-[10px] text-[var(--cu-text-muted)]">
            Runtime: {output.runtime || "unknown"} {output.runtimeVersion || ""}
          </div>
        )}

        {/* Compilation output */}
        {output.compilationOutput && (
          <div>
            <div className="text-[10px] text-[var(--cu-amber)] uppercase tracking-wider mb-1">Compilation Output</div>
            <pre className="text-[var(--cu-amber)] whitespace-pre-wrap">{output.compilationOutput}</pre>
          </div>
        )}

        {/* stdout */}
        {output.stdout && (
          <div>
            <div className="text-[10px] text-[var(--cu-text-muted)] uppercase tracking-wider mb-1">Output</div>
            <pre className="text-[var(--cu-text-primary)] whitespace-pre-wrap">{output.stdout}</pre>
          </div>
        )}

        {/* stderr */}
        {output.stderr && output.stderr !== output.compilationOutput && (
          <div>
            <div className="text-[10px] text-[var(--cu-red)] uppercase tracking-wider mb-1">
              {output.errorType || "Error"}
            </div>
            <pre className="text-[var(--cu-red)] whitespace-pre-wrap">{output.stderr}</pre>
          </div>
        )}

        {/* Empty success */}
        {output.status === "success" && !output.stdout && !output.stderr && (
          <div className="text-[var(--cu-text-muted)]">
            Program completed with exit code 0 (no output)
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
