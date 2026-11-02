import type {
  User, InsertUser,
  Project, InsertProject,
  File, InsertFile,
  PracticeProblem,
  Submission, InsertSubmission,
  UserPreferences,
} from "../shared/schema.js";
import { expandedPracticeProblems } from "./data/practiceProblems.js";
import type { SupportedLanguage } from "../shared/types.js";
import { database, PostgresStorage } from "./database.js";

// ─── In-memory storage implementation ────────────────────────────────────────
// Used for development / when no DATABASE_URL is configured.
// Swap this with a Drizzle/PostgreSQL implementation by implementing
// the same interface and changing the export at the bottom.

class MemStorage {
  private users = new Map<number, User>();
  private projects = new Map<number, Project>();
  private files = new Map<number, File>();
  private problems = new Map<number, PracticeProblem>();
  private submissions = new Map<number, Submission>();
  private preferences = new Map<number, UserPreferences>();
  private nextId = { user: 1, project: 1, file: 1, submission: 1, pref: 1 };

  // ─── Users ─────────────────────────────────────────────────────────────────
  async getUserById(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    return [...this.users.values()].find((u) => u.username === username);
  }
  async getUserByEmail(email: string): Promise<User | undefined> {
    return [...this.users.values()].find((u) => u.email === email);
  }
  async updateUser(id: number, data: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updated = { ...user, ...data, id, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }
  async deleteUser(id: number): Promise<void> {
    this.users.delete(id);
    this.preferences.delete(id);
    for (const [projectId, project] of this.projects) {
      if (project.userId === id) await this.deleteProject(projectId);
    }
    for (const [fileId, file] of this.files) {
      if (file.userId === id) this.files.delete(fileId);
    }
    for (const [submissionId, submission] of this.submissions) {
      if (submission.userId === id) this.submissions.delete(submissionId);
    }
  }
  async createUser(data: Partial<InsertUser> & { username: string; email: string; password: string }): Promise<User> {
    const id = this.nextId.user++;
    const user: User = {
      id,
      username: data.username,
      email: data.email,
      password: data.password,
      displayName: data.displayName || data.username,
      avatarUrl: null,
      fullName: data.fullName || null,
      bio: null,
      location: null,
      websiteUrl: null,
      githubUrl: null,
      linkedInUrl: null,
      preferredLanguage: "javascript",
      programmingInterests: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // ─── Projects ──────────────────────────────────────────────────────────────
  async getProjectsByUser(userId: number): Promise<Project[]> {
    return [...this.projects.values()]
      .filter((p) => p.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  async createProject(data: Partial<InsertProject> & { name: string; userId: number }): Promise<Project> {
    const id = this.nextId.project++;
    const project: Project = {
      id,
      userId: data.userId,
      name: data.name,
      description: data.description || null,
      language: data.language || "javascript",
      isPublic: data.isPublic || false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.projects.set(id, project);
    return project;
  }
  async updateProject(id: number, data: Partial<Project>): Promise<Project> {
    const project = this.projects.get(id)!;
    const updated = { ...project, ...data, updatedAt: new Date() };
    this.projects.set(id, updated);
    return updated;
  }
  async deleteProject(id: number): Promise<void> {
    this.projects.delete(id);
    // cascade delete files
    for (const [fid, f] of this.files) {
      if (f.projectId === id) this.files.delete(fid);
    }
  }

  // ─── Files ─────────────────────────────────────────────────────────────────
  async getFilesByProject(projectId: number): Promise<File[]> {
    return [...this.files.values()].filter((f) => f.projectId === projectId);
  }
  async getFile(id: number): Promise<File | undefined> {
    return this.files.get(id);
  }
  async createFile(data: Partial<InsertFile> & { name: string; path: string; userId: number }): Promise<File> {
    const id = this.nextId.file++;
    const file: File = {
      id,
      projectId: data.projectId || null,
      userId: data.userId,
      name: data.name,
      path: data.path,
      content: data.content || "",
      language: data.language || "text",
      isFolder: data.isFolder || false,
      parentId: data.parentId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.files.set(id, file);
    return file;
  }
  async updateFile(id: number, data: Partial<File>): Promise<File> {
    const file = this.files.get(id)!;
    const updated = { ...file, ...data, updatedAt: new Date() };
    this.files.set(id, updated);
    return updated;
  }
  async deleteFile(id: number): Promise<void> {
    this.files.delete(id);
  }

  // ─── Practice Problems ─────────────────────────────────────────────────────
  async getProblems(filters: { difficulty?: string; category?: string }): Promise<PracticeProblem[]> {
    let problems = [...this.problems.values()];
    if (filters.difficulty) problems = problems.filter((p) => p.difficulty === filters.difficulty);
    if (filters.category) problems = problems.filter((p) => p.category === filters.category);
    return problems;
  }
  async getProblemById(id: number): Promise<PracticeProblem | undefined> {
    return this.problems.get(id);
  }
  async getProblemBySlug(slug: string): Promise<PracticeProblem | undefined> {
    return [...this.problems.values()].find((p) => p.slug === slug);
  }
  async seedProblem(problem: PracticeProblem): Promise<void> {
    const starterCode = problem.starterCode && typeof problem.starterCode === "object"
      ? problem.starterCode as Record<string, string>
      : {};
    const languages: SupportedLanguage[] = ["python", "c", "cpp", "java", "javascript", "typescript"];
    const normalizedStarters = Object.fromEntries(languages.map((language) => [
      language,
      starterCode[language]?.trim() ? starterCode[language] : createProblemStarter(problem.title, language),
    ]));
    const rawTestCases = Array.isArray(problem.testCases)
      ? problem.testCases as Array<{ input: string; expected: string; hidden: boolean }>
      : [];
    const testCases = rawTestCases.some((testCase) => testCase.hidden)
      ? rawTestCases
      : rawTestCases.length > 0
        ? [...rawTestCases, { ...rawTestCases[0], hidden: true }]
        : [];

    this.problems.set(problem.id, {
      ...problem,
      starterCode: normalizedStarters,
      inputFormat: problem.inputFormat || "Input is provided on standard input.",
      outputFormat: problem.outputFormat || "Print the result to standard output.",
      constraints: problem.constraints || "See the problem description.",
      examples: problem.examples || [{
        input: String(rawTestCases[0]?.input || ""),
        output: String(rawTestCases[0]?.expected || ""),
        explanation: "Follow the problem statement for the required output.",
      }],
      testCases,
      supportedLanguages: problem.supportedLanguages || languages,
    });
  }

  // ─── Submissions ───────────────────────────────────────────────────────────
  async createSubmission(data: Partial<InsertSubmission> & { userId: number; problemId: number; language: string; code: string; status: string }): Promise<Submission> {
    const id = this.nextId.submission++;
    const sub: Submission = {
      id,
      userId: data.userId,
      problemId: data.problemId,
      language: data.language,
      code: data.code,
      status: data.status,
      testsPassed: data.testsPassed || 0,
      testsTotal: data.testsTotal || 0,
      executionTime: data.executionTime || null,
      createdAt: new Date(),
    };
    this.submissions.set(id, sub);
    return sub;
  }
  async getUserSubmissions(userId: number): Promise<Submission[]> {
    return [...this.submissions.values()]
      .filter((s) => s.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  // ─── Preferences ───────────────────────────────────────────────────────────
  async getUserPreferences(userId: number): Promise<UserPreferences | undefined> {
    return this.preferences.get(userId);
  }
  async upsertUserPreferences(userId: number, data: Partial<UserPreferences>): Promise<UserPreferences> {
    const existing = this.preferences.get(userId);
    const prefs: UserPreferences = {
      id: existing?.id || this.nextId.pref++,
      userId,
      theme: data.theme ?? existing?.theme ?? "dark",
      accentColor: data.accentColor ?? existing?.accentColor ?? "blue",
      editorTheme: data.editorTheme ?? existing?.editorTheme ?? "cu-dark",
      fontSize: data.fontSize ?? existing?.fontSize ?? 14,
      fontFamily: data.fontFamily ?? existing?.fontFamily ?? "JetBrains Mono",
      tabSize: data.tabSize ?? existing?.tabSize ?? 2,
      wordWrap: data.wordWrap ?? existing?.wordWrap ?? true,
      minimap: data.minimap ?? existing?.minimap ?? true,
      lineNumbers: data.lineNumbers ?? existing?.lineNumbers ?? true,
      autoSave: data.autoSave ?? existing?.autoSave ?? true,
      defaultLanguage: data.defaultLanguage ?? existing?.defaultLanguage ?? "javascript",
      profileVisibility: data.profileVisibility ?? existing?.profileVisibility ?? "public",
      notifications: data.notifications ?? existing?.notifications ?? {
        codingActivity: true,
        submissionResults: true,
        productUpdates: false,
        security: true,
      },
      updatedAt: new Date(),
    };
    this.preferences.set(userId, prefs);
    return prefs;
  }
}

// ─── Seed practice problems ───────────────────────────────────────────────────
const mem = new MemStorage();

const seedProblems: PracticeProblem[] = [
  {
    id: 1,
    title: "Hello World",
    slug: "hello-world",
    description: "Write a program that prints `Hello, World!` to standard output.",
    difficulty: "beginner",
    category: "basics",
    starterCode: {
      python: 'print("Hello, World!")',
      javascript: 'console.log("Hello, World!");',
      java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello, World!");\n  }\n}',
      c: '#include <stdio.h>\nint main() {\n  printf("Hello, World!\\n");\n  return 0;\n}',
      cpp: '#include <iostream>\nint main() {\n  std::cout << "Hello, World!" << std::endl;\n  return 0;\n}',
    },
    testCases: [{ input: "", expected: "Hello, World!", hidden: false }],
    hints: ["Use print() in Python", "Use console.log() in JavaScript"],
    createdAt: new Date(),
  },
  {
    id: 2,
    title: "Sum of Two Numbers",
    slug: "sum-of-two-numbers",
    description: "Read two integers from input (one per line) and print their sum.",
    difficulty: "beginner",
    category: "math",
    starterCode: {
      python: "a = int(input())\nb = int(input())\nprint(a + b)",
      javascript: "const lines = require('fs').readFileSync('/dev/stdin','utf8').trim().split('\\n');\nconsole.log(parseInt(lines[0]) + parseInt(lines[1]));",
      java: 'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner sc = new Scanner(System.in);\n    System.out.println(sc.nextInt() + sc.nextInt());\n  }\n}',
      c: '#include <stdio.h>\nint main() {\n  int a,b;\n  scanf("%d %d",&a,&b);\n  printf("%d\\n",a+b);\n  return 0;\n}',
      cpp: '#include <iostream>\nint main() {\n  int a,b;\n  std::cin >> a >> b;\n  std::cout << a+b << std::endl;\n  return 0;\n}',
    },
    testCases: [
      { input: "3\n5", expected: "8", hidden: false },
      { input: "10\n20", expected: "30", hidden: false },
      { input: "-5\n5", expected: "0", hidden: true },
    ],
    hints: ["Read each number on its own line", "Convert input strings to integers"],
    createdAt: new Date(),
  },
  {
    id: 4,
    title: "Reverse a String",
    slug: "reverse-string",
    description: "Read a string from input and print it reversed.",
    difficulty: "beginner",
    category: "strings",
    starterCode: {
      python: "s = input()\nprint(s[::-1])",
      javascript: "const s = require('fs').readFileSync('/dev/stdin','utf8').trim();\nconsole.log(s.split('').reverse().join(''));",
      java: 'import java.util.Scanner;\npublic class Main {\n  public static void main(String[] args) {\n    String s = new Scanner(System.in).nextLine();\n    System.out.println(new StringBuilder(s).reverse());\n  }\n}',
      c: '',
      cpp: '',
    },
    testCases: [
      { input: "hello", expected: "olleh", hidden: false },
      { input: "racecar", expected: "racecar", hidden: false },
      { input: "OpenAI", expected: "IAnepO", hidden: true },
    ],
    hints: ["Python slice [::-1] reverses a string", "Use StringBuilder.reverse() in Java"],
    createdAt: new Date(),
  },
  {
    id: 5,
    title: "Binary Search",
    slug: "binary-search",
    description: "Given N sorted integers (first line) and a target (second line), output the 0-based index if found, else -1.",
    difficulty: "intermediate",
    category: "algorithms",
    starterCode: {
      python: "nums = list(map(int, input().split()))\ntarget = int(input())\nl, r = 0, len(nums)-1\nwhile l <= r:\n    m = (l+r)//2\n    if nums[m] == target: print(m); exit()\n    elif nums[m] < target: l = m+1\n    else: r = m-1\nprint(-1)",
      javascript: "",
      java: "",
      c: "",
      cpp: "",
    },
    testCases: [
      { input: "1 3 5 7 9\n5", expected: "2", hidden: false },
      { input: "1 3 5 7 9\n6", expected: "-1", hidden: false },
      { input: "2 4 6 8 10 12\n10", expected: "4", hidden: true },
    ],
    hints: ["Maintain left and right pointers", "Middle index = (left + right) // 2"],
    createdAt: new Date(),
  },
  {
    id: 6,
    title: "Fibonacci Sequence",
    slug: "fibonacci",
    description: "Given N, print the first N numbers in the Fibonacci sequence (0-indexed: 0, 1, 1, 2, 3, ...).",
    difficulty: "beginner",
    category: "math",
    starterCode: {
      python: "n = int(input())\na, b = 0, 1\nfor _ in range(n):\n    print(a)\n    a, b = b, a+b",
      javascript: "",
      java: "",
      c: "",
      cpp: "",
    },
    testCases: [
      { input: "5", expected: "0\n1\n1\n2\n3", hidden: false },
      { input: "8", expected: "0\n1\n1\n2\n3\n5\n8\n13", hidden: false },
    ],
    hints: ["Start with a=0, b=1", "Each iteration: print a, then shift a=b, b=a+b"],
    createdAt: new Date(),
  },
  {
    id: 7,
    title: "Count Vowels",
    slug: "count-vowels",
    description: "Count the number of vowels (a, e, i, o, u — case-insensitive) in a given string.",
    difficulty: "beginner",
    category: "strings",
    starterCode: {
      python: "s = input().lower()\nprint(sum(1 for c in s if c in 'aeiou'))",
      javascript: "",
      java: "",
      c: "",
      cpp: "",
    },
    testCases: [
      { input: "Hello World", expected: "3", hidden: false },
      { input: "Code Universe", expected: "6", hidden: false },
      { input: "rhythm", expected: "0", hidden: true },
    ],
    hints: ["Convert to lowercase first", "Check each character against 'aeiou'"],
    createdAt: new Date(),
  },
  {
    id: 8,
    title: "Two Sum",
    slug: "two-sum",
    description: "Given N numbers on the first line and a target on the second, find two indices (0-based, space-separated) whose values sum to target. Output -1 -1 if no solution.",
    difficulty: "intermediate",
    category: "algorithms",
    starterCode: {
      python: "nums = list(map(int, input().split()))\ntarget = int(input())\nseen = {}\nfor i, n in enumerate(nums):\n    comp = target - n\n    if comp in seen:\n        print(seen[comp], i)\n        exit()\n    seen[n] = i\nprint(-1, -1)",
      javascript: "",
      java: "",
      c: "",
      cpp: "",
    },
    testCases: [
      { input: "2 7 11 15\n9", expected: "0 1", hidden: false },
      { input: "3 2 4\n6", expected: "1 2", hidden: false },
      { input: "1 2 3\n10", expected: "-1 -1", hidden: true },
    ],
    hints: ["Use a hash map to store seen values", "For each number, check if its complement exists"],
    createdAt: new Date(),
  },
];

for (const p of seedProblems) {
  mem.seedProblem(p);
}

for (const p of expandedPracticeProblems) {
  mem.seedProblem(p);
}

export const storage = database
  ? new PostgresStorage(database, () => mem.getProblems({}))
  : mem;

function createProblemStarter(title: string, language: SupportedLanguage): string {
  const comment = language === "python" ? `# ${title}` : `// ${title}`;
  switch (language) {
    case "python":
      return `${comment}\nimport sys\n\n# Read input, implement the solution, and print the required output.\ndata = sys.stdin.read()\n`;
    case "javascript":
      return `${comment}\nconst fs = require("node:fs");\nconst input = fs.readFileSync(0, "utf8");\n// Implement the solution and print the required output.\n`;
    case "typescript":
      return `${comment}\nimport * as fs from "node:fs";\nconst input = fs.readFileSync(0, "utf8");\n// Implement the solution and print the required output.\n`;
    case "java":
      return `${comment}\nimport java.util.*;\npublic class Main {\n  public static void main(String[] args) {\n    Scanner scanner = new Scanner(System.in);\n    // Implement the solution and print the required output.\n  }\n}\n`;
    case "c":
      return `${comment}\n#include <stdio.h>\nint main(void) {\n  // Implement the solution and print the required output.\n  return 0;\n}\n`;
    case "cpp":
      return `${comment}\n#include <iostream>\nusing namespace std;\nint main() {\n  ios::sync_with_stdio(false);\n  cin.tie(nullptr);\n  // Implement the solution and print the required output.\n  return 0;\n}\n`;
    default:
      return comment;
  }
}
