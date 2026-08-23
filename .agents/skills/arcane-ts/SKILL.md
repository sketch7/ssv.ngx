---
name: arcane-ts
description: "Use when writing or reviewing plain TypeScript in an Arcane repo — language-level conventions (const/let, optional chaining, private fields), TSDoc comment format, deriving types instead of duplicating them, and designing fluent/builder-style APIs. Applies across ngx libraries, blueprint.client, cosmowrench, schematics, and Node/CLI tooling (*.mts scripts). Not for Angular component/state/signal conventions (arcane-ngx-app-conventions) or entity-store-specific builders (arcane-ngx-datastore-consumption / arcane-ngx-datastore-extensibility)."
---

> **Source of truth: this repo (`sketch7/arcane.archives`).** Edit here, then run `npx skills update` in consuming repos. Never edit the installed copy under a consumer repo's `.agents/skills/<name>/` — it's a pulled artifact and gets silently overwritten on the next sync.

# Arcane TS

Plain-TypeScript conventions shared across the Arcane platform — verified against
`@arcane/ngx.core`/`ngx.store` (library code) and `cosmowrench`/`blueprint.client` (app code), not
just one. Angular-specific idioms (`inject()`, signal `input()`/`output()`/`computed()`,
`DestroyRef`) already live in each consumer app's own `angular.instructions.md` / `angular-developer`
skill — don't duplicate them here.

## Language basics

