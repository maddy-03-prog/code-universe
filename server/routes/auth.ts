import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { storage } from "../storage.js";
import { insertUserSchema } from "../../shared/schema.js";
import { z } from "zod";
import { removeStoredAvatar } from "../services/avatarStorage.js";
import { log } from "../logger.js";

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1).max(128),
});

const registerSchema = insertUserSchema.pick({ username: true, email: true, password: true })
  .extend({ password: z.string().min(8).max(128) });
const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128),
}).strict();

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object"
    && error !== null
    && "code" in error
    && error.code === "23505";
}

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash || !/^[a-f0-9]{128}$/i.test(hash)) return false;
  const testHash = crypto.scryptSync(password, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(testHash, "hex"));
}

// POST /api/auth/register
authRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "ValidationError", message: parsed.error.message, statusCode: 400 });
    }
    const { username, email, password } = parsed.data;

    const existing = await storage.getUserByUsername(username);
    if (existing) return res.status(409).json({ error: "Conflict", message: "Username already taken", statusCode: 409 });

    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) return res.status(409).json({ error: "Conflict", message: "Email already registered", statusCode: 409 });

    const hashedPassword = hashPassword(password);
    const user = await storage.createUser({ username, email, password: hashedPassword, displayName: username });

    (req.session as any).userId = user.id;
    const { password: _, ...safeUser } = user;
    return res.status(201).json({ user: safeUser });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return res.status(409).json({ error: "Conflict", message: "Username or email already registered.", statusCode: 409 });
    }
    log(`Registration failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Account registration is temporarily unavailable.", statusCode: 500 });
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "ValidationError", message: "Invalid credentials", statusCode: 400 });
    }
    const { username, password } = parsed.data;

    const user = await storage.getUserByUsername(username);
    if (!user || !verifyPassword(password, user.password)) {
      return res.status(401).json({ error: "Unauthorized", message: "Invalid username or password", statusCode: 401 });
    }

    (req.session as any).userId = user.id;
    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (error) {
    log(`Login failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Sign-in is temporarily unavailable.", statusCode: 500 });
  }
});

// POST /api/auth/logout
authRouter.post("/logout", (req: Request, res: Response) => {
  req.session.destroy((error) => {
    if (error) {
      log(`Logout session cleanup failed: ${error.message}`, "error");
      return res.status(500).json({ error: "SessionError", message: "Unable to sign out safely. Please try again.", statusCode: 500 });
    }
    res.clearCookie("connect.sid");
    return res.json({ message: "Logged out successfully" });
  });
});

// GET /api/auth/me
authRouter.get("/me", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.json({ user: null });
  try {
    const user = await storage.getUserById(userId);
    if (!user) return res.json({ user: null });
    const { password: _, ...safeUser } = user;
    return res.json({ user: safeUser });
  } catch (error) {
    log(`Authentication status lookup failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to verify the current session.", statusCode: 500 });
  }
});

authRouter.get("/export", async (req: Request, res: Response) => {
  const userId = (req.session as typeof req.session & { userId?: number }).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to export your data.", statusCode: 401 });
  try {
    const user = await storage.getUserById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Your session is no longer valid.", statusCode: 401 });
    const projects = await storage.getProjectsByUser(userId);
    const [filesByProject, submissions, preferences] = await Promise.all([
      Promise.all(projects.map((project) => storage.getFilesByProject(project.id))),
      storage.getUserSubmissions(userId),
      storage.getUserPreferences(userId),
    ]);
    const { password: _password, ...profile } = user;
    res.setHeader("Content-Disposition", `attachment; filename="code-universe-account-${userId}.json"`);
    return res.json({
      exportedAt: new Date().toISOString(),
      profile,
      preferences: preferences || null,
      projects: projects.map((project, index) => ({ ...project, files: filesByProject[index] })),
      submissions,
    });
  } catch (error) {
    log(`Account export failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to export account data.", statusCode: 500 });
  }
});

authRouter.patch("/password", async (req: Request, res: Response) => {
  const userId = (req.session as typeof req.session & { userId?: number }).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to change your password.", statusCode: 401 });
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map((issue) => issue.message).join(", "), statusCode: 400 });
  try {
    const user = await storage.getUserById(userId);
    if (!user || !verifyPassword(parsed.data.currentPassword, user.password)) {
      return res.status(400).json({ error: "InvalidCredentials", message: "The current password is incorrect.", statusCode: 400 });
    }
    await storage.updateUser(userId, { password: hashPassword(parsed.data.newPassword) });
    return res.json({ message: "Password changed successfully." });
  } catch (error) {
    log(`Password update failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to change your password.", statusCode: 500 });
  }
});

authRouter.delete("/account", async (req: Request, res: Response) => {
  const userId = (req.session as typeof req.session & { userId?: number }).userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to delete your account.", statusCode: 401 });
  const password = z.string().min(1).safeParse(req.body?.password);
  if (!password.success) return res.status(400).json({ error: "ValidationError", message: "Current password is required.", statusCode: 400 });
  try {
    const user = await storage.getUserById(userId);
    if (!user || !verifyPassword(password.data, user.password)) {
      return res.status(400).json({ error: "InvalidCredentials", message: "The current password is incorrect.", statusCode: 400 });
    }
    await storage.deleteUser(userId);
    try {
      await removeStoredAvatar(user.avatarUrl);
    } catch (cleanupError) {
      log(`Could not clean up an account profile photo after deletion: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`, "warn");
    }
    req.session.destroy((error) => {
      if (error) return res.status(500).json({ error: "SessionError", message: "Account deleted, but the session could not be cleared. Sign out manually.", statusCode: 500 });
      res.clearCookie("connect.sid");
      return res.json({ message: "Account deleted." });
    });
  } catch (error) {
    log(`Account deletion failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to delete your account.", statusCode: 500 });
  }
});
