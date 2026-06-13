# AI Workflow & Execution Rules (Backend Edition)

This document defines the strict step-by-step process you MUST follow when solving tasks in this project.

## 1. Task Breakdown & Stages

If a task is large or complex, break it down into logical stages.

- **1 Stage = 1 Logical Commit**.
- **CRITICAL REPOSITORY RULE**: The AI is STRICTLY FORBIDDEN from running `git commit`. The required flow is: 1) AI finishes the stage. 2) User reviews and verifies. 3) USER creates the git commit manually. 4) User tells the AI to proceed to the next stage.
- Do not attempt to implement a massive feature in a single shot.

## 2. The Interaction Loop (Strict Protocol)

For each stage, follow this exact sequence:

1. **Analyze & Propose**: Propose multiple architectural/implementation options to solve the task. List the Pros and Cons for each option.
2. **Wait for Selection**: Stop and wait for the user to choose the best option.
3. **Drafting**: Once an option is chosen, discuss it by providing code examples/drafts.
4. **Refine**: Make adjustments based on user feedback.
5. **Confirmation**: Only AFTER the user explicitly confirms the plan, you may start applying changes to the actual project files.

## 3. Test-Driven Development (TDD)

When writing new logic (and where appropriate):

- **Write Tests First**: Since we already discussed the expected behavior, write the tests first. Use **Jest** (or Vitest) for unit tests (Services/Logic) and **Supertest** for E2E tests (Controllers/Endpoints).
- **Implement Logic**: Write the main implementation code to make the tests pass.

## 4. Post-Stage Verification & Debugging

Immediately after finishing the implementation for a stage, you MUST:

- Run the Linter and Formatter (e.g., `npm run lint` / `npm run format`).
- Run the application build (`npm run build`) and type check to ensure no compilation errors are introduced.
- Run tests (`npm run test` for unit, `npm run test:e2e` for endpoints) if applicable to the modified logic.
- **Scope of Fixes**: If the linter or build fails, fix ONLY the errors caused by your current changes. Do NOT touch, fix, or refactor pre-existing errors in unrelated files.
- **Self-Correction Protocol**: If a build or linter check fails, NEVER apply blind fixes or guess. First, analyze the error trace, write the hypothesized root cause in `.agents/memory.md`, and only then apply a targeted fix.

## 5. Code Generation Strictness

- **No Lazy Coding**: Never use placeholders like `// ... rest of the code here` or `// implement logic here`. Always generate the full, working code block. Do not truncate existing logic unless explicitly instructed.

## 6. Context Preservation (Memory File)

To avoid losing context during long discussions:

- Create and maintain a temporary file at `.agents/memory.md`.
- Use this file as your "scratchpad". Document the current stage, chosen approaches, pending bugs, DB migration plans, and immediate next steps.
- Update this file continuously as requirements change or steps are completed.

## 7. Cleanup

Upon completing the entire task:

- Ask the user if everything is finalized and working correctly.
- If the user confirms, ask for permission to delete the `.agents/memory.md` file and clean up any other temporary files generated during the process.