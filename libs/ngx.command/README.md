[npm]: https://www.npmjs.com
[commandpatternwiki]: https://en.wikipedia.org/wiki/Command_pattern

# @ssv/ngx.command
[![npm version](https://badge.fury.io/js/%40ssv%2Fngx.command.svg)](https://badge.fury.io/js/%40ssv%2Fngx.command)

[Command pattern][commandpatternwiki] implementation for angular. Command's are used to encapsulate information which is needed to perform an action.

Primary usage is to disable a button when an action is executing, or not in a valid state (e.g. busy, invalid), and also to show an activity progress while executing.

## Installation

Get library via [npm]

```bash
npm install @ssv/ngx.command
```

Choose the version corresponding to your Angular version:

 | library | Angular |
 | ------- | ------- |
 | 5.x+    | 17+     |
 | 4.x+    | 17+     |
 | 3.x+    | 17+     |
 | 2.x+    | 10+     |
 | 1.x+    | 4 to 9  |


# Usage

## Command
Create a new instance of `Command`

```ts
import { command } from "@ssv/ngx.command";

const isValid = signal(false);
const isValid$ = new BehaviorSubject(false);

// non async
saveCmd = command(() => this.save(), isValid);

// async - returns an observable/promise.
saveCmd = command(() => Observable.timer(2000), isValid);

// can execute diff ways
saveCmd = command(() => this.save(), () => isValid()); // reactive fn (signal)
saveCmd = command(() => this.save(), isValid); // signal
saveCmd = command(() => this.save(), isValid$); // rx
saveCmd = command(() => this.save(), false); // boolean (perma disabled)
saveCmd = command(() => this.save(), () => isBanned() ? [{ code: "hero.banned" }] : true); // with reasons, see below
```

## Command Attribute (Directive)
Handles the command `canExecute$`, `isExecuting` and `execute` functions of the `Command`, in order to
enable/disable, add/remove a cssClass while executing in order alter styling during execution (if desired)
and execute when its enabled and clicked.

Generally used on a `<button>` as below.

### Usage

```html
<!-- simple usage -->
<button [ssvCommand]="saveCmd">Save</button>

<!-- using isExecuting + showing spinner -->
<button [ssvCommand]="saveCmd">
  @if(saveCmd.isExecuting) {
    <i class="ai-circled ai-indicator ai-dark-spin small"></i>
  }
  Save
</button>
```

#### Usage with params
This is useful for collections (loops) or using multiple actions with different args.
*NOTE: This will share the `isExecuting` when used with multiple controls.*

```html
<!-- with single param -->
<button [ssvCommand]="saveCmd" [ssvCommandParams]="{id: 1}">Save</button>
<!-- 
  NOTE: if you have only 1 argument as an array, it should be enclosed within an array e.g. [['apple', 'banana']], 
  else it will spread and you will arg1: "apple", arg2: "banana"
-->

 <!-- with multi params -->
<button [ssvCommand]="saveCmd" [ssvCommandParams]="[{id: 1}, 'hello', hero]">Save</button>
```

#### Usage with command creator
This is useful for collections (loops) or using multiple actions with different args, whilst not sharing `isExecuting`.

```html
<button [ssvCommand]="{host: this, execute: removeHero$, canExecute: isValid$, params: [hero, 1337, 'xx']}">Remove</button>
```

##### canExecute with params
```html
<button [ssvCommand]="{host: this, execute: removeHero$, canExecute: canRemoveHero$, params: [hero, 1337, 'xx']}">Remove</button>
```

```ts
canRemoveHero$(hero: Hero, id: number, param2): Observable<boolean> {
  return of(id).pipe(
    map(x => x === "invulnerable")
  );
}
```

## Disabled reasons
`canExecute` can return *why* a command cannot execute: instead of `false`, return an array of
`CommandDisabledReason` (`{ code, params? }`). `$disabledReasons()` exposes them, e.g. to explain a disabled button.

A reason carries a stable `code` (e.g. `"hero.banned"`), plus optional interpolation `params`, and no display text;
translate it in the UI layer (e.g. `code` as the translation key).

```ts
readonly recruitCmd = command(() => this.#party.recruit(this.hero()), () =>
  this.hero().banned ? [{ code: "hero.banned" }]
  : this.party().length >= 4 ? [{ code: "party.full", params: { max: 4 } }]
  : true);

recruitCmd.$canExecute(); // false
recruitCmd.$disabledReasons(); // [{ code: "hero.banned" }]
```

| `canExecute` result | `$canExecute` | `$disabledReasons` |
| ------------------- | ------------- | ------------------ |
| `undefined`, `true`, `[]` | `true` | `[]` (shared, frozen) |
| `false` | `false` | `[]` |
| `[{ code: "hero.banned" }]` | `false` | `[{ code: "hero.banned" }]` |

It applies to all `canExecute` forms (value, function/signal, observable) and to the command creator
(`{ host, execute, canExecute }`), including `canExecute(...params)`.
While executing, `$canExecute` is `false` but `$disabledReasons` is unaffected (executing is not a reason).

## Usage without Attribute
It can also be used as below without the command attribute.

```html
<button
    [disabled]="!saveCmd.canExecute"
    (click)="saveCmd.execute()">
    Save
</button>
```

## CommandRef Attribute (directive)
Command creator ref, directive which allows creating Command in the template and associate it to a command (in order to share executions).

```html
@for (hero of heroes; track hero.key) {
  <div #actionCmd="ssvCommandRef" [ssvCommandRef]="{host: this, execute: removeHero$, canExecute: isValid$}" class="button-group">
    <button [ssvCommand]="actionCmd.command()" [ssvCommandParams]="hero">
      Remove
    </button>
    <button [ssvCommand]="actionCmd.command()" [ssvCommandParams]="hero">
      Remove
    </button>
  </div>
}
```

## Utils

### canExecuteFromNgForm/canExecuteFromSignals
In order to use with `NgForm` easily, you can use the following utility method.
This will make canExecute respond to `form.valid` and for `form.dirty` - also can optionally disable validity or dirty.

```ts
import { command, canExecuteFromNgForm, canExecuteFromSignals } from "@ssv/ngx.command";

loginCmd = command(x => this.login(), canExecuteFromNgForm(this.form));

// options - disable dirty check
loginCmd = command(x => this.login(), canExecuteFromNgForm(this.form, {
  dirty: false
}));

// similar functionality using custom signals (or form which provide signals)
loginCmd = command(x => this.login(), canExecuteFromSignals({dirty: $dirty, valid: $valid}));
```

`canExecuteFromSignals` also returns why it cannot execute, as disabled reasons (see `CommandFormReason`):
`form.invalid` (validity check, invalid form) then `form.unchanged` (dirty check, nothing changed), or `true`.

```ts
import { command, canExecuteFromSignals, CommandFormReason } from "@ssv/ngx.command";

readonly recruitForm = form(this.hero);
readonly recruitCmd = command(() => this.recruit(), canExecuteFromSignals({
  valid: this.recruitForm().valid,
  dirty: this.recruitForm().dirty,
}));

// name cleared on a pristine form
recruitCmd.$disabledReasons(); // [{ code: "form.invalid" }, { code: "form.unchanged" }]
CommandFormReason.invalid; // "form.invalid", e.g. the translation key of "Fill in the hero's details"
```

### Command Input (type)
Simplifies the definition when used as an input.

```ts
// For a command with a single parameter:
readonly myCmd = input.required<CommandInput<MyType>>();
// For a command with multiple parameters:
readonly myCmd = input.required<CommandInput<[param1: string, param2: number]>>();

// instead of
readonly myCmd = input.required<Command<(param1: string, param2: number) => unknown>>();
```


## Global options

```ts
import { provideSsvCommandOptions } from "@ssv/ngx.command";

export const appConfig: ApplicationConfig = {
  providers: [
    provideSsvCommandOptions({
      executingCssClass: "is-busy",
    }),
  ],
};
```
