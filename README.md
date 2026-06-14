# agent-rules-sync-cli

Centralized, modular AI agent rules manager. Interactive CLI — generates per-project rule files for multiple AI coding agents.

## Quick Start

### Remote (recommended)

```bash
npx github:your-username/agent-rules-sync-cli
```

### Local

```bash
git clone https://github.com/your-username/agent-rules-sync-cli.git
cd your-project
node ../agent-rules-sync-cli/dist/index.js
```

## How It Works

1. Run the CLI in your project root
2. Answer questions about your tech stack (architecture, frameworks, packages)
3. The CLI generates `.agents/rules/` with rule files in priority order
4. Agent-specific config files are created (CLAUDE.md, GEMINI.md, AGENTS.md, etc.)

## Generated Structure

```
your-project/
├── .agents/rules/
│   ├── userprompt.md        # Priority 1 (CRITICAL)
│   ├── workflow.md          # Priority 2
│   ├── spec.md              # Priority 3
│   ├── architecture.md      # Priority 4
│   ├── <framework>.md       # Priority 5
│   └── package-rules.md     # Priority 6 (OPTIONAL)
├── CLAUDE.md                # Claude Code
├── GEMINI.md                # Gemini CLI
├── AGENTS.md                # Codex CLI
├── .cursor/rules/           # Cursor
├── .continue/rules/         # Continue.dev
└── ai-rules-config.json     # Saved configuration
```

## Re-running

The CLI saves `ai-rules-config.json` on first run. On subsequent runs, it offers to regenerate from the saved config — no need to answer questions again.

In CI/CD or automated environments (non-TTY), it automatically uses the saved config.

## Customization

Fork this repository and customize the `rules/` directory:

- `rules/<arch>/userprompt.md` — AI persona
- `rules/<arch>/workflow.md` — Interaction protocol
- `rules/<arch>/architecture.md` — Architecture preferences
- `rules/<arch>/frameworks/<name>.md` — Framework rules
- `rules/<arch>/packages/<name>.md` — Package/tool rules
- `rules/projects/<project-name>/` — Per-project overrides

Run your fork via `npx github:your-username/your-fork`.