import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { apiClient } from "@/lib/api";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Search, ChevronRight, CheckCircle, Circle, Bookmark } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PracticeProblem } from "../../../shared/schema";

const DIFF_CONFIG = {
  beginner: { color: "success" as const, label: "Beginner" },
  intermediate: { color: "warning" as const, label: "Intermediate" },
  advanced: { color: "danger" as const, label: "Advanced" },
};

export default function Practice() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [category, setCategory] = useState("all");
  const [language, setLanguage] = useState("all");
  const [sort, setSort] = useState<"default" | "title">("default");
  const [bookmarksOnly, setBookmarksOnly] = useState(false);
  const [bookmarks, setBookmarks] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("cu-practice-bookmarks") || "[]") as number[];
    } catch {
      return [];
    }
  });
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["/api/practice/problems"],
    queryFn: () => apiClient.get<{ problems: PracticeProblem[] }>("/api/practice/problems"),
  });

  const { data: subsData } = useQuery({
    queryKey: ["/api/practice/submissions"],
    queryFn: () => apiClient.get<{ submissions: any[] }>("/api/practice/submissions"),
  });

  const problems = data?.problems || [];
  const submissions = subsData?.submissions || [];
  const solvedIds = new Set(submissions.filter((s) => s.status === "accepted").map((s) => s.problemId));
  const attemptedIds = new Set(submissions.map((s) => s.problemId));
  const categories = useMemo(() => [...new Set(problems.map((problem) => problem.category))].sort(), [problems]);

  useEffect(() => {
    localStorage.setItem("cu-practice-bookmarks", JSON.stringify(bookmarks));
  }, [bookmarks]);

  const filtered = problems.filter((p) => {
    const matchSearch = !search || p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || p.difficulty === filter;
    const matchCategory = category === "all" || p.category === category;
    const matchLanguage = language === "all" || p.supportedLanguages?.includes(language) !== false;
    const matchBookmark = !bookmarksOnly || bookmarks.includes(p.id);
    return matchSearch && matchFilter && matchCategory && matchLanguage && matchBookmark;
  });

  const difficultyCounts = problems.reduce((acc, p) => {
    acc[p.difficulty] = (acc[p.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const pageSize = 20;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const sorted = [...filtered].sort((a, b) => sort === "title" ? a.title.localeCompare(b.title) : a.id - b.id);
  const visibleProblems = sorted.slice((page - 1) * pageSize, page * pageSize);
  const solvedByDifficulty = problems.reduce((acc, problem) => {
    if (solvedIds.has(problem.id)) acc[problem.difficulty] = (acc[problem.difficulty] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const recentAttempts = [...submissions]
    .filter((submission) => submission.problemId)
    .filter((submission, index, list) => list.findIndex((item) => item.problemId === submission.problemId) === index)
    .slice(0, 5);

  useEffect(() => setPage(1), [search, filter, category, language, sort, bookmarksOnly]);

  const toggleBookmark = (problemId: number) => {
    setBookmarks((current) => current.includes(problemId)
      ? current.filter((id) => id !== problemId)
      : [...current, problemId]);
  };

  return (
    <AppLayout title="Practice">
      <div className="h-full overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">

          {/* Header */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-[var(--cu-green)]" />
              <h1 className="text-xl font-bold text-[var(--cu-text-primary)]">Coding Practice</h1>
            </div>
            <p className="text-sm text-[var(--cu-text-muted)]">
              Sharpen your skills with algorithmic challenges. Automatic test evaluation across multiple languages.
            </p>
          </motion.div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {[
              { label: "Total", value: problems.length },
              { label: "Unsolved", value: Math.max(0, problems.length - solvedIds.size) },
              { label: "Beginner", value: `${solvedByDifficulty.beginner || 0}/${difficultyCounts.beginner || 0}` },
              { label: "Intermediate", value: `${solvedByDifficulty.intermediate || 0}/${difficultyCounts.intermediate || 0}` },
              { label: "Advanced", value: `${solvedByDifficulty.advanced || 0}/${difficultyCounts.advanced || 0}` },
              { label: "Solved", value: solvedIds.size },
            ].map((stat) => (
              <div key={stat.label} className="cu-surface rounded-lg p-3 text-center">
                <div className="text-lg font-bold font-mono text-[var(--cu-text-primary)]">{stat.value}</div>
                <div className="text-[10px] text-[var(--cu-text-muted)]">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--cu-text-muted)]" />
              <Input
                className="pl-8"
                placeholder="Search problems..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              {(["all", "beginner", "intermediate", "advanced"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    "px-3 py-1.5 rounded text-xs capitalize transition-colors",
                    filter === f
                      ? "bg-[var(--cu-blue)]/20 text-[var(--cu-blue)] border border-[var(--cu-blue)]/30"
                      : "text-[var(--cu-text-muted)] hover:text-[var(--cu-text-secondary)] hover:bg-[var(--cu-bg-elevated)]"
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-8 w-40 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="h-8 w-36 text-xs"><SelectValue placeholder="Language" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All languages</SelectItem>
                {(["python", "c", "cpp", "java", "javascript", "typescript"] as const).map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sort} onValueChange={(value) => setSort(value as "default" | "title")}>
              <SelectTrigger className="h-8 w-32 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Default order</SelectItem>
                <SelectItem value="title">Title A-Z</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" variant={bookmarksOnly ? "default" : "secondary"} onClick={() => setBookmarksOnly((value) => !value)}>
              <Bookmark className="h-3.5 w-3.5" /> Bookmarks
            </Button>
          </div>

          {/* Problem list */}
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 cu-surface rounded-lg animate-pulse" />
              ))}
            </div>
          ) : !data ? (
            <div role="alert" className="cu-surface rounded-lg p-6 text-center text-sm text-[var(--cu-red)]">
              Could not load practice problems. Please refresh and try again.
            </div>
          ) : filtered.length === 0 ? (
            <div className="cu-surface rounded-lg p-8 text-center">
              <BookOpen className="h-8 w-8 text-[var(--cu-text-muted)] mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[var(--cu-text-muted)]">No problems found</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {visibleProblems.map((problem, i) => {
                const solved = solvedIds.has(problem.id);
                const attempted = attemptedIds.has(problem.id);
                const diff = DIFF_CONFIG[problem.difficulty as keyof typeof DIFF_CONFIG] || DIFF_CONFIG.beginner;
                return (
                  <motion.div
                    key={problem.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <div className="cu-surface rounded-lg hover:border-[var(--cu-border)] hover:bg-[var(--cu-bg-elevated)] transition-all flex items-center gap-3 group">
                      <Link href={`/practice/${problem.slug}`}>
                        <div className="p-4 cursor-pointer flex items-center gap-4 min-w-0 flex-1">
                        {/* Solved indicator */}
                        <div className="shrink-0">
                          {solved
                            ? <CheckCircle className="h-4 w-4 text-[var(--cu-green)]" />
                            : <Circle className="h-4 w-4 text-[var(--cu-text-muted)]" />
                          }
                        </div>

                        {/* Problem info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium text-[var(--cu-text-primary)] group-hover:text-[var(--cu-blue)] transition-colors">
                              {i + 1}. {problem.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{problem.category}</Badge>
                            <Badge variant={diff.color}>{diff.label}</Badge>
                            {attempted && !solved && <span className="text-[10px] text-[var(--cu-amber)]">Attempted</span>}
                          </div>
                        </div>

                        <ChevronRight className="h-4 w-4 text-[var(--cu-text-muted)] group-hover:text-[var(--cu-blue)] transition-colors shrink-0" />
                        </div>
                      </Link>
                      <button
                        type="button"
                        aria-label={bookmarks.includes(problem.id) ? "Remove bookmark" : "Bookmark problem"}
                        aria-pressed={bookmarks.includes(problem.id)}
                        onClick={() => toggleBookmark(problem.id)}
                        className="mr-3 rounded p-2 text-[var(--cu-text-muted)] hover:text-[var(--cu-amber)]"
                      >
                        <Bookmark className={`h-4 w-4 ${bookmarks.includes(problem.id) ? "fill-current text-[var(--cu-amber)]" : ""}`} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between text-xs text-[var(--cu-text-muted)]">
              <span>{filtered.length} problems · Page {page} of {pageCount}</span>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
                <Button size="sm" variant="secondary" disabled={page >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button>
              </div>
            </div>
          )}

          {recentAttempts.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--cu-text-secondary)]">Recently attempted</h2>
              <div className="flex flex-wrap gap-2">
                {recentAttempts.map((attempt) => {
                  const problem = problems.find((item) => item.id === attempt.problemId);
                  return problem ? (
                    <Link key={attempt.id} href={`/practice/${problem.slug}`}>
                      <span className="cursor-pointer rounded border border-[var(--cu-border)] px-3 py-1.5 text-xs text-[var(--cu-text-secondary)] hover:text-[var(--cu-blue)]">
                        {problem.title}
                      </span>
                    </Link>
                  ) : null;
                })}
              </div>
            </section>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
