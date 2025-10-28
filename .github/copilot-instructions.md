# GitHub Copilot Instructions

Nx monorepo for publishable Angular utility libraries (`@ssv/ngx.command` and `@ssv/ngx.ux`) built with Angular 20+, TypeScript 5.9, and Jest 30.

## Architecture & Structure

**Monorepo Layout:**

- `libs/ngx.command/` - Command pattern implementation with signal & observable support
- `libs/ngx.ux/` - Viewport/responsive utilities with SSR support
- `apps/test-app/` - Development harness for testing both libraries
- Each library: standalone exports, `ng-package.json`, separate `project.json` configs

**Dependency Flow:**

- Libraries are fully standalone (no cross-dependencies)
- Test app imports both via `@ssv/ngx.command` and `@ssv/ngx.ux` path aliases
- Build outputs to `dist/libs/{lib-name}` for npm publishing

**Tech Stack (Angular 20 specific):**

- Angular 20.3.7 with standalone components/directives (no NgModules in new code)
- TypeScript 5.9.3 with strict mode + `isolatedModules`
- RxJS 7.8.2 for observables (coexists with signals)
- Jest 30.2.0 + jest-preset-angular 15.0.3 (no `setup-jest` import needed)
- pnpm 9.15+ as package manager (enforced via preinstall script)
- Nx 22.0.1 for build orchestration and caching

## Critical Development Patterns

### Modern Angular 20 DI Pattern

**Use `inject()` function with private fields** (not constructor injection):

```typescript
@Directive({ standalone: true })
export class ExampleDirective {
  #service = inject(SomeService); // Private field pattern
  #renderer = inject(Renderer2);
}
```

- Aligns with Angular 20+ conventions
- Enables better tree-shaking
- Already migrated throughout codebase (see `viewport-matcher.directive.ts`)

### Command Pattern Implementation (`@ssv/ngx.command`)

**Factory functions (not classes)** for command creation:

```typescript
// Preferred: Factory functions with auto-cleanup
saveCmd = command(() => this.save(), this.isValid);        // Sync
asyncCmd = commandAsync(() => this.http.post(...), this.canSave$);  // Async

// Supports: signal, observable, or function for canExecute
command(() => execute(), signal(true));           // Signal
command(() => execute(), observable$);            // Observable
command(() => execute(), () => this.check());     // Function
```

- `Command` class is **deprecated** - use factories only
- Factories auto-inject `DestroyRef` → no manual cleanup needed
- Commands expose `isExecuting`, `canExecute` as both snapshot values and observables

**Directive Usage:**

```html
<!-- Basic button binding -->
<button [ssvCommand]="saveCmd">Save</button>

<!-- With parameters (NOTE: arrays must be double-wrapped) -->
<button [ssvCommand]="deleteCmd" [ssvCommandParams]="[item]">Delete</button>
<button [ssvCommand]="multiCmd" [ssvCommandParams]="[[arr]]">Pass Array</button>

<!-- Command creator (for per-row commands in loops) -->
<button [ssvCommand]="{host: this, execute: remove$, params: [hero]}">Remove</button>
```

### Viewport/Responsive Patterns (`@ssv/ngx.ux`)

**Structural directives with tuple syntax** (preferred):

```html
<!-- Tuple syntax (recommended) -->
<div *ssvViewportMatcher="['>=', 'xlarge']">Desktop UI</div>
<div *ssvViewportMatcher="['<=', 'medium']">Mobile UI</div>

<!-- Object syntax (verbose) -->
<div *ssvViewportMatcher="{size: 'large', operation: '>='}">...</div>

<!-- Include multiple sizes -->
<div *ssvViewportMatcher="['xsmall', 'small']">Small screens</div>

<!-- Else clause support (use object syntax or tuple) -->
<div *ssvViewportMatcher="['>=', 'xlarge']">Large</div>
<div *ssvViewportMatcher="['<', 'xlarge']">Not large</div>
```

**ViewportService signal API:**

```typescript
constructor() {
  const viewport = inject(ViewportService);

  effect(() => {
    const size = viewport.sizeType();  // Signal: { type, name, widthThreshold }
    console.log('Current:', size.name);  // 'xsmall' | 'small' | 'medium' | ...
  });
}
```

**SSR Compatibility:**

