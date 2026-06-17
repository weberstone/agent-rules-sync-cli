# Architecture, Design Patterns & Code Style

Strictly adhere to established software engineering patterns. Zero custom ad-hoc structures. No hallucinations.

## 1. Core Principles & Literature
* **GoF:** Use standard patterns (Factory, Strategy, Observer, Decorator). No custom alternatives.
* **Clean Architecture:** Isolate business logic from UI. Depend on abstractions, not concretions.
* **DDD:** Organize complex logic around domains, entities, and value objects.
* **"Clean Code" (Robert C. Martin):** Functions must be small, doing strictly one thing. Prioritize low cognitive load.
* **"Refactoring" (Martin Fowler):** Continuously clean code structure, improve dependency clarity, and reduce architectural debt.

## 2. Anti-Hallucination Protocol
* Do not invent architectural patterns. Use standard ones and explicitly name them in explanations.
* Enforce KISS and SOLID principles meticulously.

## 3. Architecture & Encapsulation
* **Modular Boundaries:** Design modules to be easily extractable into independent packages or services.
* **Developer Documentation:** Strictly follow the project architecture provided by the developer in the project documentation.
* **Domain Modeling:** Enforce module encapsulation: expose public APIs, hide internals. Avoid cross-module imports except through explicit contracts.
* **Composition:** Prefer composition over inheritance.

## 4. Defensive Programming & Safety
* **Zero Trust:** Assume all external data (APIs, payloads, inputs) is malformed, missing, or malicious.
* **Fault Tolerance:** Prevent production crashes. Always use optional chaining (`?.`), nullish coalescing (`??`), and explicit type guards.
* **Security:** Zero hardcoded secrets or API keys.
* **XSS Prevention:** Never inject raw HTML without framework-native or explicit sanitization (e.g., `DomSanitizer`).

## 5. Performance by Default
* **Optimization:** Write implicitly high-performant code without prompt.
* **Rendering:** Optimize change detection to eliminate unnecessary re-renders (e.g., `OnPush`, `memo`, `useMemo`).
* **Memory Management:** Prevent leaks. Always unsubscribe from streams and clean up event listeners on destruction (e.g., `takeUntilDestroyed`, `async` pipe, `useEffect` cleanups).
* **Deferred Loading:** Apply lazy-loading and deferrable views for non-critical assets (e.g., `@defer`, `Suspense`, `lazy`).

## 6. Dependencies & Native First
* **Ecosystem Built-ins:** Prioritize framework core APIs, standard libraries, and native CDKs (e.g., `@angular/cdk`, built-in hooks) before third-party tools.
* **Strict NPM Guardrail:** Installing new third-party NPM libraries is STRICTLY FORBIDDEN without explicit user consent. Propose, justify, and wait for approval.

## 7. Directory Structure
* **Modular Migration:** Apply **Target Structure** to all new features. **Legacy Structure** applies only to existing untouched code.

## 8. Code Style & Low Cognitive Load
* **3-Second Architect Scan:** Write transparent, explicit data flows. Dependencies and logic must be instantly clear at a glance. Avoid "clever" syntax shortcuts.
* **Method Design (Strict SRP):** One method = one precise task. Keep functions short (ideally <20 lines). Split if doing multiple actions.
* **Control Flow:** Eliminate deep nesting (max 2 levels). Use early returns (guard clauses) to handle edge cases first.
* **Semantic Naming:** Use intention-revealing, self-documenting names. Avoid generic terms (`data`, `info`, `temp`) and cryptic abbreviations.
* **No Magic Values:** Extract all raw strings, numbers, and configurations into named constants or enums.

## 9. Documentation & High-Context Comments
* **Explain "Why", Not "What":** Comment exclusively on *why* the code is written this way (architectural decisions, constraints, business logic quirks). Code itself must be self-explanatory.
* **Developer Context:** Provide clean JSDoc/TSDoc for all classes and public methods documenting inputs, outputs, and non-obvious side effects.

## 10. Professional Etiquette & Hygiene
* **Zero Dead Code:** Instantly remove unused imports, dead variables, and old commented-out code blocks.
* **Atomic Modifications:** Focus strictly on the assigned task. Do not mix unrelated refactoring with the current implementation. Fix local warnings silently within your scope.