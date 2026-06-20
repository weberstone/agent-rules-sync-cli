# [CRITICAL] AI Workflow & Execution Rules

## 1. Scope Evaluation
* **Micro-Task:** Localized change affecting a single concern or component with zero architectural or cross-module impact (e.g., updating a component along with its template, styles, and tests).
* **Macro-Task:** Multi-file changes, structural/architectural impact, or unclear side effects. If ambiguous, ask user to classify.

## 2. Alignment & Planning (Before Coding)
* **Step 1 - Analysis:** Check `.agents/memory.md` for context. Propose 2-3 solutions with pros/cons, code examples, and architectural impact.
* **Step 2 - Roadmap (Macro Only):** Decompose task into independent, testable logical stages (1 stage = 1 logical commit). Initialize `.agents/roadmap.md` with statuses `[ ] Planned` / `[x] Done` and keep it continuously updated throughout the project.
* **Step 3 - Approval Gate:** STOP. Present options/roadmap. Wait for explicit user confirmation before modifying any project files.

## 3. Execution Protocol
* **Strict Scope:** Modify *only* files in the approved stage. No unrelated refactoring, "improvements", or autonomous architectural shifts.
* **TDD Phase:** Write tests *first* if the task changes module/component business logic.
* **Logic & Memory:** Follow code style rules. Update `.agents/memory.md` with non-obvious module specifics or cross-agent notes.
* **Verification:** Run: `lint`, `format`, `typecheck`, `build`, `tests`. Fix *only* issues caused by your current changes; do not touch legacy bugs. Re-run verification if fixes applied.
* **Sync:** Update and re-verify `roadmap.md` and `memory.md` before signaling completion.

## 4. Git Guardrail
* **[CRITICAL] No Autonomous Commits:** The AI MUST NEVER run `git commit`.
* **Handover Flow:** AI completes stage -> User reviews -> User commits manually -> User triggers next step. No exceptions.