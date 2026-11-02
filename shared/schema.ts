import { pgTable, text, integer, boolean, timestamp, jsonb, serial, index } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// ─── Users ───────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  displayName: text("display_name"),
  avatarUrl: text("avatar_url"),
  fullName: text("full_name"),
  bio: text("bio"),
  location: text("location"),
  websiteUrl: text("website_url"),
  githubUrl: text("github_url"),
  linkedInUrl: text("linkedin_url"),
  preferredLanguage: text("preferred_language").default("javascript"),
  programmingInterests: jsonb("programming_interests").$type<string[]>().notNull().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users, {
  username: z.string().min(3).max(32),
  email: z.string().email(),
  password: z.string().min(8),
});
export const selectUserSchema = createSelectSchema(users);
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// ─── Projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  language: text("language").notNull().default("javascript"),
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  userUpdatedIndex: index("projects_user_updated_idx").on(table.userId, table.updatedAt),
}));

export const insertProjectSchema = createInsertSchema(projects, {
  name: z.string().min(1).max(100),
  language: z.string(),
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// ─── Files ────────────────────────────────────────────────────────────────────
export const files = pgTable("files", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id, { onDelete: "cascade" }),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  path: text("path").notNull(),
  content: text("content").default(""),
  language: text("language").default("text"),
  isFolder: boolean("is_folder").default(false),
  parentId: integer("parent_id"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({
  projectIndex: index("files_project_idx").on(table.projectId),
  userIndex: index("files_user_idx").on(table.userId),
}));

export const insertFileSchema = createInsertSchema(files, {
  name: z.string().min(1).max(255),
  path: z.string(),
});
export type InsertFile = z.infer<typeof insertFileSchema>;
export type File = typeof files.$inferSelect;

// ─── Practice Problems ────────────────────────────────────────────────────────
export const practiceProblems = pgTable("practice_problems", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull(),
  difficulty: text("difficulty").notNull(), // beginner | intermediate | advanced
  category: text("category").notNull(),
  starterCode: jsonb("starter_code").$type<Record<string, string>>().notNull(), // { python: "...", javascript: "...", ... }
  testCases: jsonb("test_cases").$type<Array<{ input: string; expected: string; hidden: boolean }>>().notNull(), // [{ input: string, expected: string, hidden: boolean }]
  hints: jsonb("hints").$type<string[]>(),
  constraints: text("constraints"),
  inputFormat: text("input_format"),
  outputFormat: text("output_format"),
  examples: jsonb("examples").$type<PracticeExample[]>(),
  supportedLanguages: jsonb("supported_languages").$type<string[]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  difficultyCategoryIndex: index("practice_difficulty_category_idx").on(table.difficulty, table.category),
}));

export type PracticeExample = { input: string; output: string; explanation: string };
export type PracticeProblem = Omit<typeof practiceProblems.$inferSelect, "constraints" | "inputFormat" | "outputFormat" | "examples" | "supportedLanguages"> & {
  constraints?: string | null;
  inputFormat?: string | null;
  outputFormat?: string | null;
  examples?: PracticeExample[] | null;
  supportedLanguages?: string[] | null;
};

// ─── Submissions ──────────────────────────────────────────────────────────────
export const submissions = pgTable("submissions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  problemId: integer("problem_id").references(() => practiceProblems.id, { onDelete: "cascade" }),
  language: text("language").notNull(),
  code: text("code").notNull(),
  status: text("status").notNull(), // accepted | wrong_answer | runtime_error | time_limit
  testsPassed: integer("tests_passed").default(0),
  testsTotal: integer("tests_total").default(0),
  executionTime: integer("execution_time"), // ms
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userCreatedIndex: index("submissions_user_created_idx").on(table.userId, table.createdAt),
}));

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

// ─── User Preferences ─────────────────────────────────────────────────────────
export const userPreferences = pgTable("user_preferences", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).unique(),
  theme: text("theme").default("dark"),
  accentColor: text("accent_color").default("blue"),
  editorTheme: text("editor_theme").default("cu-dark"),
  fontSize: integer("font_size").default(14),
  fontFamily: text("font_family").default("JetBrains Mono"),
  tabSize: integer("tab_size").default(2),
  wordWrap: boolean("word_wrap").default(true),
  minimap: boolean("minimap").default(true),
  lineNumbers: boolean("line_numbers").default(true),
  autoSave: boolean("auto_save").default(true),
  defaultLanguage: text("default_language").default("javascript"),
  profileVisibility: text("profile_visibility").default("public"),
  notifications: jsonb("notifications").$type<{
    codingActivity: boolean;
    submissionResults: boolean;
    productUpdates: boolean;
    security: boolean;
  }>().notNull().default({
    codingActivity: true,
    submissionResults: true,
    productUpdates: false,
    security: true,
  }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserPreferences = typeof userPreferences.$inferSelect;
