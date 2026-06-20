## Strict Typing (TypeScript)
* **BANNED: `any` & `as any`.** Use `unknown` for dynamic data + explicit runtime type guards.
* **Explicit Contracts:** Define explicit types for all function arguments and returns. Avoid implicit `any`.
* **Pragmatic Assertions:** `as unknown as T` is allowed only for API parsing/edge cases to avoid generic over-engineering.
* **Automated Failure:** Any code inferring or dropping types to `any` will fail compilation.