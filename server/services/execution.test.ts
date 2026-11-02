import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { SupportedLanguage } from "../../shared/types.js";
import { checkExecutionService, executeCode } from "./execution.js";

const originalFetch = globalThis.fetch;
const originalPistonUrl = process.env.PISTON_API_URL;
let capturedRequest: { url: string; init?: RequestInit } | undefined;

afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalPistonUrl === undefined) delete process.env.PISTON_API_URL;
  else process.env.PISTON_API_URL = originalPistonUrl;
  capturedRequest = undefined;
});

function configureMock(
  response: Record<string, unknown> = {
    language: "python",
    version: "3.13.1",
    run: { stdout: "ok\n", stderr: "", code: 0, signal: null },
  },
  runtimes = [
    { language: "python", version: "3.9.0", aliases: ["python3"] },
    { language: "python", version: "3.13.1", aliases: ["python3"] },
    { language: "c", version: "12.2.0", aliases: [] },
    { language: "c++", version: "12.2.0", aliases: ["cpp"] },
    { language: "java", version: "21.0.2", aliases: [] },
    { language: "javascript", version: "22.1.0", aliases: ["js"], runtime: "node" },
    { language: "typescript", version: "5.5.0", aliases: ["ts"] },
    { language: "r", version: "4.4.0", aliases: ["rscript"] },
  ],
) {
  process.env.PISTON_API_URL = `http://localhost:2000/api/v2/test-${Math.random().toString(36).slice(2)}`;
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/runtimes")) {
      return new Response(JSON.stringify(runtimes), { status: 200 });
    }
    capturedRequest = { url, init };
    return new Response(JSON.stringify(response), { status: 200 });
  };
}

test("submits UTF-8 code and stdin using the discovered Piston runtime/version", async () => {
  configureMock({
    language: "python",
    version: "3.13.1",
    run: { stdout: "வணக்கம் ⭐\n", stderr: "", code: 0, signal: null },
  });
  const source = 'print(input() + " ⭐")';
  const stdin = "வணக்கம்";
  const result = await executeCode("python", source, stdin);

  assert.equal(result.status, "success");
  assert.equal(result.stdout, "வணக்கம் ⭐\n");
  assert.equal(result.runtime, "python");
  assert.equal(result.runtimeVersion, "3.13.1");
  assert.equal(result.executionTime, 0);
  assert.equal(capturedRequest?.url, `${process.env.PISTON_API_URL}/execute`);
  const body = JSON.parse(String(capturedRequest?.init?.body)) as {
    language: string;
    version: string;
    files: Array<{ name: string; content: string; encoding: string }>;
    stdin: string;
    run_timeout: number;
    run_memory_limit: number;
  };
  assert.equal(body.language, "python");
  assert.equal(body.version, "3.13.1");
  assert.deepEqual(body.files[0], { name: "main.py", content: source, encoding: "utf8" });
  assert.equal(body.stdin, stdin);
  assert.equal(body.run_timeout, 3_000);
  assert.equal(body.run_memory_limit, 128 * 1024 * 1024);
});

test("maps every requested runtime to the catalog entry and correct source filename", async () => {
  const cases: Array<[SupportedLanguage, string, string]> = [
    ["python", "python", "main.py"],
    ["c", "c", "main.c"],
    ["cpp", "c++", "main.cpp"],
    ["java", "java", "Main.java"],
    ["javascript", "javascript", "main.js"],
    ["typescript", "typescript", "main.ts"],
    ["r", "r", "main.r"],
  ];
  for (const [language, runtime, filename] of cases) {
    configureMock({ language: runtime, version: "1.0.0", run: { stdout: "ok", code: 0 } });
    const result = await executeCode(language, "source");
    const body = JSON.parse(String(capturedRequest?.init?.body)) as {
      language: string;
      files: Array<{ name: string }>;
    };
    assert.equal(result.status, "success", language);
    assert.equal(body.language, runtime, language);
    assert.equal(body.files[0].name, filename, language);
  }
});

test("reports Piston compilation errors and runtime errors without success status", async (t) => {
  await t.test("compilation", async () => {
    configureMock({
      language: "c",
      version: "12.2.0",
      compile: { stdout: "", stderr: "syntax error", output: "syntax error", code: 1, signal: null },
      run: { stdout: "", stderr: "", code: null, signal: null },
    });
    const result = await executeCode("c", "not valid source");
    assert.equal(result.status, "compile_error");
    assert.equal(result.errorType, "Syntax Error");
    assert.match(result.compilationOutput || "", /syntax error/);
  });
  await t.test("runtime", async () => {
    configureMock({
      language: "python",
      version: "3.13.1",
      run: { stdout: "", stderr: "ValueError: invalid value", code: 1, signal: null },
    });
    const result = await executeCode("python", "raise ValueError()");
    assert.equal(result.status, "error");
    assert.equal(result.errorType, "Runtime Error");
    assert.notEqual(result.status, "success");
  });
});

