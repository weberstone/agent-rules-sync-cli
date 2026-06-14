/**
 * Scans the `context/rules/` directory to discover available templates.
 *
 * All file system access for template discovery goes through this service.
 * It is injected into PromptService (to list options) and CompilerService
 * (to read template content). The constructor receives `rulesDir` so it
 * works regardless of where the package is installed.
 *
 * Error handling: missing directories are treated as "no options available"
 * (returns empty array / null). Non-ENOENT errors are logged as warnings.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import type { Architecture } from '../config/config.types.js';
import type { TemplateCategory } from './discovery.types.js';
import { logWarning } from '../utils/log.js';
import { isEnoent } from '../utils/fs.js';

const ALL_ARCHITECTURES: readonly Architecture[] = ['frontend', 'backend', 'fullstack'];

export class DiscoveryService {
  /**
   * @param rulesDir — absolute path to `context/rules/`
   */
  constructor(private readonly rulesDir: string) {}

  /**
   * Return which architectures are available by checking which directories
   * exist under `context/rules/`. Used to build the dynamic architecture
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

  /** List `.md` files in `context/rules/<arch>/frameworks/`, sans extension. */
  async listFrameworks(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'frameworks'));
  }

  /** List `.md` files in `context/rules/<arch>/packages/`, sans extension. */
  async listPackages(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'packages'));
  }

  /**
   * Check if a per-project override file exists and is non-empty.
   * Path: `context/projects/<projectName>/rules/<fileName>`
   */
  async hasProjectOverride(projectName: string, fileName: string): Promise<boolean> {
    const filePath = path.join(this.rulesDir, '..', 'projects', projectName, 'rules', fileName);
    return this.isFileNonEmpty(filePath);
  }

  /**
   * Read the content of a per-project override file.
   * Returns `null` if the file doesn't exist or is empty.
   */
  async getProjectOverride(projectName: string, fileName: string): Promise<string | null> {
    const filePath = path.join(this.rulesDir, '..', 'projects', projectName, 'rules', fileName);
    return this.readIfNonEmpty(filePath);
  }

  /**
   * Read the content of a general template.
   * Path: `context/rules/<arch>/<category>/<name>.md`
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
   * Read a file directly under an architecture directory.
   * Path: `context/rules/<arch>/<filename>`
   * Used for `userprompt.md`, `architecture.md`, `workflow.md`.
   */
  async getArchFile(arch: Architecture, filename: string): Promise<string | null> {
    const filePath = path.join(this.rulesDir, arch, filename);
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
