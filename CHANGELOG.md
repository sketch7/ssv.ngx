## 6.0.0

### Features

- **command:** `canExecute` can return disabled reasons: `CanExecuteResult = boolean | readonly CommandDisabledReason[]`, exposed as the `disabledReasons()` signal
- **command:** add `CommandDisabledReason` (`{ code, params? }`, a stable code plus interpolation params, translated by the UI) and `CanExecuteResult` types
- **command:** command creator (`{ host, execute, canExecute }`) supports reasons, and a `canExecute` function/signal is now reactive (previously evaluated once); a `canExecute(...params)` function follows `[ssvCommandParams]` changes (previously it kept the params at init)
- **command:** `canExecuteFromSignals` returns disabled reasons: `form.invalid` and/or `form.unchanged` (exported as `CommandFormReason`, with a derived `CommandFormReason` code type); the reasons arrays are shared and frozen
- **command:** `canExecuteFromSignals` needs a `valid`/`dirty` signal only while that check is enabled (`canExecuteFromSignals({ valid }, { dirty: false })`), and never reads the signal of a disabled check
- **command:** `canExecuteFromNgForm` returns the same disabled reasons

### Bug Fixes

- **command:** `ssvCommand` follows a bound command swapped after init (previously the first command stayed bound); command creators are still read once
- **command:** `ssvCommand` accepts `undefined` as "no command yet" (previously it threw `[ssvCommand] is not defined properly!`): not executable (`disabled`) and a click does nothing; clearing a bound command back to `undefined` drops it, so strict templates can bind `[ssvCommand]="ref.command()"`
- **command:** `ssvCommandRef` builds its command the same way as `ssvCommand`: `execute` and a `canExecute` function are bound to `host`, and a `canExecute` function returning an observable or a signal is followed (previously such a function was treated as always executable)

### BREAKING CHANGES

- **command:** requires Angular 20+ (peer range raised from `>=17.0.0`; uses `linkedSignal`)
- **command:** `ssvCommand` no longer adds the always-on `ssv-command` host class (`executingCssClass` still applies)
- **command:** the command signals drop the `$` prefix: `$isExecuting` → `isExecuting`, `$canExecute` → `canExecute` (and the new `disabledReasons`). The 5.x boolean getters `isExecuting`/`canExecute` are removed, and their names now hold the signals.
  > [!WARNING]
  > A read without `()` still compiles and is always truthy: `!cmd.canExecute` is always `false` and `cmd.isExecuting` always "loading". Templates only warn (NG8109), and nothing reports it on a directive input with a transform (e.g. `[loading]="cmd.isExecuting"`). Set `angularCompilerOptions.extendedDiagnostics.checks.interpolatedSignalNotInvoked: "error"` in `tsconfig.json`, and search for `.isExecuting` / `.canExecute` / `.disabledReasons` not followed by `(`.
- **command:** remove `ICommand`: `Command` is the only command type. It is a type, not a class: there is no public constructor and no `instanceof Command`; create instances only with `command()` (`new Command(execute, canExecute$, injector)` becomes `command(execute, canExecute$, { injector })`)
- **command:** `Command` requires `disabledReasons: Signal<readonly CommandDisabledReason[]>` (a hand-written `Command` is type-level only, since the directives accept only `command()` instances, and must add it; build test doubles with `command()`)
- **command:** remove `SsvCommandModule` (deprecated) - import the standalone `SsvCommand` / `SsvCommandRef`
- **command:** `isCommand` / `isCommandCreator` are no longer exported (internal)
- **command:** `CanExecute` is now `CanExecuteResult | (() => CanExecuteResult) | Observable<CanExecuteResult>` (the redundant `Signal<boolean>` member is removed; signals still work, since they are functions)
- **command:** `SsvCommand.command` is now `Signal<Command | undefined>` (was `Signal<ICommand>`, though it was `undefined` before `ngOnInit`): handle `undefined` when reading it, or drop an existing `| undefined` workaround
- **command:** `SsvCommandRef.command` is now `Signal<Command | undefined>` (was `Signal<ICommand>`, though it was `undefined` before `ngOnInit`); `[ssvCommand]` accepts it as is
- **command:** remove `commandAsync` (deprecated in 5.0.0) - use `command`
- **command:** `canExecuteFromSignals` returns `Signal<CanExecuteResult>` (was `Signal<boolean>`) and `canExecuteFromNgForm` returns `Observable<CanExecuteResult>` (was `Observable<boolean>`): `true`, or the reasons (`form.invalid`, `form.unchanged`); passing them to `command()` is unchanged, reading them as a boolean is not (use `cmd.canExecute()`)