test("distinguishes time and memory limits reported by Piston", async (t) => {
  await t.test("time limit", async () => {
    configureMock({
      language: "python",
      version: "3.13.1",
      run: { stdout: "", stderr: "Time Limit Exceeded", code: null, signal: "SIGKILL" },
    });
    const result = await executeCode("python", "while True: pass");
    assert.equal(result.status, "timeout");
  });
  await t.test("memory limit", async () => {
    configureMock({
      language: "python",
      version: "3.13.1",
      run: { stdout: "", stderr: "Memory Limit Exceeded", code: null, signal: "SIGKILL" },
    });
    const result = await executeCode("python", "allocate memory");
    assert.equal(result.status, "memory_limit");
  });
  await t.test("unknown kill signal", async () => {
    configureMock({
      language: "python",
      version: "3.13.1",
      run: { stdout: "", stderr: "", code: null, signal: "SIGKILL" },
    });
    const result = await executeCode("python", "allocate memory");
    assert.equal(result.status, "error");
    assert.match(result.stderr, /without identifying which resource limit/);
  });
});

test("rejects HTML/CSS and unsupported runtimes without sending them to Piston", async () => {
  configureMock();
  const html = await executeCode("html", "<h1>safe preview</h1>");
  assert.equal(html.status, "unsupported");
  assert.match(html.stderr, /sandboxed browser preview/);
  assert.equal(capturedRequest, undefined);

  configureMock({ language: "python", version: "3.13.1", run: { code: 0 } }, []);
  const unsupported = await executeCode("r", "message('hello')");
  assert.equal(unsupported.status, "unsupported");
  assert.match(unsupported.stderr, /No installed Piston runtime/);
  assert.equal(capturedRequest, undefined);
});

test("rejects invalid and oversized inputs before making requests", async () => {
  configureMock();
  assert.equal((await executeCode("python", " \n")).errorType, "Input Error");
  assert.equal((await executeCode("python", "x".repeat(100_001))).errorType, "Input Error");
  assert.equal((await executeCode("python", "print(1)", "x".repeat(10_001))).errorType, "Input Error");
  assert.equal(capturedRequest, undefined);
});

test("maps unavailable Piston service to an explicit service error", async () => {
  configureMock();
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  const result = await executeCode("python", "print('not run')");
  assert.equal(result.status, "service_error");
  assert.match(result.stderr, /Piston is unavailable/);
});

test("does not confuse Piston request validation errors with missing runtimes", async () => {
  configureMock();
  globalThis.fetch = async (input, init) => {
    if (String(input).endsWith("/runtimes")) {
      return new Response(JSON.stringify([{ language: "python", version: "3.13.1", aliases: [] }]), { status: 200 });
    }
    return new Response(JSON.stringify({ message: "Invalid memory limit value." }), { status: 400 });
  };
  const result = await executeCode("python", "print('ok')");
  assert.equal(result.status, "service_error");
  assert.doesNotMatch(result.stderr, /Unsupported Language/);
});

test("health reports local Piston reachability and runtime inventory", async () => {
  configureMock();
  const health = await checkExecutionService();
  assert.equal(health.configured, true);
  assert.equal(health.reachable, true);
  assert.equal(health.languageCount, 8);
  assert.equal(health.runtimes?.some(({ language }) => language === "python"), true);
});

test("executes SQLite scripts in a worker and returns real rows with Unicode", async () => {
  const result = await executeCode(
    "sql",
    "CREATE TABLE greetings (message TEXT); INSERT INTO greetings VALUES ('வணக்கம் ⭐'); SELECT message FROM greetings;",
  );
  assert.equal(result.status, "success");
  assert.match(result.stdout, /வணக்கம் ⭐/);
  assert.equal(result.stderr, "");
});

test("reports SQLite syntax errors and enforces a query timeout", async (t) => {
  await t.test("syntax error", async () => {
    const result = await executeCode("sql", "SELEC * FROM missing;");
    assert.equal(result.status, "compile_error");
    assert.equal(result.errorType, "Syntax Error");
  });
  await t.test("timeout", async () => {
    const result = await executeCode(
      "sql",
      "WITH RECURSIVE numbers(value) AS (SELECT 1 UNION ALL SELECT value + 1 FROM numbers) SELECT max(value) FROM numbers;",
    );
    assert.equal(result.status, "timeout");
  });
});
