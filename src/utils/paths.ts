/**
 * Path resolution utilities.
 *
 * All directory paths used by the application are resolved here:
 *  - `sourceDir`: where the CLI script lives (bundled `dist/` or dev `src/utils/`)
 *  - `targetDir`: the user's project directory (`process.cwd()`)
 *  - `contextDir`: the context root — either from AGENT_CONTEXT_DIR env/.env,
 *     or discovered by walking up from sourceDir to find `context/rules/`
 *  - `rulesDir`: `contextDir/rules/`
 *  - `skillsDir`: `contextDir/skills/`
 *  - `projectsDir`: `contextDir/projects/`
 *
 * Environment variable: AGENT_CONTEXT_DIR
 *   - Checked first in process.env, then in a .env file at process.cwd()
 *   - May be absolute, or relative to process.cwd()
 *   - Must be a directory containing a `rules/` subdirectory
 *   - When not set (or invalid), falls back to default discovery with a warning
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { logWarning } from './log.js';
import { isEnoent } from './fs.js';

const ENV_KEY = 'AGENT_CONTEXT_DIR';

// ---- .env parser ----

/**
 * Parse a simple .env file (KEY=VALUE pairs, no interpolation).
 *
 * Handles:
 *   - Blank lines and full-line comments (starting with #)
 *   - Quoted values (single/double) — quotes are stripped, content preserved as-is
 *   - Inline comments outside quotes:  KEY=value # comment → value
 *   - Hash inside quotes is preserved: KEY="path #1" → path #1
 *   - Unquoted values: # starts a comment only when preceded by whitespace
 */
function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.length === 0 || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    if (!key) continue;

    const raw = trimmed.slice(eqIdx + 1).trim();
    if (raw.length === 0) continue;

    // Quoted value: extract content between quotes, everything outside is ignored
    let value: string;
    if (raw.startsWith('"') || raw.startsWith("'")) {
      value = extractQuotedValue(raw);
    } else {
      value = stripInlineComment(raw);
    }
    if (value) result[key] = value;
  }
  return result;
}

/** Extract the content between matching quotes. Returns raw if quote is unclosed. */
function extractQuotedValue(raw: string): string {
  const quote = raw[0];
  const closeIdx = raw.indexOf(quote, 1);
  if (closeIdx === -1) return raw;
  return raw.slice(1, closeIdx);
}

/**
 * Strip inline comment from an unquoted value.
 * A # starts a comment only when preceded by whitespace or at position 0.
 *   "value # comment" → "value"
 *   "path#no-space"   → "path#no-space"
 */
function stripInlineComment(raw: string): string {
  const idx = raw.search(/(?:^|\s)#/);
  if (idx === -1) return raw;
  return raw.slice(0, idx).trimEnd();
}

/** Try to read AGENT_CONTEXT_DIR from a .env file at the given path. */
async function readEnvFile(filePath: string): Promise<string | null> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    const parsed = parseEnvFile(content);
    return parsed[ENV_KEY] ?? null;
  } catch (err) {
    if (!isEnoent(err)) {
      logWarning(`Cannot read .env file "${filePath}": ${(err as Error).message}`);
    }
    return null;
  }
}

/**
 * Walk up from `startDir` to find the package root (the directory
 * containing `context/rules/`). Returns `null` if not found.
 */
async function findPackageRoot(startDir: string): Promise<string | null> {
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    try {
      await fs.stat(path.join(dir, 'context', 'rules'));
      return dir;
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(
          `Error accessing "${path.join(dir, 'context', 'rules')}": ${(err as Error).message}`,
        );
      }
    }
    dir = path.dirname(dir);
  }
  return null;
}

interface EnvResult {
  value: string;
  /** The directory the value should be resolved relative to. */
  baseDir: string;
}

