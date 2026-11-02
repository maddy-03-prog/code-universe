import { createRequire } from "node:module";
import path from "node:path";
import { Worker } from "node:worker_threads";
import type { ExecutionResult, SupportedLanguage } from "../../shared/types.js";
import { log } from "../logger.js";

const DEFAULT_PISTON_API_URL = "http://localhost:2000/api/v2";
const SERVICE_TIMEOUT_MS = 15_000;
const MAX_SOURCE_BYTES = 100_000;
const MAX_STDIN_BYTES = 10_000;
const MAX_OUTPUT_BYTES = 50 * 1024;
const MAX_SERVICE_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_SQL_ROWS = 250;
const SQL_TIMEOUT_MS = 2_000;
const RUN_TIMEOUT_MS = 3_000;
const COMPILE_TIMEOUT_MS = 10_000;
const MEMORY_LIMIT_BYTES = 128 * 1024 * 1024;

const RUNTIME_ALIASES: Record<Extract<SupportedLanguage, "python" | "c" | "cpp" | "java" | "javascript" | "typescript" | "r">, string[]> = {
  python: ["python", "python3"],
  c: ["c"],
  cpp: ["cpp", "c++"],
  java: ["java"],
  javascript: ["javascript", "js", "nodejs", "node"],
  typescript: ["typescript", "ts"],
  r: ["r", "rscript"],
};

const FILE_NAMES: Partial<Record<SupportedLanguage, string>> = {
  python: "main.py",
  c: "main.c",
  cpp: "main.cpp",
  java: "Main.java",
  javascript: "main.js",
  typescript: "main.ts",
  r: "main.r",
};

interface PistonRuntime {
  language: string;
  version: string;
  aliases?: string[];
  runtime?: string;
}

interface PistonStage {
  stdout?: string | null;
  stderr?: string | null;
  output?: string | null;
  code?: number | null;
  signal?: string | null;
}

interface PistonResponse {
  language?: string;
  version?: string;
  run?: PistonStage;
  compile?: PistonStage;
}

interface PistonConfiguration {
  baseUrl: URL;
}

interface SqlWorkerResult {
  stdout: string;
  stderr: string;
  error?: string;
}

const sqliteWorkerSource = `
const { parentPort, workerData } = require("node:worker_threads");
try {
  const initializeSql = require(workerData.sqlModulePath);
  Promise.resolve(initializeSql()).then((SQL) => {
    const database = new SQL.Database();
    try {
      const resultSets = database.exec(workerData.code);
      let remainingRows = workerData.maxRows;
      const results = resultSets.map(({ columns, values }) => {
        const rows = values.slice(0, remainingRows);
        remainingRows -= rows.length;
        return { columns, rows };
      }).filter((result) => result.rows.length > 0);
      const output = results.length
        ? JSON.stringify(results, null, 2)
        : "SQL completed successfully.";
      parentPort.postMessage({ stdout: output, stderr: "" });
    } catch (error) {
      parentPort.postMessage({
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        error: "query",
      });
    } finally {
      database.close();
      parentPort.close();
    }
  }).catch((error) => {
    parentPort.postMessage({ stdout: "", stderr: error instanceof Error ? error.message : String(error), error: "service" });
    parentPort.close();
  });
} catch (error) {
  parentPort.postMessage({ stdout: "", stderr: error instanceof Error ? error.message : String(error), error: "service" });
  parentPort.close();
}
`;

const runtimeCache = new Map<string, { expiresAt: number; runtimes: PistonRuntime[] }>();

function failure(
  status: ExecutionResult["status"],
  errorType: NonNullable<ExecutionResult["errorType"]>,
  message: string,
): ExecutionResult {
  return {
    stdout: "",
    stderr: message,
    exitCode: 1,
    executionTime: 0,
    status,
    errorType,
  };
}

function truncateUtf8(value: string, maxBytes: number): string {
  let result = "";
  let bytes = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character, "utf8");
    if (bytes + size > maxBytes) break;
    result += character;
    bytes += size;
  }
  return result;
}

function getPistonConfiguration(): PistonConfiguration {
  const value = process.env.PISTON_API_URL?.trim() || DEFAULT_PISTON_API_URL;
  let baseUrl: URL;
  try {
    baseUrl = new URL(value);
  } catch {
    throw new Error("PISTON_API_URL must be an absolute URL such as http://localhost:2000/api/v2.");
  }
  if (baseUrl.protocol !== "http:" || !["localhost", "127.0.0.1", "::1"].includes(baseUrl.hostname)) {
    throw new Error("PISTON_API_URL must point to a local Piston service (localhost, 127.0.0.1, or ::1).");
  }
  if (baseUrl.username || baseUrl.password || baseUrl.search || baseUrl.hash) {
    throw new Error("PISTON_API_URL must not contain credentials, query parameters, or a fragment.");
  }
  baseUrl.pathname = baseUrl.pathname.replace(/\/+$/, "");
  return { baseUrl };
}

