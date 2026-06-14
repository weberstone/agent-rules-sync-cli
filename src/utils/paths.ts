/**
 * Path resolution utilities.
 *
 * All directory paths used by the application are resolved here:
 *  - `sourceDir`: where the CLI script lives (bundled `dist/` or dev `src/utils/`)
 *  - `targetDir`: the user's project directory (`process.cwd()`)
 *  - `rulesDir`: template files (`context/rules/` relative to project root)
 *  - `projectsDir`: per-project overrides (`context/projects/`)
 *
 * Uses top-level `await` to locate the `context/rules/` directory at module
 * load time. Works in both development (vitest/tsx) and production (tsup bundle).
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

/**
 * Walk up the directory tree from `startDir` until we find `context/rules/`.
 * This works for both local installs and remote `npx` executions where the
 * package is in the npm cache at an unknown depth.
 *
 * @throws If `context/rules/` is not found — the package is corrupted.
 */
async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, 'context', 'rules');
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return dir;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to read directory "${candidate}": ${(err as Error).message}`);
      }
      // ENOENT: no context/rules/ at this level, walk up to parent
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    'Cannot find context/rules/ directory. The package may be corrupted — reinstall agent-rules-sync-cli.',
  );
}

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = await findProjectRoot(sourceDir);
const rulesDir = path.join(projectRoot, 'context', 'rules');
const projectsDir = path.join(projectRoot, 'context', 'projects');

/** Directory where the CLI script lives. */
export function getSourceDir(): string {
  return sourceDir;
}

/** The user's project directory — `process.cwd()`. All output goes here. */
export function getTargetDir(): string {
  return process.cwd();
}

/** Project name derived from the current working directory name. */
export function getProjectName(): string {
  return path.basename(process.cwd());
}

/** Path to general rule templates (`context/rules/`). */
export function getRulesDir(): string {
  return rulesDir;
}

/** Path to per-project overrides (`context/projects/`). */
export function getProjectsDir(): string {
  return projectsDir;
}