/**
 * Read the AGENT_CONTEXT_DIR value, checking in order:
 *  1. process.env.AGENT_CONTEXT_DIR (resolved against process.cwd())
 *  2. .env file at process.cwd() — target project (resolved against process.cwd())
 *  3. .env file at the package root — alongside context/ folders (resolved against package root)
 * Returns `null` when no source provides a value.
 */
async function resolveContextDirEnv(sourceDir: string): Promise<EnvResult | null> {
  if (process.env[ENV_KEY]) {
    return { value: process.env[ENV_KEY]!, baseDir: process.cwd() };
  }

  // 1. Target project .env
  const cwdValue = await readEnvFile(path.join(process.cwd(), '.env'));
  if (cwdValue) return { value: cwdValue, baseDir: process.cwd() };

  // 2. Package root .env (alongside context/ and context-primary/ folders)
  const pkgRoot = await findPackageRoot(sourceDir);
  if (pkgRoot && pkgRoot !== process.cwd()) {
    const pkgValue = await readEnvFile(path.join(pkgRoot, '.env'));
    if (pkgValue) return { value: pkgValue, baseDir: pkgRoot };
  }

  return null;
}

// ---- context root resolution ----

/**
 * Resolve the default context directory by walking up from `startDir`.
 * Uses `findPackageRoot` — throws if the package is corrupted.
 */
async function findDefaultContextRoot(startDir: string): Promise<string> {
  const pkgRoot = await findPackageRoot(startDir);
  if (pkgRoot) return path.join(pkgRoot, 'context');
  throw new Error(
    'Cannot find context/rules/ directory. The package may be corrupted — reinstall agent-context-sync-cli.',
  );
}

/**
 * Resolve the context directory to an absolute path.
 *
 * When AGENT_CONTEXT_DIR is set (via env var or .env file):
 *   - Relative paths are resolved against `process.cwd()`
 *   - If the resolved directory doesn't contain `rules/`, a warning is logged
 *     and the default fallback is used instead (graceful degradation).
 *
 * Otherwise falls back to walking up from sourceDir to find `context/`.
 */
async function resolveContextRoot(sourceDir: string): Promise<string> {
  const envResult = await resolveContextDirEnv(sourceDir);

  if (envResult) {
    const resolved = path.resolve(envResult.baseDir, envResult.value);
    const rulesCandidate = path.join(resolved, 'rules');
    try {
      const stat = await fs.stat(rulesCandidate);
      if (stat.isDirectory()) return resolved;
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(`Error accessing "${rulesCandidate}": ${(err as Error).message}`);
      }
      // Directory doesn't exist or is inaccessible — fall through to default
    }
    // Graceful fallback: warn and use default discovery
    logWarning(
      `AGENT_CONTEXT_DIR is set to "${envResult.value}" but "${rulesCandidate}" ` +
        `is not a readable directory. Falling back to default context discovery.`,
    );
  }

  return findDefaultContextRoot(sourceDir);
}

// ---- module-level resolution (top-level await) ----

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
let contextDir: string;
let rulesDir: string;
let skillsDir: string;
let projectsDir: string;

/**
 * Initialize all paths. Must be called before accessing path getters.
 */
export async function initPaths(): Promise<void> {
  if (contextDir) return;
  contextDir = await resolveContextRoot(sourceDir);
  rulesDir = path.join(contextDir, 'rules');
  skillsDir = path.join(contextDir, 'skills');
  projectsDir = path.join(contextDir, 'projects');
}

// ---- public getters ----

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

/** Path to the context root directory (contains rules/, skills/, projects/). */
export function getContextDir(): string {
  return contextDir;
}

/** Path to general rule templates (`context/rules/` or custom equivalent). */
export function getRulesDir(): string {
  return rulesDir;
}

/** Path to general skills (`context/skills/` or custom equivalent). */
export function getSkillsDir(): string {
  return skillsDir;
}

/** Path to per-project overrides (`context/projects/` or custom equivalent). */
export function getProjectsDir(): string {
  return projectsDir;
}
