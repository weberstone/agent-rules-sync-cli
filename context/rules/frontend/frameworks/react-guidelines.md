# [CRITICAL] React 19+ Specific Rules (Modern & Server-First)

## 1. Component Paradigm & Compiler Compliance
* **Functional & Standalone:** Legacy Class components are strictly BANNED. Write only functional components.
* **React Compiler Rule:** Trust the React Compiler for optimization. Manual `useMemo` and `useCallback` are banned unless handling explicit custom dependency edge cases.
* **Strict Immutability:** Never mutate props, state, or context objects directly—this completely breaks React Compiler optimizations. Always return fresh references.

## 2. Server-First Architecture (RSC & RCC)
* **Server Components by Default:** Keep components as React Server Components (RSC) to minimize client-side JavaScript.
* **Client Boundary Access:** Use the `'use client'` directive strictly at the leaves of the component tree, only when interactivity (state, hooks) or browser-specific APIs are required.
* **No Fetching in Effects:** Data fetching inside `useEffect` is strictly FORBIDDEN. Fetch data directly in Server Components via `async/await` or utilize the native `use(Promise)` hook in Client Components.

## 3. State Management & Data Flow
* **Inline Derived State:** Do not synchronize different states via `useEffect`. Always calculate derived state inline during the render phase.
* **Pure Context Engine:** Use native `use(Context)` over legacy `<Context.Consumer>`. Keep context providers small and single-purpose to avoid mass client-side re-renders.
* **Unidirectional Cleanliness:** Props must flow strictly downward. Avoid lifting state up excessively; locate state as close to the consuming component as possible.

## 4. Modern Forms & Actions (React 19 Standard)
* **Native Form Actions:** Handle all form submissions using the native `action` attribute: `<form action={formAction}>`. Legacy `onSubmit={handleSubmit}` with `e.preventDefault()` is banned.
* **Async Transitions:** Manage loading, error, and form lifecycle states using modern React 19 hooks: `useActionState` and `useFormStatus`.
* **No Manual Loading States:** Do not create manual `const [isLoading, setIsLoading] = useState(false)` flags for forms or server interactions; delegate this to `useTransition`.

## 5. DOM Access & Ecosystem Lock
* **Ref Safety:** Use `useRef` strictly for DOM element references or persistent mutable variables that shouldn't trigger re-renders. Direct raw DOM manipulation (e.g., `document.getElementById`) is forbidden.
* **Cleanup Discipline:** Every `useEffect` that establishes a subscription, listener, or timer MUST return a clean-up function to prevent memory leaks.
* **Ecosystem Lock:** Third-party global state managers (Zustand, Redux) or UI libraries are strictly FORBIDDEN without prior explicit user consent. Maximize native React state hooks and Context.