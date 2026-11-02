import { useEffect, useState, Suspense, lazy } from "react";
import { useParams } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertCircle, ArrowLeft, Loader2, Play, Send } from "lucide-react";
import { Link } from "wouter";
import type { PracticeProblem } from "../../../shared/schema";
import type { SupportedLanguage } from "../../../shared/types";
import { apiClient } from "@/lib/api";
import { LANGUAGE_DISPLAY, LANGUAGE_TEMPLATES } from "@/lib/languages";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const MonacoEditor = lazy(() => import("@/components/editor/MonacoEditor"));

type TestResult = {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  hidden: boolean;
};

type SubmissionResult = {
  status: string;
  testsPassed: number;
  testsTotal: number;
  executionTime: number;
  testResults: TestResult[];
  errorMessage?: string;
};

function getStarterCode(problem: PracticeProblem | undefined, language: SupportedLanguage): string {
  if (problem?.starterCode && typeof problem.starterCode === "object") {
    const starter = Object.entries(problem.starterCode).find(([key]) => key === language)?.[1];
    if (typeof starter === "string" && starter.length > 0) return starter;
  }
  return LANGUAGE_TEMPLATES[language];
}

export default function ProblemDetail() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [language, setLanguage] = useState<SupportedLanguage>("python");
  const [code, setCode] = useState("");
  const [stdin, setStdin] = useState("");
  const [runOutput, setRunOutput] = useState<{ stdout: string; stderr: string; status: string } | null>(null);
  const [submission, setSubmission] = useState<SubmissionResult | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ["/api/practice/problems", slug],
    queryFn: () => apiClient.get<{ problem: PracticeProblem }>(`/api/practice/problems/${encodeURIComponent(slug)}`),
    enabled: Boolean(slug),
  });
  const problem = data?.problem;

  useEffect(() => {
    setCode(getStarterCode(problem, language));
    setSubmission(null);
    setRunOutput(null);
  }, [problem, language]);

  const runMutation = useMutation({
    mutationFn: () => apiClient.post<{ stdout: string; stderr: string; status: string }>("/api/execution/run", {
      language,
      code,
      stdin,
    }),
    onMutate: () => setRunOutput(null),
    onSuccess: setRunOutput,
  });

  const submitMutation = useMutation({
    mutationFn: () => apiClient.post<SubmissionResult>("/api/practice/submit", {
      problemId: problem?.id,
      language,
      code,
    }),
    onMutate: () => setSubmission(null),
    onSuccess: setSubmission,
  });

  const testCases = Array.isArray(problem?.testCases) ? problem.testCases : [];

  return (
    <AppLayout title="Practice problem">
      <div className="h-full overflow-y-auto">
        <div className="max-w-7xl mx-auto min-h-full flex flex-col px-5 py-4 gap-3">
          <Link href="/practice">
            <span className="inline-flex items-center gap-2 text-xs text-[var(--cu-text-muted)] hover:text-[var(--cu-text-primary)]">
              <ArrowLeft className="h-3.5 w-3.5" /> All problems
            </span>
          </Link>

          {isLoading ? (
            <div className="h-36 cu-surface rounded-lg animate-pulse" />
          ) : error || !problem ? (
            <div role="alert" className="cu-surface rounded-lg p-6 text-sm text-[var(--cu-red)]">
              <AlertCircle className="inline h-4 w-4 mr-2" />
              {error instanceof Error ? error.message : "Problem not found."}
            </div>
          ) : (
            <div className="grid flex-1 min-h-0 grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="min-h-0 max-lg:max-h-[40vh] overflow-y-auto">
              <section className="cu-surface rounded-lg p-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-semibold text-[var(--cu-text-primary)]">{problem.title}</h1>
                  <Badge variant={problem.difficulty === "beginner" ? "success" : problem.difficulty === "intermediate" ? "warning" : "danger"}>
                    {problem.difficulty}
                  </Badge>
                  <Badge variant="secondary">{problem.category}</Badge>
                </div>
                <p className="text-sm leading-6 text-[var(--cu-text-secondary)] whitespace-pre-wrap">{problem.description}</p>
                <div className="grid gap-3 text-xs sm:grid-cols-2">
                  <div className="rounded-md bg-[var(--cu-bg-elevated)] p-3">
                    <h2 className="font-semibold text-[var(--cu-text-primary)]">Input format</h2>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--cu-text-secondary)]">{problem.inputFormat || "Input is provided on standard input."}</p>
                  </div>
                  <div className="rounded-md bg-[var(--cu-bg-elevated)] p-3">
                    <h2 className="font-semibold text-[var(--cu-text-primary)]">Output format</h2>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--cu-text-secondary)]">{problem.outputFormat || "Print the result to standard output."}</p>
                  </div>
                  <div className="rounded-md bg-[var(--cu-bg-elevated)] p-3 sm:col-span-2">
                    <h2 className="font-semibold text-[var(--cu-text-primary)]">Constraints</h2>
                    <p className="mt-1 whitespace-pre-wrap text-[var(--cu-text-secondary)]">{problem.constraints || "See the problem description."}</p>
                  </div>
                </div>
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--cu-text-muted)]">Examples</h2>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {(problem.examples?.length
                      ? problem.examples
                      : testCases.filter((testCase) => !testCase.hidden).map((testCase) => ({
                        input: testCase.input,
                        output: testCase.expected,
                        explanation: "",
                      }))
                    ).map((example, index) => (
                      <div key={index} className="rounded-md bg-[var(--cu-bg-elevated)] p-3 font-mono text-xs">
                        <p className="text-[var(--cu-text-muted)]">Input</p>
                        <pre className="mt-1 whitespace-pre-wrap text-[var(--cu-text-primary)]">{example.input || "(empty)"}</pre>
                        <p className="mt-2 text-[var(--cu-text-muted)]">Output</p>
                        <pre className="mt-1 whitespace-pre-wrap text-[var(--cu-green)]">{example.output}</pre>
                        {example.explanation && (
                          <p className="mt-2 font-sans text-[var(--cu-text-secondary)]">{example.explanation}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                {Array.isArray(problem.hints) && problem.hints.length > 0 && (
                  <div>
                    <h2 className="text-xs font-semibold uppercase tracking-wide text-[var(--cu-text-muted)]">Hints</h2>
                    <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-[var(--cu-text-secondary)]">
                      {(problem.hints as string[]).map((hint, index) => <li key={index}>{hint}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-[10px] text-[var(--cu-text-muted)]">
                  Supported languages: {(problem.supportedLanguages || ["python", "c", "cpp", "java", "javascript", "typescript"]).join(", ")}
                </p>
              </section>
              </div>

              <section className="cu-surface rounded-lg overflow-hidden flex min-h-0 flex-col">
                <div className="flex flex-wrap items-center gap-2 border-b border-[var(--cu-border)] px-3 py-2">
                  <Select value={language} onValueChange={(value) => setLanguage(value as SupportedLanguage)}>
                    <SelectTrigger className="h-8 w-40 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["python", "javascript", "typescript", "java", "c", "cpp"] as SupportedLanguage[]).map((item) => (
                        <SelectItem key={item} value={item}>{LANGUAGE_DISPLAY[item].label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="ml-auto flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={runMutation.isPending || !code.trim()}
                      onClick={() => runMutation.mutate()}
                    >
                      {runMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                      Run with input
                    </Button>
                    <Button
                      size="sm"
                      disabled={submitMutation.isPending || !code.trim()}
                      onClick={() => submitMutation.mutate()}
                    >
                      {submitMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Submit
                    </Button>
                  </div>
                </div>

                <div className="flex-1 min-h-[260px]">
                  <Suspense fallback={<div className="h-full flex items-center justify-center text-xs text-[var(--cu-text-muted)]">Loading editor...</div>}>
                    <MonacoEditor
                      value={code}
                      language={LANGUAGE_DISPLAY[language].monacoLang}
                      onChange={(value) => setCode(value || "")}
                      minimap={false}
                    />
                  </Suspense>
                </div>

                <div className="border-t border-[var(--cu-border)] p-3 space-y-3">
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-xs text-[var(--cu-text-muted)]">Custom standard input</label>
                      <Textarea
                        value={stdin}
                        onChange={(event) => setStdin(event.target.value)}
                        className="min-h-20 font-mono text-xs"
                        placeholder="Input passed to your program"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <p className="text-xs text-[var(--cu-text-muted)]">Run output</p>
                      <pre className="min-h-20 max-h-36 overflow-auto rounded-md bg-[var(--cu-bg-elevated)] p-3 text-xs font-mono text-[var(--cu-text-primary)] whitespace-pre-wrap">
                        {runMutation.error instanceof Error
                          ? runMutation.error.message
                          : runOutput
                            ? [runOutput.stdout, runOutput.stderr].filter(Boolean).join("\n") || `Finished: ${runOutput.status}`
                            : "Run your code with the custom input."}
                      </pre>
                    </div>
                  </div>

                  {(submitMutation.error || submission) && (
                    <div role="status" className="space-y-2">
                      {submitMutation.error instanceof Error ? (
                        <p className="text-sm text-[var(--cu-red)]">{submitMutation.error.message}</p>
                      ) : submission ? (
                        <>
                          <p className={cn(
                            "text-sm font-semibold capitalize",
                            submission.status === "accepted" ? "text-[var(--cu-green)]" : "text-[var(--cu-amber)]"
                          )}>
                            {(submission.status === "internal_error" ? "execution service unavailable" : submission.status.replace(/_/g, " "))} · {submission.testsPassed}/{submission.testsTotal} tests passed · {submission.executionTime} ms
                          </p>
                          {submission.errorMessage && <p className="text-xs text-[var(--cu-red)]">{submission.errorMessage}</p>}
                          <div className="flex flex-wrap gap-2">
                            {submission.testResults.map((result, index) => (
                              <span key={index} className={cn(
                                "rounded border px-2 py-1 text-[10px]",
                                result.passed
                                  ? "border-[var(--cu-green)]/30 text-[var(--cu-green)]"
                                  : "border-[var(--cu-red)]/30 text-[var(--cu-red)]"
                              )}>
                                Test {index + 1}: {result.hidden ? (result.passed ? "Passed" : "Failed") : (result.passed ? "Passed" : "Failed")}
                              </span>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
