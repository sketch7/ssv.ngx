---
name: arcane-agent-skills
description: "Use when installing, updating, or discovering Arcane's shared agent skills (e.g. Orleans grain conventions, Angular ngx conventions, entitymeta/schematics conventions) in a repo. Covers the npx skills CLI install/update workflow, and which sketch7 repo hosts each skill."
---

# Arcane Agent Skills

Shared `SKILL.md` conventions for the Arcane platform aren't published as a package — each skill
lives directly in the sketch7 repo whose code it documents, and gets pulled into other repos with
the [Skills CLI](https://skills.sh) (`npx skills`, no install required, works with private repos
via your existing `gh`/git credentials).

## Where each skill lives

| Skill                                   | Source repo               | Covers                                                                                                                                                                                                                                                                                                                                        |
| --------------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `arcane-dotnet-conventions`             | `sketch7/arcane.archives` | General C# language/formatting conventions for Arcane .NET repos: language target, method chaining/constructor/expression-body formatting, `record`/`sealed class` naming, guard clauses, extension-method namespace placement, C# 14 `extension(...)` blocks (arcane.dotnet, hexgate, vault, foundry, gemstone, blueprint, cosmowrench.api)  |
| `arcane-dotnet-fe`                      | `sketch7/arcane.archives` | The `Arcane.Server` ASP.NET Core SSR-shell host inside Arcane Angular frontend repos: project setup (nullable disabled, tabs), the SSR-shell-not-domain-API boundary, namespace/folder/DI/config conventions (blueprint.client, cosmowrench)                                                                                                  |
| `arcane-dotnet-datastore`               | `sketch7/arcane.archives` | Router for Arcane .NET DataStore work (Orleans CRUD, dynamic filtering, indexed queries, entity stores, persistence providers, DataStore SignalR) — routes to consumption vs. extensibility workflows                                                                                                                                         |
| `arcane-dotnet-datastore-consumption`   | `sketch7/arcane.archives` | Adding/changing an application entity on Arcane DataStore: EF Core/SQL Server setup, CRUD models, indices, relationships, queries, filters, mutations, GraphQL/REST, SignalR notifications                                                                                                                                                    |
| `arcane-dotnet-datastore-extensibility` | `sketch7/arcane.archives` | Changing Arcane DataStore framework internals: `StoreBuilder`, commands, processors, hooks, storage providers, filter translators, source generators, analyzers, SignalR provider behavior                                                                                                                                                    |
| `arcane-dotnet-orleans-best-practices`  | `sketch7/arcane.archives` | Orleans grain interfaces, persistence, concurrency, keys, testing — for any service consuming `arcane.dotnet`'s Orleans infra                                                                                                                                                                                                                 |
| `arcane-dotnet-aspnet-conventions`      | `sketch7/arcane.archives` | Controllers, CQRS command layer, error-handling middleware/response shape, service registration, testing (cosmowrench.api, blueprint, foundry, gemstone, vault)                                                                                                                                                                               |
| `arcane-dotnet-errors`                  | `sketch7/arcane.archives` | The `Arcane.Core.Error` `ErrorResult`/`ApiErrorException` fluent builder API — deciding request vs. field errors, error-code conventions, extending with reusable builders (cosmowrench.api, blueprint, foundry, gemstone, vault, and any other `Arcane.Core` consumer)                                                                       |
| `arcane-dotnet-server-builder`          | `sketch7/arcane.archives` | `ArcaneServerBuilder`/`Use*` extension authoring + `Program.cs` wiring, used by every service repo                                                                                                                                                                                                                                            |
| `arcane-dotnet-sibling-linking`         | `sketch7/arcane.archives` | The Debug `ProjectReference`/Release `PackageReference` split against sibling `arcane.dotnet`/`Sketch7.SignalR.Orleans` checkouts, `ArcaneLibsLinkPath`/`ArcaneLinkPath`, and the resulting sibling-checkout requirement (vault, foundry, gemstone, blueprint, cosmowrench.api)                                                               |
| `arcane-entitymeta`                     | `sketch7/arcane.archives` | Shared `.entitymeta.json` structure (props, indices, enums, relationships) for `@arcane/schematics` — read before the platform-specific ones below                                                                                                                                                                                            |
| `arcane-dotnet-entitymeta`              | `sketch7/arcane.archives` | .NET-specific `.entitymeta.json` deltas: type mapping, numeric enums, server-only options                                                                                                                                                                                                                                                     |
| `arcane-ngx-entitymeta`                 | `sketch7/arcane.archives` | Angular-specific `.entitymeta.json` deltas: TS type mapping, string enums, NGXS state wiring                                                                                                                                                                                                                                                  |
| `arcane-ngx-entity-store`               | `sketch7/arcane.archives` | The `@arcane/schematics:entity-store` Nx generator workflow for Angular apps: `--actions` decision table, generated `EntityMetaBuilder` conventions (composite indices, virtual rels, invalidation) — read with `arcane-ngx-entitymeta` (blueprint.client, cosmowrench, other Nx client apps)                                                 |
| `arcane-ngx-datastore-consumption`      | `sketch7/arcane.archives` | Using `@arcane/ngx.store` (the Angular counterpart to the .NET DataStore) from consumer code: `EntityStateMixin`/`entityStoreProxy`, and the `fetchState`/`entityResource`/`entityView`/`listView`/`crudFormView` helpers, plus `FilterBuilder`-based dynamic filtering/indexed queries (blueprint.client, cosmowrench, other Nx client apps) |
| `arcane-ngx-datastore-extensibility`    | `sketch7/arcane.archives` | Extending `@arcane/ngx.store` framework internals: `IStoreAdapter`, `StoreBinder`/`EntityStoreResolver`, `EntityStorePlugin`/`crudFormViewPlugin` hooks, virtual indices, realtime builder, the configurable-feature DI-token pattern                                                                                                         |
| `arcane-ngx-library-conventions`        | `sketch7/arcane.ngx`      | Authoring `@arcane/ngx.*` components themselves: module wrapper, options DI pattern, theming, barrels                                                                                                                                                                                                                                         |
| `arcane-ngx-app-conventions`            | `sketch7/arcane.archives` | Consumer-app conventions shared across blueprint.client + cosmowrench: naming, signals, NGXS, testing, and the routed-container/presenter split with `inject()`-only DI                                                                                                                                                                       |
| `arcane-ngx-workspace-linking`          | `sketch7/arcane.archives` | pnpm workspace linking of `@arcane/ngx.*`/`@ssv/ngx.*` for local sibling-repo iteration: the `.npmrc`/`.pnpmfile.cjs` opt-in switch and the nested-`node_modules`/duplicate-DI-token gotcha (blueprint.client, cosmowrench)                                                                                                                   |
| `arcane-ngx-css-tokens`                 | `sketch7/arcane.archives` | The `--arc-*` CSS custom-property theming system: token catalog, where tokens are declared per-app, and the two valid consumption patterns (raw `var()` vs. `@app/fns` palette-colorize) (blueprint.client, cosmowrench)                                                                                                                      |
| `arcane-scss`                           | `sketch7/arcane.archives` | SCSS authoring conventions: `@use`/`@forward` vs legacy `@import`, `styles/@app/` partial organization and the `@app/` path alias, public vs. private mixin conventions, and how BEM naming is actually applied in practice (blueprint.client, cosmowrench)                                                                                   |
| `arcane-ngx-i18n`                       | `sketch7/arcane.archives` | Using `@arcane/ngx.i18n`'s `TranslationService`/`translate` pipe from consumer app code: fallback-key chain, `trCtx()` context convention, error-code-as-translation-key standard, translations.json key hygiene (blueprint.client, cosmowrench, other Nx client apps)                                                                        |
| `arcane-ts`                             | `sketch7/arcane.archives` | Plain-TypeScript language conventions shared across the platform: const/let, optional chaining, private-field style, TSDoc format, deriving types via `infer`/utility types instead of duplicating them, and fluent/builder-style API design (ngx libraries, blueprint.client, cosmowrench, schematics, Node/CLI tooling)                     |
| `arcane-docs-style`                     | `sketch7/arcane.archives` | TSDoc/JSDoc and README/docs writing conventions for Arcane TypeScript/JavaScript packages: example-first doc blocks, en-US spelling, README structure, use-when/avoid-when bullets vs. API tables, mermaid diagram + pastel palette conventions                                                                                               |
| `arcane-testing-principles`             | `sketch7/arcane.archives` | Framework-agnostic testing philosophy for any stack: cutting boilerplate with helpers, data-driven/table tests, League of Legends-themed fixtures, RED-GREEN TDD, testing module boundaries instead of every internal unit, pruning tests that don't earn their keep                                                                          |
| `arcane-dotnet-testing`                 | `sketch7/arcane.archives` | xUnit + Shouldly test conventions for Arcane .NET services: naming, AAA structure, Theory/InlineData data-driven tests, the FluentAssertions→Shouldly migration status per repo, test-double placement, tenant scope wiring (cosmowrench.api, blueprint, foundry, gemstone, vault, hexgate, arcane.dotnet)                                    |
| `arcane-ngx-testing`                    | `sketch7/arcane.archives` | Vitest (never Jest) + `@testing-library/angular` test conventions for Arcane Angular repos: `render()`/`screen` component tests, `TestBed`+NGXS store tests, `it.each` data-driven tests, signal mocking, `.spec.ts` naming (arcane.ngx, blueprint.client, cosmowrench, schematics)                                                           |
| `arcane-ci-cd-workflows`                | `sketch7/arcane.archives` | The two reusable-workflow tracks every Arcane repo's `ci.yml`/`cd.yml` wraps: `sketch7/.github` for CI + package-publish, `arcane.hexgate`'s own `release-dotnet(-fe)-app.yml` for deployable app repos — which track a repo belongs to, `workflow_call` inputs/secrets, and debugging a CD that didn't fire                                  |
| `arcane-skill-authoring`                | `sketch7/arcane.archives` | How to author a new Arcane-family skill: naming, placement, directory/frontmatter structure, house style, and the registration checklist — read before writing a new `SKILL.md` anywhere in the family                                                                                                                                        |
| `arcane-conventional-commit`            | `sketch7/arcane.archives` | The platform's Conventional Commits dialect as observed in commit history: type list, scope conventions (multi-word, `*` wildcard), PR-number suffixes, and hexgate's automated `deploy(...)` tag format                                                                                                                                      |

