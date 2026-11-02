import fs from "node:fs/promises";
import path from "node:path";

export const avatarDirectory = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"), "avatars");

function getLocalAvatarPath(url: string | null): string | undefined {
  if (!url?.startsWith("/uploads/avatars/")) return undefined;
  const filename = path.basename(url);
  if (!/^[a-f0-9-]+\.(jpg|png|webp)$/.test(filename)) return undefined;
  return path.join(avatarDirectory, filename);
}

export async function removeStoredAvatar(url: string | null): Promise<void> {
  const file = getLocalAvatarPath(url);
  if (!file) return;
  try {
    await fs.unlink(file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
