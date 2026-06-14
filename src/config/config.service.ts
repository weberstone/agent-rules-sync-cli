import path from 'node:path';
import { readTextFile, writeTextFile } from '../utils/fs.js';
import { logWarning } from '../utils/log.js';
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
  'lastSync',
];

export class ConfigService {
  private readonly configPath: string;

  constructor(targetDir: string) {
    this.configPath = path.join(targetDir, CONFIG_FILENAME);
  }

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
      return this.validate(parsed);
    } catch (err) {
      logWarning(
        `Config file has an invalid structure (${(err as Error).message}). A new questionnaire will be started.`,
      );
      return null;
    }
  }

  async write(config: Config): Promise<void> {
    const json = JSON.stringify(config, null, 2);
    await writeTextFile(this.configPath, json);
  }

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

    if (typeof obj.lastSync !== 'string') {
      throw new Error('"lastSync" must be a string');
    }

    return obj as unknown as Config;
  }
}
