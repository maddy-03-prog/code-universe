import { Pool } from "pg";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { and, desc, eq } from "drizzle-orm";
import * as schema from "../shared/schema.js";
import type {
  File as ProjectFile,
  InsertFile,
  InsertProject,
  InsertSubmission,
  InsertUser,
  PracticeProblem,
  Project,
  Submission,
  User,
  UserPreferences,
} from "../shared/schema.js";

export const databasePool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : undefined;

export const database = databasePool
  ? drizzle(databasePool, { schema })
  : undefined;

export class PostgresStorage {
  private catalogReady?: Promise<void>;

  constructor(
    private readonly db: NodePgDatabase<typeof schema>,
    private readonly loadSeedProblems: () => Promise<PracticeProblem[]>,
  ) {}

  async getUserById(id: number): Promise<User | undefined> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.id, id)).limit(1);
    return user;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.username, username)).limit(1);
    return user;
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
    return user;
  }
  async createUser(data: Partial<InsertUser> & { username: string; email: string; password: string }): Promise<User> {
    const programmingInterests = Array.isArray(data.programmingInterests)
      ? data.programmingInterests.filter((interest): interest is string => typeof interest === "string")
      : [];
    const [user] = await this.db.insert(schema.users).values({
      username: data.username,
      email: data.email,
      password: data.password,
      displayName: data.displayName || data.username,
      avatarUrl: data.avatarUrl || null,
      fullName: data.fullName || null,
      bio: data.bio || null,
      location: data.location || null,
      websiteUrl: data.websiteUrl || null,
      githubUrl: data.githubUrl || null,
      linkedInUrl: data.linkedInUrl || null,
      preferredLanguage: data.preferredLanguage || "javascript",
      programmingInterests,
    }).returning();
    return user;
  }
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...changes } = data;
    const [user] = await this.db.update(schema.users)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(schema.users.id, id))
      .returning();
    return user;
  }
  async deleteUser(id: number): Promise<void> {
    await this.db.delete(schema.users).where(eq(schema.users.id, id));
  }

  async getProjectsByUser(userId: number): Promise<Project[]> {
    return this.db.select().from(schema.projects).where(eq(schema.projects.userId, userId)).orderBy(desc(schema.projects.updatedAt));
  }
  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await this.db.select().from(schema.projects).where(eq(schema.projects.id, id)).limit(1);
    return project;
  }
  async createProject(data: Partial<InsertProject> & { name: string; userId: number }): Promise<Project> {
    const [project] = await this.db.insert(schema.projects).values(data).returning();
    return project;
  }
  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...changes } = data;
    const [project] = await this.db.update(schema.projects)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(schema.projects.id, id))
      .returning();
    return project;
  }
  async deleteProject(id: number): Promise<void> {
    await this.db.delete(schema.projects).where(eq(schema.projects.id, id));
  }

  async getFilesByProject(projectId: number): Promise<ProjectFile[]> {
    return this.db.select().from(schema.files).where(eq(schema.files.projectId, projectId));
  }
  async getFile(id: number): Promise<ProjectFile | undefined> {
    const [file] = await this.db.select().from(schema.files).where(eq(schema.files.id, id)).limit(1);
    return file;
  }
  async createFile(data: Partial<InsertFile> & { name: string; path: string; userId: number }): Promise<ProjectFile> {
    const [file] = await this.db.insert(schema.files).values(data).returning();
    return file;
  }
  async updateFile(id: number, data: Partial<ProjectFile>): Promise<ProjectFile> {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...changes } = data;
    const [file] = await this.db.update(schema.files)
      .set({ ...changes, updatedAt: new Date() })
      .where(eq(schema.files.id, id))
      .returning();
    return file;
  }
  async deleteFile(id: number): Promise<void> {
    await this.db.delete(schema.files).where(eq(schema.files.id, id));
  }

  private async ensureCatalog(): Promise<void> {
    if (!this.catalogReady) {
      this.catalogReady = (async () => {
        const seedProblems = await this.loadSeedProblems();
        await this.db.insert(schema.practiceProblems)
          .values(seedProblems.map((problem) => ({
            title: problem.title,
            slug: problem.slug,
            description: problem.description,
            difficulty: problem.difficulty,
            category: problem.category,
            starterCode: problem.starterCode,
            testCases: problem.testCases,
            hints: problem.hints,
            constraints: problem.constraints,
            inputFormat: problem.inputFormat,
            outputFormat: problem.outputFormat,
            examples: problem.examples,
            supportedLanguages: problem.supportedLanguages,
          })))
          .onConflictDoNothing();
      })();
    }
    await this.catalogReady;
  }
  async getProblems(filters: { difficulty?: string; category?: string }): Promise<PracticeProblem[]> {
    await this.ensureCatalog();
    const conditions = [];
    if (filters.difficulty) conditions.push(eq(schema.practiceProblems.difficulty, filters.difficulty));
    if (filters.category) conditions.push(eq(schema.practiceProblems.category, filters.category));
    return this.db.select().from(schema.practiceProblems).where(conditions.length ? and(...conditions) : undefined);
  }
  async getProblemById(id: number): Promise<PracticeProblem | undefined> {
    await this.ensureCatalog();
    const [problem] = await this.db.select().from(schema.practiceProblems).where(eq(schema.practiceProblems.id, id)).limit(1);
    return problem;
  }
  async getProblemBySlug(slug: string): Promise<PracticeProblem | undefined> {
    await this.ensureCatalog();
    const [problem] = await this.db.select().from(schema.practiceProblems).where(eq(schema.practiceProblems.slug, slug)).limit(1);
    return problem;
  }

  async createSubmission(data: Partial<InsertSubmission> & { userId: number; problemId: number; language: string; code: string; status: string }): Promise<Submission> {
    const [submission] = await this.db.insert(schema.submissions).values(data).returning();
    return submission;
  }
  async getUserSubmissions(userId: number): Promise<Submission[]> {
    return this.db.select().from(schema.submissions).where(eq(schema.submissions.userId, userId)).orderBy(desc(schema.submissions.createdAt));
  }

  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    const [preferences] = await this.db.select().from(schema.userPreferences).where(eq(schema.userPreferences.userId, userId)).limit(1);
    return preferences;
  }
  async upsertUserPreferences(userId: number, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const {
      id: _id,
      userId: _userId,
      updatedAt: _updatedAt,
      ...values
    } = data;
    const [preferences] = await this.db.insert(schema.userPreferences)
      .values({ userId, ...values })
      .onConflictDoUpdate({
        target: schema.userPreferences.userId,
        set: { ...values, updatedAt: new Date() },
      })
      .returning();
    return preferences;
  }
}
