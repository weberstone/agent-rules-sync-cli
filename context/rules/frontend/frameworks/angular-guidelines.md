# [CRITICAL] Angular Specific Rules (Zoneless & Signals-First)

## 1. Core Architecture & Dependency Injection
* **Strict Zoneless:** Code must operate with zero reliance on Zone.js change detection or global microtask timing.
* **Modern DI Engine:** Constructor dependency injection is strictly FORBIDDEN. Use the `inject()` function exclusively for all tokens and services: `private user = inject(UserService);`.
* **Clean Standalone:** Build all components, directives, and pipes as modern standalone entities. Do not add redundant `standalone: true` flags (v19+ default).

## 2. Signals-First Paradigm (UI UI-Layer Cleanliness)
* **Pure Signal Views:** The UI layer (components and templates) must be 100% reactive via Signals. Usage of RxJS (`Observable`, `Subject`, `BehaviorSubject`) inside components or templates is strictly FORBIDDEN.
* **Component API:** Use modern signal APIs exclusively: `input()`, `output()`, `model()`, and `computed()` for derived state.
* **RxJS Boundary:** RxJS is permitted *only* inside infrastructure services for complex asynchronous data streams (e.g., WebSockets, polling, multi-trigger pipelines).
* **Stream Conversion:** Bridge RxJS to the UI by converting streams immediately at the service boundary using `toSignal()`. This transformation must execute strictly within an Injection Context. Ensure remaining streams utilize `takeUntilDestroyed()`.

## 3. Template Engine & DOM Architecture
* **Modern Control Flow:** Use semantic block syntax (`@if`, `@for`, `@switch`) exclusively. Structural directives (`*ngIf`, `*ngFor`, `*ngSwitch`) are banned.
* **Property Bindings:** Use native property syntax (`[class.active]`, `[style.color]`) for dynamic styling. Legacy `ngClass` and `ngStyle` directives are banned.
* **Host Element Mapping:** Define all host bindings and event listeners inside the metadata `host: {}` block of the decorator. Use of `@HostBinding` and `@HostListener` decorators is banned.

## 4. Server-Side Safety (SSR / SSG & Hydration)
* **Global Object Protection:** Direct execution of browser-specific globals (`window`, `document`, `navigator`, `location`) is forbidden in root code paths. Use `inject(DOCUMENT)` and `isPlatformBrowser` for execution gating.
* **Safe Lifecycle Execution:** Perform all direct DOM manipulations and third-party UI initializations strictly inside `afterNextRender()` or `afterRender()` lifecycle hooks. Never touch the DOM inside constructors or `ngOnInit`.
* **State Invariance:** Ensure client-rendered UI matches server-rendered state exactly to prevent hydration mismatches (e.g., careful handling of dynamic dates, viewports, or localized text).

## 5. View-Layer Ecosystem & Forms
* **Typed Reactive Forms:** Use strictly typed reactive form primitives. `UntypedFormGroup` and template-driven forms are banned.
* **Media Optimization:** Use the `NgOptimizedImage` directive (`ngSrc`) for all images. Explicitly declare `width` and `height` properties, or enforce responsive rendering via the `fill` attribute.
* **CDK Integration:** Prioritize the native Angular CDK (Overlay, Accessibility, Scrolling) over custom implementation of complex interactive UI behaviors.
* **Ecosystem Lock:** Third-party NPM UI or state libraries are strictly FORBIDDEN without prior explicit user authorization. Maximize the usage of native platform capabilities.