# CODE UNIVERSE

**One Universe. Every Language. Infinite Possibilities.**

CODE UNIVERSE is a React/TypeScript coding workspace with an Express API. The current app includes a dashboard, Monaco editor, browser playground, practice problems, session-based authentication, local Piston execution, and a local Ollama coding assistant.

## Requirements

- Node.js 20.12 or newer
- npm
- Docker Desktop with the Linux container engine for isolated local Piston execution
- Ollama and the `qwen2.5-coder:3b` model for local AI
- PostgreSQL is optional; without `DATABASE_URL`, local development uses in-memory storage

## Install and run

```powershell
npm install
Copy-Item .env.example .env
# Set PISTON_API_URL and OLLAMA_BASE_URL in .env; no API keys are needed.
npm run dev
```

Open `http://localhost:3001`. The development server serves the Vite frontend and API from the same origin.

## Local free execution and AI

The backend sends code only to the loopback Piston service. Do not expose Piston's API to the public internet. The Piston container requires Docker's privileged-container support for its isolation model; the CODE UNIVERSE application does not expose Docker access or run submitted programs on its Express host.

### Start self-hosted Piston on Windows

Install Docker Desktop if needed, start it, and verify that the Linux container engine is ready:

```powershell
winget install --exact --id Docker.DockerDesktop
Start-Process "$Env:ProgramFiles\Docker\Docker\Docker Desktop.exe"
docker info
```

In the project directory, start the official Piston container with persistent package storage bound to loopback only. If it is already created, run `docker start piston_api` rather than creating it again.

```powershell
docker run --privileged --mount type=volume,source=code-universe-piston,target=/piston --restart unless-stopped --name piston_api -p 127.0.0.1:2000:2000 -d ghcr.io/engineer-man/piston
Invoke-RestMethod http://localhost:2000/api/v2/runtimes
powershell -ExecutionPolicy Bypass -File .\script\setup-piston.ps1
```

The setup script discovers packages from Piston's local `/api/v2/packages` endpoint, installs the latest listed Python, C, C++, Java, and JavaScript packages, and verifies the installed runtime catalog. TypeScript and R are installed if this Piston package catalog provides them; R is optional. Check the service with `docker ps --filter name=piston_api` and `docker logs --tail 50 piston_api`.

