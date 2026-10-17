# QA evidence: workspace row accessory + row takeover

Raw output of the commands run on each commit, on Windows 11 (Node 24.15, 64 GB), in a clean
worktree of the PR branch after `npm ci`, `npm run build:app-deps` and `npm run build:server`.
Long output is trimmed with `…` and local paths are replaced by `<repo>` and `%TEMP%`; nothing
else is edited. Full logs are kept locally.

## Current revision

| Commit                                                                                          | Base                  |
| ----------------------------------------------------------------------------------------------- | --------------------- |
| `43a6a046f` feat(plugins): workspace row accessory extension point                              | `main` at `d3efddb0b` |
| `56f13c16c` feat(plugins): row takeover for workspace row accessories                           | `43a6a046f`           |
| `85c890fc7` docs(plugin-examples): workspace row accessory examples (follow-up, not in this PR) | `56f13c16c`           |

Compared with the revision of the full run below (`0e7563f86`, `f89c4d6e4`), these commits add the
"without plugins" tests, limit how long a remembered host can hold the large rail (30 s in a row),
and set the fade transition only on rows that have an accessory. Re-run on each:

```text
$ git checkout --detach 43a6a046f && npm run build:plugin
$ cd packages/app && npx vitest run src/plugins src/components/sidebar
 Test Files  40 passed (40)
      Tests  261 passed (261)
$ npm run typecheck
typecheck exit 0
$ npx oxlint <changed files>
Found 0 warnings and 0 errors.

$ git checkout --detach 56f13c16c && npm run build:plugin
$ cd packages/app && npx vitest run src/plugins src/components/sidebar
 Test Files  41 passed (41)
      Tests  265 passed (265)
$ npm run typecheck
typecheck exit 0
$ npx oxlint <changed files>
Found 0 warnings and 0 errors.

$ npx playwright test --project=browser e2e/browser/plugin-workspace-row-example.spec.ts   # at 85c890fc7
  ok 1 [browser] › e2e\browser\plugin-workspace-row-example.spec.ts:87:5 › workspace row example: accessories, takeover, fallbacks (1.5m)
  1 passed (2.3m)
```

The pre-commit hook (lint, format, typecheck) passed on both commits.

## No plugin, no change

Unit tests (`workspace-row-accessory.test.tsx`, "without plugins"): with no accessory registered and
no remembered host, `useWorkspaceRowAccessory` returns no accessory and no rail, and the leading
slot renders exactly the DOM of the native leading visual, for a normal row (status indicator) and
a hoisted row (project icon). Without an accessory the row also renders no takeover layer and the
content column keeps the upstream style object.

Against `main`: the same sidebar, no plugin installed, same data and absolute paths, fixed browser
clock, captured on `main` (`d3efddb0b`) and on `56f13c16c`. Pixels compared exactly (PIL/numpy);
the sidebar list's HTML compared after replacing the generated workspace ids:

| Capture                          | Different pixels | Outside the lightning button | Sidebar list HTML |
| -------------------------------- | ---------------- | ---------------------------- | ----------------- |
| Project view, dark (1440×900)    | 2333             | 0                            | identical         |
| Project view, light              | 1625             | 0                            | identical         |
| Status view, hoisted rows, dark  | 1798             | 0                            | identical         |
| Status view, hoisted rows, light | 1695             | 0                            | identical         |
| Compact (390×844), dark          | 1722             | 0                            | identical         |

Every changed pixel is inside one ~50×50 px box at the bottom-left corner: a floating button with a
lightning icon that fades in and out over the sidebar footer on its own. It is not part of the
sidebar list and appears on both branches; the captures caught it at different points of its fade.
The HTML includes the generated style classes, which encode the style values, so styles are
identical too. Before, after and diff images: `no-plugin-regression/`.

## Full run on the previous revision

