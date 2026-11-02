import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { SupportedLanguage } from "../../shared/types.js";
import { AIServiceError, checkAIService, requestAI } from "../services/ai.js";

export const aiRouter = Router();

const languages: [SupportedLanguage, ...SupportedLanguage[]] = [
  "python", "c", "cpp", "java", "javascript", "typescript", "r", "html", "css", "sql", "json",
];
const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(4_000),
});
const aiSchema = z.object({
  action: z.enum(["explain", "debug", "optimize", "generate", "convert", "document", "suggest", "error", "ask"]),
  code: z.string().max(50_000),
  language: z.enum(languages),
  context: z.string().max(10_000).optional(),
  targetLanguage: z.enum(languages).optional(),
  messages: z.array(messageSchema).max(8).optional(),
}).strict();

aiRouter.get("/health", async (_req: Request, res: Response) => {
  const health = await checkAIService();
  return res.json(health);
});

aiRouter.post("/assist", async (req: Request, res: Response) => {
  const parsed = aiSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: "ValidationError",
      message: parsed.error.issues.map((issue) => issue.message).join(", "),
      statusCode: 400,
    });
  }

  try {
    const response = await requestAI(parsed.data);
    return res.json(response);
  } catch (error) {
    if (error instanceof AIServiceError) {
      return res.status(error.statusCode).json({
        error: error.error,
        message: error.message,
        statusCode: error.statusCode,
      });
    }
    return res.status(500).json({
      error: "AIError",
      message: "The local AI request failed unexpectedly.",
      statusCode: 500,
    });
  }
});
