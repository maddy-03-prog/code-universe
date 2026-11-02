import { useState, useCallback, useRef, useEffect, Suspense, lazy } from "react";
import { useParams, useLocation, useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PanelGroup, Panel, PanelResizeHandle } from "react-resizable-panels";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAutoSave } from "@/hooks/useAutoSave";
import { toast } from "@/hooks/useToast";
import { LANGUAGE_TEMPLATES, LANGUAGE_DISPLAY, EXECUTABLE_LANGUAGES, ALL_LANGUAGES } from "@/lib/languages";
import { getFileLanguage, getLanguageIcon, cn } from "@/lib/utils";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { SupportedLanguage, ExecutionResult } from "../../../shared/types";
import type { UserPreferences } from "../../../shared/schema";
import EditorSidebar from "@/components/editor/EditorSidebar";
import OutputPanel from "@/components/editor/OutputPanel";
import AIPanel from "@/components/editor/AIPanel";
import {
  Play, Square, Save, Share, Settings, ChevronDown, Terminal,
  Code2, Wifi, WifiOff, LayoutPanelLeft, Bot, FileCode, Plus,
  Minus, Maximize2, RefreshCw, Eye
} from "lucide-react";

const MonacoEditor = lazy(() => import("@/components/editor/MonacoEditor"));

interface FileTab {
  id: string;
  name: string;
  language: SupportedLanguage;
  content: string;
  isDirty: boolean;
}

