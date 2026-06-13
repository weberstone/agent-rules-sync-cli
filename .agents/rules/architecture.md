# Architecture & Design Patterns
To prevent hallucinations and "reinventing the wheel", all architectural decisions must strictly adhere to established software engineering patterns and robust backend practices.

## 1. Core Literature & Principles
Your solutions should be heavily inspired by the following industry-standard books:
- **"Design Patterns: Elements of Reusable Object-Oriented Software" (GoF)**: Use established creational, structural, and behavioral patterns (e.g., Factory, Strategy, Observer, Decorator) instead of custom ad-hoc structures.
- **"Clean Architecture" by Robert C. Martin**: Separate concerns. Keep business logic independent of external frameworks (like Express or Fastify). Depend on abstractions, not concretions.
- **"Domain-Driven Design" (DDD) by Eric Evans**: For complex business logic, organize code around domains, aggregates, entities, and value objects.
- **"Designing Data-Intensive Applications" by Martin Kleppmann**: Design reliable, scalable, and maintainable systems with a deep understanding of data storage, distributed systems, and concurrency.

## 2. Anti-Hallucination Protocol
- **Do not invent new architectural patterns**. If a standard pattern fits the problem, use it and explicitly name it in your explanation (e.g., "I will use the Repository pattern here...").
- Keep the architecture as simple as possible but no simpler (KISS principle).
- Follow SOLID principles meticulously.

## 3. Project-Specific Architecture (Layered Design)
- Enforce strict separation of responsibilities across layers:
    - **Transport Layer (Controllers/Resolvers)**: Strictly for handling incoming requests, routing, basic DTO validation, and returning responses. **No business logic here.**
    - **Business Layer (Services/Use Cases)**: Pure business logic. Completely agnostic of the transport layer (HTTP/GraphQL) and databases.
    - **Persistence Layer (Repositories)**: Isolated database operations. Services must interact with data via repository interfaces.

## 4. Defensive Programming & Safety
- **Strict Validation**: Assume all incoming external data (Payloads, Queries, Params) is malicious or malformed. Always validate using strict DTOs (e.g., via `class-validator` and `class-transformer`). Strip unknown properties by default (whitelist/forbidNonWhitelisted).
- **Resilience & Fallbacks**: External services fail. Always implement timeouts, and where applicable, use Retry or Circuit Breaker patterns for 3rd-party API calls.
- **Global Exception Handling**: The application must never crash or leak stack traces to the client due to `Unhandled Promise Rejections`. Use global exception filters to catch errors and return standardized responses (e.g., RFC 7807 Problem Details).
- **Security Guardrails**: Prevent SQL/NoSQL injections by using parameterized queries or standard ORM/Query Builder features. Never log sensitive data (passwords, tokens, PII, API keys).

## 5. Performance First
- **Event Loop Respect**: Node.js is single-threaded. You are strictly forbidden from using synchronous, blocking operations (e.g., `fs.readFileSync`) or running heavy, thread-blocking computations in the main event loop.
- **Database Optimization**: Write performant queries by default. Always assume tables have millions of rows: utilize indexes, and never return unpaginated lists.
- **Caching**: Proactively suggest caching mechanisms (in-memory, Redis) for frequently accessed, rarely changing data.

## 6. Dependencies & Native Framework Capabilities
- **Maximize Native APIs**: Prioritize the native features built into Node.js (e.g., `crypto`, `node:test`) and your framework (e.g., NestJS Dependency Injection, Guards, Interceptors, Pipes) before reaching for third-party tools.
- **Strict Dependency Control**: You are STRICTLY FORBIDDEN from installing or introducing new third-party NPM libraries (especially heavy ORMs or utility libraries) without explicit user consent. If you believe a third-party package is absolutely necessary, you must propose it, justify why native tools are insufficient, and wait for user approval.

## 7. Directory Structure (Domain-Driven Modules)
The project follows a modular, domain-driven structure. Code should be grouped by business capability (e.g., `src/modules/users`, `src/modules/orders`) rather than by technical roles (not `src/controllers