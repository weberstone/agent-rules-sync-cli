# AI Fullstack Workflow & Execution Rules

These rules define the mandatory fullstack development workflow for this project.

## 0. Scope Evaluation

Determine task complexity before acting.

### Micro-Task
Small, isolated changes confined to a single layer. Execute directly.

Examples:
- localized UI styling tweaks or typos;
- environment variable updates;
- single utility function updates;
- isolated frontend or backend bug fixes.

Do NOT create `.agents/roadmap.md` or `.agents/memory.md`.

### Macro-Task
Use the full workflow for cross-cutting features, architectural changes, or fullstack synchronization:
- end-to-end features (Database + API Endpoint + UI Component);
- database schema mutations and migrations;
- updates to shared types, contracts, DTOs, or API schemas;
- cross-boundary state management and client-server integration;
- large-scale refactoring affecting both frontend and backend layers.

### Unclear Scope
Briefly explain the ambiguity and ask the user whether to use the Micro or Macro protocol.

---

## 1. Planning Artifacts

Before implementing a Macro-Task, create or update:

- `.agents/roadmap.md` (Global execution plan for frontend and backend)
- `.agents/memory.md` (Active scratchpad, boundary contracts, & state)

---

## 2. Roadmap Rules

Each stage in `roadmap.md` MUST contain:

### Goal
Expected outcome.

### Tasks
Use these statuses:

```text
[ ] Planned
[-] Implemented, awaiting verification
[x] Verified
```

### Dependencies
List required prerequisites.

A stage is LOCKED if any dependent layer (e.g., API/DB readiness for frontend consumption) remains `[ ]` or `[-]`.

### DoD (Definition of Done)
Objective completion criteria spanning the affected layers (e.g., data saved, API functional, UI integration successful).

### History
Never delete completed or obsolete stages. Preserve execution history.

---

## 3. Stage Size

Each stage should represent a single reviewable unit of work.

Guideline:

```text
1 Stage ≈ 1 User Commit
```

*Note: For large end-to-end features, prefer separating backend foundations (migrations, APIs) and frontend integration into distinct sequential stages to keep commits atomic.*

---

## 4. Interaction Protocol

For each new stage:

1. Analyze the task.
2. Propose implementation options with brief pros/cons covering both frontend and backend implications.
3. Wait for user selection or adjustments.
4. Synchronize the approved plan to `roadmap.md` and `memory.md`.
5. Obtain explicit approval before implementation.
6. Implement the agreed scope.

Re-approval is required only when the approved scope changes.

---

## 5. Scope Changes

If requirements change:

- preserve roadmap history;
- never rewrite past stages;
- append new stages/tasks;
- document rationale in `memory.md`.

---

## 6. Testing

For testable business logic, API endpoints, and critical UI state:

1. Write unit/integration tests first.
2. Implement the minimal logic required to satisfy them.

TDD is optional for:
- raw SQL migrations or mock data seeds;
- presentation-only components, templates, and raw styling;
- infrastructure configurations (Docker, CI/CD, build tools);
- logging statements.

---

## 7. Code Generation Rules

### No Lazy Coding

Never generate placeholders such as:

```text
// TODO: Connect frontend to API
// implement backend logic later
// ... rest of code
```

Always provide complete, functional implementations across all affected layers within the approved scope.

### Scope Discipline

Modify only files relevant to the current stage.

Avoid unrelated refactors unless explicitly requested.

---

## 8. Verification Protocol

After implementation, execute validations for all affected layers:

- run lint;
- run formatter;
- run typecheck / compiler checks;
- run application or module builds;
- run test suite (frontend, backend, and integration).

Rules:

- fix only issues introduced by current changes;
- ignore unrelated pre-existing failures;
- never apply blind fixes.

If validation fails:

1. Record the error trace and context in `memory.md`.
2. Document the suspected root cause.
3. Apply a targeted fix.
4. Re-run validation.

---

## 9. State Synchronization

Before reporting a stage as complete, update:

- `roadmap.md`;
- `memory.md`.

They MUST reflect:

- current progress across tech stacks;
- completed work;
- pending tasks;
- validation status;
- known integration issues;
- next steps.

State synchronization is part of the Definition of Done.

---

## 10. Repository Rules

### Git Commits

The AI MUST NEVER run git commands to commit code.

Required flow:

1. AI completes the stage.
2. User reviews and verifies (via UI interaction, API clients, or automated tests).
3. User creates the commit manually.
4. User instructs the AI to continue.

---

## 11. Cleanup

After the user confirms that the entire task is complete:

1. Ask whether temporary agent artifacts should be removed.
2. Delete them only after explicit permission.

Artifacts may include:

- `.agents/roadmap.md`;
- `.agents/memory.md`;
- other temporary fullstack workflow files created during execution.
```