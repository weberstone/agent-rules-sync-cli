# Centralized AI Agent Rules Manager — CLI Tool

**Problem:** Maintaining up-to-date, consistent AI agent rules across multiple projects.

**Solution:** A centralized rules repository and interactive CLI generator. Common shared rules plus per-project overrides, generated on demand.

**Benefits:**
- Everything in one place
- Per-project rule customization
- Fast sync and update with a single command

---

## How It Works

1. User forks/clones the rules repository to customize templates.
2. Inside the repository, `context/rules/` contains a structured set of template files.
3. In the target project, the user runs the CLI script — either locally (`node path/to/dist/index.js`) or remotely (`npx github:user/repo`).
4. The CLI asks about the project's tech stack interactively.
5. Final rule files are generated into `.agents/rules/` and agent-specific config files (CLAUDE.md, AGENTS.md, .cursorrules, etc.) are created in the project root.

---

## TECHNICAL IMPLEMENTATION

**Overview:** The repository contains a `context/` directory with a defined structure. Template files contain rule fragments that get compiled into a final rule set based on the project's configuration.

- `context/rules/` — general template rules organized by architecture type (frontend, backend, fullstack).
- `context/projects/<project-name>/rules/` — per-project override directories. Before running the CLI, the user can create a folder named after their target project and place custom rule files inside a `rules/` subdirectory. The CLI will prefer these overrides when the project name matches.

---

## RULES DIRECTORY STRUCTURE

### `context/rules/<arch>/userprompt.md` (NEW — CRITICAL PRIORITY)
AI persona definition. Describes the AI agent's role, expertise, and mindset for this architecture type. Examples:
- `context/rules/frontend/userprompt.md` — "You are a dedicated frontend expert..."
- `context/rules/backend/userprompt.md` — "You are a dedicated Node.js backend expert..."
- `context/rules/fullstack/userprompt.md` — "You are a fullstack developer..."

This file is OPTIONAL but highly recommended. If absent, the user is warned and may continue without it — no userprompt.md will be generated in the output. If present, it gets **Priority 1 (CRITICAL)** in agent config files.

**Project override:** `context/projects/<name>/rules/userprompt.md` takes precedence over the general one.

### `context/rules/<arch>/workflow.md`
Interaction protocol between the user and the AI agent. Execution rules, commit standards, TDD requirements, memory management, etc. **Priority 2** in agent config files.

**Project override:** `context/projects/<name>/rules/workflow.md` takes precedence.

### `context/rules/<arch>/spec.md` — only via project override
Project-specific specifications: tech stack, package versions, directory structure conventions. Unlike other files, there is NO general `spec.md` in `rules/<arch>/`. Spec exists ONLY as a project override in `context/projects/<name>/rules/spec.md`. If absent, the file is simply not generated.

### `context/rules/<arch>/architecture.md`
Architecture preferences: SOLID, DDD, Clean Architecture, pattern recommendations, anti-patterns to avoid. **Priority 4** in agent config files.

**Project override:** `context/projects/<name>/rules/architecture.md` takes precedence.

### `context/rules/<arch>/frameworks/<framework>.md`
Framework-specific technical rules and best practices. Does NOT contain persona — persona lives in `userprompt.md`.

**Selection type depends on architecture:**
- `frontend` or `backend`: **radio** (single choice)
- `fullstack`: **multiselect** (can choose multiple frameworks from `context/rules/fullstack/frameworks/` only — does NOT pull from frontend/backend directories)

Output filename matches the source filename (e.g., `angular-guidelines.md`). Multiple framework files for fullstack all get copied to output. **Priority 5** in agent config files.

### `context/rules/<arch>/packages/<package>.md`
Tool/package-specific rules: Tailwind, TypeScript, Angular Material, etc. Contains recommendations, usage examples, constraints. Filename should match the package/tool name.

**Selection type:** multiselect. Selected files are compiled into a single `package-rules.md` with a `# Code Style & Tools` header. If nothing is selected, the file is not created and no link appears in agent config files. **Priority 6 (OPTIONAL)** in agent config files.

---

## PROCESSING FLOW

All messages to the user are in **English**.

### Step 1: Config Discovery
Check for an existing `ai-rules-config.json` in the target project root.

- **No config found** → start the questionnaire (Step 2).
- **Config found** → ask (in English): *"Existing configuration file found. Use it to regenerate rules, or start a fresh questionnaire?"*
  - "Use existing" → skip questionnaire, regenerate from config.
  - "Start fresh" → proceed to Step 2.

### Step 2: Project Spec Check (`spec.md`)
Check if `context/projects/<project-name>/rules/spec.md` exists and is non-empty (where `<project-name>` is derived from `path.basename(process.cwd())`).

- **Exists and non-empty** → proceed to Step 3.
- **Missing or empty** → show a message (in English) explaining the user can create a project-specific spec. Ask: *"Continue without project specifications?"*
  - "Continue" → proceed to Step 3.
  - "Cancel" → exit.

### Step 3: Architecture Type Selection
Dynamically check which architecture directories exist in `context/rules/` and present them as options (radio):

- `Frontend` (if `context/rules/frontend/` exists)
- `Backend` (if `context/rules/backend/` exists)
- `Fullstack` (if `context/rules/fullstack/` exists)

### Step 3b: Userprompt Check (`userprompt.md`) — NEW
Check for userprompt. Priority: project override → general.

