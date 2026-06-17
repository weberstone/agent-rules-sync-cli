# Angular 22+ Specific Rules

## 1. Core Paradigm & DI
* Zoneless: no Zone.js, no microtask reliance
* DI: inject() only. Constructor DI banned
* Standalone default. standalone: true not required

## 2. Signals-First (RxJS exclusion)
* State: signals only (signal)
* Derived: computed()
* API: input(), output(), model()
* RxJS in components/templates: forbidden
* Observable/Subject/BehaviorSubject: forbidden in UI layer
* RxJS allowed only in infra services (ws/polling/complex streams)
* RxJS → toSignal() immediately at service boundary (strictly in Injection Context)
* Clean up remaining RxJS streams via takeUntilDestroyed()

## 3. Templates & Layout
* Control flow only: @if, @for, @switch
* *ngIf/*ngFor banned
* [class] instead of ngClass
* [style.*] instead of ngStyle
* ngClass/ngStyle banned
* @HostBinding/@HostListener banned
* host:{} only

## 4. SSR / SSG / Hydration
* No window/document/navigator
* Use inject(DOCUMENT) / isPlatformBrowser
* DOM access only in afterNextRender()/afterRender()
* No DOM in constructor/ngOnInit
* No SSR/client state mismatch (time, viewport, etc.)

## 5. Forms / Media / CDK
* Strict typed reactive forms only
* UntypedFormGroup + template-driven forms banned
* NgOptimizedImage required (ngSrc)
* width/height or fill required
* Prefer Angular CDK (overlay/scrolling/a11y)
* New 3rd-party NPM libs STRICTLY FORBIDDEN without explicit user consent (ask, justify, wait)