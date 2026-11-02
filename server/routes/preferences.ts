import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { storage } from "../storage.js";

export const preferencesRouter = Router();

const notificationSchema = z.object({
  codingActivity: z.boolean(),
  submissionResults: z.boolean(),
  productUpdates: z.boolean(),
  security: z.boolean(),
}).partial();
const defaultNotifications = {
  codingActivity: true,
  submissionResults: true,
  productUpdates: false,
  security: true,
};

const preferencesPatchSchema = z.object({
  theme: z.enum(["dark", "light", "system"]),
  accentColor: z.enum(["blue", "violet", "green", "cyan", "orange"]),
  editorTheme: z.enum(["cu-dark", "vs-dark", "vs", "hc-black"]),
  fontSize: z.number().int().min(10).max(32),
  fontFamily: z.enum(["JetBrains Mono", "Fira Code", "Cascadia Code", "Consolas"]),
  tabSize: z.number().int().min(2).max(8),
  wordWrap: z.boolean(),
  minimap: z.boolean(),
  lineNumbers: z.boolean(),
  autoSave: z.boolean(),
  defaultLanguage: z.enum(["python", "c", "cpp", "java", "javascript", "typescript", "r", "html", "css", "sql", "json"]),
  profileVisibility: z.enum(["public", "private"]),
  notifications: notificationSchema,
}).partial().strict();

function getUserId(req: Request): number | undefined {
  const userId = (req.session as typeof req.session & { userId?: number }).userId;
  return Number.isInteger(userId) ? userId : undefined;
}

// GET /api/preferences
preferencesRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.json({ preferences: null });
  try {
    const prefs = await storage.getUserPreferences(userId);
    return res.json({ preferences: prefs || null });
  } catch (error) {
    return res.status(500).json({ error: "ServerError", message: error instanceof Error ? error.message : "Unable to load preferences.", statusCode: 500 });
  }
});

// PATCH /api/preferences
preferencesRouter.patch("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to save preferences.", statusCode: 401 });
  const parsed = preferencesPatchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map((issue) => issue.message).join(", "), statusCode: 400 });
  }
  try {
    const current = await storage.getUserPreferences(userId);
    const data = {
      ...parsed.data,
      notifications: parsed.data.notifications
        ? { ...defaultNotifications, ...current?.notifications, ...parsed.data.notifications }
        : current?.notifications,
    };
    const preferences = await storage.upsertUserPreferences(userId, data);
    return res.json({ preferences });
  } catch (error) {
    return res.status(500).json({ error: "ServerError", message: error instanceof Error ? error.message : "Unable to save preferences.", statusCode: 500 });
  }
});