| 5.x | 6.0.0 |
| --- | --- |
| `cmd.$isExecuting()`, `cmd.isExecuting` | `cmd.isExecuting()` |
| `cmd.$canExecute()`, `cmd.canExecute` | `cmd.canExecute()` |
| - | `cmd.disabledReasons()` |
| `ICommand`, `Command` (class) | `Command` (type) |
| `new Command(execute, canExecute$, injector)`, `commandAsync(...)` | `command(execute, canExecute$, { injector })` |
| `SsvCommandModule` | `SsvCommand`, `SsvCommandRef` |
| `isCommand`, `isCommandCreator` | removed (internal) |

```ts
// before
new Command(execute, canExecute$, injector);
cmd.isExecuting; cmd.canExecute; // or cmd.$isExecuting(); cmd.$canExecute();
const invalidHero = canExecuteFromSignals({ valid: signal(false), dirty: signal(true) });
invalidHero(); // false
canExecuteFromNgForm(invalidForm).subscribe(x => x); // false

// after
command(execute, canExecute$, { injector });
cmd.isExecuting(); cmd.canExecute(); // signals: always call them
const recruitCmd = command(() => recruit(), () => hero().banned ? [{ code: "hero.banned" }] : true);
recruitCmd.disabledReasons(); // [{ code: "hero.banned" }]
const invalidHero = canExecuteFromSignals({ valid: signal(false), dirty: signal(true) });
invalidHero(); // [{ code: "form.invalid" }]
canExecuteFromNgForm(invalidForm).subscribe(x => x); // [{ code: "form.invalid" }]
```

## 5.0.0 (2026-03-11)

### Features

- **command:** `command` supports both sync/async
- **command:** `command.execute` now returns `T | Promise<T>` (based on the execute function)
- **command:** `command.execute` when error is thrown it will bubble the error
- **command:** `Command` is now typed based on the execute function
- **command:** `Command` `canExecute` now support `boolean`
- **command:** `SsvCommand/SsvCommandRef` is now typed
- **command:** add `CommandInput` type

### BREAKING CHANGES

- **command:** remove `autoDestroy`, `destroy`, `subscribe`, `unsubscribe` from `ICommand`/`Command`
- **command:** `commandAsync` deprecated use `command` instead
- **command:** `Observable` `isExecuting` will change to false only when it completes (previously when it emits)
- **command:** `SsvCommand/SsvCommandRef` strict typings
- **command:** `CommandAsync` has been removed - use `command` instead to create instance or use type `Command`
- **command:** `ssvCommandParams` and commandCreator params must be in defined in `[]` e.g. `[hero]`
- **command:** `ssvCommand` `command` is now signal
- **command:** `ssvCommandRef` `command` is now signal

## 4.0.0 (2025-11-14)

### Features

- **command:** refactor to signal based add `$isExecuting` and `$canExecute`
- **command:** change `provideSsvCommandOptions` to `Provider[]` instead of `EnvironmentProviders`
- **command:** deprecated `Command` `autoDestroy`, `subscribe`, `unsubscribe` (redundant when using `command`/`commandAsync`)
- **command:** deprecated `Command` `canExecute`, `isExecuting` in favor of signal based

### Refactor

- **all:** remove all `OnDestroy` in favor of `DestroyRef`

### BREAKING CHANGES

- **command:** remove `Command` `isExecuting$` and `canExecute$`
- **command:** remove `CommandOptions` `hasDisabledDelay`
- **command:** rename `CommandDirective` to `SsvCommand`
- **command:** rename `CommandRefDirective` to `SsvCommandRef`
- **ux:** rename `SsvViewportMatcherVarDirective` to `SsvViewportMatcherVar`
- **ux:** rename `SsvViewportMatcherDirective` to `SsvViewportMatcher`

## 3.3.0 (2025-10-28)

### Chore

- **all:** update deps

## 3.2.0 (2025-06-05)

### 🚀 Features

- **ux viewport:** `ViewportService` exposes `viewportSize` and `sizeType` as signals

## 3.1.3 (2025-03-04)

### 🩹 Fixes

- **ux viewport:** `VIEWPORT_SSR_DEVICE` provide in platform

## 3.1.2 (2025-02-27)

### 🩹 Fixes

- **command:** `canExecuteFromNgForm` validity when form is already initialized

## 3.1.1 (2025-02-20)

### 🩹 Fixes

- **command:** fix `canExecuteFromNgForm` initial valid

## 3.1.0 (2025-02-16)

### 🚀 Features

- **command:** add `canExecuteFromSignals`

### 🩹 Fixes

- **command:** change `canExecuteFromNgForm` to use pristine/status events which handles state more accurately

## 3.0.0 (2025-02-11)

### 🚀 Features

