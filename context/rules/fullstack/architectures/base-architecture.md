# Unified Architecture, Design Patterns & Code Style

Strictly adhere to established software engineering principles. Zero custom ad-hoc structures. No implementation hallucinations.

## 1. Core Principles & Literature
* **GoF & Enterprise Patterns:** Use standard patterns (Factory, Strategy, Observer, Decorator, Repository, DI). No custom alternatives.
* **Clean Architecture & SOLID:** Isolate core business logic from frameworks, UI, and external data drivers. Depend on abstractions, not concretions.
* **DDD (Domain-Driven Design):** Organize complex software layers around domains, aggregates, entities, and value objects.
* **"Clean Code" (Robert C. Martin):** Functions must be small, doing strictly one thing. Prioritize minimal cognitive load.
* **"Refactoring" & Data Integrity:** Continuously improve dependency clarity, manage data consistency boundaries, and systematically reduce technical debt.

## 2. Anti-Hallucination Protocol
* Do not invent architectural patterns or custom abstraction layers. Use industry-standard ones and explicitly name them in explanations.
* Enforce KISS, DRY, and SOLID principles meticulously across all application layers.

## 3. Architecture & Boundary Encapsulation
* **Modular Boundaries:** Design module/package boundaries so they are highly decoupled and ready to be extracted into independent packages, libs, or microservices.
* **Developer Documentation:** Strictly follow the project architecture provided by the developer in the project documentation.
* **Strict Encapsulation:** Expose minimal public APIs/contracts, strictly hiding module internals. Avoid cross-module leaks or circular dependencies.
* **Composition:** Prefer composition over inheritance in object and component design.

## 4. Defensive Programming & Security
* **Zero Trust Input:** Assume all external data (HTTP payloads, API responses, user inputs, configurations) is malformed, missing, or malicious.
* **Fail-Safe Robustness:** Prevent runtime crashes. Always use optional chaining (`?.`), nullish coalescing (`??`), and strict type guards.
* **Data Security & Sanitization:** Zero hardcoded secrets, tokens, or API keys. Safely encode or sanitize all outputs to prevent execution vectors (SQLi, XSS) depending on the environment layer.

## 5. Performance & Resource Management
* **Optimization by Default:** Write implicitly high-performant code without waiting to be asked.
* **Resource Optimization:** Eliminate resource and memory leaks. Always unsubscribe from long-lived streams, clear event listeners, and release database/network connection pools immediately after execution.
* **Deferred & Chunked Operations:** Apply lazy-loading, code-splitting, or chunked stream processing for heavy, non-critical assets or data payloads to optimize time-to-interaction and memory usage.

## 6. Dependencies & Native First
* **Maximize Platform Built-ins:** Always prioritize the platform's/framework's core APIs, official standard libraries, and native CDKs/SDKs before reaching for third-party tools.
* **Strict Dependency Guardrail:** Installing or introducing new third-party packages or NPM libraries is STRICTLY FORBIDDEN without explicit user consent. Propose, justify, and wait for approval.

## 7. Directory Structure
* **Modular Migration:** Apply the defined **Target Structure** to all new features and modules. **Legacy Structure** applies only to existing untouched codebase areas.

## 8. Code Style & Low Cognitive Load
* **3-Second Architect Scan:** Write transparent, explicit data flows. A human architect must instantly read and understand dependencies and logic flows at a glance. Avoid "clever" syntax shortcuts or cryptic abstractions.
* **Method Design (Strict SRP):** One method/function = one precise task. Keep functions short (ideally <20 lines). Split immediately if it handles multiple concerns.
* **Control Flow:** Eliminate deep nesting (maximum 2 levels). Strictly use early returns (guard clauses) to handle validation and edge cases first.
* **Semantic Naming:** Use intention-revealing, self-documenting names. Avoid generic terms (`data`, `info`, `temp`, `obj`) and cryptic abbreviations.
* **No Magic Values:** Extract all raw strings, numbers, configurations, and magic constants into named constants, configurations, or enums.

## 9. Documentation & High-Context Comments
* **Explain "Why", Not "What":** Do not comment on *what* the code does (the code itself must be self-explanatory). Comment exclusively on *why* it is written this way (architectural decisions, constraints, business logic quirks).
* **Rich Context Documentation:** Provide clean JSDoc/TSDoc/Docstrings for all public classes, methods, and modules. Explicitly document inputs, outputs, non-obvious side effects, and critical dependencies.

## 10. Professional Etiquette & Hygiene
* **Zero Dead Code:** Instantly remove unused imports, dead variables, and old commented-out code blocks.
* **Atomic Modifications:** Focus strictly on the assigned task. Do not mix unrelated refactoring with the current implementation. Fix local linter warnings silently within your scope.