import micromatch from 'micromatch';
import type { JobConfig, RelevanceResult } from './types';

const MM_OPTS: micromatch.Options = { dot: true };

/**
 * Split a comma-separated glob string into a trimmed array.
 * Handles incidental whitespace like "a/**, b/**".
 */
export function splitPatterns(str: string | undefined): string[] {
  if (!str) return [];
  return str
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Parse the filenames input. Accepts any mix of newlines, spaces, tabs, or commas
 * as separators — whichever the upstream `list-changed-files` job happens to emit.
 */
export function parseFilenames(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Decide whether a job is relevant for the given set of changed files.
 *
 * Rules:
 *  - If `includes` is empty/omitted, every file is considered "included".
 *    (Matches entries like `build` / `core` / `regression` which only set `excludes`.)
 *  - A file counts if it matches includes AND does NOT match excludes.
 *  - The job is relevant if ANY changed file counts.
 */
export function isRelevant(jobConfig: JobConfig, changedFiles: string[]): RelevanceResult {
  const includes = splitPatterns(jobConfig.includes);
  const excludes = splitPatterns(jobConfig.excludes);

  for (const file of changedFiles) {
    const included = includes.length === 0 || micromatch.isMatch(file, includes, MM_OPTS);
    if (!included) continue;
    const excluded = excludes.length > 0 && micromatch.isMatch(file, excludes, MM_OPTS);
    if (!excluded) {
      return { relevant: true, trigger: file };
    }
  }
  return { relevant: false, trigger: null };
}
