# Architecture

## Overview

`agent-rules-sync-cli` — CLI tool on Node.js/TypeScript. Runs in the target project root, asks interactive questions about the tech stack, and generates AI agent rule files.

### Execution Modes

| Mode | Command | Template source |
|---|---|---|
| Local | `node path/to/agent-rules-sync-cli/dist/index.js` | Local repo clone |
| Remote | `npx github:user/agent-rules-sync-cli` | npm cache (downloaded temporarily) |

Templates (`context/`) are included in the npm package via `"files": ["dist/", "context/"]`. In both modes the script reads templates relative to `import.meta.url`. Remote mode does NOT git-clone into the user's project — npm downloads to its cache, the script runs, output goes to `process.cwd()`.

### System Diagram

```
┌──────────────────────────────────────┐
│  agent-rules-sync-cli (package)      │
│  ┌────────────┐  ┌────────────────┐  │
│  │  context/  │  │  dist/index.js │  │
│  │  (templates)│  │  (CLI code)    │  │
│  └────────────┘  └────────────────┘  │
└──────────────────┬───────────────────┘
                   │ node / npx
                   ▼
┌──────────────────────────────────────┐
│  Target project ($CWD)               │
│  ┌──────────────────────────────────┐│
│  │ .agents/rules/                   ││
│  │  ├── userprompt.md     (P1)      ││
│  │  ├── workflow.md       (P2)      ││
│  │  ├── spec.md           (P3)      ││
│  │  ├── architecture.md   (P4)      ││
│  │  ├── <framework>.md    (P5)      ││
│  │  └── package-rules.md  (P6, opt.)││
│  ├── CLAUDE.md                      ││
│  ├── AGENTS.md                      ││
│  ├── .cursorrules                   ││
│  └── ai-rules-config.json           ││
└──────────────────────────────────────┘
```

---

## Core Principles

1. **Zero-config first run.** No config → questionnaire.
2. **Config-driven repeat runs.** Config allows skipping the questionnaire.
3. **Source of Truth on CLI side.** Templates live in the `agent-rules-sync-cli` package. Target project gets only compiled output.
4. **Project overrides.** User can create `context/projects/<name>/` in their fork with custom versions of `userprompt.md`, `spec.md`, `architecture.md`, `workflow.md`. These take precedence over general templates.
5. **Minimum dependencies.** `@clack/prompts` + `picocolors`. Everything else — native Node.js.
6. **Single-file bundle.** `tsup` compiles `src/` into `dist/index.js`.

---

## Directory Structure

```
agent-rules-sync-cli/
├── src/
│   ├── index.ts                  # Entry point, orchestrator
│   ├── config/
│   │   ├── config.types.ts       # Config, Architecture types
│   │   └── config.service.ts     # Read/write/validate config
│   ├── utils/
│   │   ├── paths.ts              # Source/target path resolution
│   │   ├── log.ts                # Colored terminal output
│   │   └── fs.ts                 # File system helpers
│   ├── discovery/
│   │   ├── discovery.types.ts    # TemplateCategory type
│   │   └── discovery.service.ts  # Scan context/rules/ directory
│   ├── prompts/                  # Questionnaire (Stage 5)
│   ├── compiler/                 # Rules compilation (Stage 6)
│   ├── generators/               # Agent file generators (Stage 7)
│   └── output/                   # File writing (Stage 8)
├── context/rules/                  # Templates (included in npm package)
│   ├── frontend/
│   │   ├── userprompt.md         # AI persona (OPTIONAL but recommended)
│   │   ├── architecture.md
│   │   ├── workflow.md
│   │   ├── frameworks/
│   │   │   └── *.md
│   │   └── packages/
│   │       └── *.md
│   ├── backend/
│   │   └── ... (same structure)
│   ├── fullstack/
│   │   └── ... (same structure)
│   └── projects/                 # Per-project overrides
│       └── <project-name>/
│           ├── userprompt.md     # Optional
│           ├── spec.md
│           ├── architecture.md   # Optional
│           └── workflow.md       # Optional
├── dist/                         # Compiled bundle (not in git)
├── package.json
├── tsconfig.json
├── tsup.config.ts
└── docs/
```

---

## Data Flow

```
User runs npx/node
         │
         ▼
  ┌──────────────┐    ┌─────────────────┐
  │ 1. Config?   │─yes─▶ Use existing   │
  └──────┬───────┘    │ config?         │
         │ no         ├── Yes → skip    │
         ▼            │   questionnaire │
  ┌──────────────┐    └──┬──────┬───────┘
  │ 2. Spec check│       │      │ No → questionnaire
  └──────┬───────┘       │      ▼
         ▼               │  ┌───────────────────┐
  ┌──────────────┐       │  │ 3. Architecture   │──▶ Frontend/Backend
  │ Questionnaire│       │  └───────────────────┘    /Fullstack (dynamic)
  │ (steps 3-7)  │       │         │
  └──────┬───────┘       │         ▼
         │               │  ┌───────────────────┐
         ▼               │  │ 3b. Userprompt    │──▶ project override
  ┌──────────────┐       │  └───────────────────┘    or general
  │ 8. Compile   │◀──────┘         │
  │    rules     │                 ▼
  └──────┬───────┘        ┌───────────────────┐
         │                │ 4. Framework      │──▶ frontend/backend: radio
         ▼                └───────────────────┘    fullstack: multiselect
  ┌──────────────┐                 │           (own dir only, no mixing)
  │ 9. Generate  │                 ▼
  │    agent     │        ┌───────────────────┐
  │    files     │        │ 5. Packages       │──▶ multiselect
  └──────┬───────┘        └───────────────────┘
         │                         │
         ▼                         ▼
  ┌──────────────┐        ┌───────────────────┐
  │10. Write     │        │ 6. Workflow       │──▶ project override
  │    config    │        └───────────────────┘    or default
  └──────┬───────┘                 │
         ▼                         ▼
  ┌──────────────┐        ┌───────────────────┐
  │11. Done +    │        │ 7. Agents         │──▶ multiselect
  │   ASCII art  │        └───────────────────┘
  └──────────────┘
```

