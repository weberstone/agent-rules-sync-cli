# [CRITICAL] Architecture, Design Patterns & Code Style (Fullstack Spec)

## 1. Unified Core Philosophy
* **Patterns & Paradigms:** Prefer standard GoF (Factory, Strategy, Observer, Decorator), SOLID, Clean Architecture, and DDD. Keep business and domain logic strictly decoupled from both UI frameworks (frontend) and transport/database layers (backend).
* **No Premature Abstraction:** Prefer small, obvious duplication over complex, premature abstractions. Do not extract trivial, single-use transformations or helpers into dedicated files unless explicit cross-layer or cross-domain reuse is expected.
* **Testing Philosophy (Khorikov/Bugayenko):** Test public boundary behavior (AAA structure), never internal implementation details (e.g., UI component private states or backend database query chains). Refactoring inner logic must not break tests if observable behavior remains identical. Forbid shared mutable state and loops in tests (prefer `test.each`). Maintain 1:1 mapping between source and test files.

## 2. Fullstack Boundary & Contract Architecture
* **End-to-End Type Safety:** Enforce strict compilation boundaries between Frontend and Backend. Share schemas or contracts using a shared types layer/package, but never leak backend-specific code (Mongoose models, entities, decorators) into the frontend layer.
* **Ingress Contracts (DTOs):** DTOs are strictly for incoming backend request payloads (body, query, params). Enforce validation at the network boundary. Do not reuse DTO classes for outgoing responses or client-side application state.
* **Egress Responses & UI Isolation:** Frontend must consume sanitized data. Backend public responses must omit internal system metadata—derive them via explicit response shapes or transport-level exclusions. Do not expose database document objects directly to the client.

## 3. Layer-Specific Execution Rules

### Frontend Layer
* **View-Layer Isolation:** Components must focus purely on presentation and localized view state. Offload complex data orchestration to state management artifacts or services.
* **Ecosystem & Tools:** Maximize framework core, native CDKs, and currently installed libraries. Never reinvent existing features or install new NPM packages without explicit approval.

### Backend Layer
* **Thin Controllers:** Controllers are lightweight facades. Role: accept request, validate via DTO, delegate to service, return response. Zero business logic or data normalization allowed inside.
* **Service Boundaries:** Services own all business logic and invariants. A domain service acts as the exclusive public API for other modules; domains must never reach directly into another domain's database models or repositories.
* **Fail-Fast Queries:** Prefer fail-fast data lookups (e.g., auto-throwing `NotFound` exceptions on empty results) over verbose, repetitive manual check blocks inside service methods.
* **Infrastructure Error Mapping:** Keep exception filters and error interceptors strictly in the infrastructure layer. Services must never manually map technical database errors into HTTP-specific status codes.

## 4. Safety, Defense & Hygiene
* **Zero Trust Boundary:** Validate all incoming payloads and external API responses at their respective entry points (client inputs on frontend, network ingress on backend). Assume all external data is malformed.
* **Crash Prevention:** Always use optional chaining (`?.`), nullish coalescing (`??`), and explicit runtime type guards.
* **Security:** Never hardcode secrets, tokens, or API keys. Sanitize raw HTML (e.g., using framework-native sanitizers) against XSS vulnerabilities.
* **Clarity & Hygiene:** Instantly remove unused imports, dead variables, and commented-out code blocks.

## 5. Code Style & Low Cognitive Load
* **Reviewer-First (KISS):** Write code for human reviewers, not compilers. Choose the most readable, explicit approach. Avoid "clever" syntax shortcuts, cryptic abbreviations, or hidden magic.
* **Strict SRP:** One method/function = one precise task. Keep functions short (ideally <20 lines). Split if doing multiple actions; no multi-purpose "combines".
* **Control Flow:** Eliminate deep nesting (max 2 levels). Use early returns (guard clauses) to handle edge cases, validation failures, and errors first.
* **Semantic Naming:** Use domain-first, intention-revealing names (`userActive`, `projectQueryService`, not `activeUser`, `queryProjectService`). Avoid generic terms (`data`, `info`, `temp`). Move raw values to constants or enums.
* **High-Context Comments:** Use **TSDoc** (`/** ... */`) for classes/methods to log inputs, outputs, dependencies, and high-level intent (*what/why*). Use **Inline comments** (`//`) inside methods *only* for non-obvious "how" and "why". Strictly avoid trivial "what" comments.