| Commit (previous revision)                                                                      | Base                  |
| ----------------------------------------------------------------------------------------------- | --------------------- |
| `0e7563f86` feat(plugins): workspace row accessory extension point                              | `main` at `d3efddb0b` |
| `f89c4d6e4` feat(plugins): row takeover for workspace row accessories                           | `0e7563f86`           |
| `8d47aeaf4` docs(plugin-examples): workspace row accessory examples (follow-up, not in this PR) | `f89c4d6e4`           |

Each commit was checked out on its own (`git checkout --detach <commit>`) and the plugin package
rebuilt (`npm run build:plugin`) before its commands.

## Summary

| Check                                                                            | `0e7563f86`                                   | `f89c4d6e4`             | `main` (`d3efddb0b`) |
| -------------------------------------------------------------------------------- | --------------------------------------------- | ----------------------- | -------------------- |
| App unit tests, `src/plugins` + `src/components/sidebar`                         | 256/256 pass                                  | 260/260 pass            | not needed           |
| Whole-repo typecheck (`npm run typecheck`)                                       | pass                                          | pass                    |                      |
| Lint of changed files                                                            | 0 warnings/errors                             | 0 warnings/errors       |                      |
| Format of changed files (as committed)                                           | pass                                          | pass                    |                      |
| SDK boundaries (`packages/plugin` `boundaries.test.ts`)                          | pass                                          | pass                    | pass                 |
| Client loader (`evaluate.test.ts`, in the app run)                               | pass                                          | pass                    |                      |
| Server loader (`compiler.test.ts`, `plugin-process.test.ts`, `manifest.test.ts`) | 9 fail (symlink EPERM)                        | 9 fail (same)           | 9 fail (same)        |
| `packages/plugin` other suites                                                   | `acp.test.ts` timeouts, `skill-examples` CRLF | same                    | same                 |
| Browser e2e of the example plugin (Playwright, isolated daemon)                  | —                                             | pass (with `8d47aeaf4`) |                      |
| `knip`                                                                           | —                                             | crashes before analysis | crashes the same way |

The failures in the last rows come from this Windows machine: no symlink privilege (no Developer
Mode), process signals (`SIGTERM`) in the ACP tests, and CRLF checkouts (`core.autocrlf=true`)
read by a test that searches for `\n## `. `main` fails them the same way. Those suites run in CI on
Linux; they could not be made meaningful here. The PR does not touch `packages/plugin/src/server`,
the plugin compiler or the server loader.

## App unit tests

```text
$ cd packages/app && npx vitest run src/plugins src/components/sidebar     # at 0e7563f86
 Test Files  40 passed (40)
      Tests  256 passed (256)
   Duration  34.39s (transform 28.18s, setup 391ms, import 52.59s, tests 543ms, environment 3.29s)
exit 0
```

```text
$ cd packages/app && npx vitest run src/plugins src/components/sidebar     # at f89c4d6e4
 Test Files  41 passed (41)
      Tests  260 passed (260)
   Duration  27.97s (transform 23.70s, setup 464ms, import 44.92s, tests 665ms, environment 3.09s)
exit 0
```

New and changed tests: `workspace-row-accessory.test.tsx` (selection, the large rail across hosts,
the remembered rail, mount with badge, fallback on throw, fallback while the host runtime is not
ready, Overlay props), `workspace-row-takeover.test.ts` (one per row, host-owned end, cancel,
dispose, duration bounds), new cases in `evaluate.test.ts` (registration, validation, duplicate
ids, cleanup). Other test files only gain the new `workspaceRowAccessories: []` field in fixtures.

## Typecheck

```text
$ npm run typecheck                                                        # at 0e7563f86
> paseo@0.11.2 typecheck
> npm run typecheck --workspaces --if-present
> @getpaseo/builtin-plugins@0.11.2 typecheck
> @getpaseo/expo-two-way-audio@0.11.2 typecheck
> @getpaseo/highlight@0.11.2 typecheck
> @getpaseo/plugin@0.11.2 typecheck
> @getpaseo/protocol@0.11.2 typecheck
> @getpaseo/client@0.11.2 typecheck
> @getpaseo/server@0.11.2 typecheck
> @getpaseo/app@0.11.2 typecheck
> @getpaseo/relay@0.11.2 typecheck
> @getpaseo/website@0.11.2 typecheck
> @getpaseo/desktop@0.11.2 typecheck
> @getpaseo/cli@0.11.2 typecheck
exit 0
```

