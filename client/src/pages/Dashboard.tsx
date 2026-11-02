import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/useToast";
import { formatRelativeTime, getLanguageIcon } from "@/lib/utils";
import { ALL_LANGUAGES, LANGUAGE_DISPLAY } from "@/lib/languages";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  Code2, Plus, FolderOpen, Clock, Zap, Globe, BookOpen,
  Terminal, Sparkles, ArrowRight, Activity, Star, Users, TrendingUp, Trash2
} from "lucide-react";
import { useState } from "react";
import type { SupportedLanguage } from "../../../shared/types";

const STATS = [
  { label: "Languages", value: "10", icon: Code2, color: "var(--cu-blue)" },
  { label: "Practice Problems", value: "8", icon: BookOpen, color: "var(--cu-violet)" },
  { label: "Storage Mode", value: "In-memory", icon: Activity, color: "var(--cu-amber)" },
  { label: "Execution Timeout", value: "10s", icon: Zap, color: "var(--cu-amber)" },
];

const TEMPLATES = [
  { name: "Python Starter", lang: "python", description: "Start with a runnable Python program" },
  { name: "JavaScript Starter", lang: "javascript", description: "Start with a runnable JavaScript program" },
  { name: "Java Starter", lang: "java", description: "Start with a runnable Java program" },
  { name: "C Starter", lang: "c", description: "Start with a runnable C program" },
  { name: "C++ Starter", lang: "cpp", description: "Start with a runnable C++ program" },
  { name: "HTML Starter", lang: "html", description: "Open an HTML document in the editor" },
];

interface SubmissionActivity {
  id: number;
  problemId: number | null;
  language: string;
  status: string;
  createdAt: string;
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [showNewProject, setShowNewProject] = useState(false);
  const [newName, setNewName] = useState("");
  const [newLang, setNewLang] = useState<SupportedLanguage>("python");

  const { data: projectsData } = useQuery({
    queryKey: ["/api/projects"],
    queryFn: () => apiClient.get<{ projects: any[] }>("/api/projects"),
    enabled: isAuthenticated,
  });
  const projects = projectsData?.projects || [];
  const { data: problemData } = useQuery({
    queryKey: ["/api/practice/problems"],
    queryFn: () => apiClient.get<{ problems: unknown[] }>("/api/practice/problems"),
  });
  const { data: healthData } = useQuery({
    queryKey: ["/api/health"],
    queryFn: () => apiClient.get<{ storageMode: string }>("/api/health"),
    staleTime: 60_000,
  });
  const { data: activityData, isLoading: activityLoading, error: activityError } = useQuery({
    queryKey: ["/api/practice/submissions"],
    queryFn: () => apiClient.get<{ submissions: SubmissionActivity[] }>("/api/practice/submissions"),
    enabled: isAuthenticated,
  });
  const recentActivity = activityData?.submissions.slice(0, 5) || [];

