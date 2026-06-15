# AI Workflow & Execution Rules (Fullstack Edition)

This document defines the strict step-by-step process you MUST follow when solving tasks in this project.

## 1. Task Breakdown & Stages

If a task is large or complex, break it down into logical stages.

- **1 Stage = 1 Logical Commit**.
- **CRITICAL REPOSITORY RULE**: The AI is STRICTLY FORBIDDEN from running `git commit`. The required flow is: 1) AI finishes the stage. 2) User reviews and verifies. 3) USER creates the git commit manually. 4) User tells the AI to proceed to the next stage.
- Do not attempt to implement a massive feature in a single shot.

## 2. The Interaction Loop (Strict Protocol)

For each stage, follow this exact sequence:

1. **Analyze & Propose**: Propose multiple architectural/implementation options. List the Pros and Cons for each.
2. **Wait for Selection**: Stop and wait for the user to choose the best option.
3. **Drafting**: Once an option is chosen, provide code examples/drafts.
4. **Refine**: Adjust based on user feedback.
5. **Confirmation**: Only AFTER the user explicitly confirms the plan, start applying changes to the actual project files.

## 3. Fullstack Development Order

When building a feature, work in this order:

1. **Shared types/validation schemas** (Zod, TypeScript interfaces)
2. **Backend API endpoint** with tests
3. **Frontend UI** consuming the endpoint
4. **End-to-end integration** with Playwright/Cypress

## 4. Test-Driven Development (TDD)

- **Write Tests First**: Use **Vitest** for unit tests, **Testing Library** for components, **Playwright** for E2E.
- **Implement Logic**: Write the implementation code to make the tests pass.

## 5. Post-Stage Verification

Immediately after finishing a stage, you MUST:

- Run `npm run typecheck` (frontend + backend)
- Run `npm run lint` and `npm run format`
- Run `npm test` for both frontend and backend
- Run `npm run build` to verify compilation
- **Scope of Fixes**: Fix ONLY errors caused by your current changes. Do NOT touch pre-existing errors in unrelated files.
- **Self-Correction Protocol**: Analyze error traces, write the hypothesized root cause in `.agents/memory.md`, then apply a targeted fix.

## 6. Code Generation Strictness

- **No Lazy Coding**: Never use placeholders. Always generate the full, working code block.
- Do not truncate existing logic unless explicitly instructed.

## 7. Context Preservation (Memory File)

- Maintain `.agents/memory.md` as your scratchpad.
- Document current stage, chosen approaches, pending bugs, and next steps.
- Update continuously as requirements change.

## 8. Cleanup

Upon completing the task:
- Ask the user if everything is finalized.
- If confirmed, ask for permission to delete `.agents/memory.md` and any temporary files.