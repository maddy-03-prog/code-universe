import { Router, type Request, type Response } from "express";
import { checkExecutionService, executeCode } from "../services/execution.js";
import { z } from "zod";

export const executionRouter = Router();

executionRouter.get("/health", async (_req: Request, res: Response) => {
  const health = await checkExecutionService();
  return res.status(health.reachable ? 200 : 503).json(health);
});

const executionSchema = z.object({
  language: z.enum(["python", "c", "cpp", "java", "javascript", "typescript", "r", "html", "css", "sql", "json"]),
  code: z.string().max(100_000),
  stdin: z.string().max(10_000).optional().default(""),
});

// POST /api/execution/run
executionRouter.post("/run", async (req: Request, res: Response) => {
  try {
    const parsed = executionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "ValidationError",
        message: parsed.error.errors.map((e) => e.message).join(", "),
        statusCode: 400,
      });
    }
    const { language, code, stdin } = parsed.data;
    const result = await executeCode(language, code, stdin);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: "ExecutionError", message: err.message, statusCode: 500 });
  }
});
