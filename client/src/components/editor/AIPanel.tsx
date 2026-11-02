import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Loader2, AlertCircle, Send } from "lucide-react";
import type { SupportedLanguage, AIRequest, AIResponse } from "../../../../shared/types";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { value: "explain", label: "Explain Code" },
  { value: "debug", label: "Find Bugs" },
  { value: "optimize", label: "Optimize" },
  { value: "document", label: "Add Documentation" },
  { value: "suggest", label: "Suggest Improvements" },
  { value: "generate", label: "Generate Code" },
  { value: "convert", label: "Convert Language" },
  { value: "error", label: "Explain Error" },
  { value: "ask", label: "Ask a question" },
] as const;

const ALL_LANGUAGES = ["python", "javascript", "typescript", "java", "c", "cpp", "r"];

interface Message {
  role: "user" | "assistant";
  content: string;
  action?: string;
}

interface Props {
  code: string;
  language: SupportedLanguage;
}

export default function AIPanel({ code, language }: Props) {
  const [action, setAction] = useState<AIRequest["action"]>("explain");
  const [context, setContext] = useState("");
  const [targetLang, setTargetLang] = useState<SupportedLanguage>("javascript");
  const [messages, setMessages] = useState<Message[]>([]);
  const { data: aiHealth, isError: healthRequestFailed } = useQuery({
    queryKey: ["/api/ai/health"],
    queryFn: () => apiClient.get<{
      reachable: boolean;
      model: string;
      modelAvailable: boolean;
      message: string;
    }>("/api/ai/health"),
    refetchInterval: 30_000,
    staleTime: 10_000,
    retry: false,
  });

  const aiMutation = useMutation({
    mutationFn: (payload: AIRequest) =>
      apiClient.post<AIResponse>("/api/ai/assist", payload),
    onSuccess: (res, vars) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: `[${vars.action.toUpperCase()}] ${code.slice(0, 80)}...`, action: vars.action },
        { role: "assistant", content: res.result },
      ]);
      setContext("");
    },
  });

  const submit = () => {
    aiMutation.mutate({
      action,
      code,
      language,
      context: context || undefined,
      targetLanguage: action === "convert" ? targetLang : undefined,
      messages: messages.slice(-8).map(({ role, content }) => ({ role, content })),
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--cu-border)] shrink-0">
        <Bot className="h-4 w-4 text-[var(--cu-violet)]" />
        <span className="text-xs font-semibold text-[var(--cu-text-primary)]">AI Assistant</span>
        <span className="text-[10px] text-[var(--cu-text-muted)] ml-auto">Local · {aiHealth?.model || "Ollama"}</span>
      </div>
      <div
        role="status"
        className={cn(
          "px-3 py-1.5 border-b border-[var(--cu-border)] text-[10px]",
          aiHealth?.reachable && aiHealth.modelAvailable
            ? "text-[var(--cu-green)]"
            : "text-[var(--cu-amber)]"
        )}
      >
        {aiHealth?.message || (healthRequestFailed
          ? "Could not check the local Ollama service."
          : "Checking local Ollama…")}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-6">
              <Bot className="h-8 w-8 text-[var(--cu-violet)] opacity-40 mx-auto mb-2" />
              <p className="text-xs text-[var(--cu-text-muted)]">Use the current editor code or ask a programming question</p>
              <p className="text-[10px] text-[var(--cu-text-muted)] mt-1">Runs locally with Ollama</p>
            </div>
          ) : (
            messages.map((msg, i) => (
              <div key={i} className={cn("text-xs", msg.role === "user" ? "opacity-60" : "")}>
                <div className={cn(
                  "rounded-md p-2.5 font-mono whitespace-pre-wrap",
                  msg.role === "user"
                    ? "bg-[var(--cu-bg-elevated)] text-[var(--cu-text-muted)]"
                    : "bg-[var(--cu-violet)]/10 border border-[var(--cu-violet)]/20 text-[var(--cu-text-primary)]"
                )}>
                  {msg.content}
                </div>
              </div>
            ))
          )}
          {aiMutation.isPending && (
            <div className="flex items-center gap-2 text-xs text-[var(--cu-text-muted)]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Thinking...
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Controls */}
      <div className="border-t border-[var(--cu-border)] p-3 space-y-2 shrink-0">
        <div className="flex gap-2">
          <Select value={action} onValueChange={(v) => setAction(v as AIRequest["action"])}>
            <SelectTrigger className="h-7 text-xs flex-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value} className="text-xs">{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {action === "convert" && (
            <Select value={targetLang} onValueChange={(v) => setTargetLang(v as SupportedLanguage)}>
              <SelectTrigger className="h-7 text-xs w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALL_LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        {(action === "generate" || action === "error" || action === "ask" || action === "debug") && (
          <Textarea
            className="text-xs h-16 resize-none"
            placeholder={
              action === "generate" ? "Describe what to generate..." :
              action === "error" ? "Paste error message here..." :
              action === "ask" ? "Ask a programming question..." :
              "Optional error details..."
            }
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        )}
        {aiMutation.error && (
          <div role="alert" className="flex items-start gap-1.5 text-[10px] text-[var(--cu-red)]">
            <AlertCircle className="h-3 w-3 mt-0.5 shrink-0" />
            <span>{aiMutation.error.message}</span>
          </div>
        )}
        <Button
          size="sm"
          className="w-full h-7 bg-[var(--cu-violet)]/20 text-[var(--cu-violet)] border border-[var(--cu-violet)]/30 hover:bg-[var(--cu-violet)]/30"
          onClick={submit}
          disabled={aiMutation.isPending}
        >
          {aiMutation.isPending ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Processing...</>
          ) : (
            <><Send className="h-3.5 w-3.5" /> Ask AI</>
          )}
        </Button>
      </div>
    </div>
  );
}
