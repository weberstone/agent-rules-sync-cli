/**
 * Scans the rules directory to discover available templates.
 *
 * All file system access for template discovery goes through this service.
 * It is injected into PromptService (to list options) and CompilerService
 * (to read template content). The constructor receives `rulesDir` for
 * template discovery and `projectsDir` for per-project overrides.
 *
 * Error handling: missing directories are treated as "no options available"
 * (returns empty array / null). Non-ENOENT errors are logged as warnings.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import type { Architecture } from '../config/config.types.js';
import { ALL_ARCHITECTURES } from '../config/config.types.js';
import type { TemplateCategory } from './discovery.types.js';
import { logWarning } from '../../utils/log.js';
import { isEnoent } from '../../utils/fs.js';

export class DiscoveryService {
  /**
   * @param rulesDir — absolute path to the rules directory (e.g. `context/rules/`)
   * @param projectsDir — absolute path to the projects directory (e.g. `context/projects/`)
   */
  constructor(
    private readonly rulesDir: string,
    private readonly projectsDir: string,
  ) {}

  /**
   * Return which architectures are available by checking which directories
   * exist under the rules directory. Used to build the dynamic architecture
   * selection in the questionnaire (fullstack only appears if its dir exists).
   */
  async getAvailableArchitectures(): Promise<Architecture[]> {
    const available: Architecture[] = [];
    for (const arch of ALL_ARCHITECTURES) {
      try {
        const stat = await fs.stat(path.join(this.rulesDir, arch));
        if (stat.isDirectory()) {
          available.push(arch);
        }
      } catch (err) {
        if (!isEnoent(err)) {
          logWarning(`Cannot read architecture directory "${arch}": ${(err as Error).message}`);
        }
      }
    }
    return available;
  }

  /** List `.md` files in `<rulesDir>/<arch>/frameworks/`, sans extension. */
  async listFrameworks(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'frameworks'));
  }

  /** List `.md` files in `<rulesDir>/<arch>/packages/`, sans extension. */
  async listPackages(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'packages'));
  }

  /**
   * Check if a per-project override file exists and is non-empty.
   * Path: `<projectsDir>/<projectName>/rules/<fileName>`
   */
  async hasProjectOverride(projectName: string, fileName: string): Promise<boolean> {
    const filePath = path.join(this.projectsDir, projectName, 'rules', fileName);
    return this.isFileNonEmpty(filePath);
  }

  /**
   * Read the content of a per-project override file.
   * Returns `null` if the file doesn't exist or is empty.
   */
  async getProjectOverride(projectName: string, fileName: string): Promise<string | null> {
    const filePath = path.join(this.projectsDir, projectName, 'rules', fileName);
    return this.readIfNonEmpty(filePath);
  }

  /**
   * Read the content of a general template.
   * Path: `<rulesDir>/<arch>/<category>/<name>.md`
   */
  async getTemplateContent(
    arch: Architecture,
    category: TemplateCategory,
    name: string,
  ): Promise<string | null> {
    const filePath = path.join(this.rulesDir, arch, category, `${name}.md`);
    return this.readIfNonEmpty(filePath);
  }

  /**
   * List `.md` files in `<rulesDir>/<arch>/userprompts/`, sans extension.
   * Returns [] if the directory doesn't exist or is empty.
   */
  async listUserprompts(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'userprompts'));
  }

  /**
   * Read a specific userprompt file from `<rulesDir>/<arch>/userprompts/<name>.md`.
   * Returns `null` if the file doesn't exist or is empty.
   */
  async getUserpromptContent(arch: Architecture, name: string): Promise<string | null> {
    const filePath = path.join(this.rulesDir, arch, 'userprompts', `${name}.md`);
    return this.readIfNonEmpty(filePath);
  }

  /**
   * List `.md` files in `<rulesDir>/<arch>/architectures/`, sans extension.
   * Returns [] if the directory doesn't exist or is empty.
   */
  async listArchitectures(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'architectures'));
  }

  /**
   * Read a specific architecture file from `<rulesDir>/<arch>/architectures/<name>.md`.
   * Returns `null` if the file doesn't exist or is empty.
   */
  async getArchitectureContent(arch: Architecture, name: string): Promise<string | null> {
    const filePath = path.join(this.rulesDir, arch, 'architectures', `${name}.md`);
    return this.readIfNonEmpty(filePath);
  }

  /**
   * List `.md` files in `<rulesDir>/<arch>/workflows/`, sans extension.
   * Returns [] if the directory doesn't exist or is empty.
   */
  async listWorkflows(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'workflows'));
  }

  /**
   * Read a specific workflow file from `<rulesDir>/<arch>/workflows/<name>.md`.
   * Returns `null` if the file doesn't exist or is empty.
   */
  async getWorkflowContent(arch: Architecture, name: string): Promise<string | null> {
    const filePath = path.join(this.rulesDir, arch, 'workflows', `${name}.md`);
    return this.readIfNonEmpty(filePath);
  }

  /** Check if a file exists and has non-whitespace content. */
  async isFileNonEmpty(filePath: string): Promise<boolean> {
    const content = await this.readIfNonEmpty(filePath);
    return content !== null;
  }

  // ---- private helpers ----

  /** List `.md` filenames (without extension) in a directory. Returns [] if the directory doesn't exist. */
  private async listDir(dirPath: string): Promise<string[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(`Cannot read directory "${dirPath}": ${(err as Error).message}`);
      }
      return [];
    }

    return entries.filter((name) => name.endsWith('.md')).map((name) => name.replace(/\.md$/, ''));
  }

  /** Read a file and return its content, or `null` if it doesn't exist or is empty. */
  private async readIfNonEmpty(filePath: string): Promise<string | null> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(`Cannot read file "${filePath}": ${(err as Error).message}`);
      }
      return null;
    }

    if (content.trim().length === 0) {
      return null;
    }

    return content;
  }
}
