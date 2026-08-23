---
name: arcane-ngx-testing
description: "Use when writing or reviewing Vitest tests in an Arcane Angular repo (arcane.ngx, blueprint.client, cosmowrench, schematics). Covers Vitest-only tooling (no Jest, ever), @testing-library/angular render()/screen for component tests, TestBed for NGXS store/service tests, it.each data-driven tests, signal mocking, and .spec.ts naming. For framework-agnostic testing judgment (boilerplate, module boundaries, League of Legends theming) see arcane-testing-principles; for component/state/naming conventions themselves (not testing) see arcane-ngx-app-conventions."
---

> **Source of truth: this repo (`sketch7/arcane.archives`).** Edit here, then run `npx skills update` in consuming repos. Never edit the installed copy under a consumer repo's `.agents/skills/<name>/` — it's a pulled artifact and gets silently overwritten on the next sync.

# Arcane ngx Testing

Test-writing conventions for Arcane's Angular repos — `arcane.ngx`, `blueprint.client`,
`cosmowrench`, `schematics`. Read with `arcane-testing-principles` (cross-stack judgment: boilerplate,
data-driven tests, theming, pruning) and `arcane-ngx-app-conventions` (component/state conventions
that aren't about testing).

> **Adoption note (2026-08):** this skill states the platform standard going forward, not a
> universally-established one. Vitest itself is fully adopted everywhere — no Jest anywhere in the
> platform, don't introduce it. `@testing-library/angular`'s `render()` is the mandated pattern for
> _new_ component tests, but as of this writing it has exactly one real usage platform-wide
> (`ngx.ui.core`'s `date-range-input.component.spec.ts`); the majority of existing component tests
> use `TestBed` + `@testing-library/dom`'s `screen` directly. Don't present `render()` as
> long-established precedent — it's the standard you're now applying, and older `TestBed`-only specs
> aren't wrong, just pre-dating it.

## 1. Vitest only — never Jest

Every repo runs on Vitest (`@analogjs/vite-plugin-angular` for Angular projects). Never add `jest`,
`ts-jest`, or `jasmine` as a dependency or introduce Jest-style globals config — there is no Jest
anywhere in the platform today and no reason to reintroduce it. `@testing-library/jest-dom` is a
_matcher library_ usable under any runner (including Vitest) — its name doesn't mean Jest is
involved; don't flag it as a Jest dependency.

```ts
import { describe, expect, it, vi } from "vitest";
```

`arcane.ngx`'s house style is to **import `describe`/`it`/`expect` explicitly from `"vitest"`**
rather than relying on globals, even though `globals: true` is set in `vitest.config.ts` (that flag
stays on because `vi.mock(...)` calls need to be hoisted before imports, which requires the
ambient global — it's not there for you to skip the import). Nest `describe` blocks in a
given/when/should pattern:

```ts
describe("HeroValidator", () => {
	describe("given a hero with no primary ability", () => {
		it("should return a validation error", () => { ... });
	});
});
```

## 2. Component tests: `@testing-library/angular`'s `render()` + `screen`

For new component tests, render through testing-library rather than driving `TestBed` directly —
query by role/text/label the way a user would, not by CSS selector or component internals:

```ts
import { render, screen } from "@testing-library/angular";
import { userEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { AppAlert } from "./alert";

describe("AppAlert", () => {
  it("should render its message and dismiss on click", async () => {
    const user = userEvent.setup();
    await render(AppAlert, { inputs: { message: "Summoner disconnected" } });

    expect(screen.getByText("Summoner disconnected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(screen.queryByText("Summoner disconnected")).not.toBeInTheDocument();
  });
});
```

`toBeInTheDocument()`/`toHaveClass()`/etc. need `@testing-library/jest-dom` imported in the repo's
`test-setup.ts` (already wired in `blueprint.client`/`cosmowrench`) — **`arcane.ngx`'s own packages
don't have this dependency**, so when writing specs inside `arcane.ngx` itself, assert with plain
Vitest `expect(...).toBe(...)`/`toContain(...)` against `element.textContent`/`classList` instead of
`jest-dom` matchers, or add the dependency to that package first.

**When `render()` doesn't fit** — a component under test needs heavy real dependencies stripped
out (a large form, a grid with real data services) — fall back to `TestBed` with
`overrideComponent` and `NO_ERRORS_SCHEMA` to stub what you don't need, still asserting through
`@testing-library/dom`'s `screen` queries rather than raw `DebugElement` lookups:

```ts
TestBed.overrideComponent(FeeGrid, { set: { imports: [], schemas: [NO_ERRORS_SCHEMA] } });
const fixture = TestBed.createComponent(FeeGrid);
fixture.componentRef.setInput("fees", mockFees); // signal inputs: set via componentRef, not property assignment
fixture.detectChanges();
expect(screen.getByRole("table")).toBeInTheDocument();
```

Either way, prefer testing-library's role/text queries over `fixture.debugElement.query(By.css(...))`
— they fail less often on unrelated markup changes and read closer to what a user actually sees.

### Business-logic screens: e2e only, unless the logic is genuinely hard to verify by hand

A business-logic screen — a page-level container wired to `crudFormView`/`entityResource` (a
create/edit screen, a profile form), or any component whose job is presenting/collecting entity
data — should be covered by e2e alone. Don't add a `render()`/`TestBed` spec for it. This is the
default, not a fallback for when e2e "happens to already cover it": these screens are wiring
(form controls mapped to entity props, a resource query, `withCreate`/`withUpdate` dispatching a
known action) plus, at most, simple derived values a reviewer can verify correct by reading three
lines of code — string concatenation, a nullish-coalescing default, a regex strip. A unit test for
that isn't buying coverage, it's restating the implementation in test syntax while adding a
maintenance tax every time a field is renamed — see `arcane-testing-principles` §6 ("does this test
catch a real regression, or does it just restate the implementation?"). If the screen has no e2e
coverage yet, add that — don't reach for a container-level unit test as a substitute; a `render()`
spec that stubs the DataStore/router/translation service to mount the container in isolation proves
the mocks are wired correctly, not that the real screen works.

The exception is narrow: logic that's genuinely hard to verify by reading it or by clicking through
the UI once — the kind of thing you'd have to run through several cases in your head (or a
spreadsheet) to be sure it's right, and where a bug would be easy to miss by eye in a rendered grid.
`libs/ui/fee-grid/fee-grid.utils.ts`'s billing-cycle math (`isStartOfBillingCycle`,
`calculateSpanWithinYear`, `isCycleContinuation` — modular period arithmetic that has to handle
cycles spanning a calendar year boundary) is the reference case: get the modulo or the year-rollover
wrong and a rendered grid can look plausible while being wrong for half the months. That earns
`fee-grid.utils.spec.ts`'s `it.each` table over the period-boundary cases. A `legalName`/
`accountHolderName` default built from `[client.name, client.surname].filter(Boolean).join(" ")`,
or an `invoicePrefix` stripped of trailing dashes via `.replace(/-+$/, "")`, does not — reading the
line proves it correct as fast as a test would, and e2e already exercises the screen it lives in.

When logic *does* clear that bar, extract it into a plain (non-`@Component`) sibling file and
unit-test it there rather than rendering the whole container — importing a `@Component`-decorated
file straight into a spec can break the Angular ngtsc program when the app's `tsconfig.spec.json`
only includes `*.spec.ts`/`*.d.ts` (not plain `.ts` sources), so extraction is also what keeps the
test runnable, not just what keeps it focused.

## 3. Store/service tests: `TestBed` + NGXS directly

Component-rendering tools don't apply to NGXS state or plain services — use `TestBed` to configure
the module and inject what you need:

```ts
TestBed.configureTestingModule({ imports: [NgxsModule.forRoot([ArcaneHeroState])] });
const store = TestBed.inject(Store);
const actions$ = TestBed.inject(Actions);

store.reset({ ...store.snapshot(), hero: HERO_INITIAL_STATE });

it("should mark the hero selected", () => {
  store.dispatch(new SelectHero("teemo"));
  expect(store.selectSnapshot(HeroState.selected)).toBe("teemo");
});
```

Assert async effects via `actions$.pipe(ofActionSuccessful(SelectHero))`, not by polling
`selectSnapshot` in a loop.

## 4. Data-driven tests: `it.each`

Prefer `it.each` over near-duplicate `it()` blocks for input/output table tests — this is already
`arcane.ngx`'s own convention (used in ~half its spec files), extend it rather than writing three
copies of the same test body:

```ts
it.each([
  ["easy", false],
  ["superHard", true],
])("should mark %s difficulty as advanced=%s", (difficulty, expected) => {
  expect(isAdvanced(difficulty)).toBe(expected);
});
```

## 5. Mocking signals and resources

Mock a signal input/dependency with a plain `signal(...)` (or `.asReadonly()` for a read-only
contract) rather than a hand-rolled fake class — it satisfies the real signal type and is trivial
to update mid-test:

```ts
export function mockEntityResource<T>(items: T, status: FetchStatusLiteral = "success"): EntityResourceRef<T> {
	const valueSignal = signal<T | null | undefined>(items);
	return { value: valueSignal.asReadonly(), status: signal(status).asReadonly(), ... };
}
```

## 6. Fixtures and shared test helpers

Extract repeated setup into a `testing/` subfolder or a `*.fixtures.ts` file next to the code under
test, and publish genuinely shared helpers as a library subpath export rather than re-declaring
them per consumer — e.g. `@arcane/ngx.core/testing`'s `MOCK_CORE_CONFIG` provider stub. A builder
function with overrides (`buildContract(overrides: Partial<ContractEntity> = {})`) beats a static
fixture object once more than one test needs slightly different data — see
`arcane-testing-principles` §1 for when extraction is worth it.

For themed test data, follow the platform's League of Legends convention — `arcane.ngx`'s
`entity-store-testing/` fixture (`HeroEntity`/`ArcaneHeroState`/`HeroMockService`, champion names
like `teemo`/`kassadin`/`annie`/`darius`) is the reference to copy from, per
`arcane-testing-principles` §3. Domain-specific fixtures (e.g. cosmowrench's `buildContract`/
`buildProperty` fee-grid data) are fine to keep business-themed when the domain shape itself is the
point of the test.

## 7. File naming and location

`*.spec.ts`, co-located with the source file it tests (`alert.ts` → `alert.spec.ts`). No
`__tests__` directory anywhere in the platform — don't introduce one.

## 8. Running tests

`vitest` / `vitest --ui` / `vitest run` locally; each repo's `package.json` wires `nx run-many
--target=test` (or plain `vitest run` in `schematics`, which has no Nx fan-out) as the `test`
script that CI runs.

## Quick Reference Checklist

- [ ] Vitest only — no `jest`/`jasmine` dependency, no Jest-style config (§1)
- [ ] `describe`/`it`/`expect` imported explicitly from `"vitest"`, nested given/when/should (§1)
- [ ] New component test uses `@testing-library/angular`'s `render()` + `screen` queries; `TestBed`+`overrideComponent` fallback only when dependencies need stripping (§2)
- [ ] `jest-dom` matchers only used where the package actually depends on `@testing-library/jest-dom` — plain `expect` assertions otherwise (§2)
- [ ] Business-logic screen (`crudFormView`/`entityResource` container, profile/edit form): e2e only, no container unit test — unless it has logic hard to verify by reading it (period/cycle math, multi-branch calculations), which is extracted to a non-`@Component` sibling file and unit-tested there (§2)
- [ ] NGXS/service tests use `TestBed.configureTestingModule` + `Store`/`Actions`, not testing-library (§3)
- [ ] 3+ near-duplicate cases → `it.each` (§4)
- [ ] Signal inputs/dependencies mocked with `signal(...)`, not a hand-rolled fake (§5)
- [ ] Repeated setup → `*.fixtures.ts`/`testing/` helper; new placeholder fixtures are League of Legends-themed (§6)
- [ ] `*.spec.ts` co-located with source, no `__tests__` folder (§7)