Same output and `exit 0` at `f89c4d6e4`. The pre-commit hook (lint, format, typecheck) also passed
on both commits.

## Lint and format of the changed files

```text
$ npx oxlint <21 changed files of 0e7563f86>
Found 0 warnings and 0 errors.
Finished in 325ms on 21 files with 177 rules using 24 threads.
exit 0

$ npx oxlint <10 changed files of f89c4d6e4>
Found 0 warnings and 0 errors.
Finished in 147ms on 10 files with 177 rules using 24 threads.
exit 0
```

`oxfmt --check` on the Windows working copy reports every file because of CRLF line endings.
Checked on the committed (LF) content instead:

```text
$ git -c core.autocrlf=false archive 0e7563f86 <changed files> | tar -x; npx oxfmt --check <changed files>
All matched files use the correct format.
Finished in 474ms on 22 files using 24 threads.
exit 0

$ git -c core.autocrlf=false archive f89c4d6e4 <changed files> | tar -x; npx oxfmt --check <changed files>
All matched files use the correct format.
Finished in 601ms on 11 files using 24 threads.
exit 0
```

## SDK import boundaries and runtime loaders

`docs/qa.md` asks for the boundary tests and both runtime loaders. The new types live in
`@getpaseo/plugin/client` (`client/contracts.ts`, re-exported from `client/index.ts`); nothing
is added to the shared root or to a server entry.

```text
$ cd packages/plugin && npx vitest run src/server/acp.test.ts src/boundaries.test.ts
d3efddb0b (main)  ❯ src/server/acp.test.ts (32 tests | 12 failed) 63496ms
d3efddb0b (main)  Test Files  1 failed | 1 passed (2)
d3efddb0b (main)       Tests  12 failed | 70 passed (82)
f89c4d6e4 (PR)    ❯ src/server/acp.test.ts (32 tests | 12 failed) 62693ms
f89c4d6e4 (PR)    Test Files  1 failed | 1 passed (2)
f89c4d6e4 (PR)         Tests  12 failed | 70 passed (82)

$ git diff --stat d3efddb0b f89c4d6e4 -- packages/plugin/src/server packages/plugin/src/index.ts packages/plugin/src/contracts.ts
(no output)
```

`boundaries.test.ts` passes on both; `acp.test.ts` times out on the same ACP process-signal
tests on `main` and on the PR (which tests time out varies by a test or two between runs).

Full `packages/plugin` run:

```text
$ cd packages/plugin && npx vitest run                                    # at f89c4d6e4
 FAIL  src/skill-examples.test.ts > paseo-plugin skill examples > composer pill example typechecks against the plugin SDK
Error: No tsx example under "Add a composer pill"
 ❯ sectionCode src/skill-examples.test.ts:13:20
…
 Test Files  2 failed | 7 passed (9)
      Tests  13 failed | 116 passed (129)
exit 1

$ cd packages/plugin && npx vitest run                                    # at d3efddb0b (main)
 Test Files  2 failed | 7 passed (9)
      Tests  11 failed | 118 passed (129)
exit 1
```

Client loader: `evaluate.test.ts` runs in the app suite above (registration, validation, cleanup
of `addWorkspaceRowAccessory` and `requestRowTakeover`). Server loader:

```text
$ cd packages/server && npx vitest run src/server/plugins/compiler.test.ts src/server/plugins/plugin-process.test.ts src/server/plugins/manifest.test.ts
 FAIL  src/server/plugins/compiler.test.ts > plugin runtime entries > checks the physical owner of type-only symlinks
Error: EPERM: operation not permitted, symlink '…\paseo-plugin-…\secret.ts' -> '…'
…
 Test Files  1 failed | 2 passed (3)
      Tests  9 failed | 111 passed (120)
exit 1
```

