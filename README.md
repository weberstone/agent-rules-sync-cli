agent-context-sync-cli

Centralized, modular AI agent rules and skills manager. Interactive CLI — generates per-project rule files and installs reusable skills for multiple AI coding agents.

## Quick Start

```bash
# Remote (recommended)
npx github:your-username/agent-context-sync-cli

# Local
git clone https://github.com/your-username/agent-context-sync-cli.git
cd your-project
node ../agent-context-sync-cli/dist/index.js
```

## How It Works

1. Run the CLI in your project root
2. Answer: Sync rules? → interactive questionnaire (architecture, frameworks, packages)
3. Answer: Sync skills? → multiselect from available skills
4. Select AI agents to generate config files for
5. CLI generates `.agents/rules/`, `.agents/skills/`, and agent config files

## Generated Structure

```
your-project/
├── .agents/
│   ├── rules/
│   │   ├── userprompt.md        # Priority 1 (CRITICAL)
│   │   ├── workflow.md          # Priority 2
│   │   ├── spec.md              # Priority 3
│   │   ├── architecture.md      # Priority 4
│   │   ├── <framework>.md       # Priority 5
│   │   └── package-rules.md     # Priority 6 (OPTIONAL)
│   └── skills/
│       ├── angular-dev/         # Folder-based skill
│       │   └── SKILL.md
│       └── code-reviewer.md     # File-based skill
├── CLAUDE.md                    # Claude Code
├── GEMINI.md                    # Gemini CLI
├── AGENTS.md                    # Codex CLI
├── .cursor/rules/               # Cursor
├── .continue/rules/             # Continue.dev
└── ai-rules-config.json
```

## Re-running

The CLI saves `ai-rules-config.json`. On subsequent runs, it asks whether to use the saved config — no need to answer questions again. In CI/CD (non-TTY), the saved config is used automatically.

## Customization

Fork this repository and customize `context/`:

### Rules (`context/rules/`)

- `context/rules/<arch>/userprompt.md` — AI persona (Priority 1)
- `context/rules/<arch>/workflow.md` — Interaction protocol (Priority 2)
- `context/rules/<arch>/architecture.md` — Architecture preferences (Priority 4)
- `context/rules/<arch>/frameworks/<name>.md` — Framework rules (Priority 5)
- `context/rules/<arch>/packages/<name>.md` — Package/tool rules (Priority 6)

### Skills (`context/skills/`)

- **Folder skill**: `context/skills/<name>/SKILL.md` — YAML frontmatter with `name` and `description`. Entire folder copied to `.agents/skills/`.
- **File skill**: `context/skills/<name>.md` — YAML frontmatter with `description`. Copied as-is.
- **Project skills**: `context/projects/<name>/skills/` — always installed for that project.

Example `SKILL.md` frontmatter:

```markdown
---
name: angular-developer
description: Generates Angular code and provides architectural guidance.
license: MIT
---
```

### Project Overrides (`context/projects/<name>/`)

- `rules/` — per-project rule overrides (userprompt.md, architecture.md, workflow.md, spec.md)
- `skills/` — per-project skills (always installed)

Run your fork via `npx github:your-username/your-fork`.