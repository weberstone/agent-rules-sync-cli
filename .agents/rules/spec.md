# Project Overview: agent-rules-sync-cli

## Tech Stack

- **Runtime**: Node.js (v20+). Strict ESM environment (`"type": "module"` in `package.json`).
- **Language**: TypeScript with strict type checking.
- **Bundler**: `tsup` (Configured to compile the source code and dependencies into a single, minified `index.js` file for fast `npx` execution).
- **CLI UI**: `@clack/prompts` for interactive, beautifully animated terminal prompts; `picocolors` for terminal text styling and success/error logs.
- **Core Modules**: Native Node.js modules ONLY for file operations and networking (`fs/promises`, `path`, `url` for `fileURLToPath`, and native `fetch`).

## Project Architecture

The application is a CLI tool. The architecture strictly separates the CLI execution logic from the rule templates.

### `src/`
The main source directory containing the CLI application logic.

- **`index.ts`**: The main entry point. Orchestrates the CLI flow (Check config -> Run Prompts -> Build -> Output).
- **`config/`**: Logic for handling `.ai-rules-config.json`. Manages the critical distinction between `process.cwd()` (the user's target project path) and the CLI's internal execution path.
- **`prompts/`**: Contains the `@clack/prompts` logic for each step of the questionnaire (Steps 1 through 7 from the documentation).
- **`builder/`**: The core engine. Responsible for reading markdown files, compiling the `package-rules.md` bundle, and writing the final files to the target `.agents/rules/` directory.
- **`utils/`**: Helper functions (e.g., Cthulhu ASCII art logger, file system validators, path resolvers).
- **`templates/`**: Base templates for generating agent-specific entry files (e.g., the structure of a `.cursorrules` or `.clauderc.md` file).

### `rules/`
The "Single Source of Truth" repository structure containing the actual markdown rules that the CLI will copy and compile.

- **`frontend/`**: Contains `architecture.md`, `workflow.md`, and subfolders `frameworks/` and `packages/` for frontend technologies.
- **`backend/`**: Contains `architecture.md`, `workflow.md`, and subfolders `frameworks/` and `packages/` for backend technologies.
- **`projects/`**: Project-specific override folders (e.g., `/projects/<project-name>/spec.md` or `workflow.md`).

## Critical Execution Rules
- **Path Resolution**: The script MUST use `process.cwd()` to determine the target directory where the `.agents/` folder and `ai-rules-config.json` will be created.
- **Dynamic Project Name**: The script MUST dynamically determine the project name using `path.basename(process.cwd())` to search for overrides in the `rules/projects/` directory.
- **ESM Paths**: When reading files from the CLI's own `rules/` directory, use `import.meta.url` and `fileURLToPath` to resolve the correct source directory, NOT `__dirname`.