# CLAUDE.md

You are operating within a project that uses a centralized, modular AI rule management system.

## 🧠 Core Directives
1. **SSOT (Single Source of Truth)**: Your instructions live in `.agents/rules/`.
2. **Priority Order**: You must load and adhere to these files in the priority defined below.
3. **No Generalization**: If a local rule exists, it overrides any general knowledge, framework best practices, or default AI behavior.

## 🔗 Rule Manifest & Priority (Load in order)

| Priority | File Path | Description |
| :--- | :--- | :--- |
| 1 (CRITICAL) | `@.agents/rules/workflow.md` | Interaction protocol, TDD rules, commit standards, and memory management. |
| 2 (REQUIRED) | `@.agents/rules/spec.md` | Project-specific stack, folder structure, and domain definitions. |
| 3 (REQUIRED) | `@.agents/rules/architecture.md` | Architectural principles, SOLID, and pattern constraints. |
| 4 (REQUIRED) | `@.agents/rules/frameworkname.md` | Framework-specific personas and core technical constraints. |
| 5 (OPTIONAL) | `@.agents/rules/package-rules.md` | Tool-specific rules (Tailwind, TypeScript, I18n, etc.). |

## 🛠 Usage Instructions
- **Initialization**: Always read the priority list above before any task.
- **Pathing**: All paths in this project are relative to the project root. Do not suggest changes that deviate from the directory structure defined in `spec.md`.
- **Constraint Enforcement**: If you propose code that violates these rules, you must stop, self-reflect on the rules provided in `.agents/rules/`, and correct your proposal BEFORE outputting.

---
*This file is managed by `agent-rules-sync-cli`. Do not modify this file manually unless you intend to bypass the sync mechanism.*