- `const`/`let`, never `var`.
- Optional chaining (`?.`) and nullish coalescing (`??`) over manual null checks.
- Prefer immutable data (`const`, `readonly`) over mutation.
- Private fields: the two codebases split by context, not a single blanket rule — match the
  surrounding file, don't convert wholesale:
  - Angular components/services lean `#field` (28 files in cosmowrench's app vs. 9 using `private`).
  - Plain library code (`ngx.store`, `ngx.core`) leans the `private` keyword (29 files vs. 7 using
    `#`) — e.g. `FilterBuilder`'s `private _and`/`private _or`.

## Don't duplicate types — derive them

A hand-written interface that re-lists fields already expressed elsewhere drifts the moment one
side changes. `@arcane/ngx.core`'s `types/core.ts` and `ngx.store`'s `entity-meta.ts` lean hard on
conditional `infer` types to _extract_ a shape from an existing generic instead of redeclaring it:

```ts
/** Extracts the generic type of an `Observable`. */
export type ExtractObservable<P> = P extends Observable<infer TObs> ? TObs : P;

// same pattern, real usage in ngx.store/entity-meta/entity-meta.ts:
export type ExtractEntity<T> =
  T extends EntityMeta<infer E> ? E : T extends EntityDataSourceQuery<infer U> ? U : never;
```

Before writing a new interface to describe "the type of X", check whether it can instead be
derived:

- `T extends Wrapper<infer U> ? U : T` to unwrap a generic (`ExtractObservable`, `ExtractEntity`,
  `ExtractArray`, `ExtractCrudFormViewEntity` are all this shape in `ngx.core`/`ngx.store`).
- `ReturnType<typeof fn>` / `Parameters<typeof fn>` / `typeof obj[number]` instead of a parallel
  interface next to the function or const array it already describes.
- Mapped/utility types over ad-hoc duplicates — `ngx.core/types/core.ts` has `WithRequired`,
  `WritableOnly`, `Nullable`, `DeepPartial`, `IntersectionProps` ready to reuse before writing a
  new one.
- `satisfies` to check a literal against a shape without widening it to that shape (loses fewer
  literal types than an `: Type` annotation would).

### Phantom type fields — collapsing many generic slots into one

A generic type with several loosely-related type parameters (`EntityMeta<T, TQuery, TId,
TMutations>`) forces every consumer, subclass, and helper type down the chain to repeat the same
long parameter list — and to keep it in sync when a slot is added. `ngx.store`'s `EntityMetaDef`
instead declares the extra slots as `readonly` fields that are never actually assigned a runtime
value — they exist purely so TypeScript can infer/read a type off the object:

```ts
export type EntityMetaDef<
  T extends Entity = Entity,
  TDataSourceQuery extends EntityDataSourceQueryUntyped<T> = EntityDataSourceQueryUntyped<T>,
  TMutations extends EntityMetaMutationsDef = EntityMetaMutationsDef<T>,
> = {
  readonly TEntity: T,
  readonly TDataSourceQuery?: TDataSourceQuery,
  // create/update input types, defaulted from `TEntity` but overridable via `TMutations`
  readonly TCreate?: TMutations["TCreate"],
  readonly TUpdate?: TMutations["TUpdate"],
};
```

A concrete meta object only ever has to be built (or typed) once; everywhere else in the codebase
that needs "the entity type for this meta" or "the create-input type for this meta" reads it back
off the object with an indexed access — `TEntityMeta["TEntity"]`, `TEntityMeta["TCreate"]` — instead
of threading a matching generic parameter through every function signature along the call chain.

The `?`-marked slots (all but the first) come back as `T | undefined` from a plain indexed access,
which is noise once you know the field is always populated by the builder — a `props?:
EntityPropMeta[]`-shaped optional field on the *value* side is genuinely absent sometimes, but an
optional phantom field on the *type* side is optional only so TS strict mode accepts a meta object
that doesn't set every generic. `@arcane/ngx.core`'s `PhantomType<T, K>` (`types/core.ts`) is exactly
`NonNullable<T[K]>` — reach for it instead of writing that `NonNullable<...>` wrapper by hand or
loosely typing the read as `T[K]`:

```ts
export type PhantomType<T extends object, K extends keyof T> = NonNullable<T[K]>;

// usage — reads the create-input type back off a meta, stripping the `| undefined`:
type CreateInput<TEntityMeta extends EntityMetaDef> = PhantomType<TEntityMeta, "TCreate">;
```

Reach for this pattern when a type is threading 3+ related generic parameters through several
signatures and callers only ever need "one of them, by name" at each call site — collapse the
parameter list into one object-shaped generic with phantom fields, then read individual slots back
with `PhantomType<TMeta, "TheField">` instead of adding another type parameter everywhere.

## TSDoc

See `arcane-docs-style` for comment format (example-first, one-line `@param`/`@returns`) — don't
duplicate it here.

## Fluent / builder APIs

When an API is configured along several optional dimensions, build it — don't grow a single
function with a wide options bag. The house shape, consistent across `ngx.core` and `ngx.store`:

```ts
export class HttpRequestBuilder {
  private queryParamOptionsBuilder = new QueryParamOptionsBuilder();

  withQueryParamOptions(
    configure: (builder: QueryParamOptionsBuilder) => void,
  ): HttpRequestBuilder {
    configure(this.queryParamOptionsBuilder);
    return this;
  }

  build(): HttpRequestOptions {
    return { queryParamOptions: this.queryParamOptionsBuilder.build() };
  }
}
```

- Chained methods return `this` (or the builder's own type); a terminal `.build()` produces the
  plain data object consumers actually use — `FilterBuilder.and()/or()/andObj()/orObj()` +
  `.build()` in `ngx.store/filtering/filter-builder.ts` is the same shape with more dimensions.
- For nested/composable config, take a configure-callback rather than a sub-builder instance the
  caller has to build and pass in themselves: `.withX(configure: (builder: XBuilder) => void)`
  (`HttpRequestBuilder.withQueryParamOptions`, `FilterBuilder.withUntyped`).
- A lighter functional variant is fine for a single call site — `computedClasses(name, x =>
x.add(...))` (see `arcane-ngx-app-conventions`) — reach for a full class only once there's a
  `.build()` output worth naming.
- This mirrors the `.NET` side's `Use*`/`StoreBuilder` fluent convention
  (`arcane-dotnet-server-builder`) — keeping both platforms' builder shape recognizable to the same
  reader is deliberate, not a coincidence.

## Quick reference checklist

- [ ] `const`/`let`, `?.`/`??`, immutable data by default
- [ ] Private fields match the file's context (`#` in Angular classes, `private` in library code)
- [ ] No new interface duplicates a shape derivable via `infer`, `ReturnType`/`Parameters`,
      `typeof`, or an existing `ngx.core` utility type
- [ ] 3+ related generic parameters threaded through many signatures → collapse into one
      object-shaped generic with phantom fields, read back per-field with `PhantomType<T, K>`
- [ ] TSDoc follows `arcane-docs-style` (example-first, one-line `@param`/`@returns`)
- [ ] Multi-dimension config API → builder class (`with*` configure callbacks + `this` chaining +
      `.build()`), not a wide options bag
