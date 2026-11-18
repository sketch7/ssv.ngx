---
name: ssv-ngx-command
description: Implement command pattern in Angular using @ssv/ngx.command library. Use for encapsulating actions with execution state tracking, enabling/disabling controls, and managing async operations. Triggers on button states, action execution, form submissions, or implementing command pattern.
---

# @ssv/ngx.command

Command pattern - encapsulates actions with auto state tracking (`isExecuting`, `canExecute`). Primary use: disable buttons during execution, show loading indicators.

## Creating Commands

**Use `command()` factory** (requires injection context):

```typescript
import { command } from "@ssv/ngx.command";

readonly isValid = signal(false);
readonly saveCmd = command(() => this.save$(), this.isValid);

// Observable, function, boolean also supported
readonly deleteCmd = command(() => this.delete$(), this.isValid$);
readonly computeCmd = command(
  () => this.compute(),
  () => this.check(),
);
readonly simpleCmd = command(() => this.action()); // No validation

// Options object (3rd arg): outside an injection context pass the injector
readonly outsideCmd = command(() => this.save$(), this.isValid, { injector: this.#injector });
```

`canExecute` result: `true`/`[]` enabled; `false` disabled (no reason); non-empty `CommandDisabledReason[]` (`{ code, params? }`) disabled with reasons. A function/signal is reactive. `commandAsync`/`new Command()` are removed - use `command()`.

## Disabled Reasons

Return reasons from `canExecute` (codes only, the UI translates them):

```typescript
readonly recruitCmd = command(
  () => this.recruit$(),
  () => this.hero().banned ? [{ code: "hero.banned" }] : true,
);
recruitCmd.$disabledReasons(); // [{ code: "hero.banned" }]
```

```html
@for (reason of recruitCmd.$disabledReasons(); track reason.code) { <small>{{ reason.code | translate: reason.params }}</small> }
```

Executing is not a reason: `$disabledReasons` is unaffected while `$isExecuting()`.

## Directive Usage

```html
<!-- Basic -->
<button [ssvCommand]="saveCmd">Save</button>

<!-- With loading UI -->
<button [ssvCommand]="saveCmd">@if(saveCmd.$isExecuting()) { <mat-spinner diameter="20"></mat-spinner> } Save</button>

<!-- Custom CSS class -->
<button [ssvCommand]="saveCmd" [ssvCommandOptions]="{executingCssClass: 'is-loading'}">Save</button>
```

## Parameters

**CRITICAL: Array args must be double-wrapped**:

```html
<!-- Single param -->
<button [ssvCommand]="deleteCmd" [ssvCommandParams]="userId">Delete</button>

<!-- Multiple params -->
<button [ssvCommand]="updateCmd" [ssvCommandParams]="[user, id, 'save']">Update</button>

<!-- Single ARRAY param - MUST double-wrap -->
<button [ssvCommand]="bulkCmd" [ssvCommandParams]="[[items]]">Process</button>
```

Why: `[items]` spreads. Use `[[items]]` for single array arg.

## Collections (Loops)

**Isolated `isExecuting` per item**:

```html
@for (hero of heroes; track hero.id) {
<button [ssvCommand]="{host: this, execute: removeHero$, canExecute: canRemove, params: [hero]}">Remove</button>
}
```

`ssvCommand` follows a bound command swapped after init. A creator object is read once (its `canExecute` is still reactive, and may return reasons).

```typescript
removeHero$(hero: Hero) {
  return this.#http.delete(`/api/heroes/${hero.id}`);
}
```

## Form Integration

```typescript
import { canExecuteFromNgForm, canExecuteFromSignals } from "@ssv/ngx.command";

// NgForm
readonly loginCmd = command(() => this.login$(), canExecuteFromNgForm(this.form()));

// Signal forms
readonly saveCmd = command(() => this.save$(), canExecuteFromSignals({ valid: form.valid, dirty: form.dirty }));
```

Both return `true` or reasons `form.invalid` / `form.unchanged` (`CommandFormReason`, in that order), not a boolean: read `cmd.$canExecute()` / `cmd.$disabledReasons()`. Opt out per check with `{ validity: false }` / `{ dirty: false }`.

## State & Execution

```typescript
cmd.$isExecuting(); // Signal<boolean>
cmd.$canExecute(); // Signal<boolean>
cmd.$disabledReasons(); // Signal<readonly CommandDisabledReason[]>, from canExecute returning e.g. [{ code: "hero.banned" }]
cmd.isExecuting; // boolean (deprecated - use signals)
cmd.canExecute; // boolean (deprecated - use signals)

cmd.execute(); // Direct
cmd.execute(arg1, arg2); // With params
await cmd.execute(); // Returns Promise for async
```

## Anti-Patterns

❌ Never use `new Command()` - use `command()` factory
❌ `[ssvCommandParams]="[items]"` spreads - use `[[items]]`
❌ Sharing `isExecuting` in loops - use command creator `{host, execute, params}`

## Common Patterns

```typescript
// Computed validation
readonly canSave = computed(() => this.isValid() && this.hasChanges());
readonly saveCmd = command(() => this.save$(), this.canSave);

// Error handling
readonly saveCmd = command(() =>
  this.#http.post('/api/save', data).pipe(
    catchError(err => { this.showError(err); return EMPTY; })
  )
);

// Loading UI
<button [ssvCommand]="saveCmd" [class.loading]="saveCmd.$isExecuting()">
  @if (saveCmd.$isExecuting()) { <mat-spinner/> } @else { <mat-icon>save</mat-icon> }
  Save
</button>
```

## CommandInput Type

Simplify command input types in child components:

```typescript
import type { CommandInput } from "@ssv/ngx.command";

// Single parameter
readonly onSave = input.required<CommandInput<User>>();

// Multiple parameters
readonly onUpdate = input.required<CommandInput<[user: User, id: number]>>();

// Instead of verbose:
// readonly onSave = input.required<Command<(user: User) => unknown>>();
```

## Global Config

```typescript
import { provideSsvCommandOptions } from "@ssv/ngx.command";

provideSsvCommandOptions({ executingCssClass: "is-busy" });
```

## Advanced

- `references/advanced-patterns.md` - CommandRef, per-item canExecute, CommandInput helper

**Library Ref**: [README](../../../libs/ngx.command/README.md) | [Examples](../../../apps/test-app/src/app/command/) | [Tests](../../../libs/ngx.command/src/command.spec.ts)
