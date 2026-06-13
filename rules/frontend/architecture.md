# Architecture & Design Patterns

To prevent hallucinations and "reinventing the wheel", all architectural decisions must strictly adhere to established software engineering patterns.

## 1. Core Literature & Principles

Your solutions should be heavily inspired by the following industry-standard books:

- **"Design Patterns: Elements of Reusable Object-Oriented Software" (GoF)**: Use established creational, structural, and behavioral patterns (e.g., Factory, Strategy, Observer, Decorator) instead of custom ad-hoc structures.
- **"Clean Architecture" by Robert C. Martin**: Separate concerns. Keep business logic independent of UI frameworks. Depend on abstractions, not concretions.
- **"Domain-Driven Design" (DDD) by Eric Evans**: For complex business logic, organize code around domains, entities, and value objects.

## 2. Anti-Hallucination Protocol

- **Do not invent new architectural patterns**. If a standard pattern fits the problem, use it and explicitly name it in your explanation (e.g., "I will use the Strategy pattern here...").
- Keep the architecture as simple as possible but no simpler (KISS principle).
- Follow SOLID principles meticulously.

## 3. Project-Specific Architecture

- Respect the target architecture defined in the project's main `../../README.md` (e.g., `core/`, `entities/`, `pages/`, `shared/`).
- Use "Smart" (Container) and "Dumb" (Presentational) components to enforce separation of concerns.

## 4. Defensive Programming & Safety

- **Maximize Defense**: Assume all external data (API responses, server payloads, user inputs) can be malformed, missing, or malicious.
- **Graceful Fallbacks**: Always use optional chaining (`?.`), nullish coalescing (`??`), and explicit type guards. The application must never crash or throw unhandled exceptions due to unexpected or missing data in production.
- **Security Guardrails**: Never trust external input. Avoid using `innerHTML` without explicit sanitization via Angular's `DomSanitizer`. Never hardcode secrets or API keys in the frontend code.

## 5. Performance First

- **Optimization by Default**: Write highly performant code by default without waiting to be asked.
- In Angular, this means: strictly use `ChangeDetectionStrategy.OnPush`, prevent memory leaks by always unsubscribing from Observables (using `takeUntilDestroyed` or the `async` pipe), and use deferrable views (`@defer`) for heavy, non-critical components.

## 6. Dependencies & Native Framework Capabilities

- **Maximize Native APIs**: Always prioritize the native features built into the Angular framework and its CDK (e.g., `@angular/animations`, `@angular/cdk/drag-drop`, `@angular/cdk/scrolling`) before reaching for third-party tools.
- **Strict Dependency Control**: You are STRICTLY FORBIDDEN from installing or introducing new third-party NPM libraries without explicit user consent. If you believe a third-package is absolutely necessary, you must propose it, justify why native Angular tools are insufficient, and wait for user approval.

## 7. Directory Structure (Migration in Progress)

The project is currently transitioning to a modular architecture. New features should follow the **Target Structure**, while existing code may still reside in the **Legacy Structure**.
