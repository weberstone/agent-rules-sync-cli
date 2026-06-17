/**
 * Reads, writes, and validates `ai-context-config.json`.
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
import type { Config } from './config.types.js';
import { ALL_ARCHITECTURES } from './config.types.js';

const CONFIG_FILENAME = 'ai-context-config.json';

const VALID_ARCHITECTURES: ReadonlySet<string> = new Set(ALL_ARCHITECTURES);

const VALID_SOURCES: ReadonlySet<string | null> = new Set([null, 'project', 'general']);

type FieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'string[]'
  | 'string|null'
  | 'architecture'
  | 'source';

interface FieldDef {
  type: FieldType;
  default: unknown;
}

/** Single source of truth for every config field — drives both validation and defaults. */
const CONFIG_SCHEMA: Record<string, FieldDef> = {
  version: { type: 'number', default: 1 },
  projectName: { type: 'string', default: '' },
  architecture: { type: 'architecture', default: 'frontend' },
  frameworks: { type: 'string[]', default: [] },
  packages: { type: 'string[]', default: [] },
  agents: { type: 'string[]', default: [] },
  hasUserprompt: { type: 'boolean', default: false },
  userpromptFile: { type: 'string|null', default: null },
  userpromptSource: { type: 'source', default: null },
  hasArchitecture: { type: 'boolean', default: false },
  architectureFile: { type: 'string|null', default: null },
  architectureSource: { type: 'source', default: null },
  hasWorkflow: { type: 'boolean', default: false },
  workflowFile: { type: 'string|null', default: null },
  workflowSource: { type: 'source', default: null },
  hasProjectFramework: { type: 'boolean', default: false },
  hasProjectPackages: { type: 'boolean', default: false },
  syncSkills: { type: 'boolean', default: false },
  skills: { type: 'string[]', default: [] },
  lastSync: { type: 'string', default: '' },
};

/**
 * Fields added after the initial release. Older configs may lack them —
 * fill in safe defaults so validation passes.
 */
const BACKWARD_COMPAT_DEFAULTS: Record<string, unknown> = {
  syncSkills: false,
  skills: [],
  userpromptFile: null,
  userpromptSource: null,
  hasArchitecture: false,
  architectureFile: null,
  architectureSource: null,
  hasWorkflow: false,
  workflowFile: null,
  workflowSource: null,
  hasProjectFramework: false,
  hasProjectPackages: false,
};

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
   * Schema-driven validation.
   *
   * Each field is checked against its type descriptor in CONFIG_SCHEMA.
   * Adding a new field only requires adding one entry to CONFIG_SCHEMA.
   *
   * @throws with a descriptive message on validation failure.
   */
  private validate(data: unknown): Config {
    if (typeof data !== 'object' || data === null) {
      throw new Error('must be a non-null object');
    }

    const obj = data as Record<string, unknown>;

    for (const [field, def] of Object.entries(CONFIG_SCHEMA)) {
      if (!(field in obj)) {
        throw new Error(`missing required field "${field}"`);
      }
      this.validateField(field, obj[field], def.type);
    }

    return obj as unknown as Config;
  }

  private validateField(field: string, value: unknown, type: FieldType): void {
    switch (type) {
      case 'string':
        if (typeof value !== 'string') throw new Error(`"${field}" must be a string`);
        break;
      case 'number':
        if (typeof value !== 'number') throw new Error(`"${field}" must be a number`);
        break;
      case 'boolean':
        if (typeof value !== 'boolean') throw new Error(`"${field}" must be a boolean`);
        break;
      case 'string[]':
        if (!Array.isArray(value) || !value.every((e) => typeof e === 'string')) {
          throw new Error(`"${field}" must be an array of strings`);
        }
        break;
      case 'string|null':
        if (value !== null && typeof value !== 'string') {
          throw new Error(`"${field}" must be a string or null`);
        }
        break;
      case 'architecture':
        if (!VALID_ARCHITECTURES.has(value as string)) {
          throw new Error(`"${field}" must be one of: ${[...VALID_ARCHITECTURES].join(', ')}`);
        }
        break;
      case 'source':
        if (!VALID_SOURCES.has(value as string | null)) {
          throw new Error(`"${field}" must be "project", "general", or null`);
        }
        break;
    }
  }

  /**
   * Backward compatibility: fill in defaults for fields absent from older configs.
   */
  private applyDefaults(data: unknown): Record<string, unknown> {
    if (typeof data !== 'object' || data === null) return data as Record<string, unknown>;
    const result = { ...(data as Record<string, unknown>) };
    for (const [field, value] of Object.entries(BACKWARD_COMPAT_DEFAULTS)) {
      if (!(field in result)) {
        result[field] = value;
      }
    }
    return result;
  }
}