The [official Piston installation guide](https://github.com/engineer-man/piston#installation) also documents cloning its repository and starting `docker-compose up -d api`; the [official API v2 reference](https://github.com/engineer-man/piston/blob/master/docs/api-v2.md) describes runtime discovery, execution, and package installation. Its public API is no longer freely available as of February 2026; this project uses the self-hosted API and requires no public API authorization or billing.

### Start local Ollama

Install Ollama with its official Windows installer and download the configured model:

```powershell
irm https://ollama.com/install.ps1 | iex
ollama pull qwen2.5-coder:3b
Invoke-RestMethod http://localhost:11434/api/tags
```

Ollama normally starts its local service after installation. If it is not running, start `ollama serve` in a separate PowerShell window. The application uses Ollama's local [`/api/chat` endpoint](https://docs.ollama.com/api/chat); it does not require an OpenAI key or send editor code to a paid cloud API.

### Environment and application startup

The `.env.example` values work with the local services above. Copy the file to `.env` and check these entries:

```dotenv
PISTON_API_URL=http://localhost:2000/api/v2
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5-coder:3b
```

Then start the application from the project root:

```powershell
npm run dev
```

Health checks: `http://localhost:3001/api/execution/health` and `http://localhost:3001/api/ai/health`. Both integrations default to loopback URLs and reject remote hosts to prevent forwarding user code to an arbitrary service.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start the Express API with the Vite development frontend |
| `npm run check` | Run the TypeScript compiler |
| `npm run test:execution` | Test isolated execution service request handling and UTF-8 decoding |
| `npm run test:ai` | Test Ollama local-model selection, request context, and failure handling |
| `npm run test:practice` | Verify practice problem counts, uniqueness, hidden tests, and language starters |
| `npm run build` | Build the frontend and bundled production server |
| `npm start` | Start the production server (run after `npm run build`) |
| `npm run db:push` | Apply the Drizzle schema to a PostgreSQL database |

## Environment configuration

The server loads `.env` at startup. Copy `.env.example` to `.env`; do not commit real credentials.

| Variable | Required | Purpose |
| --- | --- | --- |
| `SESSION_SECRET` | Yes outside local development | Secret used to sign session cookies. Supply a long, random value. |
| `PORT` | No | HTTP port; defaults to `3001`. |
| `PISTON_API_URL` | No | Local Piston API base URL; defaults to `http://localhost:2000/api/v2`. Must use a loopback host. |
| `OLLAMA_BASE_URL` | No | Local Ollama base URL; defaults to `http://localhost:11434`. Must use a loopback host. |
| `OLLAMA_MODEL` | No | Locally installed Ollama model; defaults to `qwen2.5-coder:3b`. Download it with `ollama pull qwen2.5-coder:3b`. |
| `DATABASE_URL` | For durable storage | PostgreSQL connection string. When set, Drizzle/PostgreSQL backs application data and sessions; when absent, development uses in-memory storage. |
| `UPLOAD_DIR` | No | Directory for profile photo files; defaults to `uploads`. Use a persistent volume in deployment. |

For local PowerShell use, set variables in the same terminal before starting the server:

```powershell
$env:SESSION_SECRET = "use-a-long-random-local-value"
$env:PISTON_API_URL = "http://localhost:2000/api/v2"
$env:OLLAMA_BASE_URL = "http://localhost:11434"
$env:OLLAMA_MODEL = "qwen2.5-coder:3b"
$env:DATABASE_URL = "postgresql://..."
npm run dev
```

Do not commit real secrets.

`GET /api/execution/health` reports Piston connectivity and installed runtimes. `GET /api/ai/health` reports Ollama connectivity and whether the selected model is installed. Piston runtime versions are discovered from its local catalog. Execution requests have source/input/output limits and bounded compile, run, and memory settings. SQL runs in a separate, time-limited worker using an in-memory SQLite database. HTML and CSS are handed to the existing sandboxed browser preview.

## Current architecture and implementation status

- **Frontend:** React 18, TypeScript, Vite, Wouter, TanStack Query, Tailwind CSS, Monaco Editor.
- **Backend:** Express, Zod validation, PostgreSQL-backed storage and session store when `DATABASE_URL` is set; in-memory storage is retained for local development without a database.
- **Editor:** Multi-language Monaco UI, tabs, resizable output/input/AI panels, local Piston-backed execution, and HTML/CSS preview in the existing sandboxed playground. Saving project editor contents to the file API is not wired yet.
- **Playground:** HTML/CSS/JavaScript preview in a sandboxed iframe, console forwarding, responsive preview sizes, and ZIP download.
- **Practice:** Original seeded sample problems, problem detail/editor, custom-input execution, and sample test submission.
- **Authentication:** Registration/login routes and UI with password hashing and server sessions. PostgreSQL-backed sessions and records persist when `DATABASE_URL` is configured.
- **Profile and settings:** Profile editing, JPG/PNG/WebP photo upload (3 MB maximum), theme/accent/editor preferences, privacy setting, and recent activity. Photos are stored on disk under `UPLOAD_DIR`; use persistent storage in deployment.
- **AI:** The editor assistant uses the local Ollama chat API, supports editor-code context and in-panel conversation history, and reports when Ollama or its model is unavailable. Chat history remains in browser component state; the current database schema has no AI chat persistence table.

The practice catalog is seeded with 75 original problems (25 beginner, 25 intermediate, 25 advanced). Each has sample and hidden test cases, statement metadata, and starter templates for Python, C, C++, Java, JavaScript, and TypeScript.

## Production work still required

Before deploying this as a multi-user coding platform:

1. Provide production PostgreSQL credentials, then apply the schema with `npm run db:push`.
2. Install Docker Desktop and Ollama, start the local services, run `script/setup-piston.ps1`, verify both health endpoints, and run real compiler/model tests. Those desktop applications are not currently installed in this workspace, so live Piston and Ollama behavior has not been validated here.
3. Use a persistent, web-served `UPLOAD_DIR` (or replace local disk storage with managed object storage) in deployment.
4. Configure HTTPS, a strong session secret, secure cookies, rate limiting appropriate to the deployment, and monitoring.
5. Add automated frontend tests and test on the target deployment environment.

The Piston adapter sends source and standard input as UTF-8 and preserves Unicode output. Docker/Piston runtime availability depends on the package list supplied by the installed Piston image; the application reports missing runtimes instead of claiming they ran.