export default function Editor() {
  const params = useParams<{ projectId?: string }>();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const initialLang = (searchParams.get("lang") || "python") as SupportedLanguage;

  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const { data: preferencesData } = useQuery({
    queryKey: ["/api/preferences"],
    queryFn: () => apiClient.get<{ preferences: UserPreferences | null }>("/api/preferences"),
    enabled: isAuthenticated,
  });
  const preferences = preferencesData?.preferences;

  // ── Editor state ────────────────────────────────────────────────────────────
  const [tabs, setTabs] = useState<FileTab[]>([
    {
      id: "tab-1",
      name: `main.${LANGUAGE_DISPLAY[initialLang]?.ext || "py"}`,
      language: initialLang,
      content: LANGUAGE_TEMPLATES[initialLang],
      isDirty: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState("tab-1");
  const [fontSize, setFontSize] = useState(14);
  const [wordWrap, setWordWrap] = useState<"on" | "off">("on");
  const [minimap, setMinimap] = useState(false);
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState<ExecutionResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [activePanel, setActivePanel] = useState<"output" | "input" | "problems" | "ai">("output");
  const [showSidebar, setShowSidebar] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [newTabLang, setNewTabLang] = useState<SupportedLanguage>("python");
  const [showNewTab, setShowNewTab] = useState(false);
  const [selectedCode, setSelectedCode] = useState("");

  useEffect(() => {
    if (!preferences) return;
    setFontSize(preferences.fontSize || 14);
    setWordWrap((preferences.wordWrap ?? true) ? "on" : "off");
    setMinimap(preferences.minimap ?? true);
  }, [preferences]);

  useEffect(() => {
    if (!preferences?.defaultLanguage || searchParams.has("lang")) return;
    const language = ALL_LANGUAGES.includes(preferences.defaultLanguage as SupportedLanguage)
      ? preferences.defaultLanguage as SupportedLanguage
      : "javascript";
    setTabs((current) => {
      if (current.length !== 1 || current[0].id !== "tab-1" || current[0].isDirty) return current;
      const extension = LANGUAGE_DISPLAY[language]?.ext || "txt";
      return [{ ...current[0], language, name: `main.${extension}`, content: LANGUAGE_TEMPLATES[language] }];
    });
  }, [preferences?.defaultLanguage, search]);

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const updateTab = useCallback((id: string, content: string) => {
    setTabs((prev) => prev.map((t) => t.id === id ? { ...t, content, isDirty: true } : t));
  }, []);

  const saveTab = useCallback(
    async (content: string) => {
      // If project exists, save to backend
      if (params.projectId && isAuthenticated) {
        // Persist via API (simplified: save all files)
      }
      setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, isDirty: false } : t));
    },
    [activeTabId, params.projectId, isAuthenticated]
  );

  const { save: autoSave, status: saveStatus } = useAutoSave({ onSave: saveTab });

  const handleEditorChange = (value: string | undefined) => {
    const content = value || "";
    updateTab(activeTabId, content);
    if (preferences?.autoSave ?? true) autoSave(content);
  };

  const runCode = async () => {
    if (isRunning) return;
    setIsRunning(true);
    setOutput(null);
    setActivePanel("output");
    try {
      const result = await apiClient.post<ExecutionResult>("/api/execution/run", {
        language: activeTab.language,
        code: activeTab.content,
        stdin,
      });
      setOutput(result);
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error("Unable to reach the execution API.");
      const statusCode = typeof err === "object" && err !== null && "statusCode" in err &&
        typeof err.statusCode === "number" ? err.statusCode : undefined;
      const isValidationError = statusCode !== undefined && statusCode >= 400 && statusCode < 500;
      setOutput({
        stdout: "",
        stderr: error.message,
        exitCode: 1,
        executionTime: 0,
        status: isValidationError ? "error" : "service_error",
        errorType: isValidationError ? "Input Error" : "Execution Service Error",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        runCode();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        saveTab(activeTab.content);
      }
    },
    [activeTab, runCode]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const changeLanguage = (lang: SupportedLanguage) => {
    const ext = LANGUAGE_DISPLAY[lang]?.ext || "txt";
    const baseName = activeTab.name.split(".")[0];
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId
          ? { ...t, language: lang, name: `${baseName}.${ext}`, content: LANGUAGE_TEMPLATES[lang] }
          : t
      )
    );
  };

  const addTab = () => {
    if (!newTabName.trim()) return;
    const ext = LANGUAGE_DISPLAY[newTabLang]?.ext || "txt";
    const name = newTabName.includes(".") ? newTabName : `${newTabName}.${ext}`;
    const id = `tab-${Date.now()}`;
    setTabs((prev) => [...prev, {
      id, name, language: newTabLang,
      content: LANGUAGE_TEMPLATES[newTabLang], isDirty: false,
    }]);
    setActiveTabId(id);
    setShowNewTab(false);
    setNewTabName("");
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return;
    const idx = tabs.findIndex((t) => t.id === id);
    const newTabs = tabs.filter((t) => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[Math.max(0, idx - 1)].id);
    }
  };

  const canRun = EXECUTABLE_LANGUAGES.includes(activeTab.language);
  const canPreview = activeTab.language === "html" || activeTab.language === "css";
  const openPreview = () => {
    try {
      sessionStorage.setItem("code-universe-playground-source", JSON.stringify({
        language: activeTab.language,
        code: activeTab.content,
      }));
      setLocation("/playground?source=editor");
    } catch {
      toast({ title: "Could not open preview", description: "The browser could not store this file for the playground.", variant: "error" });
    }
  };
  const saveIndicator =
    saveStatus === "saving" ? "Saving..." :
    saveStatus === "saved" ? "Saved ✓" :
    saveStatus === "error" ? "Save failed" :
    activeTab.isDirty ? "Unsaved" : "Saved ✓";

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex h-screen overflow-hidden bg-[var(--cu-bg-base)]">

        {/* ── Left sidebar (file explorer) ── */}
        {showSidebar && (
          <EditorSidebar
            tabs={tabs}
            activeTabId={activeTabId}
            onSelectTab={setActiveTabId}
            onAddTab={() => setShowNewTab(true)}
          />
        )}

        {/* ── Main editor area ── */}
        <div className="flex-1 flex flex-col min-w-0">

          {/* Top toolbar */}
          <div className="h-11 flex items-center gap-2 px-3 border-b border-[var(--cu-border)] bg-[var(--cu-bg-surface)] shrink-0">
            {/* Sidebar toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="ghost" onClick={() => setShowSidebar((v) => !v)}>
                  <LayoutPanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Toggle Sidebar</TooltipContent>
            </Tooltip>

            <div className="w-px h-5 bg-[var(--cu-border)]" />

            {/* Logo */}
            <div className="flex items-center gap-1.5 mr-1">
              <div className="w-5 h-5 rounded bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] flex items-center justify-center">
                <Code2 className="h-3 w-3 text-white" />
              </div>
              <span className="text-xs font-semibold text-[var(--cu-text-secondary)] hidden sm:block">CODE UNIVERSE</span>
            </div>

            <div className="w-px h-5 bg-[var(--cu-border)]" />

            {/* File tabs */}
            <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTabId(tab.id)}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-mono whitespace-nowrap transition-colors group",
                    tab.id === activeTabId
                      ? "bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)]"
                      : "text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-bg-elevated)]/50"
                  )}
                >
                  <span>{getLanguageIcon(tab.language)}</span>
                  <span>{tab.name}</span>
                  {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-[var(--cu-blue)]" />}
                  {tabs.length > 1 && (
                    <span
                      onClick={(e) => closeTab(tab.id, e)}
                      className="ml-0.5 opacity-0 group-hover:opacity-100 hover:text-[var(--cu-red)] transition-all"
                    >×</span>
                  )}
                </button>
              ))}
              <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setShowNewTab(true)}>
                <Plus className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Right toolbar */}
            <div className="flex items-center gap-1.5 shrink-0">
              {/* Language selector */}
              <Select value={activeTab.language} onValueChange={(v) => changeLanguage(v as SupportedLanguage)}>
                <SelectTrigger className="h-7 text-xs w-32 border-[var(--cu-border)] bg-[var(--cu-bg-elevated)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang} className="text-xs">
                      {getLanguageIcon(lang)} {LANGUAGE_DISPLAY[lang].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Font size */}
              <div className="flex items-center gap-0.5">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFontSize((f) => Math.max(10, f - 1))}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="text-xs text-[var(--cu-text-muted)] w-7 text-center font-mono">{fontSize}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setFontSize((f) => Math.min(24, f + 1))}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              <div className="w-px h-5 bg-[var(--cu-border)]" />

              {/* AI panel toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon" variant="ghost" className="h-7 w-7"
                    onClick={() => setActivePanel((p) => p === "ai" ? "output" : "ai")}
                  >
                    <Bot className={cn("h-4 w-4", activePanel === "ai" ? "text-[var(--cu-violet)]" : "")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>AI Assistant</TooltipContent>
              </Tooltip>

              {/* Settings */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setShowSettings(true)}>
                    <Settings className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Settings</TooltipContent>
              </Tooltip>

              {/* Run button */}
              {canRun ? (
                <Button
                  size="sm"
                  className="h-7 px-3 bg-[var(--cu-green)]/20 text-[var(--cu-green)] border border-[var(--cu-green)]/30 hover:bg-[var(--cu-green)]/30"
                  onClick={runCode}
                  disabled={isRunning}
                >
                  {isRunning ? (
                    <><Square className="h-3.5 w-3.5" /> Stop</>
                  ) : (
                    <><Play className="h-3.5 w-3.5 fill-current" /> Run</>
                  )}
                </Button>
              ) : canPreview ? (
                <Button
                  size="sm"
                  className="h-7 px-3 bg-[var(--cu-blue)]/20 text-[var(--cu-blue)] border border-[var(--cu-blue)]/30 hover:bg-[var(--cu-blue)]/30"
                  onClick={openPreview}
                >
                  <Eye className="h-3.5 w-3.5" /> Preview
                </Button>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button size="sm" className="h-7 px-3" disabled>
                        <Play className="h-3.5 w-3.5" /> Run
                      </Button>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>{activeTab.language.toUpperCase()} is rendered in the browser playground</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Editor + output panels */}
          <PanelGroup direction="vertical" className="flex-1">
            <Panel defaultSize={65} minSize={30}>
              <Suspense fallback={
                <div className="h-full flex items-center justify-center bg-[var(--cu-bg-base)]">
                  <div className="text-sm text-[var(--cu-text-muted)] font-mono">Loading editor...</div>
                </div>
              }>
                <MonacoEditor
                  value={activeTab.content}
                  language={LANGUAGE_DISPLAY[activeTab.language]?.monacoLang || activeTab.language}
                  onChange={handleEditorChange}
                  onSelectionChange={setSelectedCode}
                  fontSize={fontSize}
                  wordWrap={wordWrap}
                  minimap={minimap}
                  lineNumbers={preferences?.lineNumbers ?? true}
                  tabSize={preferences?.tabSize ?? 2}
                  fontFamily={preferences?.fontFamily || "JetBrains Mono"}
                  editorTheme={(preferences?.editorTheme as "cu-dark" | "vs-dark" | "vs" | "hc-black") || "cu-dark"}
                />
              </Suspense>
            </Panel>

            <PanelResizeHandle className="h-1 bg-[var(--cu-border)] hover:bg-[var(--cu-blue)]/50 transition-colors cursor-row-resize" />

            <Panel defaultSize={35} minSize={20}>
              <div className="h-full flex flex-col bg-[var(--cu-bg-surface)]">
                {/* Panel tabs */}
                <div className="flex items-center gap-0.5 px-3 py-1.5 border-b border-[var(--cu-border)] shrink-0">
                  {(["output", "input", "problems", "ai"] as const).map((panel) => (
                    <button
                      key={panel}
                      onClick={() => setActivePanel(panel)}
                      className={cn(
                        "px-3 py-1 text-xs rounded transition-colors capitalize",
                        activePanel === panel
                          ? "bg-[var(--cu-bg-elevated)] text-[var(--cu-text-primary)]"
                          : "text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)]"
                      )}
                    >
                      {panel === "ai" ? "AI Assistant" : panel}
                    </button>
                  ))}
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-[10px] text-[var(--cu-text-muted)] font-mono">{saveIndicator}</span>
                    {isRunning && (
                      <span className="flex items-center gap-1 text-[10px] text-[var(--cu-amber)]">
                        <span className="w-1.5 h-1.5 bg-[var(--cu-amber)] rounded-full animate-pulse" />
                        Running...
                      </span>
                    )}
                  </div>
                </div>

                {/* Panel content */}
                <div className="flex-1 overflow-hidden">
                  {activePanel === "output" && <OutputPanel output={output} isRunning={isRunning} />}
                  {activePanel === "input" && (
                    <div className="h-full flex flex-col p-3 gap-2">
                      <label className="text-xs text-[var(--cu-text-muted)]">Standard Input (stdin)</label>
                      <Textarea
                        className="flex-1 font-mono text-xs resize-none"
                        placeholder="Enter program input here..."
                        value={stdin}
                        onChange={(e) => setStdin(e.target.value)}
                      />
                    </div>
                  )}
                  {activePanel === "problems" && (
                    <div className="h-full flex items-center justify-center text-sm text-[var(--cu-text-muted)]">
                      <div className="text-center">
                        <Code2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                        <p>No problems detected</p>
                        <p className="text-xs mt-1">Problems will appear here after running your code</p>
                      </div>
                    </div>
                  )}
                  {activePanel === "ai" && (
                    <AIPanel
                      code={selectedCode || activeTab.content}
                      language={activeTab.language}
                    />
                  )}
                </div>
              </div>
            </Panel>
          </PanelGroup>

          {/* Status bar */}
          <div className="h-6 flex items-center gap-4 px-3 border-t border-[var(--cu-border)] bg-[var(--cu-bg-surface)] shrink-0">
            <span className="text-[10px] font-mono text-[var(--cu-text-muted)]">
              {getLanguageIcon(activeTab.language)} {LANGUAGE_DISPLAY[activeTab.language]?.label}
            </span>
            <span className="text-[10px] font-mono text-[var(--cu-text-muted)]">UTF-8</span>
            <span className="text-[10px] font-mono text-[var(--cu-text-muted)]">Font: {fontSize}px</span>
            {output && (
              <span className={cn(
                "text-[10px] font-mono ml-auto",
                output.status === "success" ? "text-[var(--cu-green)]" : "text-[var(--cu-red)]"
              )}>
                Exit: {output.exitCode}{output.executionTime > 0 ? ` · ${output.executionTime}ms` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── New Tab Dialog ── */}
      <Dialog open={showNewTab} onOpenChange={setShowNewTab}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New File</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--cu-text-muted)] mb-1.5 block">File Name</label>
              <Input placeholder="main.py" value={newTabName} onChange={(e) => setNewTabName(e.target.value)} autoFocus />
            </div>
            <div>
              <label className="text-xs text-[var(--cu-text-muted)] mb-1.5 block">Language</label>
              <Select value={newTabLang} onValueChange={(v) => setNewTabLang(v as SupportedLanguage)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>{getLanguageIcon(lang)} {LANGUAGE_DISPLAY[lang].label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewTab(false)}>Cancel</Button>
            <Button onClick={addTab} disabled={!newTabName.trim()}>Create File</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Settings Dialog ── */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editor Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--cu-text-primary)]">Word Wrap</label>
              <button
                onClick={() => setWordWrap((w) => w === "on" ? "off" : "on")}
                className={cn("w-10 h-5 rounded-full transition-colors", wordWrap === "on" ? "bg-[var(--cu-blue)]" : "bg-[var(--cu-bg-elevated)]")}
              >
                <span className={cn("block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5", wordWrap === "on" ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-[var(--cu-text-primary)]">Minimap</label>
              <button
                onClick={() => setMinimap((m) => !m)}
                className={cn("w-10 h-5 rounded-full transition-colors", minimap ? "bg-[var(--cu-blue)]" : "bg-[var(--cu-bg-elevated)]")}
              >
                <span className={cn("block w-4 h-4 rounded-full bg-white shadow transition-transform mx-0.5", minimap ? "translate-x-5" : "translate-x-0")} />
              </button>
            </div>
            <div>
              <label className="text-sm text-[var(--cu-text-primary)] block mb-2">Font Size: {fontSize}px</label>
              <input
                type="range" min={10} max={24} value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-full accent-[var(--cu-blue)]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
