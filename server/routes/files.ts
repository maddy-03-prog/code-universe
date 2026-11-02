import { Router, type Request, type Response } from "express";
import { storage } from "../storage.js";
import { insertFileSchema } from "../../shared/schema.js";

export const filesRouter = Router();

function requireAuth(req: Request, res: Response): number | null {
  const userId = (req.session as any).userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Authentication required", statusCode: 401 });
    return null;
  }
  return userId;
}

// GET /api/files?projectId=X
filesRouter.get("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  const projectId = Number(req.query.projectId);
  if (!Number.isInteger(projectId) || projectId < 1) return res.status(400).json({ error: "ValidationError", message: "A valid projectId is required.", statusCode: 400 });
  try {
    const project = await storage.getProject(projectId);
    if (!project) return res.status(404).json({ error: "NotFound", message: "Project not found", statusCode: 404 });
    if (project.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    const files = await storage.getFilesByProject(projectId);
    return res.json({ files });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// POST /api/files
filesRouter.post("/", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const schema = insertFileSchema.omit({ userId: true });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "ValidationError", message: parsed.error.message, statusCode: 400 });
    }
    if (parsed.data.projectId !== undefined && parsed.data.projectId !== null) {
      const project = await storage.getProject(parsed.data.projectId);
      if (!project) return res.status(404).json({ error: "NotFound", message: "Project not found", statusCode: 404 });
      if (project.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    }
    const file = await storage.createFile({ ...parsed.data, userId });
    return res.status(201).json({ file });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// PATCH /api/files/:id
filesRouter.patch("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const file = await storage.getFile(parseInt(req.params.id));
    if (!file) return res.status(404).json({ error: "NotFound", message: "File not found", statusCode: 404 });
    if (file.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    const filePatchSchema = insertFileSchema.pick({ name: true, path: true, content: true, language: true, isFolder: true, parentId: true }).partial().strict();
    const parsed = filePatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "ValidationError", message: parsed.error.issues.map((issue) => issue.message).join(", "), statusCode: 400 });
    const updated = await storage.updateFile(file.id, parsed.data);
    return res.json({ file: updated });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});

// DELETE /api/files/:id
filesRouter.delete("/:id", async (req: Request, res: Response) => {
  const userId = requireAuth(req, res);
  if (!userId) return;
  try {
    const file = await storage.getFile(parseInt(req.params.id));
    if (!file) return res.status(404).json({ error: "NotFound", message: "File not found", statusCode: 404 });
    if (file.userId !== userId) return res.status(403).json({ error: "Forbidden", message: "Access denied", statusCode: 403 });
    await storage.deleteFile(file.id);
    return res.json({ message: "File deleted" });
  } catch (err: any) {
    return res.status(500).json({ error: "ServerError", message: err.message, statusCode: 500 });
  }
});
