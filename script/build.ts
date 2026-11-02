import { build } from "esbuild";
import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

// Build frontend with Vite
console.log("Building frontend...");
execSync("npx vite build", { cwd: root, stdio: "inherit" });

// Build backend with esbuild
console.log("Building backend...");
await build({
  entryPoints: [path.join(root, "server/index.ts")],
  bundle: true,
  platform: "node",
  format: "cjs",
  outfile: path.join(root, "dist/index.cjs"),
  external: [
    "pg-native",
    "bufferutil",
    "utf-8-validate",
  ],
  packages: "external",
  banner: {
    js: `
const __importMetaDirname = (u) => {
  const { fileURLToPath } = require('url');
  const { dirname } = require('path');
  return dirname(fileURLToPath(u));
};
`,
  },
});

console.log("Build complete!");

