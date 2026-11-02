import type { SupportedLanguage } from "../../../shared/types";

export const LANGUAGE_TEMPLATES: Record<SupportedLanguage, string> = {
  python: `# Python — CODE UNIVERSE
def main():
    print("Hello, Code Universe!")

if __name__ == "__main__":
    main()
`,
  javascript: `// JavaScript — CODE UNIVERSE
function main() {
  console.log("Hello, Code Universe!");
}

main();
`,
  typescript: `// TypeScript — CODE UNIVERSE
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet("Code Universe"));
`,
  r: `# R — CODE UNIVERSE
message("Hello, Code Universe!")
`,
  java: `// Java — CODE UNIVERSE
public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Code Universe!");
    }
}
`,
  c: `// C — CODE UNIVERSE
#include <stdio.h>

int main() {
    printf("Hello, Code Universe!\\n");
    return 0;
}
`,
  cpp: `// C++ — CODE UNIVERSE
#include <iostream>
using namespace std;

int main() {
    cout << "Hello, Code Universe!" << endl;
    return 0;
}
`,
  html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>My Page</title>
  <style>
    body {
      font-family: sans-serif;
      background: #0f0f0f;
      color: #e0e0e0;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
    }
    h1 { color: #3b82f6; }
  </style>
</head>
<body>
  <h1>Hello, Code Universe!</h1>
  <script>
    console.log("Script running!");
  </script>
</body>
</html>
`,
  css: `/* CSS — CODE UNIVERSE */
:root {
  --primary: #3b82f6;
  --background: #0f0f0f;
  --text: #e0e0e0;
}

body {
  background: var(--background);
  color: var(--text);
  font-family: sans-serif;
  margin: 0;
  padding: 2rem;
}

h1 {
  color: var(--primary);
  font-size: 2rem;
}
`,
  sql: `-- SQL — CODE UNIVERSE
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);

INSERT INTO users (name, email) VALUES
  ('Alice', 'alice@example.com'),
  ('Bob', 'bob@example.com');

SELECT * FROM users;
`,
  json: `{
  "name": "code-universe",
  "version": "2.0.0",
  "description": "One Universe. Every Language. Infinite Possibilities.",
  "features": [
    "Multi-language editor",
    "Code execution",
    "AI assistant",
    "Practice problems",
    "Web playground"
  ]
}
`,
};

export const LANGUAGE_DISPLAY: Record<SupportedLanguage, { label: string; ext: string; monacoLang: string }> = {
  python: { label: "Python", ext: "py", monacoLang: "python" },
  javascript: { label: "JavaScript", ext: "js", monacoLang: "javascript" },
  typescript: { label: "TypeScript", ext: "ts", monacoLang: "typescript" },
  r: { label: "R", ext: "r", monacoLang: "r" },
  java: { label: "Java", ext: "java", monacoLang: "java" },
  c: { label: "C", ext: "c", monacoLang: "c" },
  cpp: { label: "C++", ext: "cpp", monacoLang: "cpp" },
  html: { label: "HTML", ext: "html", monacoLang: "html" },
  css: { label: "CSS", ext: "css", monacoLang: "css" },
  sql: { label: "SQL", ext: "sql", monacoLang: "sql" },
  json: { label: "JSON", ext: "json", monacoLang: "json" },
};

export const EXECUTABLE_LANGUAGES: SupportedLanguage[] = [
  "python", "javascript", "typescript", "java", "c", "cpp", "r", "sql",
];

export const ALL_LANGUAGES: SupportedLanguage[] = [
  "python", "javascript", "typescript", "java", "c", "cpp", "r", "html", "css", "sql", "json",
];
