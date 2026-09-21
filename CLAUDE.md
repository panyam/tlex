# CLAUDE.md

Quick reference for working in this repo. TLEX is a lexer generator and tokenizer library in TypeScript, published to npm as `tlex`. Galore depends on it, so anything in the public API here is somebody else's contract.

Where to look for detail:

- `README.md` for what the library does, `docs/content/` for the doc site's own pages (concepts, reference, guides).
- `CHANGELOG.md` and `docs/releases/<tag>.md` for what shipped when. Tags before v1.2.0 carry no notes and are not back-filled.
- `docs/NEXTSTEPS.md` tracks the doc site, not the library.
- The site under `docs/` is a separate s3gen (Go) project with its own `package.json` and `Makefile`.

## Commands

```bash
pnpm install              # also runs `prepare`, which is a full build
pnpm run build            # tsc twice: tsconfig.json -> lib/esm, tsconfig-cjs.json -> lib/cjs
pnpm test                 # jest --coverage --runInBand
pnpm run lint             # eslint 9 flat config in eslint.config.mjs
pnpm run lintfix
pnpm run docs             # typedoc into sites/dist/docs
pnpm run check:package    # asserts the tarball has no test code and keeps its JSDoc
```

CI is `.github/workflows/tests.yml`: lint, build, package check and test on node 20 and 22, with `pnpm install --frozen-lockfile`. The older `static.yml` deploys the Pages site.

## Gotchas

- **Two places hold the version.** `package.json` and `docs/content/SiteMetadata.json`, the second of which `docs/templates/Footer.html` renders. v1.2.0 shipped with only the first one bumped and the site advertised 1.1.1 until a follow-up commit. Bump both.
- **pnpm settings live in `pnpm-workspace.yaml`.** pnpm 10 and later refuse a non-interactive install when a dependency has an unapproved build script, and `pre-commit`, `spawn-sync` and `unrs-resolver` all have one. Without the `allowBuilds` entries, `pnpm install --frozen-lockfile` fails with `ERR_PNPM_IGNORED_BUILDS`, which means CI and fresh clones fail. pnpm 12 does not read these from the package.json `pnpm` field and warns if you put them there.
- **`prepare` builds on every install,** so a type error surfaces as an install failure.
- **The eslint config tunes two rules rather than disabling them** (issue 4). `no-fallthrough` runs with `allowEmptyCase`, because the conformance suite groups case labels under comments quoting the grammar production each one covers. `no-control-regex`, `no-useless-backreference` and `no-empty-character-class` are off for `src/tests/**` only, since that suite quotes pathological patterns out of ECMA-262 on purpose. Keep them live in `src/`, where they once found a real bug.
- **`prettier/prettier` is an error rule,** so formatting is not optional and `pnpm run lintfix` is part of normal work.
- **Dependabot runs fail on this repo** with `path_dependencies_not_reachable` for `@panyam/tsappkit`, a `file:../../../golang/goapplib/tsappkit` dependency in `docs/package.json`. It has nothing to do with the library or with any given PR, so do not go chasing it when a red run shows up.
- **`tsconfig.json` shapes what gets published, in two ways that bite.** `exclude` has to name `./src/tests/**` and not just `./src/**/*.spec.ts`, because `src/tests/utils.ts` is a helper rather than a spec and otherwise compiles into `lib/` and ships (issue 10). And `removeComments` strips JSDoc from the emitted `.d.ts` as well as the `.js`, so turning it on means no exported symbol shows hover docs at a call site (issue 11). `pnpm run check:package` guards both and runs in CI.
- **npm registry lag is real.** A fresh publish can take minutes to appear through `npm view`, and npm's metadata cache lags further, so a clean install can still resolve the previous version for a while. Check `registry.npmjs.org/tlex` directly before concluding a publish failed.

## Buffer and tokenizer contracts

`TokenBuffer` is handed to owners that keep it for their whole lifetime, a parser being the usual case, so its lifecycle methods have to say what they leave alone as much as what they do.

- `reset()` (1.1.0) drops unconsumed lookahead. It does not rewind the tape, so peeked tokens are lost rather than re-read, and it keeps `tokenizerContext`, which belongs to whoever set it. Both are pinned by tests in `src/tests/token.spec.ts`.
- `addVar` (1.2.0) widens a name rather than replacing it. Adding the same name twice makes it the alternation of everything added, in call order, which also fixes match priority to call order.

Consumers of a new method cannot ship until this repo releases, so the order is tag and publish here, then the range bump downstream, then the downstream release.

## Release checklist

1. Bump `package.json` and `docs/content/SiteMetadata.json`.
2. Write `docs/releases/v<X.Y.Z>.md` and add the matching `CHANGELOG.md` entry, newest on top, Keep a Changelog headings.
3. `pnpm run lint`, `pnpm run build`, `pnpm test`.
4. Commit as `Release v<X.Y.Z>`, tag `v<X.Y.Z>`, push master and the tag.
5. `gh release create v<X.Y.Z> --notes-file docs/releases/v<X.Y.Z>.md`.
6. `npm publish` is the maintainer's step. Verify afterwards from a clean directory outside the repo.

A behavior change to an existing exported call earns a minor bump, not a patch. v1.2.0 skipped 1.1.1 for exactly that reason.

## Open threads

Issues 8 and 9 came out of the `addVar` work, 10 and 11 out of the published tarball. Worth reading before touching packaging or the API reference.
