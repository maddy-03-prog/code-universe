import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import type { AIRequest } from "../../shared/types.js";
import { checkAIService, requestAI } from "./ai.js";

const originalFetch = globalThis.fetch;
const originalBaseUrl = process.env.OLLAMA_BASE_URL;
const originalModel = process.env.OLLAMA_MODEL;
let capturedChat: { url: string; init?: RequestInit } | undefined;

afterEach(() => {
  globalThis.fetch = originalFetch;
  restoreEnvironment("OLLAMA_BASE_URL", originalBaseUrl);
  restoreEnvironment("OLLAMA_MODEL", originalModel);
  capturedChat = undefined;
});

function restoreEnvironment(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name];
  else process.env[name] = value;
}

function configureMock(modelInstalled = true) {
  process.env.OLLAMA_BASE_URL = "http://localhost:11434";
  process.env.OLLAMA_MODEL = "qwen2.5-coder:3b";
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    if (url.endsWith("/api/tags")) {
      return new Response(JSON.stringify({
        models: modelInstalled ? [{ name: "qwen2.5-coder:3b" }] : [],
      }), { status: 200 });
    }
    capturedChat = { url, init };
    return new Response(JSON.stringify({
      message: { content: "This program adds two values." },
      prompt_eval_count: 21,
      eval_count: 12,
    }), { status: 200 });
  };
}

const request: AIRequest = {
  action: "ask",
  code: "print(1 + 1)",
  language: "python",
  context: "Why does this print 2?",
  messages: [{ role: "user", content: "Explain the example." }, { role: "assistant", content: "It prints a value." }],
};

test("uses the default local Ollama endpoint and model", async () => {
  delete process.env.OLLAMA_BASE_URL;
  delete process.env.OLLAMA_MODEL;
  globalThis.fetch = async () => new Response(JSON.stringify({ models: [] }), { status: 200 });
  const health = await checkAIService();
  assert.equal(health.model, "qwen2.5-coder:3b");
  assert.equal(health.reachable, true);
  assert.equal(health.modelAvailable, false);
  assert.match(health.message, /ollama pull qwen2.5-coder:3b/);
});

test("sends editor context and conversation to the local Ollama chat API", async () => {
  configureMock();
  const response = await requestAI(request);
  assert.equal(response.result, "This program adds two values.");
  assert.equal(response.tokens, 33);
  assert.equal(capturedChat?.url, "http://localhost:11434/api/chat");
  const body = JSON.parse(String(capturedChat?.init?.body)) as {
    model: string;
    stream: boolean;
    messages: Array<{ role: string; content: string }>;
  };
  assert.equal(body.model, "qwen2.5-coder:3b");
  assert.equal(body.stream, false);
  assert.equal(body.messages[0].role, "system");
  assert.match(body.messages[0].content, /untrusted data/);
  assert.deepEqual(body.messages.slice(1, 3).map(({ role }) => role), ["user", "assistant"]);
  assert.match(body.messages[3].content, /print\(1 \+ 1\)/);
  assert.match(body.messages[3].content, /Why does this print 2/);
});

test("does not call chat when the local model is missing", async () => {
  configureMock(false);
  await assert.rejects(requestAI(request), /ollama pull qwen2.5-coder:3b/);
  assert.equal(capturedChat, undefined);
});

test("reports a stopped local Ollama service without generating a response", async () => {
  configureMock();
  globalThis.fetch = async () => { throw new TypeError("fetch failed"); };
  const health = await checkAIService();
  assert.equal(health.reachable, false);
  assert.match(health.message, /not reachable/);
});

test("rejects remote Ollama URLs rather than forwarding private editor code", async () => {
  process.env.OLLAMA_BASE_URL = "https://example.com";
  const health = await checkAIService();
  assert.equal(health.configured, false);
  assert.match(health.message, /must point to a local Ollama service/);
});
