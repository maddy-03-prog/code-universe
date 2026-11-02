import { Router, type Request, type Response } from "express";
import express from "express";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { storage } from "../storage.js";
import { log } from "../logger.js";
import { avatarDirectory, removeStoredAvatar } from "../services/avatarStorage.js";

export const profileRouter = Router();
const profileSchema = z.object({
  fullName: z.string().trim().max(100).nullable().optional(),
  displayName: z.string().trim().min(1).max(64).nullable().optional(),
  username: z.string().trim().min(3).max(32).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  bio: z.string().trim().max(500).nullable().optional(),
  location: z.string().trim().max(100).nullable().optional(),
  websiteUrl: z.string().url().max(2048).nullable().or(z.literal("")).optional(),
  githubUrl: z.string().url().max(2048).nullable().or(z.literal("")).optional(),
  linkedInUrl: z.string().url().max(2048).nullable().or(z.literal("")).optional(),
  preferredLanguage: z.enum(["python", "c", "cpp", "java", "javascript", "typescript", "r", "html", "css", "sql", "json"]).optional(),
  programmingInterests: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  email: z.string().email().optional(),
}).strict();

const imageContentTypes = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const MAX_AVATAR_BYTES = 3 * 1024 * 1024;

function getUserId(req: Request): number | undefined {
  const userId = (req.session as typeof req.session & { userId?: number }).userId;
  return Number.isInteger(userId) ? userId : undefined;
}

function safeUser(user: NonNullable<Awaited<ReturnType<typeof storage.getUserById>>>) {
  const { password: _password, ...profile } = user;
  return profile;
}

function imageMatchesType(buffer: Buffer, contentType: string): boolean {
  if (contentType === "image/jpeg") return buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  if (contentType === "image/png") return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  if (contentType === "image/webp") return buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP";
  return false;
}

profileRouter.get("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to view your profile.", statusCode: 401 });
  try {
    const user = await storage.getUserById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Your session is no longer valid.", statusCode: 401 });
    const [projects, submissions, preferences] = await Promise.all([
      storage.getProjectsByUser(userId),
      storage.getUserSubmissions(userId),
      storage.getUserPreferences(userId),
    ]);
    const solvedCount = new Set(submissions.filter((submission) => submission.status === "accepted").map((submission) => submission.problemId)).size;
    return res.json({
      profile: safeUser(user),
      stats: {
        projectsCreated: projects.length,
        problemsSolved: solvedCount,
        submissionCount: submissions.length,
      },
      recentSubmissions: submissions.slice(0, 8).map(({ id, problemId, language, status, testsPassed, testsTotal, createdAt }) => ({
        id, problemId, language, status, testsPassed, testsTotal, createdAt,
      })),
      preferences: preferences || null,
    });
  } catch (error) {
    log(`Profile load failed for authenticated user: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to load your profile.", statusCode: 500 });
  }
});

profileRouter.get("/public/:username", async (req: Request, res: Response) => {
  try {
    const user = await storage.getUserByUsername(req.params.username);
    if (!user) return res.status(404).json({ error: "NotFound", message: "Profile not found.", statusCode: 404 });
    const preferences = await storage.getUserPreferences(user.id);
    if (preferences?.profileVisibility === "private") {
      return res.status(404).json({ error: "NotFound", message: "Profile not found.", statusCode: 404 });
    }
    const [projects, submissions] = await Promise.all([
      storage.getProjectsByUser(user.id),
      storage.getUserSubmissions(user.id),
    ]);
    return res.json({
      profile: {
        username: user.username,
        fullName: user.fullName,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        bio: user.bio,
        location: user.location,
        websiteUrl: user.websiteUrl,
        githubUrl: user.githubUrl,
        linkedInUrl: user.linkedInUrl,
        preferredLanguage: user.preferredLanguage,
        programmingInterests: user.programmingInterests,
        createdAt: user.createdAt,
      },
      stats: {
        projectsCreated: projects.length,
        problemsSolved: new Set(submissions.filter((submission) => submission.status === "accepted").map((submission) => submission.problemId)).size,
        submissionCount: submissions.length,
      },
    });
  } catch (error) {
    log(`Public profile load failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to load this profile.", statusCode: 500 });
  }
});

