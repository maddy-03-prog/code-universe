import "./env.js";
import express, { type Request, type Response, type NextFunction } from "express";
import { createServer } from "node:http";
import fs from "node:fs/promises";
import session from "express-session";
import MemoryStore from "memorystore";
import connectPgSimple from "connect-pg-simple";
import path from "path";
import { registerRoutes } from "./routes.js";
import { log } from "./logger.js";
import { avatarDirectory } from "./services/avatarStorage.js";
import { databasePool } from "./database.js";

const __dirname = path.dirname(process.argv[1] || process.cwd());
const sessionSecret = process.env.SESSION_SECRET;

if (process.env.NODE_ENV === "production" && !sessionSecret) {
  throw new Error("SESSION_SECRET must be configured in production.");
}

const app = express();
const MemStore = MemoryStore(session);
const PgSessionStore = connectPgSimple(session);

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));
app.use("/uploads/avatars", express.static(avatarDirectory, {
  fallthrough: false,
  index: false,
  maxAge: "1d",
  immutable: false,
}));

app.use(
  session({
    secret: sessionSecret || "local-development-session-secret",
    resave: false,
    saveUninitialized: false,
    store: databasePool
      ? new PgSessionStore({ pool: databasePool, createTableIfMissing: true })
      : new MemStore({ checkPeriod: 86400000 }),
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  })
);

// ─── Request logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  const start = Date.now();
  _res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${_res.statusCode} — ${duration}ms`);
    }
  });
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
registerRoutes(app);

async function startServer() {
  const httpServer = createServer(app);

  if (process.env.NODE_ENV === "production") {
    const distPath = path.resolve(__dirname, "public");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      configFile: path.resolve(__dirname, "..", "vite.config.ts"),
      appType: "custom",
      server: { middlewareMode: true, hmr: { server: httpServer } },
    });
    app.use(vite.middlewares);
    app.get("*", async (req, res, next) => {
      try {
        const indexHtml = await fs.readFile(path.resolve(__dirname, "..", "client", "index.html"), "utf-8");
        res.status(200).set({ "Content-Type": "text/html" }).end(await vite.transformIndexHtml(req.originalUrl, indexHtml));
      } catch (error) {
        if (error instanceof Error) vite.ssrFixStacktrace(error);
        next(error);
      }
    });
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const statusCode = err.statusCode || err.status || 500;
    const message = err.message || "Internal server error";
    log(`Error: ${message}`, "error");
    res.status(statusCode).json({ error: "ServerError", message, statusCode });
  });

  const PORT = parseInt(process.env.PORT || "3001", 10);
  httpServer.listen(PORT, "0.0.0.0", () => {
    log(`CODE UNIVERSE server running on port ${PORT}`);
  });
}

startServer().catch((error: unknown) => {
  log(`Failed to start CODE UNIVERSE server: ${error instanceof Error ? error.message : String(error)}`, "error");
  process.exitCode = 1;
});

export default app;
