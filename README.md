# is-relevant action (TypeScript, bundled)

Drop-in replacement for `tubular-algorithms/is-relevant-action@v4`. Given a list of changed filenames and a config of glob patterns per job, decides which jobs are relevant.

Written in TypeScript, bundled with [tsup](https://tsup.egoist.dev/). Runs as a `node20` action (no `npm install` at runtime), typically completing in ~300ms of in-process work.

## Usage

Your workflow needs no changes beyond the `uses:` line:

```yaml
- name: Check relevance
  id: is-relevant
  if: ${{ ! contains(github.event.pull_request.labels.*.name, 'RUN ALL JOBS') }}
  uses: ./.github/actions/is-relevant
  with:
    filenames: ${{ needs.list-changed-files.outputs.filenames }}
    config: ${{ env.config }}
```

The `relevant` output is still `{"job": "yes" | "no"}`, so the existing `Force relevance` and `Output results` steps continue to work.

## Inputs

| name | description | required |
|---|---|---|
| `filenames` | Whitespace-, newline-, or comma-separated list of changed files. | yes |
| `config` | JSON mapping job names to `{ includes, excludes }` comma-separated glob patterns. | yes |

## Outputs

- `relevant` — `{ jobName: "yes" | "no" }`. Same shape as `is-relevant-action@v4`.
- `relevant-bool` — `{ jobName: true | false }`. Real booleans, convenient for `fromJSON(...).x` in `if:` conditions.
- `jobs-to-run` — JSON array of job names where the value is `"yes"`.

## Repo layout

```
action.yml              -- uses: node20, main: dist/index.js
tsup.config.ts          -- bundler config
src/
  index.ts              -- action entrypoint (@actions/core I/O)
  matcher.ts            -- pure matching logic (testable without mocks)
  types.ts              -- shared types
  matcher.test.ts       -- node:test unit tests
dist/
  index.js              -- bundled output — COMMIT THIS
tsconfig.json           -- main tsc config (excludes *.test.ts)
tsconfig.test.json      -- test tsc config (compiles tests to dist-test/)
package.json
```

## Development

```bash
npm install
npm run typecheck     # tsc --noEmit against src/
npm run build         # tsup bundles src/index.ts → dist/index.js
npm run test:all      # compile + run node:test unit tests
npm run all           # typecheck + build + test
```

### Why `dist/` is committed

GitHub Actions executes the file referenced by `main:` in `action.yml` directly — there's no build step when the action runs. So the bundle has to be in the repo. This is the standard pattern for JS actions (see `actions/checkout`, `actions/setup-node`, etc.).

To enforce this in CI, add a workflow that rebuilds and diffs:

```yaml
# .github/workflows/check-dist.yml
name: Check dist/
on:
  pull_request:
  push:
    branches: [main]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
      - name: Fail if dist/ is out of date
        run: |
          if [ -n "$(git status --porcelain dist/)" ]; then
            echo "dist/ is out of date. Run 'npm run build' and commit the result."
            git diff dist/
            exit 1
          fi
```

## Matching rules

For each job, for each changed file:

1. File is **included** if `includes` is empty/omitted OR matches any `includes` glob.
2. File is **excluded** if it matches any `excludes` glob.
3. File counts for the job if included AND not excluded.
4. Job is relevant (`"yes"`) if any changed file counts.

Glob matching uses [micromatch](https://github.com/micromatch/micromatch) with `dot: true`, so `.eslintrc.js` matches `**`. Character classes like `[tj]s` match `.ts`/`.js` but **not** `.tsx` — use `[tj]sx` for the latter.
