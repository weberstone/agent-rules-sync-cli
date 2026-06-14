# Claude Code — Agent Config Specification

**Source:** [Claude Code Docs](https://docs.anthropic.com/en/docs/claude-code), [CLAUDE.md Guide](https://www.morphllm.com/claude-md-guide)

---

## File Format

| Property | Value |
|---|---|
| **Filename** | `CLAUDE.md` |
| **Location** | Project root (`./CLAUDE.md`) |
| **Format** | Plain Markdown, UTF-8 |
| **Max recommended size** | 200 lines (300 absolute max, ~50 used by system prompt) |
| **Import syntax** | `@path/to/file.md` — inline expansion, up to 5 levels of recursion |

## Loading Hierarchy

| Priority | Path | Scope |
|---|---|---|
| 1 (highest) | Managed Policy (`/Library/Application Support/ClaudeCode/CLAUDE.md`) | Org-wide |
| 2 | `~/.claude/CLAUDE.md` | User-wide, all projects |
| 3 | `./CLAUDE.md` or `./.claude/CLAUDE.md` | Project root, committed |
| 4 | `./CLAUDE.local.md` | Personal, auto-gitignored |
| 5 | Parent dir `CLAUDE.md` (monorepo walk-up) | Loaded at launch |
| 6 | Subdirectory `CLAUDE.md` | On-demand when reading that dir |

## .claude/ Directory Structure

```
project/
├── CLAUDE.md              # Main project config (committed)
├── CLAUDE.local.md        # Personal overrides (gitignored)
├── .claude/
│   ├── settings.json      # Hooks, permissions, MCP
│   ├── settings.local.json
│   ├── rules/             # Path-scoped rules (.md + YAML frontmatter)
│   ├── skills/            # SKILL.md workflows
│   ├── commands/          # Slash command definitions
│   └── hooks/             # Event-driven shell scripts
```

## .claude/rules/ — Path-Scoped Rules

Files with YAML frontmatter and `paths` field:

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API Design Rules
- All handlers return { data, error } shape
```

## @import Syntax

```markdown
See @README.md for project overview.
See @docs/api-patterns.md for API conventions.
See @.agents/rules/workflow.md for interaction protocol.
```

- Max recursion: 5 levels
- Path: relative to the file containing the import

## What Our Generator Should Produce

A `CLAUDE.md` at the project root that:
1. References `.agents/rules/` directory with `@import` or inline table
2. Lists rules in priority order (userprompt P1 → workflow P2 → ... → package-rules P6)
3. Uses `@.agents/rules/<file>.md` imports for each priority file