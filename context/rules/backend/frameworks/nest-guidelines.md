# NestJS Specific Execution Rules

## 1. Architecture & Dependency Injection
* **Constructor Injection Only:** Use strictly constructor injection with access modifiers: `constructor(private readonly service: Service)`. Strictly avoid property injection (`@Inject()`) unless using custom tokens or abstract inheritance.
* **Thin Controllers:** Controllers must contain *zero* business logic or data normalization. Role: accept request via DTO, delegate to service, return response.
* **Controller Isolation:** Split Admin and Public routes into separate controllers, even within the same domain (e.g., `ProjectsAdminController` and `ProjectsPublicController`).
* **Service Boundaries:** Domain services own business logic. Cross-domain communication happens *only* by injecting a domain service into another domain service. Never inject foreign models/repositories directly.
* **Domain Modules:** Name modules in plural form (`LanguagesModule`). Strictly avoid grouping unrelated logic into generic `AdminModule` or `PublicModule`.

## 2. Request Validation & Decorators
* **Boundary Validation:** Use `class-validator` and `class-transformer` via global `ValidationPipe`. Never manually validate payloads inside controllers.
* **DTO Limits:** DTO classes are strictly for request-side contracts (body, params, query). Never use DTOs for response shaping or internal logic.
* **Custom Transformers:** Keep DTO transformations minimal. Prefer shared decorators (e.g., `@Trim()`, `@ToLowerCase()`) in `src/common/decorators` over repeating inline `@Transform()` logic.

## 3. Exception Filters & Middleware
* **Infrastructure Filters:** Keep exception filters inside `src/core/filters`. Services must never throw HTTP-specific exceptions (`HttpException`, `BadRequestException`). Services throw domain or driver errors; Filters map them to HTTP codes (e.g., mapping `DocumentNotFoundError` to 404).
* **Filter Isolation:** Create separate filters per error source or abstraction level. Do not mix Mongo driver errors and Mongoose validation errors in a single filter.

## 4. NestJS Testing Harness (`@nestjs/testing`)
* **Unit Testing Isolation:** Use `Test.createTestingModule(...).compile()` for Nest-managed classes. Do *not* boot a full Nest application (`INestApplication`) in unit tests unless testing global runtime wiring.
* **Provider Retrieval:** Use `moduleRef.get()` for static providers and controllers. Use `moduleRef.resolve()` *only* for request-scoped or transient providers.
* **Mocking Boundary:** Replace dependencies via `overrideProvider()` or custom providers inside the test module setup. Strictly forbid ad-hoc monkey patching of class methods.
* **Test Architecture:** One test file (`*.spec.ts`) per code file. Services test business logic; Controllers test routing and delegation (never duplicate service tests inside controller specs). Exception filters test `catch()` directly via a mocked `ArgumentsHost`.