import { type Express, type Request, type RequestHandler, type Response } from "express";
import { authRouter } from "./routes/auth.js";
import { executionRouter } from "./routes/execution.js";
import { projectsRouter } from "./routes/projects.js";
import { filesRouter } from "./routes/files.js";
import { aiRouter } from "./routes/ai.js";
import { practiceRouter } from "./routes/practice.js";
import { preferencesRouter } from "./routes/preferences.js";
import { profileRouter } from "./routes/profile.js";
import { databasePool } from "./database.js";
import { log } from "./logger.js";

function createRateLimiter(max: number, windowMs: number): RequestHandler {
  const counts = new Map<string, { count: number; reset: number }>();
  return (req: Request, res: Response, next) => {
    const ip = req.ip || "unknown";
    const now = Date.now();
    const entry = counts.get(ip);
    if (!entry || now > entry.reset) {
      counts.set(ip, { count: 1, reset: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ error: "TooManyRequests", message: "Rate limit exceeded", statusCode: 429 });
    }
    entry.count++;
    return next();
  };
}

export function registerRoutes(app: Express) {
  const apiLimiter = createRateLimiter(200, 60_000);
  const executionLimiter = createRateLimiter(30, 60_000);
  const aiLimiter = createRateLimiter(20, 60_000);
  const authMutationLimiter = createRateLimiter(10, 15 * 60_000);

  app.use("/api", apiLimiter);
  app.use("/api/auth/login", authMutationLimiter);
  app.use("/api/auth/register", authMutationLimiter);
  app.use("/api/auth/password", authMutationLimiter);
  app.use("/api/auth/account", authMutationLimiter);

  app.use("/api/auth", authRouter);
  app.use("/api/execution", executionLimiter, executionRouter);
  app.use("/api/projects", projectsRouter);
  app.use("/api/files", filesRouter);
  app.use("/api/ai", aiLimiter, aiRouter);
  app.use("/api/practice", practiceRouter);
  app.use("/api/preferences", preferencesRouter);
  app.use("/api/profile", profileRouter);

  // Health check
  app.get("/api/health", async (_req, res) => {
    let databaseStatus: "not_configured" | "reachable" | "unavailable" = "not_configured";
    if (databasePool) {
      try {
        await databasePool.query("SELECT 1");
        databaseStatus = "reachable";
      } catch (error) {
        databaseStatus = "unavailable";
        log(`Database health check failed: ${error instanceof Error ? error.message : String(error)}`, "error");
      }
    }
    return res.status(databaseStatus === "unavailable" ? 503 : 200).json({
      status: databaseStatus === "unavailable" ? "degraded" : "ok",
      service: "CODE UNIVERSE",
      version: "2.0.0",
      database: databaseStatus,
      storageMode: databasePool ? "postgresql" : "in-memory",
      timestamp: new Date().toISOString(),
    });
  });
}
