---
name: ssv-ngx-ux
description: "Use when building responsive or viewport-aware Angular UI with @ssv/ngx.ux — rendering different markup per breakpoint, reading viewport size or breakpoint in TypeScript instead of a CSS media query, resolving a per-breakpoint value (columns, page size, slides per view), customizing the breakpoint map, or fixing responsive UI that renders at the wrong size under SSR. Also use for ssvViewportMatcher/ssvViewportMatcherVar/ssvViewportData questions, and TS2322 errors on a viewport matcher else clause."
---

# @ssv/ngx.ux

Viewport/responsive utilities: render by breakpoint, read viewport size as signals, and resolve
per-breakpoint data. Everything resolves through one breakpoint map, so a template directive, a
service read, and a data lookup always agree — which is the point of using this over raw media
queries.

## Breakpoints

Named sizes with a **max-width threshold** each (the largest size is everything above the previous):

| Size       | Threshold (px) |
| ---------- | -------------- |
| `xsmall`   | 450            |
| `small`    | 767            |
| `medium`   | 992            |
| `large`    | 1200           |
| `xlarge`   | 1500           |
| `xxlarge`  | 1920           |
| `xxlarge1` | 2100           |

Comparison operands: `=` `<>` `<` `<=` `>` `>=`.

## Render by breakpoint

`*ssvViewportMatcher` renders its content only while the condition matches:

```html
<!-- tuple expression — the recommended form -->
<div *ssvViewportMatcher="['>=', 'xlarge']">desktop UI</div>

<!-- single size / multiple sizes (OR) -->
<div *ssvViewportMatcher="'large'">only large</div>
<div *ssvViewportMatcher="['small', 'large']">small or large</div>

<!-- exclude -->
<div *ssvViewportMatcher="''; exclude ['xsmall', 'small']">hide on phones</div>
```

`*ssvViewportMatcherVar` gives you the boolean instead of controlling rendering — use it when the
same condition drives several bindings and you don't want to repeat the expression:

```html
<div *ssvViewportMatcherVar="let isMediumDown when ['<=', 'medium']">
  <button [class.compact]="isMediumDown">{{ isMediumDown ? "Menu" : "Navigation" }}</button>
</div>
```

**Avoid the `else` clause.** `*ssvViewportMatcher="…; else tpl"` trips `TS2322` under Angular 21's
`TemplateRef` typing. The input exists and works at runtime, but the build fails — so pair two
directives with complementary conditions instead:

```html
<div *ssvViewportMatcher="['>=', 'large']">Large</div>
<div *ssvViewportMatcher="['<', 'large']">Smaller</div>
```

## Read the viewport in TypeScript

```typescript
import { ViewportService } from "@ssv/ngx.ux";

#viewport = inject(ViewportService);

readonly sizeType = this.#viewport.sizeType;          // Signal<ViewportSizeTypeInfo>
readonly isCompact = computed(() => this.sizeType().type <= ViewportSizeType.medium);
```

| Member                          | Shape                                                  |
| ------------------------------- | ------------------------------------------------------ |
| `sizeType` / `viewportSize`     | signals, throttled by `resizePollingSpeed` (33ms)      |
| `sizeType$` / `size$`           | observables, throttled                                 |
| `sizeTypeSnap$` / `sizeSnap$`   | observables, every resize event — use only if you need it |
| `sizeTypeSnapshot`              | current value, for one-off imperative reads            |
| `sizeTypes` / `sizeTypeMap`     | the generated size list/lookup, ordered smallest→largest |

Compare with `ViewportSizeTypeInfo.type` (a `ViewportSizeType` ordinal), not with the `name` string —
ordinals make `<=`/`>=` comparisons work and survive renamed custom breakpoints.

## Per-breakpoint values

When what changes per breakpoint is a *value* rather than markup (page size, column count, slides per
view), declare it once as a data config instead of branching in the template:

```typescript
readonly columns: ViewportDataConfig<number> = { default: 1, medium: 2, large: 3, xlarge: 4 };
```

```html
<div [style.--cols]="columns | ssvViewportData: 'smaller'">…</div>
```

The `smaller` strategy means "exact match, else the nearest smaller size, else `default`" — so `large`
above also covers `xlarge` if you drop that key. See
[references/viewport-data.md](references/viewport-data.md) for the other strategies, the
`ViewportDataService` API (`get`/`get$`/`generateRules`), and how to pick between them.

## Configuration

```typescript
provideSsvUxViewportOptions({
  breakpoints: { xsmall: 450, small: 767, medium: 992, large: 1200, xlarge: 1500 },
  resizePollingSpeed: 33,
  defaultDataMatchStrategy: ViewportDataMatchStrategy.smaller,
});
```

Breakpoints are **replaced, not merged** — a partial map silently drops the sizes you omit, and every
matcher expression referencing a missing name stops matching. Always supply the complete set.

## SSR

There's no viewport on the server, so without a hint everything renders at the fallback size and
visibly reflows on hydration. Supply the device type you detected server-side:

```typescript
import { withViewportSsrDevice } from "@ssv/ngx.ux";

providers: [
  provideSsvUxViewportOptions({}, withViewportSsrDevice(deviceTypeFromRequest)), // "mobile" | "tablet" | "desktop"
];
```

For finer control, replace `ViewportServerSizeService` with your own class exposing
`get(): ViewportSize`.

## Common mistakes

| Mistake                                                    | Why it bites                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------ |
| `else` on `*ssvViewportMatcher`                             | `TS2322` at build time — use two complementary directives          |
| Partial `breakpoints` map                                   | Replaces the defaults; omitted sizes vanish                        |
| Comparing `sizeType().name` strings                         | Breaks ordering comparisons — compare `.type` ordinals             |
| Subscribing to `sizeTypeSnap$` for UI                       | Unthrottled — fires on every resize event; use `sizeType`/`sizeType$` |
| Template branching for a per-breakpoint value               | Use a `ViewportDataConfig` + `ssvViewportData` pipe instead        |
| Nothing provided for SSR                                    | Server renders at the fallback size, then reflows on hydration     |

**Library ref**: [README](../../../libs/ngx.ux/README.md) ·
[source](../../../libs/ngx.ux/src/viewport/) ·
[example app](../../../apps/test-app/src/app/viewport/)
