/**
 * Reads, writes, and validates `ai-rules-config.json`.
 *
 * The config file persists the user's questionnaire answers so that
 * subsequent runs can skip the interactive prompts and regenerate rules
 * directly. Validation is done manually (no schema library) to keep
 * the bundle small — the config has a flat structure with only 10 fields.
 *
 * Error recovery: if the file is missing, corrupted, or has an invalid
 * structure, `read()` returns `null` and logs a warning. The orchestrator
 * interprets `null` as "start a fresh questionnaire."
 */

import path from 'node:path';
import { readTextFile, writeTextFile } from '../../utils/fs.js';
import { logWarning } from '../../utils/log.js';
import type { Config, Architecture } from './config.types.js';

const CONFIG_FILENAME = 'ai-rules-config.json';

const VALID_ARCHITECTURES: ReadonlySet<string> = new Set<Architecture>([
  'frontend',
  'backend',
  'fullstack',
]);

const REQUIRED_FIELDS: ReadonlyArray<keyof Config> = [
  'version',
  'projectName',
  'architecture',
  'frameworks',
  'packages',
  'agents',
  'hasUserprompt',
  'syncSkills',
  'skills',
  'lastSync',
];

export class ConfigService {
  private readonly configPath: string;

  /**
   * @param targetDir — the target project root (`process.cwd()`)
   */
  constructor(targetDir: string) {
    this.configPath = path.join(targetDir, CONFIG_FILENAME);
  }

  /**
   * Read and validate the config file.
   *
   * @returns A valid `Config`, or `null` if the file is missing,
   *          corrupted (invalid JSON), or structurally invalid.
   *          A warning is logged for corruption/invalid structure.
   */
  async read(): Promise<Config | null> {
    let raw: string;
    try {
      raw = await readTextFile(this.configPath);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return null;
      }
      logWarning(
        `Cannot read config file: ${(err as Error).message}. A new questionnaire will be started.`,
      );
      return null;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      logWarning('Config file is corrupted (invalid JSON). A new questionnaire will be started.');
      return null;
    }

    try {
      return this.validate(this.applyDefaults(parsed));
    } catch (err) {
      logWarning(
        `Config file has an invalid structure (${(err as Error).message}). A new questionnaire will be started.`,
      );
      return null;
    }
  }

  /** Write a `Config` object as pretty-printed JSON. Overwrites existing file. */
  async write(config: Config): Promise<void> {
    const json = JSON.stringify(config, null, 2);
    await writeTextFile(this.configPath, json);
  }

  /**
   * Runtime validation of parsed JSON.
   *
   * Checks that all required fields are present and have the correct types.
   * Uses manual type-checking (typeof, Array.isArray, Set.has) instead of a
   * schema library — the config is flat, so this adds zero dependencies.
   *
   * @throws with a descriptive message on validation failure.
   */
  private validate(data: unknown): Config {
    if (typeof data !== 'object' || data === null) {
      throw new Error('must be a non-null object');
    }

    const obj = data as Record<string, unknown>;

    for (const field of REQUIRED_FIELDS) {
      if (!(field in obj)) {
        throw new Error(`missing required field "${field}"`);
      }
    }

    if (typeof obj.version !== 'number') {
      throw new Error('"version" must be a number');
    }

    if (typeof obj.projectName !== 'string') {
      throw new Error('"projectName" must be a string');
    }

    if (!VALID_ARCHITECTURES.has(obj.architecture as string)) {
      throw new Error(`"architecture" must be one of: ${[...VALID_ARCHITECTURES].join(', ')}`);
    }

    if (!Array.isArray(obj.frameworks) || !obj.frameworks.every((f) => typeof f === 'string')) {
      throw new Error('"frameworks" must be an array of strings');
    }

    if (!Array.isArray(obj.packages) || !obj.packages.every((p) => typeof p === 'string')) {
      throw new Error('"packages" must be an array of strings');
    }

    if (!Array.isArray(obj.agents) || !obj.agents.every((a) => typeof a === 'string')) {
      throw new Error('"agents" must be an array of strings');
    }

    if (typeof obj.hasUserprompt !== 'boolean') {
      throw new Error('"hasUserprompt" must be a boolean');
    }

    if (typeof obj.syncSkills !== 'boolean') {
      throw new Error('"syncSkills" must be a boolean');
    }

    if (!Array.isArray(obj.skills) || !obj.skills.every((s) => typeof s === 'string')) {
      throw new Error('"skills" must be an array of strings');
    }

    if (typeof obj.lastSync !== 'string') {
      throw new Error('"lastSync" must be a string');
    }

    return obj as unknown as Config;
  }

  /**
   * Backward compatibility: old configs may not have Phase 2 fields.
   * Fill in safe defaults so validation passes.
   */
  private applyDefaults(data: unknown): Record<string, unknown> {
    if (typeof data !== 'object' || data === null) return data as Record<string, unknown>;
    const obj = data as Record<string, unknown>;
    const result = { ...obj };
    if (!('syncSkills' in result)) result.syncSkills = false;
    if (!('skills' in result)) result.skills = [];
    return result;
  }
}
