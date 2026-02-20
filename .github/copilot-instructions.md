# GitHub Copilot Instructions

Nx monorepo for publishable Angular utility libraries built with Angular 21+, TypeScript 5.9, and Vitest 4.x. Two standalone libraries: `@ssv/ngx.command` (command pattern) and `@ssv/ngx.ux` (viewport/responsive utilities).

## Quick Start

```bash
pnpm start                    # Dev server (test-app:4200)
pnpm nx run-many -t test      # Run all tests
pnpm nx run-many -t build     # Build all libraries
pnpm nx reset                 # Clear cache (use when builds seem stale)
```

**Package manager:** pnpm 9.15+ (enforced via preinstall script)  
**Stack:** Angular 21.0.3 • TypeScript 5.9.3 • RxJS 7.8.2 • Vitest 4.x • Nx 22.2.0

## Architecture

```
libs/
  ngx.command/    → Command pattern (signals + observables)
  ngx.ux/         → Viewport/responsive (SSR support)
apps/
  test-app/       → Development harness for both libs
```

- **No cross-dependencies** between libraries (publish independently)
- **Standalone only** - no NgModules in new code
- **Build output:** `dist/libs/{lib-name}` for npm publishing
- **Version sync:** Both libraries share root `package.json` version

## Critical Patterns

### 1. Modern Angular DI (inject() + private fields)

```typescript
@Directive({ standalone: true })
export class ExampleDirective {
  #renderer = inject(Renderer2); // NOT constructor injection
  #cdr = inject(ChangeDetectorRef);
}
```

**Why:** Aligns with Angular 21+ conventions, enables better tree-shaking. Already migrated throughout codebase.

### 2. Command Pattern (`@ssv/ngx.command`)

**Use factory functions** (not `new Command()`):

```typescript
// Factory functions auto-inject DestroyRef (no cleanup needed)
saveCmd = command(() => this.save(), this.isValid);         // Sync
asyncCmd = command(() => this.http.post(...), this.canSave$);  // Async

// canExecute accepts: Signal | Observable | Function | boolean
command(() => execute(), signal(true));           // Signal ✅
command(() => execute(), this.valid$);            // Observable ✅
command(() => execute(), () => this.check());     // Function ✅
```

**Directive usage:**

```html
<!-- Basic -->
<button [ssvCommand]="saveCmd">Save</button>

<!-- With params (NOTE: arrays MUST be double-wrapped) -->
<button [ssvCommand]="deleteCmd" [ssvCommandParams]="[item]">Delete</button>
<button [ssvCommand]="multiCmd" [ssvCommandParams]="[[arr]]">Pass Array</button>

<!-- Command creator (for loops - separate isExecuting per instance) -->
<button [ssvCommand]="{host: this, execute: remove$, params: [hero]}">Remove</button>
```

**Key exports:**

- `command()` - Creates Command (handles sync/async automatically)
- `commandAsync()` - **Deprecated** alias for `command()`
- `Command` class - **Deprecated** (use factory functions)

### 3. Viewport/Responsive (`@ssv/ngx.ux`)

**Structural directive (tuple syntax preferred):**

```html
<!-- Tuple syntax (recommended) -->
<div *ssvViewportMatcher="['>=', 'xlarge']">Desktop UI</div>
<div *ssvViewportMatcher="['<=', 'medium']">Mobile UI</div>

<!-- Multiple sizes (OR condition) -->
<div *ssvViewportMatcher="['xsmall', 'small']">Small screens</div>

<!-- Avoid else clause (Angular 21 TemplateRef typing issues) -->
<div *ssvViewportMatcher="['>=', 'xlarge']">Large</div>
<div *ssvViewportMatcher="['<', 'xlarge']">Not large</div>
```

**ViewportService (signals):**

```typescript
class MyComponent {
  #viewport = inject(ViewportService);

  constructor() {
    effect(() => {
      const size = this.#viewport.sizeType(); // Signal<ViewportSizeTypeInfo>
      console.log(size.name); // 'xsmall' | 'small' | 'medium' | 'large' | ...
    });
  }
}
```

**Default breakpoints:**
| Size | Range | | xsmall | ≤450 | | small | 451-767 | | medium | 768-992 | | large | 993-1200 | | xlarge | 1201-1500 | | xxlarge | 1501-1920 | | xxlarge1 | ≥1921 |

**SSR:** Always provide device type via `withViewportSsrDevice('mobile' | 'tablet' | 'desktop')` (see `viewport-server-size.service.ts`).

## Testing (Vitest 4.x)

**Setup (`test-setup.ts`):**

```typescript
import "@angular/compiler";
import "@analogjs/vitest-angular/setup-zone";
import { getTestBed } from "@angular/core/testing";
import { BrowserTestingModule, platformBrowserTesting } from "@angular/platform-browser/testing";

getTestBed().initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
```

**Test structure:**

```typescript
import { vi } from "vitest";

describe("Command", () => {
  it("should disable during execution", async () => {
    const cmd = command(() => delay(100));
    expect(cmd.canExecute).toBe(true);
    cmd.execute();
    expect(cmd.isExecuting).toBe(true); // State transition
    await delay(150);
    expect(cmd.isExecuting).toBe(false);
  });
});
```

**Run tests:** `pnpm nx run-many -t test` or `pnpm test`

## Code Quality

**TypeScript:**

- Strict mode (`isolatedModules: true`)
- Use type guards: `isCommand()`, `isViewportSizeMatcherExpression()`
- Prefer `unknown` over `any` (suppress with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` if needed)

**ESLint:**

- Double quotes enforced (`@stylistic/ts/quotes`)
- No cross-lib dependencies (Nx module boundaries)
- Custom `ssv` prefix for directives (selector rules disabled)

**Deprecation pattern:**

```typescript
/** @deprecated Use {@link command} instead. */
export const commandAsync = command;
```

Maintain backward compatibility while steering to modern APIs.

## Release Process

```bash
pnpm run prepare-release      # Bump version + generate changelog (local)
pnpm run release              # Publish to npm (CI only)
```

- CI publishes on `master`, `*.x` branches, or manual workflow trigger
- `nx release` updates `package.json` + `version.ts` in both libraries
- **Version compatibility:** Angular 17+ → v3.x+ | Angular 10-16 → v2.x | Angular 4-9 → v1.x

## Known Issues

**Angular 21 TemplateRef typing:** `else` clauses on structural directives may cause `TS2322` errors. Use separate directives instead:

```html
<!-- ❌ Causes TS2322 -->
<div *ssvViewportMatcher="['>=', 'large']; else smaller">...</div>

<!-- ✅ Use this -->
<div *ssvViewportMatcher="['>=', 'large']">Large</div>
<div *ssvViewportMatcher="['<', 'large']">Smaller</div>
```

## Reference

- [Command README](../libs/ngx.command/README.md) - Full API docs
- [Viewport README](../libs/ngx.ux/README.md) - Breakpoint config & SSR
- [Angular Instructions](instructions/angular.instructions.md) - Team coding standards
- [AGENTS.md](../AGENTS.md) - Nx-specific AI workflows
