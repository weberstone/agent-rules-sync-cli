# [CRITICAL] Architecture, Design Patterns & Code Style (Frontend Spec)

## 1. Core Philosophy
* **Patterns & Principles:** Prefer standard GoF (Factory, Strategy, Observer, Decorator), SOLID, Clean Architecture, and DDD. Keep business logic strictly independent of UI components and framework view-layers.
* **No Premature Abstraction:** Prefer small, obvious duplication over complex, premature abstractions. Do not extract trivial one-line transformations or single-use local helpers into separate files unless explicit reuse is expected.
* **Testing (Khorikov/Bugayenko):** Test public behavior, never internal implementation details. Refactoring inner logic must not break tests if observable behavior remains unchanged. Strictly forbid shared mutable state and loops inside tests (prefer `test.each`).

## 2. Framework Architecture & Ecosystem
* **Up-to-Date Tech:** Use only current official framework/library documentation. Always verify latest APIs via MCP, tools, or web search; never guess.
* **Modularity:** Expose strict public APIs, hide internals. Cross-module dependencies via explicit contracts only. Modules/features must be easily extractable.
* **Composition:** Prefer composition over inheritance.
* **Ecosystem & Tools:** Maximize framework core, native CDKs, and currently installed libraries (animations, UI, drag-drop). Never reinvent existing features or install new NPM packages without explicit approval.
* **Directory Structure:** Apply **Target Structure** to all new features. **Legacy Structure** applies only to untouched code.

## 3. Safety & Defense
* **Zero Trust:** Validate all external inputs and API responses; assume malformed or malicious data.
* **Crash Prevention:** Always use optional chaining (`?.`), nullish coalescing (`??`), and explicit type guards.
* **Security:** Never hardcode secrets, tokens, or API keys. Sanitize raw HTML (e.g., using `DomSanitizer`) against XSS vulnerabilities.

## 4. Code Style & Low Cognitive Load
* **Reviewer-First (KISS):** Write code for human reviewers, not compilers. Choose the most readable, explicit approach. Strictly avoid "clever" syntax shortcuts, cryptic abbreviations, or hidden magic.
* **Strict SRP:** One method/function = one precise task. Keep functions short (ideally <20 lines). Split if doing multiple actions; no multi-purpose "combines".
* **Control Flow:** Eliminate deep nesting (max 2 levels). Use early returns (guard clauses) to handle edge cases and errors first.
* **Semantic Naming:** Use domain-first, intention-revealing names (`userActive`, `languageSelected`, not `activeUser`, `selectedLanguage`). Avoid generic terms (`data`, `info`, `temp`). Move raw strings and magic numbers to constants or enums.
* **Clarity & Hygiene:** Instantly remove unused imports, dead variables, and commented-out code blocks.
* **High-Context Comments:** Use **TSDoc** (`/** ... */`) for classes/methods to log inputs, outputs, dependencies, and high-level intent (*what/why*). Use **Inline comments** (`//`) inside methods *only* for non-obvious "how" and "why". Strictly avoid trivial "what" comments.