profileRouter.patch("/", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to edit your profile.", statusCode: 401 });
  const parsed = profileSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map((issue) => issue.message).join(", "), statusCode: 400 });
  try {
    const currentUser = await storage.getUserById(userId);
    if (!currentUser) return res.status(401).json({ error: "Unauthorized", message: "Your session is no longer valid.", statusCode: 401 });
    if (parsed.data.email && parsed.data.email.toLowerCase() !== currentUser.email.toLowerCase()) {
      return res.status(400).json({ error: "VerificationRequired", message: "Changing your email requires email verification, which is not configured yet.", statusCode: 400 });
    }
    if (parsed.data.username && parsed.data.username !== currentUser.username) {
      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing && existing.id !== userId) return res.status(409).json({ error: "Conflict", message: "That username is already in use.", statusCode: 409 });
    }
    const changes = { ...parsed.data };
    delete changes.email;
    const updated = await storage.updateUser(userId, changes);
    if (!updated) return res.status(404).json({ error: "NotFound", message: "Profile not found.", statusCode: 404 });
    return res.json({ profile: safeUser(updated) });
  } catch (error) {
    log(`Profile update failed for authenticated user: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to save profile changes.", statusCode: 500 });
  }
});

profileRouter.put(
  "/avatar",
  express.raw({ type: [...imageContentTypes.keys()], limit: MAX_AVATAR_BYTES }),
  async (req: Request, res: Response) => {
    const userId = getUserId(req);
    if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to upload a profile photo.", statusCode: 401 });
    const contentType = req.get("content-type")?.split(";")[0].trim().toLowerCase() || "";
    const extension = imageContentTypes.get(contentType);
    const image = Buffer.isBuffer(req.body) ? req.body : undefined;
    if (!extension || !image?.length || image.length > MAX_AVATAR_BYTES || !imageMatchesType(image, contentType)) {
      return res.status(400).json({ error: "ValidationError", message: "Upload a valid JPG, PNG, or WebP image smaller than 3 MB.", statusCode: 400 });
    }
    try {
      const user = await storage.getUserById(userId);
      if (!user) return res.status(401).json({ error: "Unauthorized", message: "Your session is no longer valid.", statusCode: 401 });
      await fs.mkdir(avatarDirectory, { recursive: true });
      const filename = `${crypto.randomUUID()}${extension}`;
      await fs.writeFile(path.join(avatarDirectory, filename), image, { flag: "wx" });
      const avatarUrl = `/uploads/avatars/${filename}`;
      const updated = await storage.updateUser(userId, { avatarUrl });
      if (!updated) {
        await fs.unlink(path.join(avatarDirectory, filename));
        return res.status(404).json({ error: "NotFound", message: "Profile not found.", statusCode: 404 });
      }
      try {
        await removeStoredAvatar(user.avatarUrl);
      } catch (cleanupError) {
        log(`Could not clean up the previous profile photo: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`, "warn");
      }
      return res.json({ avatarUrl });
    } catch (error) {
      log(`Profile photo upload failed for authenticated user: ${error instanceof Error ? error.message : String(error)}`, "error");
      return res.status(500).json({ error: "ServerError", message: "Unable to save the profile photo.", statusCode: 500 });
    }
  }
);

profileRouter.delete("/avatar", async (req: Request, res: Response) => {
  const userId = getUserId(req);
  if (!userId) return res.status(401).json({ error: "Unauthorized", message: "Sign in to remove your profile photo.", statusCode: 401 });
  try {
    const user = await storage.getUserById(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized", message: "Your session is no longer valid.", statusCode: 401 });
    await storage.updateUser(userId, { avatarUrl: null });
    try {
      await removeStoredAvatar(user.avatarUrl);
    } catch (cleanupError) {
      log(`Could not clean up the removed profile photo: ${cleanupError instanceof Error ? cleanupError.message : String(cleanupError)}`, "warn");
    }
    return res.json({ avatarUrl: null });
  } catch (error) {
    log(`Profile photo removal failed for authenticated user: ${error instanceof Error ? error.message : String(error)}`, "error");
    return res.status(500).json({ error: "ServerError", message: "Unable to remove the profile photo.", statusCode: 500 });
  }
});
