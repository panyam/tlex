# Changelog

Notable changes to tlex. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Releases before v1.2.0 were tags without notes, and are not back-filled here.

## [1.2.0] - 2026-09-21

Full notes: `docs/releases/v1.2.0.md`. Version 1.1.0 was published to npm from this same range without a tag, so its contents are folded in below. The number skips 1.1.1 because this release adds exported API and changes what an existing call does, neither of which belongs in a patch.

### Added

- `TokenBuffer.reset()` discards buffered lookahead so one buffer can serve several independent runs, including after a run that threw and left its offending token queued (PR 3). The tape is not rewound and `tokenizerContext` is kept.
- A test file for `TokenBuffer`, which had none.

### Fixed

- `Tokenizer.addVar` keeps both definitions when one name is added twice, instead of dropping the first (PR 7, issue 5). The name now stands for the alternation of everything added under it, in call order. Observable for callers that redefine a name; see the upgrade note in the full release notes.

### Changed

- `npm run lint` and `npm run lintfix` run again, on a flat `eslint.config.mjs` that eslint 9 can actually read (PR 6, issue 4).
- Formatting across ten source files, from `eslint --fix` against the repo's prettier config, plus `case` clause braces in `vm.ts`, `jsparser.ts` and `repr.ts` (PR 6). No behavior change.
- CI runs lint, build and tests on master and on every PR, across node 20 and 22 (PR 3, PR 6).
- `addVar` and `getVar` carry doc comments for the first time (PR 7).

### Known issues

- The API reference documents `addVar` taking a `RegExp`, which throws (issue 8).
- The playground `%define` path, the only caller of `addVar` in this repo, has no tests (issue 9).
