# Cursor — Agent Config Specification

**Source:** [Cursor Forum — Community Testing](https://forum.cursor.com/t/cursorrules-isnt-loaded-in-agent-mode-i-tested-it-heres-what-actually-works/152045), [Cursor Docs](https://cursor.com/docs)

---

## ⚠️ .cursorrules is DEPRECATED for Agent Mode

Legacy single-file `.cursorrules` at project root is **silently ignored in Agent mode** (confirmed by community testing, Feb 2026). It still works for basic Tab completion but does NOT apply to Agent conversations.

**Do NOT generate `.cursorrules`.**

## Current Standard: `.cursor/rules/*.mdc`

### File Location
```
project/
└── .cursor/
    └── rules/
        ├── 00-global.mdc
        ├── 01-typescript.mdc
        └── ...
```

### File Format: YAML Frontmatter + Markdown Body

```markdown
---
description: "Semantic description — agent uses this to decide when to load"
alwaysApply: true
globs: "**/*.ts,**/*.tsx"
---

# Rule Content Here
Markdown body with the actual instructions.
```

### Frontmatter Fields (from community testing)

| Field | Type | Purpose |
|---|---|---|
| `description` | string | Agent embeds this and compares against user query to decide relevance |
| `alwaysApply` | boolean | `true` = always included. `false` = conditional (default) |
| `globs` | string | Comma-separated gitignore-style patterns |

### Four Activation Modes

| `alwaysApply` | `description` | `globs` | Behavior |
|---|---|---|---|
| `true` | any | any | **Always included**. Globs & description ignored |
| `false` | any | provided | **Auto-attached by file match**. Description ignored |
| `false` | provided | not set | **Agent reads description**, pulls in when relevant |
| `false` | not set | not set | **Manual only** — via `@-mention` in chat |

### Glob Pattern Examples

| Pattern | Matches |
|---|---|
| `*.ts` | All `.ts` files in root |
| `**/*.ts` | All `.ts` files anywhere |
| `src/**` | Everything under `src/` |
| `src/**/*.tsx` | All `.tsx` files under `src/` |

## What Our Generator Should Produce

Generate `.cursor/rules/00-agent-rules.mdc` with:

```markdown
---
description: "Project AI agent rules and conventions"
alwaysApply: true
---

# Project AI Rules

This project uses a centralized AI rule management system.
All rules are located in `.agents/rules/`. Load them in priority order:

1. `.agents/rules/userprompt.md` — AI persona (CRITICAL)
2. `.agents/rules/workflow.md` — Interaction protocol
3. `.agents/rules/spec.md` — Project specifications
...

Refer to `.agents/rules/` for the complete rule set.

---
*Managed by `agent-rules-sync-cli`.*
```

**Why `.mdc` not `AGENTS.md`:** Cursor's native mechanism is `.cursor/rules/*.mdc`. Using the native format ensures proper Agent mode support with `alwaysApply: true`.