import { Router, type Request, type Response } from "express";
import { storage } from "../storage.js";
import { insertProjectSchema } from "../../shared/schema.js";
import { z } from "zod";

export const projectsRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Authentication required", statusCode: 401 });
    return null;
  }
  return userId;
}

// GET /api/projects
projectsRouter.get("/", async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  if (!userId) return res.json({ projects: [] }); // guest returns empty
  try {
    const projects = await storage.getProjectsByUser(userId);
    return res.json({ projects });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// POST /api/projects
projectsRouter.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const schema = insertProjectSchema.omit({ userId: true });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "ValidationError", message: parsed.error.message, statusCode: 400 });
    }
    const project = await storage.createProject({ ...parsed.data, userId });
    return res.status(201).json({ project });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// GET /api/projects/:id
projectsRouter.get("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId < 1) return res.status(400).json({ error: "ValidationError", message: "Invalid project ID.", statusCode: 400 });
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ error: "NotFound", message: "Project not found", statusCode: 404 });
    if (project.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    return res.json({ project });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// PATCH /api/projects/:id
projectsRouter.patch("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId < 1) return res.status(400).json({ error: "ValidationError", message: "Invalid project ID.", statusCode: 400 });
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ error: "NotFound", message: "Project not found", statusCode: 404 });
    if (project.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    const parsed = insertProjectSchema.pick({ name: true, description: true, language: true, isPublic: true }).partial().strict().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map((issue) => issue.message).join(", "), statusCode: 400 });
    const updated = await storage.updateProject(project.id, parsed.data);
    return res.json({ project: updated });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// DELETE /api/projects/:id
projectsRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const projectId = Number(req.params.id);
    if (!Number.isInteger(projectId) || projectId < 1) return res.status(400).json({ error: "ValidationError", message: "Invalid project ID.", statusCode: 400 });
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ error: "NotFound", message: "Project not found", statusCode: 404 });
    if (project.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    await storage.deleteProject(project.id);
    return res.json({ message: "Project deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});
