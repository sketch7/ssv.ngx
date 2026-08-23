# Viewport Data

Resolving a value per breakpoint — `ViewportDataService`, the `ssvViewportData` pipe, and the match
strategies.

## The data config

A `ViewportDataConfig<T>` is a plain map of size name → value, plus an optional `default` used when no
strategy produces a match:

```typescript
const pageSize: ViewportDataConfig<number> = { default: 10, small: 5, large: 20 };
```

You only declare the sizes where the value *changes*. The strategy fills in the rest, which is why a
three-key config covers seven breakpoints.

## Strategies

Every strategy tries an exact match first, then falls back as described, then finally `default`
(returning `undefined` if there's no `default` either).

| Strategy              | Fallback after exact match                        | Use for                                                            |
| --------------------- | -------------------------------------------------- | ------------------------------------------------------------------ |
| `exact`               | none                                                | values that genuinely differ at every size you care about          |
| `smaller`             | nearest smaller size                                | mobile-first configs — the default, and usually what you want      |
| `larger`              | nearest larger size                                 | desktop-first configs                                              |
| `closestSmallerFirst` | nearest in either direction, smaller preferred      | sparse configs where any neighbour beats `default`                 |
| `closestLargerFirst`  | nearest in either direction, larger preferred       | same, biased upward                                                |

With `{ default: 10, small: 5, large: 20 }` at `xlarge`: `smaller` → 20 (from `large`), `larger` → 10
(nothing above `large`, so `default`), `exact` → 10.

The workspace default is `smaller`, changeable via
`provideSsvUxViewportOptions({ defaultDataMatchStrategy })`.

## Pipe

```html
<ul [style.--page-size]="pageSize | ssvViewportData: 'smaller'">…</ul>
```

The strategy argument is the **string literal** name (`ViewportDataMatchStrategyLiteral`), not the enum
member — the pipe indexes the enum by key internally. The pipe is impure by necessity (it tracks resize),
so keep the config object as a stable class field rather than building it inline in the template, which
would re-subscribe on every change detection pass.

## Service

```typescript
#viewportData = inject(ViewportDataService);

// one-off read at the current size
const size = this.#viewportData.get(pageSize, ViewportDataMatchStrategy.smaller);

// reactive
readonly pageSize$ = this.#viewportData.get$(pageSize, ViewportDataMatchStrategy.smaller);
```

`get$(config, strategy?, throttle = true)` — leave `throttle` on unless you specifically need every
resize event; it's distinct-until-changed either way, so untrottled mostly buys extra work.

Both take the enum member (`ViewportDataMatchStrategy.smaller`), unlike the pipe's string literal.

## Generating CSS-style ranges

`generateRules(config, strategy?)` expands a config into `{ min?, max?, value }[]` — pixel ranges rather
than size names. Use it when handing breakpoint data to something that thinks in pixels (a carousel's
`breakpoints` option, an inline `<style>` block, a canvas layout), instead of reimplementing the
threshold arithmetic:

```typescript
const slidesPerView: ViewportDataConfig<number> = { default: 1, medium: 2, xlarge: 4 };
const rules = this.#viewportData.generateRules(slidesPerView, ViewportDataMatchStrategy.smaller);
// [{ value: 1 }, { value: 2, min: 768, max: 992 }, { value: 4, min: 1201 }]
```

The first entry (no `min`/`max`) is the `default`, and the last declared size extends upward with no
`max`. Note this expands to *declared* sizes only — a size you skipped (`large` above) falls into the
default rule here, whereas `get`/`get$` would resolve it to the nearest smaller declared value (`2`).
If you need the two to agree exactly, declare every size you care about.
