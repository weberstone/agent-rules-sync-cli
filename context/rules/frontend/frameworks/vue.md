# [CRITICAL] Vue 3+ Specific Rules (Composition API & Vapor-Ready)

## 1. Component Paradigm & Script Setup
* **Strict Composition API:** Legacy Options API (`data`, `methods`, `computed` options) is strictly BANNED. Use `<script setup>` exclusively for all components.
* **Vapor Mode Readiness:** Code must be optimized for fine-grained reactivity. Avoid heavy component re-renders; keep component templates structured and semantic.
* **Define-Macros:** Use compiler macros strictly without imports: `defineProps()`, `defineEmits()`, `defineExpose()`, and `defineSlots()`.

## 2. Modern Reactivity Engine (Vue 3.5+ Standard)
* **Reactive Props Destructure:** Capitalize on native props destructure: `const { title = 'Default' } = defineProps<{ title?: string }>();`. Do not wrap props in `toRefs` or access them via `props.title` everywhere.
* **Ref vs Reactive:** Prefer `ref()` for primitive values and single state variables. Use `reactive()` strictly for deep, coherent objects or forms where structural mutation is intentional.
* **Explicit Derived State:** Never use `watch()` or `watchEffect()` to synchronize internal state. Always compute derived values inline using `computed()`.

## 3. Template Engine & Directives
* **Shorthand Syntax Required:** Always use shorthands: `:` for `v-bind`, `@` for `v-on`, and `#` for `v-slot`.
* **Dynamic Styling Cleanliness:** Use standard binding architecture for styles: `:class="{ active: isActive }"` and `:style="{ color: textColor }"`. Do not use manual template string concatenations for classes.
* **Strict Key Binding:** Every `v-for` directive MUST have a unique, stable `:key` binding. Strictly forbid using the array index as a key if the array can be reordered, filtered, or mutated.
* **No Side Effects in Templates:** Templates must purely interpolate state. Executing methods that mutate data inside double curly braces `{{ }}` or directive expressions is strictly forbidden.

## 4. Server-Side Safety (SSR / Nuxt Compatibility)
* **Global Object Protection:** Accessing browser globals (`window`, `document`, `navigator`) directly in the root setup scope is forbidden. Execute browser-only logic strictly inside `onMounted()` or `onBeforeMount()`.
* **State Leak Prevention:** Global state shared across SSR requests must never be declared as a global variable at the module root level. Always wrap shared state in a factory function, custom composable, or Store instance.
* **Template Invariance:** Ensure client-rendered templates align perfectly with SSR output. Avoid conditional hydration logic based on unpredictable client parameters (e.g., immediate viewport checks) during initial render.

## 5. Composables & Ecosystem Lock
* **Composable Hygiene:** Custom composables must enforce a standard naming convention: `use...` (e.g., `useAuth`). Every composable that establishes events, intervals, or WebSocket connections must hook into `onUnmounted()` to clean up.
* **No Direct Template Refs Manipulation:** Use `ref<HTMLElement | null>(null)` for DOM references. Modifying the DOM directly via native selectors inside Vue lifecycle hooks is strictly forbidden.
* **Ecosystem Lock:** Third-party global state managers (Pinia) or UI component libraries are strictly FORBIDDEN without prior explicit user authorization. Maximize native Composition API, reactive references, and provide/inject architectures.