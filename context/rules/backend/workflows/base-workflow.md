# AI Backend Workflow & Execution Rules

These rules define the mandatory backend development workflow for this project.

## 0. Scope Evaluation

Determine task complexity before acting.

### Micro-Task
Small, isolated changes. Execute directly.

Examples:
- configuration tweaks & env updates;
- logging adjustments;
- single-function updates;
- localized bug fixes.

Do NOT create `.agents/roadmap.md` or `.agents/memory.md`.

### Macro-Task
Use the full workflow for:
- new API endpoints / business logic;
- database schema changes & migrations;
- architectural shifts (layers, services, repositories);
- security / auth integrations;
- tasks requiring staged execution.

### Unclear Scope
Briefly explain the ambiguity and ask the user whether to use the Micro or Macro protocol.

---

## 1. Planning Artifacts

Before implementing a Macro-Task, create or update:

- `.agents/roadmap.md` (Global execution plan)
- `.agents/memory.md` (Active scratchpad & state)

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

A stage is LOCKED if any dependency remains `[ ]` or `[-]`.

### DoD (Definition of Done)
Objective completion criteria (e.g., data saved, correct API statuses).

### History
Never delete completed or obsolete stages. Preserve execution history.

---

## 3. Stage Size

Each stage should represent a single reviewable unit of work.

Guideline:

```text
1 Stage ≈ 1 User Commit
```

Do not combine unrelated changes.

---

## 4. Interaction Protocol

For each new stage:

1. Analyze the task.
2. Propose implementation options with brief pros/cons.
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

For testable business logic and API endpoints:

1. Write unit/integration tests first.
2. Implement the minimal logic required to satisfy them.

TDD is optional for:
- raw database migration SQL/scripts;
- seed data / mock scripts;
- infrastructure setup (Docker, CI/CD);
- environment configurations;
- log statements.

---

## 7. Code Generation Rules

### No Lazy Coding

Never generate placeholders such as:

```text
// TODO
// implement later
// ... rest of backend logic
```

Always provide complete implementations within the approved scope.

### Scope Discipline

Modify only files relevant to the current stage.

Avoid unrelated refactors unless explicitly requested.

---

## 8. Verification Protocol

After implementation:

- run lint;
- run formatter;
- run compiler / typecheck;
- run build (if applicable);
- run test suite (unit and integration).

Rules:

- fix only issues introduced by current changes;
- ignore unrelated pre-existing failures;
- never apply blind fixes.

If validation fails:

1. Record the error trace in `memory.md`.
2. Document the suspected root cause.
3. Apply a targeted fix.
4. Re-run validation.

---

## 9. State Synchronization

Before reporting a stage as complete, update:

- `roadmap.md`;
- `memory.md`.

They MUST reflect:

- current progress;
- completed work;
- pending tasks;
- validation status;
- known issues;
- next steps.

State synchronization is part of the Definition of Done.

---

## 10. Repository Rules

### Git Commits

The AI MUST NEVER run git commands to commit code.

Required flow:

1. AI completes the stage.
2. User reviews and verifies (e.g., via Postman, cURL, or tests).
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
- other temporary workflow files created during execution.
```