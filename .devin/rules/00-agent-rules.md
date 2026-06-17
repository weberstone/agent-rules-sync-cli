<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->
---
trigger: always_on
description: "Project AI agent rules and conventions — always loaded into every session"
---

# Project AI Rules

## Core Directives
At initialization, open and read every file referenced in the Rule Manifest below and load into context. Do not skip any — each file contains instructions that override default behavior.
When executing tasks, follow the rules defined in these files. If a local rule conflicts with general knowledge, the local rule takes precedence.

## Rules

All rules are located in `.agents/rules/`. Load them in priority order:

1. `.agents/rules/userprompt.md` — Agent role, persona, and behavioral guidelines
2. `.agents/rules/workflow.md` — Task execution workflow and interaction protocols
4. `.agents/rules/architecture.md` — Architectural constraints and design principles
6. `.agents/rules/package-rules.md` — Tool and package configuration rules
---
*This file is managed by `agent-context-sync-cli`. Do not modify manually.*
<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->
