# Gemini CLI — Agent Config Specification

**Source:** [Gemini CLI Docs](https://geminicli.com/docs), [Memory Management](https://geminicli.com/docs/cli/tutorials/memory-management/)

---

## File Format

| Property | Value |
|---|---|
| **Filename** | `GEMINI.md` |
| **Location** | Project root (`./GEMINI.md`) |
| **Format** | Plain Markdown, UTF-8 |
| **Max size** | No hard limit (1M+ token context window) |
| **Import syntax** | `@file.md` — inline expansion |

## Loading Hierarchy

| Level | Path | Scope |
|---|---|---|
| Global (User) | `~/.gemini/GEMINI.md` | All projects |
| Ancestor Dirs | Parent directories up to `.git` root | Upward scan |
| Project Root | `./GEMINI.md` | Current repository |
| Subdirectory | `./src/GEMINI.md` | Module/component scoped |

**Loading order:** Global → Ancestor (upward) → Subdirectories (downward)

## Key Features

- **`@import` directives**: `@AGENTS.md` or `@.agents/rules/workflow.md`
- **Custom filename**: overridable via `context.fileName` in settings
- **`/memory add <text>`**: slash command to add to global GEMINI.md
- **`/memory show`**: print loaded instructions
- **`/memory reload`**: force reload context

## Policy Engine (Separate)

TOML-based at `~/.gemini/policies/*.toml` — for programmatic tool-use guardrails. Not relevant for rules generation.

## Settings

`.gemini/settings.json` at project or user level. Key: `context.fileName` overrides the rules filename.

## Skills

Follows Agent Skills open standard: `.gemini/skills/<name>/SKILL.md` with YAML frontmatter (`name`, `description`).

## What Our Generator Should Produce

A `GEMINI.md` at the project root that:
1. References `.agents/rules/` with `@import` directives
2. Uses `@.agents/rules/userprompt.md`, `@.agents/rules/workflow.md`, etc.
3. Flat structure — Gemini CLI handles 1M+ tokens, no need to be terse