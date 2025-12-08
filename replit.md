# MAD IDE

## Overview

MAD IDE is a multi-language online code editor supporting Python, C, C++, Java, and SQL. The application provides an integrated development environment with a Monaco-based code editor, input/output panels, and real-time code execution capabilities. Built as a full-stack application, it features a React frontend with shadcn/ui components and an Express backend that handles code compilation and execution.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool.

**UI Component Library**: shadcn/ui (Radix UI primitives) with Tailwind CSS for styling. The design follows a "new-york" style variant with a neutral color scheme and CSS variables for theming.

**Code Editor**: Monaco Editor (the editor that powers VS Code) integrated via `@monaco-editor/react`. Supports syntax highlighting and language-specific features for Python, C, C++, Java, and SQL.

**State Management**: TanStack Query (React Query) for server state management. Local component state uses React hooks. No global state management library is employed.

**Routing**: Single-page application with component-based navigation. The app toggles between a language selection landing page (`Home`) and a code workspace (`Workspace`) based on selected language.

**Theming**: Dark/light mode toggle with persistence to localStorage. Theme is applied via CSS class on the document root.

**Design Philosophy**: Inspired by VS Code, GitHub, Linear, and Replit. Emphasizes developer-first clarity, information density with breathing room, and minimal distraction. Uses Inter/system fonts for interface text and JetBrains Mono/Fira Code for code display.

### Backend Architecture

**Framework**: Express.js with TypeScript running on Node.js.

**Build Process**: Custom build script using esbuild for server bundling and Vite for client bundling. Server dependencies are selectively bundled (allowlist approach) to reduce cold start times.

**Code Execution**: Server spawns child processes to execute user code in isolated temporary directories. Supports compilation (for C, C++, Java) and interpretation (for Python, SQL). Implements execution timeouts (10 seconds) and output size limits (50KB) for security.

**API Structure**: RESTful API with `/api` prefix. Code execution endpoint accepts language type, code content, and optional input.

**Session Management**: Configured with express-session and connect-pg-simple for PostgreSQL-backed sessions (though current implementation uses in-memory storage).

**Middleware**: JSON body parsing with raw body preservation for webhook compatibility. Request logging middleware tracks API calls with timing information.

### Data Storage

**ORM**: Drizzle ORM configured for PostgreSQL with schema definitions in TypeScript.

**Schema Design**:
- `users` table: Basic user authentication with username/password
- `code_files` table: Stores saved code files with filename, language, and content

**Current Implementation**: In-memory storage class (`MemStorage`) used for development. Production would use PostgreSQL via Drizzle ORM.

**Migration Strategy**: Drizzle Kit configured with migrations output to `/migrations` directory. Schema changes are version-controlled.

### External Dependencies

**Database**: PostgreSQL (configured but not actively used in current implementation)

**UI Libraries**:
- Radix UI: Headless component primitives (dialogs, dropdowns, tabs, etc.)
- Tailwind CSS: Utility-first CSS framework
- Lucide React: Icon library
- React Icons: Additional icon set for language logos

**Code Execution**:
- System compilers: gcc (C), g++ (C++), javac (Java)
- Interpreters: Python, SQLite (for SQL execution)

**Development Tools**:
- Vite: Frontend build tool and dev server
- esbuild: Server bundling
- TypeScript: Type safety across full stack
- Replit-specific plugins: Dev banner, cartographer, runtime error overlay

**Styling Utilities**:
- clsx & tailwind-merge: Conditional class name composition
- class-variance-authority: Component variant management

**Form Handling**: React Hook Form with Zod validation schemas via `@hookform/resolvers`

**API Client**: Fetch API with custom wrapper functions for type-safe requests through TanStack Query