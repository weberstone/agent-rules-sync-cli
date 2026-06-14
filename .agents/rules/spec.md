# Project Overview: agent-rules-sync-cli

## Tech Stack

- **Runtime**: Node.js (v20+). Strict ESM environment (`"type": "module"` in `package.json`).
- **Language**: TypeScript with strict type checking.
- **Bundler**: `tsup` (Configured to compile the source code and dependencies into a single, minified `index.js` file for fast `npx` execution).
- **CLI UI**: `@clack/prompts` for interactive, beautifully animated terminal prompts; `picocolors` for terminal text styling and success/error logs.
- **Core Modules**: Native Node.js modules ONLY for file operations and networking (`fs/promises`, `path`, `url` for `fileURLToPath`, and native `fetch`).

## Critical Execution Rules
- **Path Resolution**: The script MUST use `process.cwd()` to determine the target directory where the `.agents/` folder and `ai-rules-config.json` will be created.
- **Dynamic Project Name**: The script MUST dynamically determine the project name using `path.basename(process.cwd())` to search for overrides in the `rules/projects/` directory.
- **ESM Paths**: When reading files from the CLI's own `rules/` directory, use `import.meta.url` and `fileURLToPath` to resolve the correct source directory, NOT `__dirname`.