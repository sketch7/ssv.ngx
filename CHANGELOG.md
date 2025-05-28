## 4.0.0 (2025-05-28)

### 🚀 Features

- **ux viewport:** `ViewportService` exposes `viewportSize` and `sizeType` as signals

### BREAKING CHANGES

- **ux viewport:** `sizeTypeMap` and `sizeTypes` changed from `getter` to `readonly` props

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