import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitPatterns, parseFilenames, isRelevant } from './matcher';

test('splitPatterns handles whitespace after commas', () => {
  assert.deepEqual(splitPatterns('a/**, b/**,c/**'), ['a/**', 'b/**', 'c/**']);
});

test('splitPatterns returns [] for undefined / empty', () => {
  assert.deepEqual(splitPatterns(undefined), []);
  assert.deepEqual(splitPatterns(''), []);
});

test('parseFilenames splits on whitespace, newlines, and commas', () => {
  assert.deepEqual(parseFilenames('a.ts\nb.ts c.ts,d.ts'), ['a.ts', 'b.ts', 'c.ts', 'd.ts']);
});

test('isRelevant: empty includes means "everything"', () => {
  const result = isRelevant({ excludes: 'docs/**' }, ['src/app.ts']);
  assert.equal(result.relevant, true);
  assert.equal(result.trigger, 'src/app.ts');
});

test('isRelevant: excludes take precedence over empty includes', () => {
  const result = isRelevant({ excludes: 'docs/**' }, ['docs/readme.md']);
  assert.equal(result.relevant, false);
});

test('isRelevant: file must match includes', () => {
  const result = isRelevant({ includes: 'ui/**/*.ts' }, ['server/app.ts']);
  assert.equal(result.relevant, false);
});

test('isRelevant: [tj]s character class matches ts/js but not tsx', () => {
  const cfg = { includes: 'ui/**/*.[tj]s' };
  assert.equal(isRelevant(cfg, ['ui/app.ts']).relevant, true);
  assert.equal(isRelevant(cfg, ['ui/app.js']).relevant, true);
  assert.equal(isRelevant(cfg, ['ui/app.tsx']).relevant, false);
});

test('isRelevant: dotfiles match ** (dot: true)', () => {
  const cfg = { includes: 'flow-web/**' };
  assert.equal(isRelevant(cfg, ['flow-web/.eslintrc.js']).relevant, true);
});

test('isRelevant: returns first matching file as trigger', () => {
  const cfg = { includes: 'ui/**' };
  const result = isRelevant(cfg, ['server/app.ts', 'ui/button.tsx', 'ui/other.tsx']);
  assert.equal(result.trigger, 'ui/button.tsx');
});

test('isRelevant: whitespace-padded include patterns work', () => {
  // Mirrors the user's real config where some patterns have spaces after commas
  const cfg = { includes: 'flow-web/**/*.[tj]s, flow-web/**/*.[tj]sx' };
  assert.equal(isRelevant(cfg, ['flow-web/app.tsx']).relevant, true);
});

// Integration: the user's actual config
const REAL_CONFIG = {
  'build': {
    excludes: 'cypress/e2e/smoke/**,**/*.test.[tj]s,cypress/e2e/smoke/**,**/*.test.[tj]sx,storyshots/**,flow-web/**/*.test.[tj]s,flow-web/**/*.test.[tj]sx,flow-web/**/*.test.[tj]s.snap,flow-web/**/*.test.[tj]s.snap',
  },
  'core': { excludes: 'cypress/e2e/smoke/**,cypress/e2e/regression/**,**/*.test.[tj]s,**/*.test.[tj]sx,storyshots/**' },
  'regression': { excludes: 'cypress/e2e/smoke/**,cypress/e2e/core/**,tests/playwright/e2e/core/**,**/*.test.[tj]s,**/*.test.[tj]sx,storyshots/**' },
  'unit-tests-ui': { includes: 'ui/**/*.[tj]s,ui/**/*.[tj]sx' },
  'lint-syncpack': { includes: 'package.json' },
  'storyshots-ui': {
    includes: 'ui/src/**/*,ui/tests/**/*,icons/src/**/*,storyshots/src/**/*',
    excludes: '*.test.[tj]s,*.test.[tj]sx,**/*.md',
  },
};

test('real config: smoke test alone should match nothing', () => {
  const files = ['cypress/e2e/smoke/login.spec.ts'];
  assert.equal(isRelevant(REAL_CONFIG.build, files).relevant, false);
  assert.equal(isRelevant(REAL_CONFIG.core, files).relevant, false);
  assert.equal(isRelevant(REAL_CONFIG.regression, files).relevant, false);
});

test('real config: ui source file triggers the right jobs', () => {
  const files = ['ui/src/Button/Button.tsx'];
  assert.equal(isRelevant(REAL_CONFIG.build, files).relevant, true);
  assert.equal(isRelevant(REAL_CONFIG['unit-tests-ui'], files).relevant, true);
  assert.equal(isRelevant(REAL_CONFIG['storyshots-ui'], files).relevant, true);
});

test('real config: regression spec does NOT trigger core', () => {
  const files = ['cypress/e2e/regression/checkout.spec.ts'];
  assert.equal(isRelevant(REAL_CONFIG.core, files).relevant, false);
  assert.equal(isRelevant(REAL_CONFIG.regression, files).relevant, true);
});

test('real config: package.json triggers lint-syncpack', () => {
  assert.equal(isRelevant(REAL_CONFIG['lint-syncpack'], ['package.json']).relevant, true);
});
