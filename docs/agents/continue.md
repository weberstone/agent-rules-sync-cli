# Continue.dev — Agent Config Specification

**Source:** [Continue Docs](https://docs.continue.dev/reference), [Config Reference](https://docs.continue.dev/reference)

---

## Primary Config Format

Continue.dev uses **`config.yaml`** as the primary configuration (not Markdown). The older `config.json` is deprecated.

### Locations

| Level | Path |
|---|---|
| Global (user) | `~/.continue/config.yaml` |
| Project | `.continue/config.yaml` |

### Required Top-Level Fields

```yaml
name: My Config
version: 1.0.0
schema: v1
```

## Rules Mechanism

Rules are **Markdown (`.md`)** files in `.continue/rules/`:

```markdown
<!-- .continue/rules/01-global.md -->

---
globs: "**/*.py"
---

# Python Rules
- Python 3.12+. Type hints on all signatures.
```

### Predictive Lexicographic Ordering

Files loaded in filename order — use numeric prefixes:
```
.continue/rules/
  00-global.md
  01-python.md
  02-typescript.md
```

### Inline Rules in config.yaml

```yaml
rules:
  - Give concise responses
  - Always assume TypeScript
```

Or from hub/file:
```yaml
rules:
  - uses: file://user/Desktop/rules.md
```

## Agent File Auto-Detection

Continue **automatically detects** agent files at the workspace root: `AGENT.md`, `CLAUDE.md`, `AGENTS.md`, etc. — and converts them into rules. This means if we generate `CLAUDE.md` or `AGENTS.md` for other agents, Continue will use it automatically.

## What Our Generator Should Produce

**Minimal approach:** Nothing separate needed. Continue auto-detects `CLAUDE.md` / `AGENTS.md` generated for other agents.

**Full approach:** Generate `.continue/rules/00-ai-rules.md` with `alwaysApply: true` and a reference to `.agents/rules/`.

Recommendation: generate a single `.continue/rules/00-agent-rules.md` with `alwaysApply: true` that links to `.agents/rules/` files.