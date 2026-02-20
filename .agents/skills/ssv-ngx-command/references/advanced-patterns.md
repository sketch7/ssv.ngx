# Advanced Command Patterns

## CommandRef - Shared Execution State

Share execution state across multiple buttons:

```html
@for (item of items; track item.id) {
  <div #cmd="ssvCommandRef" [ssvCommandRef]="{host: this, execute: remove$}">
    <button [ssvCommand]="cmd.command()" [ssvCommandParams]="[item]">Delete</button>
    <button [ssvCommand]="cmd.command()" [ssvCommandParams]="[item]">Archive</button>
  </div>
}
```

Both buttons share `isExecuting` state. Use when multiple actions should disable together.

## Per-Item CanExecute

Dynamic validation per collection item:

```typescript
canRemove$(item: Item): Observable<boolean> {
  return this.lockedItems$.pipe(
    map(locked => !locked.has(item.id))
  );
}
```

```html
<button [ssvCommand]="{
  host: this,
  execute: remove$,
  canExecute: canRemove$,
  params: [item]
}">
  Remove
</button>
```

The `canExecute` function receives same params as `execute`.

## Complex Validation

Combine multiple validation sources with computed signals:

```typescript
readonly canSave = computed(() => this.formValid() &&  this.hasChanges() &&  this.isOnline());

readonly saveCmd = command(() => this.save$(), this.canSave);
```

## CommandInput Type Helper

Simplify input types when passing commands to child components:

```typescript
import type { CommandInput } from "@ssv/ngx.command";

@Component({
  selector: "app-child",
  template: `<button [ssvCommand]="onSave()">Save</button>`
})
export class ChildComponent {
  // Single parameter
  readonly onSave = input.required<CommandInput<User>>();
  
  // Multiple parameters (tuple)
  readonly onUpdate = input.required<CommandInput<[user: User, id: number]>>();
  
  // No parameters
  readonly onRefresh = input.required<CommandInput<void>>();
}
```

Parent usage:

```typescript
@Component({
  template: `<app-child [onSave]="saveUserCmd" />`
})
export class ParentComponent {
  readonly saveUserCmd = command((user: User) => this.save$(user));
}
```

**Instead of verbose**:
```typescript
readonly onSave = input.required<Command<(user: User) => unknown>>();
```
