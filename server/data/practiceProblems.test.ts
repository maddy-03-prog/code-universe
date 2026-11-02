import assert from "node:assert/strict";
import { test } from "node:test";
import { storage } from "../storage.js";

test("seeds 75 unique practice problems evenly across difficulty levels", async () => {
  const problems = await storage.getProblems({});
  const counts = problems.reduce((result, problem) => {
    result[problem.difficulty] = (result[problem.difficulty] || 0) + 1;
    return result;
  }, {} as Record<string, number>);

  assert.equal(problems.length, 75);
  assert.deepEqual(counts, { beginner: 25, intermediate: 25, advanced: 25 });
  assert.equal(new Set(problems.map((problem) => problem.id)).size, problems.length);
  assert.equal(new Set(problems.map((problem) => problem.slug)).size, problems.length);
});

test("every problem has examples, hidden tests, and six executable language templates", async () => {
  const problems = await storage.getProblems({});
  const languages = ["python", "c", "cpp", "java", "javascript", "typescript"];
  const sudoku = problems.find((problem) => problem.title === "Sudoku Solver");
  assert.ok(sudoku);
  const sudokuCases = sudoku.testCases as Array<{ input: string; expected: string; hidden: boolean }>;
  const sudokuPublicCase = sudokuCases.find((testCase) => !testCase.hidden);
  const sudokuHiddenCase = sudokuCases.find((testCase) => testCase.hidden);
  assert.ok(sudokuPublicCase);
  assert.ok(sudokuHiddenCase);
  assert.equal(sudokuHiddenCase.input, sudokuPublicCase.expected);
  assert.equal(sudokuHiddenCase.expected, sudokuPublicCase.expected);

  for (const problem of problems) {
    const cases = problem.testCases as Array<{ input: string; expected: string; hidden: boolean }>;
    const starters = problem.starterCode as Record<string, string>;
    assert.ok(problem.examples?.length, `${problem.title} is missing examples`);
    assert.ok(problem.inputFormat, `${problem.title} is missing input format`);
    assert.ok(problem.outputFormat, `${problem.title} is missing output format`);
    assert.ok(problem.constraints, `${problem.title} is missing constraints`);
    assert.ok(cases.some((testCase) => !testCase.hidden), `${problem.title} is missing a public test`);
    assert.ok(cases.some((testCase) => testCase.hidden), `${problem.title} is missing a hidden test`);
    assert.deepEqual(problem.supportedLanguages, languages);
    for (const language of languages) {
      assert.ok(starters[language]?.trim(), `${problem.title} is missing ${language} starter code`);
    }
  }
});
