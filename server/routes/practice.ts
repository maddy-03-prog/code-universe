import { Router, type Request, type Response } from "express";
import { storage } from "../storage.js";
import { executeCode } from "../services/execution.js";
import type { SupportedLanguage } from "../../shared/types.js";
import { z } from "zod";

export const practiceRouter = Router();

function withoutHiddenTests<T extends { testCases: unknown }>(problem: T): T {
  const testCases = Array.isArray(problem.testCases)
    ? problem.testCases.filter((testCase) => (
      typeof testCase === "object"
      && testCase !== null
      && "hidden" in testCase
      && testCase.hidden === false
    ))
    : [];
  return { ...problem, testCases };
}

// GET /api/practice/problems
practiceRouter.get("/problems", async (req: Request, res: Response) => {
  try {
    const { difficulty, category } = req.query;
    const problems = await storage.getProblems({
      difficulty: difficulty as string,
      category: category as string,
    });
    return res.json({ problems: problems.map(withoutHiddenTests) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// GET /api/practice/problems/:slug
practiceRouter.get("/problems/:slug", async (req: Request, res: Response) => {
  try {
    const problem = await storage.getProblemBySlug(req.params.slug);
    if (!problem) return res.status(404).json({ error: "NotFound", message: "Problem not found", statusCode: 404 });
    return res.json({ problem: withoutHiddenTests(problem) });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

const submitSchema = z.object({
  problemId: z.number().int().positive(),
  language: z.enum(["python", "javascript", "java", "c", "cpp", "typescript"]),
  code: z.string().min(1).max(100_000),
});

// POST /api/practice/submit
practiceRouter.post("/submit", async (req: Request, res: Response) => {
  try {
    const parsed = submitSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "ValidationError", message: parsed.error.message, statusCode: 400 });
    }
    const { problemId, language, code } = parsed.data;
    const userId = (req.session as any).userId;

    const problem = await storage.getProblemById(problemId);
    if (!problem) return res.status(404).json({ error: "NotFound", message: "Problem not found", statusCode: 404 });

    const testCases = problem.testCases as Array<{ input: string; expected: string; hidden: boolean }>;
    if (testCases.length === 0) {
      return res.status(500).json({ error: "JudgeConfigurationError", message: "This problem has no test cases configured.", statusCode: 500 });
    }

    let passed = 0;
    let executionTime = 0;
    let verdict: string | null = null;
    let executionError: string | undefined;

    const testResults: Array<{ passed: boolean; input: string; expected: string; actual: string; hidden: boolean }> = [];

    for (const tc of testCases) {
      const result = await executeCode(language as SupportedLanguage, code, tc.input);
      executionTime += result.executionTime;
      if (result.status !== "success") {
        if (!tc.hidden || result.status === "configuration_error" || result.status === "service_error") {
          executionError = result.stderr;
        }
        verdict = result.status === "compile_error"
          ? "compilation_error"
          : result.status === "timeout"
            ? "time_limit_exceeded"
            : result.status === "memory_limit"
              ? "memory_limit_exceeded"
              : result.status === "configuration_error" || result.status === "service_error"
                ? "internal_error"
                : "runtime_error";
        testResults.push({
          passed: false,
          input: tc.hidden ? "[hidden]" : tc.input,
          expected: tc.hidden ? "[hidden]" : tc.expected,
          actual: tc.hidden ? "[hidden]" : result.stderr,
          hidden: tc.hidden,
        });
        break;
      }

      const actual = result.stdout.replace(/\r\n/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
      const expected = tc.expected.replace(/\r\n/g, "\n").split("\n").map((line) => line.trimEnd()).join("\n").trim();
      const isPassed = actual === expected;
      if (isPassed) passed++;
      testResults.push({
        passed: isPassed,
        input: tc.hidden ? "[hidden]" : tc.input,
        expected: tc.hidden ? "[hidden]" : tc.expected,
        actual: tc.hidden ? (isPassed ? "✓ Passed" : "✗ Failed") : actual,
        hidden: tc.hidden,
      });
    }

    const status = verdict || (passed === testCases.length ? "accepted" : "wrong_answer");

    // Save submission if logged in
    if (userId) {
      await storage.createSubmission({
        userId,
        problemId,
        language,
        code,
        status,
        testsPassed: passed,
        testsTotal: testCases.length,
        executionTime,
      });
    }

    return res.json({
      status,
      testsPassed: passed,
      testsTotal: testCases.length,
      executionTime,
      testResults,
      ...(executionError ? { errorMessage: executionError } : {}),
    });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// GET /api/practice/submissions
practiceRouter.get("/submissions", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.json({ submissions: [] });
  try {
    const submissions = await storage.getUserSubmissions(userId);
    return res.json({ submissions });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});
