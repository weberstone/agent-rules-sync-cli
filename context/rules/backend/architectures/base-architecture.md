# Backend Architecture, Design Patterns & Code Style

Strictly adhere to established backend engineering patterns. Zero custom ad-hoc structures. No hallucinations.

## 1. Core Principles & Literature
* **GoF & Enterprise Patterns:** Use Integration, Creational, and Behavioral patterns (Dependency Injection, Strategy, Repository, CQRS).
* **Clean Architecture & Onion:** Isolate core domain logic from external frameworks, HTTP controllers, and Database/ORM layers.
* **DDD (Domain-Driven Design):** Model complex domains using Aggregates, Entities, Value Objects, Repositories, and Domain Events.
* **"Enterprise Application Architecture" (Martin Fowler):** Focus on data integrity, transaction boundaries, and efficient concurrency management.
* **"Designing Data-Intensive Applications" (Martin Kleppmann):** Prioritize system scalability, data consistency models, and network partition tolerance.

## 2. Anti-Hallucination Protocol
* Do not invent custom architectural abstraction layers. Stick to framework-standard modules/providers and explicitly name patterns used.
* Enforce KISS, SOLID, and 12-Factor App principles meticulously.

## 3. Architecture & Module Encapsulation
* **Modular Monolith / Microservices Ready:** Design strict module boundaries. Modules must interact only via public interfaces/contracts or internal event buses, making them ready to be extracted into separate services.
* **Developer Documentation:** Strictly follow the project architecture provided by the developer in the project documentation.
* **Decoupled Data Layer:** Business logic must not depend directly on database schemas or ORM models. Use Data Transfer Objects (DTOs) and Mappers.
* **Dependency Injection:** Strictly rely on the framework’s DI container. Never instantiate services manually via `new`.

## 4. Defensive Programming, Security & Input Validation
* **Zero Trust Input:** Assume all incoming HTTP payloads, query params, and headers are corrupted or malicious.
* **Strict Class-Validator / Schema Guardrails:** Enforce payload validation at the network edge (e.g., using Pipes/Middlewares). Strip all non-whitelisted properties instantly.
* **Security & Token Hygiene:** Zero hardcoded secrets, database credentials, or API keys. Load strictly from `process.env` with type-safe configuration validation at startup.
* **SQL Injection & OWASP Top 10:** Use ORM query builders or parameterized queries exclusively. Raw strings in queries are strictly forbidden.

## 5. Performance, Database & Resource Management
* **Database Optimization:** Write implicitly performant database queries. Avoid N+1 query problems; always use explicit relations loading, joins, or pagination.
* **Index Awareness:** Ensure queries leverage existing database indexes. Never perform full-table scans on high-throughput endpoints.
* **Memory Management & Streams:** Use streams or chunk-by-chunk processing for heavy data exports, imports, or file parsing. Prevent heap out-of-memory crashes.
* **Connection Pooling:** Ensure all external connections (DB, Redis, MQ) reuse connection pools and clean up or release clients immediately after execution.

## 6. Dependencies & Native Ecosystem First
* **Maximize Framework Built-ins:** Prioritize core framework utilities, official modules (e.g., NestJS `@nestjs/config`, `@nestjs/CQRS`, `@nestjs/bull`), and native Node.js APIs before reaching for third-party NPM packages.
* **Strict NPM Guardrail:** Installing new third-party NPM libraries is STRICTLY FORBIDDEN without explicit user consent. Propose, justify, and wait for approval.

## 7. Directory Structure & Layers
* **Layered Isolation:** Enforce standard backend directory separation: `Controllers/Resolvers` (HTTP/GraphQL transport) -> `Services/UseCases` (Business logic) -> `Repositories/Entities` (Data access).

## 8. Code Style & Low Cognitive Load
* **3-Second Architect Scan:** Write transparent, explicit data flows. A human architect must instantly trace how a request moves from route handler to database and back. Avoid cryptic syntax.
* **Transaction Control:** Be explicit about database transactions. Wrap multi-entity writes in managed transactions; ensure rollback on any atomic failure.
* **Control Flow & Early Returns:** Eliminate deep nesting (max 2 levels). Use early guard clauses for authorization, validation, and edge-case failures first.
* **No Magic Values:** Extract error codes, status values, and configurations into named constants or enums.

## 9. Robust Error Handling & Logging
* **Fail-Safe Global Filters:** All unexpected errors must be caught by global exception filters. Never leak raw database stack traces or internal errors to the client.
* **Contextual Structured Logging:** Log all operational failures with clear context (e.g., Module, Service, RequestID). Do not use plain `console.log`; use structured logger levels (`error`, `warn`, `debug`).

## 10. Professional Etiquette & Hygiene
* **Zero Dead Code:** Instantly remove unused imports, dead variables, and old commented-out code blocks.
* **Atomic Modifications:** Focus strictly on the assigned task. Do not mix unrelated refactoring with the current implementation. Fix local warnings silently within your scope.