  const createMutation = useMutation({
    mutationFn: (data: { name: string; language: string }) =>
      apiClient.post<{ project: any }>("/api/projects", data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      setShowNewProject(false);
      setNewName("");
      toast({ title: "Project created!", variant: "success" });
      setLocation(`/editor/${res.project.id}`);
    },
    onError: () => toast({ title: "Failed to create project", variant: "error" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiClient.delete(`/api/projects/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/projects"] });
      toast({ title: "Project deleted", variant: "default" });
    },
  });

  return (
    <AppLayout>
      <div className="h-full overflow-y-auto">
        <div className="max-w-6xl mx-auto px-6 py-8 space-y-10">

          {/* ── Hero ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-2"
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[var(--cu-blue)] to-[var(--cu-violet)] flex items-center justify-center">
                <Code2 className="h-4 w-4 text-white" />
              </div>
              <div>
                <span className="text-xs font-mono text-[var(--cu-text-muted)] tracking-widest uppercase">CODE UNIVERSE</span>
              </div>
            </div>
            <h1 className="text-2xl font-bold text-[var(--cu-text-primary)]">
              {isAuthenticated ? `Welcome back, ${user?.username}` : "Welcome to CODE UNIVERSE"}
            </h1>
            <p className="text-sm text-[var(--cu-text-muted)] max-w-lg">
              One Universe. Every Language. Infinite Possibilities. — Write, run, and learn programming directly in your browser.
            </p>

            <div className="flex items-center gap-3 pt-2">
              {isAuthenticated ? (
                <>
                  <Button onClick={() => setShowNewProject(true)}>
                    <Plus className="h-3.5 w-3.5" /> New Project
                  </Button>
                  <Button variant="secondary" onClick={() => setLocation("/editor")}>
                    <Terminal className="h-3.5 w-3.5" /> Open Editor
                  </Button>
                </>
              ) : (
                <>
                  <Link href="/register">
                    <Button><Sparkles className="h-3.5 w-3.5" /> Get Started Free</Button>
                  </Link>
                  <Button variant="secondary" onClick={() => setLocation("/editor")}>
                    <Terminal className="h-3.5 w-3.5" /> Try as Guest
                  </Button>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Stats ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-3"
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="cu-surface rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                  <span className="text-xs text-[var(--cu-text-muted)]">{stat.label}</span>
                </div>
                <div className="text-xl font-bold font-mono" style={{ color: stat.color }}>
                  {stat.label === "Practice Problems"
                    ? (problemData?.problems.length ?? "…")
                    : stat.label === "Storage Mode"
                      ? (healthData?.storageMode ?? "…")
                      : stat.value}
                </div>
              </div>
            ))}
          </motion.div>

          {/* ── Quick actions ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
          >
            <h2 className="text-sm font-semibold text-[var(--cu-text-secondary)] mb-3 uppercase tracking-wider">Quick Start</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Link href="/editor">
                <div className="cu-surface rounded-lg p-4 cursor-pointer hover:border-[var(--cu-blue)]/40 hover:bg-[var(--cu-bg-elevated)] transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-md bg-[var(--cu-blue)]/20 flex items-center justify-center">
                      <Code2 className="h-4 w-4 text-[var(--cu-blue)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--cu-text-primary)]">Code Editor</span>
                  </div>
                  <p className="text-xs text-[var(--cu-text-muted)]">Multi-language Monaco editor with execution, AI assistant, and file management.</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-[var(--cu-blue)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open Editor <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>

              <Link href="/playground">
                <div className="cu-surface rounded-lg p-4 cursor-pointer hover:border-[var(--cu-violet)]/40 hover:bg-[var(--cu-bg-elevated)] transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-md bg-[var(--cu-violet)]/20 flex items-center justify-center">
                      <Globe className="h-4 w-4 text-[var(--cu-violet)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--cu-text-primary)]">Web Playground</span>
                  </div>
                  <p className="text-xs text-[var(--cu-text-muted)]">HTML, CSS, and JavaScript live preview environment with console output.</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-[var(--cu-violet)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Open Playground <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>

              <Link href="/practice">
                <div className="cu-surface rounded-lg p-4 cursor-pointer hover:border-[var(--cu-green)]/40 hover:bg-[var(--cu-bg-elevated)] transition-all group">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-md bg-[var(--cu-green)]/20 flex items-center justify-center">
                      <BookOpen className="h-4 w-4 text-[var(--cu-green)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--cu-text-primary)]">Practice Problems</span>
                  </div>
                  <p className="text-xs text-[var(--cu-text-muted)]">Algorithmic challenges with automatic test evaluation across difficulty levels.</p>
                  <div className="flex items-center gap-1 mt-3 text-xs text-[var(--cu-green)] opacity-0 group-hover:opacity-100 transition-opacity">
                    Start Practicing <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* ── Languages ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h2 className="text-sm font-semibold text-[var(--cu-text-secondary)] mb-3 uppercase tracking-wider">Supported Languages</h2>
            <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
              {ALL_LANGUAGES.map((lang) => {
                const info = LANGUAGE_DISPLAY[lang];
                return (
                  <button
                    key={lang}
                    onClick={() => setLocation(`/editor?lang=${lang}`)}
                    className="cu-surface rounded-lg p-3 text-center hover:border-[var(--cu-blue)]/40 hover:bg-[var(--cu-bg-elevated)] transition-all group flex flex-col items-center gap-1.5"
                  >
                    <span className="text-lg">{getLanguageIcon(lang)}</span>
                    <span className="text-[10px] text-[var(--cu-text-muted)] group-hover:text-[var(--cu-text-primary)] font-mono transition-colors">{info.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* ── Recent Projects ── */}
          {isAuthenticated && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.25 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-[var(--cu-text-secondary)] uppercase tracking-wider">Recent Projects</h2>
                <Button size="sm" variant="ghost" onClick={() => setShowNewProject(true)}>
                  <Plus className="h-3.5 w-3.5" /> New
                </Button>
              </div>

              {projects.length === 0 ? (
                <div className="cu-surface rounded-lg p-8 text-center">
                  <FolderOpen className="h-8 w-8 text-[var(--cu-text-muted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--cu-text-muted)]">No projects yet</p>
                  <p className="text-xs text-[var(--cu-text-muted)] mt-1">Create your first project to get started</p>
                  <Button size="sm" className="mt-4" onClick={() => setShowNewProject(true)}>
                    <Plus className="h-3.5 w-3.5" /> Create Project
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {projects.slice(0, 6).map((project: any) => (
                    <div
                      key={project.id}
                      className="cu-surface rounded-lg p-4 cursor-pointer hover:border-[var(--cu-border)] hover:bg-[var(--cu-bg-elevated)] transition-all group"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0" onClick={() => setLocation(`/editor/${project.id}`)}>
                          <span className="text-base shrink-0">{getLanguageIcon(project.language)}</span>
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-[var(--cu-text-primary)] truncate">{project.name}</div>
                            <div className="text-xs text-[var(--cu-text-muted)] flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" />
                              {formatRelativeTime(project.updatedAt)}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Badge variant="secondary">{LANGUAGE_DISPLAY[project.language as SupportedLanguage]?.label || project.language}</Badge>
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(project.id); }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:text-[var(--cu-red)] text-[var(--cu-text-muted)] transition-all"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Coding activity ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.28 }}
          >
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-[var(--cu-text-secondary)] uppercase tracking-wider">Coding Activity</h2>
              <Link href="/practice">
                <span className="text-xs text-[var(--cu-blue)] hover:underline">Practice problems</span>
              </Link>
            </div>
            {isAuthenticated ? (
              activityLoading ? (
                <div className="h-20 cu-surface rounded-lg animate-pulse" />
              ) : activityError ? (
                <div role="status" className="cu-surface rounded-lg p-4 text-sm text-[var(--cu-red)]">
                  Could not load your coding activity.
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="cu-surface rounded-lg p-4 text-sm text-[var(--cu-text-muted)]">
                  No submissions yet. Your practice attempts will appear here.
                </div>
              ) : (
                <div className="cu-surface rounded-lg divide-y divide-[var(--cu-border)]">
                  {recentActivity.map((item) => (
                    <Link key={item.id} href="/practice">
                      <div className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--cu-bg-elevated)] transition-colors cursor-pointer">
                        <Activity className={`h-4 w-4 shrink-0 ${item.status === "accepted" ? "text-[var(--cu-green)]" : "text-[var(--cu-amber)]"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[var(--cu-text-primary)] truncate">
                            {item.status === "accepted" ? "Accepted practice submission" : "Practice submission"}
                          </p>
                          <p className="text-xs text-[var(--cu-text-muted)]">
                            {LANGUAGE_DISPLAY[item.language as SupportedLanguage]?.label || item.language}
                            {item.problemId ? ` · Problem #${item.problemId}` : ""}
                          </p>
                        </div>
                        <Badge variant={item.status === "accepted" ? "success" : item.status === "partial" ? "warning" : "danger"}>
                          {item.status.replace("_", " ")}
                        </Badge>
                        <span className="text-[10px] text-[var(--cu-text-muted)] whitespace-nowrap">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )
            ) : (
              <div className="cu-surface rounded-lg p-4 text-sm text-[var(--cu-text-muted)]">
                <Link href="/login">
                  <span className="text-[var(--cu-blue)] hover:underline">Sign in</span>
                </Link>{" "}
                to keep a history of your practice submissions.
              </div>
            )}
          </motion.div>

          {/* ── Templates ── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h2 className="text-sm font-semibold text-[var(--cu-text-secondary)] mb-3 uppercase tracking-wider">Quick-Start Templates</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {TEMPLATES.map((tpl) => (
                <button
                  key={tpl.name}
                  onClick={() => setLocation(`/editor?lang=${tpl.lang}`)}
                  className="cu-surface rounded-lg p-4 text-left hover:border-[var(--cu-blue)]/30 hover:bg-[var(--cu-bg-elevated)] transition-all group"
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span>{getLanguageIcon(tpl.lang)}</span>
                    <span className="text-sm font-medium text-[var(--cu-text-primary)]">{tpl.name}</span>
                  </div>
                  <p className="text-xs text-[var(--cu-text-muted)]">{tpl.description}</p>
                </button>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* ── New Project Dialog ── */}
      <Dialog open={showNewProject} onOpenChange={setShowNewProject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--cu-text-muted)] mb-1.5 block">Project Name</label>
              <Input
                placeholder="my-awesome-project"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && newName.trim() && createMutation.mutate({ name: newName.trim(), language: newLang })}
                autoFocus
              />
            </div>
            <div>
              <label className="text-xs text-[var(--cu-text-muted)] mb-1.5 block">Language</label>
              <Select value={newLang} onValueChange={(v) => setNewLang(v as SupportedLanguage)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_LANGUAGES.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {getLanguageIcon(lang)} {LANGUAGE_DISPLAY[lang].label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowNewProject(false)}>Cancel</Button>
            <Button
              onClick={() => createMutation.mutate({ name: newName.trim(), language: newLang })}
              disabled={!newName.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? "Creating..." : "Create Project"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
