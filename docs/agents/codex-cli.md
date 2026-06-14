# OpenAI Codex CLI — Agent Config Specification

**Source:** [Codex CLI — Advanced Configuration](https://developers.openai.com/codex/config-advanced), [Codex CLI — AGENTS.md Guide](https://developers.openai.com/codex/guides/agents-md)

---

## Project Guidance: AGENTS.md

AGENTS.md is Codex CLI's mechanism for project-level instructions. Confirmed from official OpenAI docs.

| Property | Value |
|---|---|
| **Filename** | `AGENTS.md` |
| **Format** | Plain Markdown, no YAML frontmatter required |
| **Max size** | 32 KiB default (`project_doc_max_bytes` config) |
| **Override file** | `AGENTS.override.md` (in same directory, replaces AGENTS.md) |
| **Fallback filenames** | Configurable via `project_doc_fallback_filenames` |

## Discovery Hierarchy

```
~/.codex/AGENTS.md          ← Global (user-level, all projects)
  └── <repo>/AGENTS.md      ← Project root (team-shared)
        └── <cwd>/AGENTS.md  ← Module/subdirectory specific
```

**Resolution at each level:** `AGENTS.override.md` → `AGENTS.md` → fallback filenames

**Merge:** Concatenated from root down, joined with blank lines. Closer to cwd = later in combined prompt. Stops at current directory.

## No Formal Schema

Codex docs explicitly state: no strict schema, no YAML frontmatter required. Content is freeform Markdown. Recommended sections:

```markdown
## Working agreements
- Use `pnpm` when installing dependencies
- Run `pnpm test` before committing

## Repository expectations
- All functions must have type hints
- Linting passes before PR
```

## Key Behaviors

- **No caching**: Codex rebuilds the instruction chain on every run
- **Overrides replace** (not merge): `AGENTS.override.md` in a directory causes Codex to skip `AGENTS.md` in that same directory
- **Truncation**: Combined content stops at `project_doc_max_bytes` (default 32 KiB)

## What Our Generator Should Produce

An `AGENTS.md` at the project root:

```markdown
# AGENTS.md

This project uses a centralized AI rule management system.
Your instructions live in `.agents/rules/`. Load these files in priority order:

| Priority | File | Description |
|----------|------|-------------|
| 1 (CRITICAL) | `.agents/rules/userprompt.md` | AI persona |
| 2 | `.agents/rules/workflow.md` | Interaction protocol |
| 3 | `.agents/rules/spec.md` | Project specifications |
| 4 | `.agents/rules/architecture.md` | Architecture principles |
| 5 | `.agents/rules/<framework>.md` | Framework rules |
| 6 (OPTIONAL) | `.agents/rules/package-rules.md` | Tool rules |

---
*Managed by `agent-rules-sync-cli`.*
```

Note: Codex also reads `CLAUDE.md` if listed in `project_doc_fallback_filenames`.