---

## Key Design Decisions

### 1. Source vs Target Paths

```
Source (templates):  path.dirname(fileURLToPath(import.meta.url)) + '/context/rules/'
Target (output):     process.cwd()
```

### 2. Project Name Detection

```ts
const projectName = path.basename(process.cwd());
```

### 3. Priority: Project Override → General Template → Skip

For `userprompt.md`, `architecture.md`, `workflow.md`:
1. `context/projects/<projectName>/rules/<file>.md` (if exists and non-empty)
2. `context/rules/<arch>/<file>.md` (general template)
3. Skip with warning

For `spec.md`: only from project override. If absent → skip (no warning, normal).

### 4. Config File

Format: JSON. Name: `ai-rules-config.json`. Location: `process.cwd()`.

```json
{
  "version": 1,
  "projectName": "my-app",
  "architecture": "fullstack",
  "frameworks": ["angular-guidelines", "only-node"],
  "packages": ["tailwind", "typescript"],
  "agents": ["claude-code", "cursor"],
  "hasUserprompt": true,
  "lastSync": "2026-06-14T12:00:00Z"
}
```

- `frameworks`: always an array. Single-element for frontend/backend, multi-element for fullstack.
- `hasUserprompt`: whether userprompt.md was found and included.
- `packages`: empty array if nothing selected.

### 5. Compiling package-rules.md

Concatenation with a header:

```md
# Code Style & Tools

<content of first selected file>

<content of second selected file>
```

If nothing selected → file not created, no link in agent files.

### 6. Bundling Strategy

`tsup` compiles `src/` → `dist/index.js`. `context/rules/` is NOT bundled — read at runtime. Both included in npm package: `"files": ["dist/", "context/"]`.

### 7. Output Files

| Output file | Source |
|---|---|
| `userprompt.md` | Project override or `context/rules/<arch>/userprompt.md`. Skip if both absent. |
| `spec.md` | `context/projects/<name>/rules/spec.md` only. Skip if absent. |
| `architecture.md` | Project override or `context/rules/<arch>/architecture.md` |
| `workflow.md` | Project override or `context/rules/<arch>/workflow.md` |
| `<framework>.md` | Selected file(s) from `context/rules/<arch>/frameworks/`. Original filename preserved. Single for frontend/backend, multiple for fullstack. |
| `package-rules.md` | Compilation from selected `context/rules/<arch>/packages/*.md`. Optional. |

### 8. Fullstack Architecture

- Directory: `context/rules/fullstack/` — same structure as frontend/backend.
- Framework selection: **multiselect** from `context/rules/fullstack/frameworks/` ONLY. Does NOT pull from frontend/backend directories.
- No merging logic — fullstack rules are written by the user as a self-contained set.
- Shown in questionnaire only if `context/rules/fullstack/` directory exists (dynamic via `getAvailableArchitectures()`).

### 9. Userprompt — Separate Persona File

- Persona extracted from framework files into `context/rules/<arch>/userprompt.md`.
- Framework files now contain only technical rules — no persona.
- Userprompt gets **Priority 1 (CRITICAL)** in agent config files.
- If `userprompt.md` is not found (neither project nor general), the questionnaire warns but allows continuing. No `userprompt.md` is generated in output, and no link appears in agent files.

---

## Priority Order in Agent Config Files

| Priority | File | Description |
|----------|------|-------------|
| 1 (CRITICAL) | `.agents/rules/userprompt.md` | AI persona and role definition |
| 2 | `.agents/rules/workflow.md` | Interaction protocol, execution rules |
| 3 | `.agents/rules/spec.md` | Project-specific stack and structure |
| 4 | `.agents/rules/architecture.md` | Architectural principles and constraints |
| 5 | `.agents/rules/<framework>.md` | Framework-specific tech rules |
| 6 (OPTIONAL) | `.agents/rules/package-rules.md` | Tool/package-specific rules |

---

## Module Responsibilities

| Module | Responsibility |
|---|---|
| `index.ts` | Orchestration. Entry point. |
| `config/` | Read, write, validate `ai-rules-config.json`. |
| `utils/` | Path resolution, colored logging, fs helpers. |
| `discovery/` | Scan `context/rules/` — available architectures, frameworks, packages, project overrides. |
| `prompts/` | Interactive questionnaire via `@clack/prompts`. No business logic. |
| `compiler/` | Assemble output `.md` files: copy + compile package-rules.md. |
| `generators/` | Generate agent-specific files (CLAUDE.md, .cursorrules, etc.). |
| `output/` | Write files to `process.cwd()`, overwrite/append/skip logic. |

---

## Error Handling Strategy

1. **Pre-flight:** Verify `context/rules/` is accessible before starting.
2. **Graceful degradation:** Template file not found/empty → warn, ask to continue.
3. **No write permission:** Clear error, exit.
4. **Cancelled questionnaire (Ctrl+C):** Clean exit, nothing created.
5. **Error during generation:** Notify user. Partially created `.agents/` possible, user warned.