# [CRITICAL] Architecture, Design Patterns & Code Style

## 1. Core Philosophy
* **Patterns & Paradigms:** Prefer standard GoF (Factory, Strategy, Observer, Decorator), SOLID, Clean Architecture, and DDD. Keep core business logic strictly decoupled from transport protocols (HTTP/WebSockets) and specific database drivers.
* **No Premature Abstraction:** Prefer small, obvious duplication over complex, premature abstractions. Do not extract trivial, single-use logic or transformations into dedicated utility files unless explicit cross-domain reuse is expected.
* **Testing Philosophy:** Test public boundary behavior (AAA structure), never internal method or query-builder chains. Refactoring data-access layers must not break tests if input/output behavior remains identical. Forbid shared mutable state in tests.

## 2. API & Contract Architecture
* **Thin Controllers:** Controllers must be lightweight facades. Role: accept request, delegate to service, return response. Zero business logic or data normalization allowed inside controllers.
* **API Separation:** Strictly split Admin and Public API routes, contracts, and controllers (even within the same domain). Admin routes must leverage primary system identifiers; Public routes should use abstract tokens/slugs where applicable.
* **Ingress Contracts (DTOs):** DTOs are strictly for incoming request payloads (payloads, route params, query queries). Enforce validation at the network boundary. Do not reuse DTO classes for outgoing responses.
* **Egress Responses:** Admin responses may include internal system metadata. Public responses must strictly omit system/audit fields—derive them via explicit response shapes or transport-level exclusions. Do not introduce response mappers if the persistence shape already matches the contract closely.

## 3. Domain Logic & Data Layer
* **Module & File Layout:** Group files by domain modules. Local helpers/transformers must reside in a domain-local `utils/` subdirectory, never in the module root. Use barrel files only for focused subdirectories, not for the entire domain.
* **Service Boundary Rules:** Services own all business logic and domain invariants. A domain service acts as the exclusive public API for other modules; domains must never reach directly into another domain's database models or repositories.
* **Data Portability:** Services should return plain, decoupled data structures or domain entities rather than framework-specific database documents, ensuring reusability across HTTP controllers, CLI commands, or message brokers.
* **Fail-Fast Queries:** Prefer fail-fast data lookups (e.g., auto-throwing `NotFound` exceptions on empty results) over verbose, repetitive manual check blocks inside service methods.

## 4. Error Handling & Defense
* **Infrastructure Error Mapping:** Keep exception filters and error interceptors strictly in the infrastructure layer (`src/core/...`). Domain services must never manually map technical database errors into HTTP-specific status codes.
* **Zero Trust Boundary:** Validate all incoming payloads and external microservice responses at the entry point; assume all external data is malformed.
* **Crash Prevention:** Enforce explicit type guards and runtime checks. Never allow unhandled promise rejections or implicit type coercions to cause server crashes.

## 5. Code Style & Low Cognitive Load
* **Reviewer-First (KISS):** Write code for human reviewers, not compilers. Choose the most readable, explicit approach. Avoid "clever" shorthand tricks or implicit architectural magic.
* **Strict SRP:** One method/function = one precise task. Keep functions short (ideally <20 lines). Split if doing multiple actions; no multi-purpose "combines".
* **Control Flow:** Eliminate deep nesting (max 2 levels). Use early returns (guard clauses) to handle edge cases and validation failures first.
* **Semantic Naming:** Use domain-first, intention-revealing names (`projectQueryService`, `languageAdminController`, not `queryProjectService`, `adminLanguageController`). Avoid generic terms (`data`, `info`, `temp`).
* **High-Context Comments:** Use **TSDoc** (`/** ... */`) for classes/methods to log inputs, outputs, dependencies, and high-level intent (*what/why*). Use **Inline comments** (`//`) inside methods *only* for non-obvious "how" and "why". Strictly avoid trivial "what" comments.