(Add a row here whenever a new Arcane-specific skill is authored somewhere in the family.)

**Naming**: prefix with `arcane-dotnet-` or `arcane-ngx-` when the skill is specific to one stack;
plain `arcane-<topic>` when it's genuinely shared across both (e.g. `arcane-entitymeta`,
`arcane-agent-skills` itself).

**Placement rule**: what matters is whether the skill teaches _authoring the library's own
internals_ or _consuming the library's API from another repo_ — not how many repos use it, and not
whether the underlying tool happens to be a single repo.

- Authoring-only (the only real audience is people editing that library's own source) → lives in
  that library's repo. Currently just `arcane-ngx-library-conventions` (authoring `@arcane/ngx.*`
  components themselves). `arcane.schematics`'s own generator/template authoring guide
  (`AGENTS.md` there) stays local for the same reason — nobody outside that repo writes new
  generator templates.
- Consumption-facing (the audience is engineers in _other_ repos calling into the library's API —
  even if there's only one library/tool behind it, like `arcane.dotnet` or `arcane.schematics`) →
  lives in `arcane.archives`. This is most of the table above: the three `arcane-dotnet-*` skills
  document `arcane.dotnet` APIs, and the three entitymeta skills document `@arcane/schematics`'s
  `.entitymeta.json` format — but the actual audience for all of them is anyone writing a
  grain/controller/`Program.cs`/`.entitymeta.json` in `cosmowrench.api`/`blueprint`/`foundry`/
  `gemstone`/`vault`, not people editing `arcane.dotnet`/`arcane.schematics` themselves. Keeping a
  consumption-facing skill in the library's own repo risks the same drift that made
  `arcane-dotnet-orleans-best-practices` go stale before it moved here, and the same problem we
  found in a repo-local copy of the entitymeta skills that had gone stale enough to reference a
  teammate's personal machine path instead of a real install source.

## Install a skill into a repo

```bash
npx skills add sketch7/arcane.archives --skill arcane-dotnet-conventions --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-fe --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-datastore arcane-dotnet-datastore-consumption arcane-dotnet-datastore-extensibility --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-orleans-best-practices --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-aspnet-conventions --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-server-builder --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-sibling-linking --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-entitymeta arcane-dotnet-entitymeta --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-entitymeta arcane-ngx-entitymeta arcane-ngx-entity-store --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ngx-datastore-consumption arcane-ngx-datastore-extensibility --agent '*' -y
npx skills add sketch7/arcane.ngx --skill arcane-ngx-library-conventions --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ngx-app-conventions --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ngx-workspace-linking --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ngx-css-tokens --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-scss --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ngx-i18n --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ts --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-docs-style --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-testing-principles --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-dotnet-testing --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ngx-testing --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-ci-cd-workflows --agent '*' -y
npx skills add sketch7/arcane.archives --skill arcane-conventional-commit --agent '*' -y
```

Or `--skill '*'` to pull every skill from a source repo at once. This materializes the real files
under `.agents/skills/<name>/` (read by Claude Code, Codex, GitHub Copilot, and most other agents
directly) plus a per-agent symlink where needed (e.g. `.claude/skills/<name>` for Claude Code), and
records the source + content hash in `skills-lock.json`.

**Commit only `.agents/skills/<name>/` and `skills-lock.json`.** There's no CI step or sync job
required for those — agents (local, CI, or Copilot's cloud agent) just see the files because
they're checked into the repo, the same way `arcane.archives` already commits its own
`mermaid-diagrams` skill. The per-agent symlink (`.claude/skills/<name>`) and the universal
fallback copy (`agent/skills/<name>`) are derived from those two, machine-specific (the symlink is
an absolute path), and regenerable — gitignore `.claude/skills/` and `agent/` instead of
committing them, and run `npx skills experimental_install` after cloning if a particular agent
needs its copy restored locally.

## Update after a shared skill changes

```bash
npx skills update
```

Review the diff and commit it, same as any other dependency bump.

## Adding a new shared skill

See `arcane-skill-authoring` for the full authoring workflow (naming, directory/frontmatter
structure, house style, testing, registration checklist) — read it before writing a new
`SKILL.md`. Once it's written, add a row to the table above so other repos know where to install
it from.