- **command:** add `command`/`commandAsync` which handles auto destroy with `DestroyRef` 
- **command:** canExecute signal support/reactive function e.g. signal based
- **command:** deprecated `Command` and `CommandAsync`
- **deps:** update angular 17
- **ux viewport:** add module `SsvUxViewportModule`
- **ux viewport:** add `withViewportSsrDevice` to set `UX_VIEWPORT_SSR_DEVICE`

### Refactor

- **deps:** rxjs remove `"rxjs/operators`
- **all:** convert all components to standalone

### Chore

- move `@ssv/ngx.command` library repo + migrate to nx
- move `@ssv/ngx.ux` library repo + migrate to nx

### BREAKING CHANGES

- **command:** remove `SsvCommandModule.forRoot` use `provideSsvCommandOptions` instead
- **viewport:** remove `SsvUxModule.forRoot` use `provideSsvUxViewportOptions` instead
- **viewport:** remove `UX_VIEWPORT_DEFAULT_BREAKPOINTS` (can be accessed via provide see README)
- **viewport:** remove `UX_OPTIONS` - replaced with `VIEWPORT_OPTIONS`
- **viewport:** remove `MODULE_CONFIG_DATA` replaced with `VIEWPORT_OPTIONS` (without `viewport: {}`)
- **viewport:** rename `UX_VIEWPORT_SSR_DEVICE` to `VIEWPORT_SSR_DEVICE`

## 3.0.0-dev.1 (2024-10-26)

### 🚀 Features

- ***:** example app + fixes ([#20](https://github.com/sketch7/ssv.ngx/pull/20))
- ***:** up ng15 tooling + switch to github actions ([#82](https://github.com/sketch7/ssv.ngx/pull/82))
- **args:** implement arguments to command ([#8](https://github.com/sketch7/ssv.ngx/pull/8))
- **command:** add option `handleDisabled` ([fe81ddb](https://github.com/sketch7/ssv.ngx/commit/fe81ddb))
- **command:** add option `handleDisabled` ([#44](https://github.com/sketch7/ssv.ngx/pull/44))
- **config:** implemented configurable config (optional) in order to change `executingCssClass` executing default cssClass. ([754de00](https://github.com/sketch7/ssv.ngx/commit/754de00))
- **deps:** update angular 6 + rxjs6 ([#3](https://github.com/sketch7/ssv.ngx/pull/3))
- **deps:** update angular core to >=6 ([#9](https://github.com/sketch7/ssv.ngx/pull/9))
- **deps:** angular 10 support ([#40](https://github.com/sketch7/ssv.ngx/pull/40))
- **directive:** canExecute with params ([#19](https://github.com/sketch7/ssv.ngx/pull/19))
- **examples:** update to ng16 + fix usage for `strictTemplates` ([#83](https://github.com/sketch7/ssv.ngx/pull/83))
- **packages:** updated angular to 2.0 ([8fd495f](https://github.com/sketch7/ssv.ngx/commit/8fd495f))
- **util:** canExecuteFromNgForm now supports reactive forms ([#15](https://github.com/sketch7/ssv.ngx/pull/15))
- **util:** canExecuteFromNgForm options - dirty checking ([#18](https://github.com/sketch7/ssv.ngx/pull/18))

### 🩹 Fixes

- **command:** options merging and isExecuting when complete ([#14](https://github.com/sketch7/ssv.ngx/pull/14))
- **command:** fix isExecuting was being false too fast ([035deff](https://github.com/sketch7/ssv.ngx/commit/035deff))
- **command:** initial disable delay ([#41](https://github.com/sketch7/ssv.ngx/pull/41))
- **command:** sequence error ([#69](https://github.com/sketch7/ssv.ngx/pull/69))
- **command:** initial flicker ([#75](https://github.com/sketch7/ssv.ngx/pull/75))
- **directive:** fix when using in an on push component ([#5](https://github.com/sketch7/ssv.ngx/pull/5))
- **directive:** wrap vars in if, as sometimes might not initialize and they will throw ([#11](https://github.com/sketch7/ssv.ngx/pull/11))
- **util:** `canExecuteFromNgForm` initial value will now emit ([#16](https://github.com/sketch7/ssv.ngx/pull/16))
- **util:** `canExecuteFromNgForm` add delay to cater for pristine changes ([#63](https://github.com/sketch7/ssv.ngx/pull/63))

### ❤️  Thank You

- [Kurt Aquilina](https://github.com/kurtaqui)
- Konstantin  Kuptsov
- [Stephen Lautier @stephenlautier](https://github.com/stephenlautier)

## Pre 3.x changelog
- [ngx.command](https://github.com/sketch7/ngx.command/blob/master/CHANGELOG.md)
- [ngx.ux](https://github.com/sketch7/ngx.ux/blob/master/CHANGELOG.md)