- `context/projects/<name>/rules/userprompt.md` exists and non-empty → use it.
- Otherwise, `context/rules/<arch>/userprompt.md` exists and non-empty → use it.
- **Missing or empty** → warning (in English): *"Userprompt file not found. It is highly recommended to create one to define the AI persona for this architecture. Continue without it?"*
  - "Continue" → no `userprompt.md` generated in output, no link in agent files.
  - "Cancel" → exit.

### Step 4: Framework Selection
Based on the architecture selected in Step 3:

- **Frontend / Backend:** Read `context/rules/<arch>/frameworks/`, present as **radio** selection.
- **Fullstack:** Read `context/rules/fullstack/frameworks/` ONLY, present as **multiselect**.

If the frameworks directory is empty or missing → warning + ask *"Continue without framework rules?"*

### Step 5: Package Selection
Based on the architecture selected in Step 3, read `context/rules/<arch>/packages/` and present as **multiselect**.

If the packages directory is empty or missing → warning + ask *"Continue without package rules?"*

### Step 6: Workflow (`workflow.md`)
Priority: project override (`context/projects/<name>/rules/workflow.md`) → general (`context/rules/<arch>/workflow.md`).

If the selected file is missing or empty → warning + ask *"Continue without workflow rules?"*

### Step 7: AI Agent Selection
Ask the user which AI agents they use (multiselect): Claude Code, Claude CLI, Gemini, Gemini CLI, Codex, Cursor, Continue, etc. For each selected agent, a corresponding config file is generated in the project root.

**Existing file handling (e.g., CLAUDE.md / .cursorrules):**
- **No existing file:** Create a new structured file with links to `.agents/rules/`.
- **Existing file found:** Ask (in English):
  > ⚠️ Existing file `<filename>` found. What should be done?
  > `[Overwrite]` Replace with generated rules (Recommended).
  > `[Append]` Keep current content, prepend a link to `.agents/rules/`.
  > `[Skip]` Don't touch this file.

### Step 8: Completion & Config Save
Save `ai-rules-config.json` with the user's answers. Print an ASCII Cthulhu art and a success message listing all created files. Print a large recommendation to add `ai-rules-config.json` to `.gitignore`.

---

## OUTPUT STRUCTURE (TARGET PROJECT)

```
<project-root>/
├── .agents/rules/
│   ├── userprompt.md        # Priority 1 (CRITICAL) — AI persona
│   ├── workflow.md          # Priority 2 — interaction protocol
│   ├── spec.md              # Priority 3 — project specifications
│   ├── architecture.md      # Priority 4 — architecture preferences
│   ├── <framework>.md       # Priority 5 — framework tech rules (may be multiple for fullstack)
│   └── package-rules.md     # Priority 6 (OPTIONAL) — compiled tool rules
├── CLAUDE.md                # Agent config (if Claude Code selected)
├── AGENTS.md                # Agent config (if Claude Code selected)
├── .cursorrules             # Agent config (if Cursor selected)
└── ai-rules-config.json     # Saved questionnaire answers
```

### Priority Order in Agent Config Files

| Priority | File | Description |
|----------|------|-------------|
| 1 (CRITICAL) | `.agents/rules/userprompt.md` | AI persona and role definition |
| 2 | `.agents/rules/workflow.md` | Interaction protocol, execution rules |
| 3 | `.agents/rules/spec.md` | Project-specific stack and structure |
| 4 | `.agents/rules/architecture.md` | Architectural principles and constraints |
| 5 | `.agents/rules/<framework>.md` | Framework-specific tech rules |
| 6 (OPTIONAL) | `.agents/rules/package-rules.md` | Tool/package-specific rules |

---

## TECH STACK

### Runtime & Language
- **Platform:** Node.js v20+. ESM (`"type": "module"`).
- **Language:** TypeScript with strict type checking. Compiled to JS before distribution.

### Dependencies
- `@clack/prompts` — interactive terminal UI (animations, radio, multiselect, spinners)
- `picocolors` — lightweight terminal text coloring
- `tsup` (dev) — single-file bundler for fast `npx` execution

### Native Node.js Modules
- `fs/promises` — async file operations
- `path` — cross-platform path resolution
- `url` — `fileURLToPath` for ESM path resolution

### Execution Modes
1. **Local:** `node path/to/agent-rules-sync-cli/dist/index.js` — templates read from local clone
2. **Remote:** `npx github:user/agent-rules-sync-cli` — package downloaded to npm cache, templates read from cache. No git clone in user project. Private repos require SSH keys configured with GitHub.

### Path Resolution
- **Source (templates):** Resolved via `import.meta.url` + `fileURLToPath` — relative to the script location
- **Target (output):** `process.cwd()` — where the user runs the terminal
- **Project name:** `path.basename(process.cwd())` — used to find overrides in `rules/projects/`

---

## FAQ

**Where is the script stored?**
In the same repository as the rules ("server" side). The repo contains both `context/` (templates) and `src/` (CLI code).

**How is the script invoked?**
Two ways:
1. Locally: `node ../path-to/agent-rules-sync-cli/dist/index.js`
2. Remotely: `npx github:user/agent-rules-sync-cli`

**How is the project name determined?**
Dynamically via `path.basename(process.cwd())`. The directory name of the target project is used to find overrides in `context/projects/`.