- Always provide device type via `withViewportSsrDevice('mobile' | 'tablet' | 'desktop')`
- See `viewport-server-size.service.ts` for custom implementations
- Default breakpoints: xsmall (≤450), small (451-767), medium (768-992), large (993-1200), xlarge (1201-1500), xxlarge (1501-1920), xxlarge1 (≥1921)

## Development Workflows

**Essential Commands:**

```bash
pnpm start                    # Dev server (test-app on port 4200)
pnpm nx run-many -t build     # Build all libraries
pnpm nx run-many -t test      # Run Jest tests for all libs
pnpm nx run-many -t lint      # ESLint all projects
pnpm nx reset                 # Clear Nx cache (fixes stale builds)
```

**Release Process:**

```bash
pnpm run prepare-release      # Version bump + changelog (doesn't publish)
pnpm run release              # Publish to npm (CI only)
```

- Versioning: Managed by `nx release` (updates `package.json` + `version.ts`)
- CI publishes on `master`, `*.x` branches, or manual workflow trigger

## Testing Conventions

**Jest 30 + jest-preset-angular 15 setup:**

```typescript
// test-setup.ts (NO import of 'jest-preset-angular/setup-jest' - removed in v15)
globalThis.ngJest = {
  testEnvironmentOptions: {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  },
};
```

**Test Structure:**

```typescript
describe("Command", () => {
  it("should disable during execution", async () => {
    const cmd = command(() => delay(100));
    expect(cmd.canExecute).toBe(true);
    cmd.execute();
    expect(cmd.isExecuting).toBe(true);
    await delay(150);
    expect(cmd.isExecuting).toBe(false);
  });
});
```

- Use `jest.fn()`, `jest.spyOn()` for mocking
- Command tests verify `isExecuting` state transitions
- Viewport tests validate breakpoint calculations and condition matching

## Code Quality Standards

**TypeScript:**

- Strict mode enabled (`strict: true`, `isolatedModules: true`)
- Use type guards: `isCommand()`, `isViewportSizeMatcherExpression()` (see `command.util.ts`, `viewport.util.ts`)
- Avoid `any` - use `unknown` with type narrowing or suppress with `// eslint-disable-next-line @typescript-eslint/no-explicit-any`

**ESLint:**

- Double quotes enforced (`@stylistic/ts/quotes`)
- Nx module boundaries enforced (no cross-lib dependencies)
- Angular directive selector rules disabled (custom `ssv` prefix used)

**Deprecation Pattern:**

```typescript
/**
 * @deprecated Use {@link commandAsync} instead.
 */
export class CommandAsync extends Command { ... }
```

- Mark deprecated APIs with JSDoc + maintain for backward compatibility
- Steer users to modern alternatives in documentation

## Angular 20 Compatibility Notes

**Template Reference Typing (Breaking Change in Angular 20):**

- `else` clause on structural directives may cause `TemplateRef<any>` incompatibility
- Workaround: Use separate directives instead of `else`:

  ```html
  <!-- Instead of this (can cause TS2322 errors): -->
  <div *ssvViewportMatcher="['>=', 'large']; else smaller">...</div>

  <!-- Use this: -->
  <div *ssvViewportMatcher="['>=', 'large']">Large</div>
  <div *ssvViewportMatcher="['<', 'large']">Smaller</div>
  ```

**Signal & Observable Interop:**

- `toSignal()` converts observables → signals (used in `ViewportService`)
- `toObservable()` converts signals → observables (used in `Command` for `canExecute`)
- Both coexist: Commands accept signal/observable/function for `canExecute`

## Library Publishing

**What gets published:**

- Built files from `dist/libs/{lib-name}` (excludes tests, specs, config)
- Each library has separate npm package (`@ssv/ngx.command`, `@ssv/ngx.ux`)
- Version sync: Both libraries share root `package.json` version

**Version compatibility:**

- Angular 17+ → library v3.x
- Angular 10-16 → library v2.x
- Angular 4-9 → library v1.x

## Quick Reference Links

- [Command README](../libs/ngx.command/README.md) - Full API docs
- [Viewport README](../libs/ngx.ux/README.md) - Breakpoint config & SSR
- [Angular Instructions](instructions/angular.instructions.md) - Team coding standards
- [Nx Agent Guidelines](../AGENTS.md) - Nx-specific AI workflows