The 9 failing tests are the same 9 on `main` (`diff` of the failing test names is empty), all
`EPERM` on `symlink`.

## Browser e2e (Playwright, isolated daemon, mock agents)

On `8d47aeaf4` (the examples follow-up stacked on `f89c4d6e4`):

```text
$ cd packages/app && npx playwright test --project=browser e2e/browser/plugin-workspace-row-example.spec.ts
[e2e] Metro warmed on port 51310
Running 1 test using 1 worker
[e2e] Worker 0 daemon started on port 51199, home: %TEMP%\paseo-e2e-worker-0-GiKtDX
  ok 1 [browser] › e2e\browser\plugin-workspace-row-example.spec.ts:87:5 › workspace row example: accessories, takeover, fallbacks (1.3m)
[e2e] Worker 0 daemon stopped
Error: Failed to terminate process tree for PID 159680
…
    at <repo>\packages\app\e2e\support\global-setup.ts:185:7
[cause]: Error: Command failed: taskkill /pid 159680 /T /F

  1 passed (2.1m)
  1 error was not a part of any test, see above for details
exit 1
```

The test passes. The error after it is the harness's Windows teardown: `taskkill` on a Metro
process tree that has already exited; no process is left running.

The spec installs the example plugin into an isolated daemon with mock agents in running,
needs-input, failed and done states, and drives every mode, a takeover, the throwing accessory,
light/dark, the compact layout and reduced motion. It writes the screenshots in this folder.

## Layout stability on first load (measured)

Rows render before their host's plugins evaluate. Sampling every animation frame after a reload,
with a `large` accessory installed:

```text
before the fix (accessory slot decided only after evaluation)
   0 ms  rows absent
3032 ms  every row: h=36 x=40 native
3808 ms  every row: h=56 x=64 native     ← titles jump 24 px, rows grow 20 px
4101 ms  every row: h=56 x=64 accessory

after the fix (hosts with a large accessory remembered across launches)
   0 ms  rows absent
3611 ms  every row: h=56 x=64 native
5975 ms  every row: h=56 x=64 accessory  ← no movement
```

`x` is the title's left edge, `h` the row height. Recording: `videos/first-load-no-layout-shift.mp4`.

## knip

```text
$ npx knip                                                                 # PR head and main
TypeError: specifier.charCodeAt is not a function
    at getPackageNameFromModuleSpecifier (…/knip/dist/util/modules.js:5:10)
    at …/knip/dist/plugins/expo/helpers.js:23:16
exit 1
```

Knip's Expo plugin crashes on this machine while reading the app config, before any analysis, on
`main` as well. Unused exports were checked by hand: every new export has a caller.

## Recordings

All from the PR code (`f89c4d6e4` + examples), isolated e2e daemon, neutral names, sidebar only:
`videos/` (MP4 + light GIF per scene, `mascot-all-scenes.webm`). See PR.md.

## Platforms

| Platform        | Tested | Notes                                                                                                                                                                                                                                       |
| --------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| iOS             | No     | Plain React Native views; not run. No simulator on this machine.                                                                                                                                                                            |
| Android         | No     | Same.                                                                                                                                                                                                                                       |
| Web             | Yes    | Chromium (Playwright): desktop 1440×900 and phone 390×844, dark and light, reduced motion.                                                                                                                                                  |
| Desktop macOS   | Partly | Tried by hand on macOS 26.5 (Apple Silicon) in the fork build with this API, connected to a Windows daemon over SSH via Tailscale: row accessories and row takeovers on real workspaces. This exact PR code was exercised in Chromium only. |
| Desktop Windows | Partly | Tried by hand on Windows 11 in a fork build on 0.11.2 with this API (design-audit fixes included) plus fork-only extras; this exact PR code was exercised in Chromium only.                                                                 |
| Desktop Linux   | No     |                                                                                                                                                                                                                                             |
