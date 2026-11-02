import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function formatRelativeTime(date: Date | string): string {
  const diff = Date.now() - new Date(date).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    python: "#3776AB",
    javascript: "#F7DF1E",
    typescript: "#3178C6",
    r: "#276DC3",
    java: "#ED8B00",
    c: "#A8B9CC",
    cpp: "#00599C",
    html: "#E34F26",
    css: "#1572B6",
    sql: "#336791",
    json: "#8BC34A",
  };
  return colors[lang.toLowerCase()] || "#64748b";
}

export function getLanguageIcon(lang: string): string {
  const icons: Record<string, string> = {
    python: "🐍",
    javascript: "⚡",
    typescript: "🔷",
    r: "📊",
    java: "☕",
    c: "🔵",
    cpp: "🔷",
    html: "🌐",
    css: "🎨",
    sql: "🗄️",
    json: "📋",
  };
  return icons[lang.toLowerCase()] || "📄";
}

export function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const langMap: Record<string, string> = {
    py: "python",
    js: "javascript",
    ts: "typescript",
    r: "r",
    R: "r",
    tsx: "typescript",
    jsx: "javascript",
    java: "java",
    c: "c",
    cpp: "cpp",
    cc: "cpp",
    html: "html",
    htm: "html",
    css: "css",
    sql: "sql",
    json: "json",
    md: "markdown",
    txt: "text",
  };
  return langMap[ext] || "text";
}