function endpoint(configuration: PistonConfiguration, name: string): URL {
  const basePath = configuration.baseUrl.pathname.replace(/\/+$/, "");
  return new URL(`${basePath}/${name}`, configuration.baseUrl);
}

class ServiceResponseError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ServiceResponseError";
  }
}

async function readLimitedResponse(response: Response, maxBytes: number): Promise<string> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new Error("Piston returned a response larger than the allowed limit.");
  }
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    totalBytes += value.byteLength;
    if (totalBytes > maxBytes) {
      await reader.cancel();
      throw new Error("Piston returned a response larger than the allowed limit.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, totalBytes).toString("utf8");
}

async function fetchPistonJson<T>(
  url: URL,
  signal: AbortSignal,
  body?: unknown,
): Promise<T> {
  const response = await fetch(url, {
    method: body === undefined ? "GET" : "POST",
    redirect: "error",
    signal,
    headers: body === undefined ? { Accept: "application/json" } : {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const responseText = await readLimitedResponse(response, MAX_SERVICE_RESPONSE_BYTES);
  let parsed: unknown;
  try {
    parsed = responseText ? JSON.parse(responseText) : {};
  } catch {
    throw new Error("Piston returned an invalid JSON response.");
  }
  if (!response.ok) {
    const message = typeof parsed === "object" && parsed !== null && "message" in parsed &&
      typeof parsed.message === "string"
      ? parsed.message
      : `Piston returned HTTP ${response.status}.`;
    throw new ServiceResponseError(response.status, message);
  }
  return parsed as T;
}

function normalizeRuntimeName(value: string): string {
  return value.toLowerCase().replace(/\+\+/g, "pp").replace(/[^a-z0-9]/g, "");
}

function compareVersions(left: string, right: string): number {
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: "base" });
}

function selectRuntime(language: SupportedLanguage, runtimes: PistonRuntime[]): PistonRuntime | undefined {
  if (!(language in RUNTIME_ALIASES)) return undefined;
  const aliases = new Set(RUNTIME_ALIASES[language as keyof typeof RUNTIME_ALIASES].map(normalizeRuntimeName));
  return runtimes
    .filter((runtime) => [runtime.language, ...(runtime.aliases || [])]
      .some((name) => aliases.has(normalizeRuntimeName(name))))
    .sort((left, right) => compareVersions(right.version, left.version))[0];
}

async function getRuntimes(
  configuration: PistonConfiguration,
  signal: AbortSignal,
): Promise<PistonRuntime[]> {
  const key = configuration.baseUrl.toString();
  const cached = runtimeCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.runtimes;

  const runtimes = await fetchPistonJson<PistonRuntime[]>(endpoint(configuration, "runtimes"), signal);
  if (!Array.isArray(runtimes) || runtimes.some((runtime) =>
    typeof runtime.language !== "string" || typeof runtime.version !== "string")) {
    throw new Error("Piston returned an invalid runtime catalog.");
  }
  runtimeCache.set(key, { expiresAt: Date.now() + 30_000, runtimes });
  return runtimes;
}

function serviceFailure(error: unknown): ExecutionResult {
  if (error instanceof ServiceResponseError) {
    if (error.status === 400 && /language|runtime|version|not installed|not supported/i.test(error.message)) {
      return failure("unsupported", "Unsupported Language/Runtime", `Piston could not run this language/runtime: ${error.message}`);
    }
    if (error.status === 404) {
      return failure("configuration_error", "Configuration Error", "Piston returned 404. Check that PISTON_API_URL includes the /api/v2 path.");
    }
    return failure("service_error", "Execution Service Error", `Piston rejected or could not complete the request (HTTP ${error.status}): ${error.message}`);
  }
  if (error instanceof Error && error.name === "AbortError") {
    return failure("timeout", "Time Limit Exceeded", "Timed out waiting for the local Piston service.");
  }
  return failure(
    "service_error",
    "Execution Service Error",
    `Piston is unavailable. Start the local Piston service and verify PISTON_API_URL. ${error instanceof Error ? error.message : ""}`.trim(),
  );
}

function createAbortController(timeoutMs: number): { controller: AbortController; timeout: ReturnType<typeof setTimeout> } {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timeout };
}

function mapPistonResult(response: PistonResponse): ExecutionResult {
  const run = response.run;
  if (!run) return failure("service_error", "Execution Service Error", "Piston returned no run result.");

  const stdout = truncateUtf8(run.stdout || "", MAX_OUTPUT_BYTES);
  const stderr = truncateUtf8(run.stderr || "", MAX_OUTPUT_BYTES);
  const compileOutput = response.compile
    ? truncateUtf8(response.compile.output || `${response.compile.stdout || ""}${response.compile.stderr || ""}`, MAX_OUTPUT_BYTES)
    : "";
  const resultMetadata = {
    runtime: response.language,
    runtimeVersion: response.version,
  };

  if (response.compile && (response.compile.code !== 0 || response.compile.signal)) {
    const diagnostic = compileOutput || response.compile.stderr || response.compile.signal || "Compilation failed.";
    return {
      stdout,
      stderr: truncateUtf8(response.compile.stderr || diagnostic, MAX_OUTPUT_BYTES),
      compilationOutput: diagnostic,
      exitCode: response.compile.code ?? 1,
      executionTime: 0,
      status: "compile_error",
      errorType: /syntax|parse error|unexpected token/i.test(diagnostic) ? "Syntax Error" : "Compilation Error",
      ...resultMetadata,
    };
  }

  const diagnostic = stderr || run.signal || "";
  if (run.signal && /memory|out of memory/i.test(diagnostic)) {
    return {
      stdout, stderr: diagnostic || "The process exceeded its memory limit.", exitCode: 1,
      executionTime: 0, status: "memory_limit", errorType: "Memory Limit Error", ...resultMetadata,
    };
  }
  if (run.signal && /time|timeout|killed/i.test(diagnostic)) {
    return {
      stdout, stderr: diagnostic || "The process exceeded its time limit.", exitCode: -1,
      executionTime: 0, status: "timeout", errorType: "Time Limit Exceeded", ...resultMetadata,
    };
  }
  if (run.code === 0 && !run.signal) {
    return {
      stdout, stderr, exitCode: 0, executionTime: 0, status: "success", ...resultMetadata,
    };
  }
  if (run.signal === "SIGKILL" && !stderr) {
    return {
      stdout,
      stderr: "Piston stopped the process (SIGKILL) without identifying which resource limit was reached.",
      exitCode: -1,
      executionTime: 0,
      status: "error",
      errorType: "Runtime Error",
      ...resultMetadata,
    };
  }
  return {
    stdout,
    stderr: stderr || run.signal || `Program exited with code ${run.code ?? "unknown"}.`,
    exitCode: run.code ?? 1,
    executionTime: 0,
    status: "error",
    errorType: "Runtime Error",
    ...resultMetadata,
  };
}

async function executeSql(code: string): Promise<ExecutionResult> {
  const startTime = Date.now();
  const require = createRequire(path.join(process.cwd(), "package.json"));
  let worker: Worker;
  try {
    worker = new Worker(sqliteWorkerSource, {
      eval: true,
      workerData: {
        sqlModulePath: require.resolve("sql.js"),
        code,
        maxRows: MAX_SQL_ROWS,
      },
      resourceLimits: { maxOldGenerationSizeMb: 128, stackSizeMb: 4 },
    });
  } catch (error) {
    log(`SQLite worker could not start: ${error instanceof Error ? error.message : String(error)}`, "error");
    return failure("service_error", "Execution Service Error", "The local SQLite execution worker could not start.");
  }

  return new Promise<ExecutionResult>((resolve) => {
    let settled = false;
    const finish = (result: ExecutionResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve(result);
    };
    const timeout = setTimeout(() => {
      void worker.terminate();
      finish({
        ...failure("timeout", "Time Limit Exceeded", "SQLite query exceeded the 2 second execution limit."),
        executionTime: Date.now() - startTime,
      });
    }, SQL_TIMEOUT_MS);
    worker.once("message", (result: SqlWorkerResult) => {
      const executionTime = Date.now() - startTime;
      if (result.error === "service") {
        finish({
          ...failure("service_error", "Execution Service Error", "The SQLite service failed to initialize."),
          executionTime,
        });
        return;
      }
      if (result.error === "query") {
        const syntaxError = /syntax error|incomplete input|unrecognized token|unterminated/i.test(result.stderr);
        finish({
          stdout: "",
          stderr: truncateUtf8(result.stderr, MAX_OUTPUT_BYTES),
          exitCode: 1,
          executionTime,
          status: syntaxError ? "compile_error" : "error",
          errorType: syntaxError ? "Syntax Error" : "Runtime Error",
        });
        return;
      }
      finish({
        stdout: truncateUtf8(result.stdout, MAX_OUTPUT_BYTES),
        stderr: "",
        exitCode: 0,
        executionTime,
        status: "success",
      });
    });
    worker.once("error", (error) => {
      log(`SQLite worker failed: ${error.message}`, "error");
      finish({
        ...failure("service_error", "Execution Service Error", "The SQLite execution worker failed."),
        executionTime: Date.now() - startTime,
      });
    });
    worker.once("exit", (code) => {
      if (!settled && code !== 0) {
        finish({
          ...failure("service_error", "Execution Service Error", "The SQLite execution worker stopped unexpectedly."),
          executionTime: Date.now() - startTime,
        });
      }
    });
  });
}

export async function checkExecutionService(): Promise<{
  configured: boolean;
  reachable: boolean;
  languageCount?: number;
  runtimes?: Array<{ language: string; version: string }>;
  message: string;
}> {
  let configuration: PistonConfiguration;
  try {
    configuration = getPistonConfiguration();
  } catch (error) {
    return {
      configured: false,
      reachable: false,
      message: error instanceof Error ? error.message : "Invalid Piston configuration.",
    };
  }
  const { controller, timeout } = createAbortController(SERVICE_TIMEOUT_MS);
  try {
    const runtimes = await getRuntimes(configuration, controller.signal);
    return {
      configured: true,
      reachable: true,
      languageCount: runtimes.length,
      runtimes: runtimes.map(({ language, version }) => ({ language, version })),
      message: "Local Piston service is reachable.",
    };
  } catch (error) {
    const result = serviceFailure(error);
    log(`Piston health check failed: ${error instanceof Error ? error.message : String(error)}`, "error");
    return { configured: true, reachable: false, message: result.stderr };
  } finally {
    clearTimeout(timeout);
  }
}

export async function executeCode(
  language: SupportedLanguage,
  code: string,
  stdin = "",
): Promise<ExecutionResult> {
  if (!code.trim()) return failure("error", "Input Error", "Source code cannot be empty.");
  if (Buffer.byteLength(code, "utf8") > MAX_SOURCE_BYTES) {
    return failure("error", "Input Error", "Source code exceeds the 100 KB limit.");
  }
  if (Buffer.byteLength(stdin, "utf8") > MAX_STDIN_BYTES) {
    return failure("error", "Input Error", "Standard input exceeds the 10 KB limit.");
  }
  if (language === "html" || language === "css") {
    return failure("unsupported", "Unsupported Language/Runtime", `${language.toUpperCase()} uses the sandboxed browser preview, not the compiler.`);
  }
  if (language === "json") {
    return failure("unsupported", "Unsupported Language/Runtime", "JSON is a data format, not an executable program.");
  }
  if (language === "sql") return executeSql(code);

  let configuration: PistonConfiguration;
  try {
    configuration = getPistonConfiguration();
  } catch (error) {
    return failure("configuration_error", "Configuration Error", error instanceof Error ? error.message : "Invalid Piston configuration.");
  }

  const { controller, timeout } = createAbortController(SERVICE_TIMEOUT_MS);
  try {
    const runtimes = await getRuntimes(configuration, controller.signal);
    const runtime = selectRuntime(language, runtimes);
    if (!runtime) {
      return failure("unsupported", "Unsupported Language/Runtime", `No installed Piston runtime is available for ${language}. Install that runtime in Piston and retry.`);
    }

    const response = await fetchPistonJson<PistonResponse>(endpoint(configuration, "execute"), controller.signal, {
      language: runtime.language,
      version: runtime.version,
      files: [{ name: FILE_NAMES[language], content: code, encoding: "utf8" }],
      stdin,
      args: [],
      compile_timeout: COMPILE_TIMEOUT_MS,
      run_timeout: RUN_TIMEOUT_MS,
      compile_memory_limit: MEMORY_LIMIT_BYTES,
      run_memory_limit: MEMORY_LIMIT_BYTES,
    });
    return mapPistonResult(response);
  } catch (error) {
    const result = serviceFailure(error);
    log(`Piston execution failed (${language}): ${error instanceof Error ? error.message : String(error)}`, "error");
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

export const executionLimits = {
  timeoutMs: SERVICE_TIMEOUT_MS,
  runTimeoutMs: RUN_TIMEOUT_MS,
  compileTimeoutMs: COMPILE_TIMEOUT_MS,
  maxSourceBytes: MAX_SOURCE_BYTES,
  maxStdinBytes: MAX_STDIN_BYTES,
  maxOutputBytes: MAX_OUTPUT_BYTES,
  sqlTimeoutMs: SQL_TIMEOUT_MS,
  sqlMaxRows: MAX_SQL_ROWS,
};
