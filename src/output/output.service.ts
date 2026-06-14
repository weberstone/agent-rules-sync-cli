/**
 * File output service — all disk writes go through here.
 *
 * Handles two categories of output:
 * 1. **Rule files** (`.agents/rules/`) — always overwritten (sync mechanism)
 * 2. **Agent config files** (CLAUDE.md, GEMINI.md, etc.) — written with the
 *    marker-wrapper system for safe updates
 *
 * The constructor receives `targetDir` (`process.cwd()`) so the service
 * works regardless of where the script is invoked from.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { writeTextFile, ensureDir, readTextFile, isEnoent } from '../utils/fs.js';
import { logWarning } from '../utils/log.js';
import type { CompiledFile } from '../compiler/compiler.types.js';
import { wrapRules, updateRules, hasSyncMarkers } from './content-wrapper.js';

const RULES_DIR = '.agents/rules';

export class OutputService {
  private readonly rulesDir: string;

  /**
   * @param targetDir — the target project root (`process.cwd()`)
   */
  constructor(private readonly targetDir: string) {
    this.rulesDir = path.join(targetDir, RULES_DIR);
  }

  /**
   * Write rule files to `.agents/rules/`.
   * This is always a full overwrite — it's the sync mechanism.
   */
  async writeRulesDir(files: CompiledFile[]): Promise<void> {
    await ensureDir(this.rulesDir);
    for (const file of files) {
      const filePath = path.join(this.rulesDir, file.filename);
      await writeTextFile(filePath, file.content);
    }
  }

  /**
   * Check whether a file exists at the given path relative to targetDir.
   *
   * If the file can't be stat'd for a reason other than ENOENT (e.g. EACCES),
   * assumes it exists to avoid accidental overwrites — safer default.
   */
  async fileExists(relativePath: string): Promise<boolean> {
    const filePath = path.join(this.targetDir, relativePath);
    try {
      await fs.stat(filePath);
      return true;
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(
          `Cannot check if file exists "${relativePath}": ${(err as Error).message}. Assuming it does to avoid accidental overwrite.`,
        );
        return true;
      }
      return false;
    }
  }

  /**
   * Check whether an agent file already contains `AGENT-CONTEXT-SYNC-CLI`
   * markers. Used to decide whether to silently update or prompt the user.
   */
  async hasSyncMarkersInFile(relativePath: string): Promise<boolean> {
    const filePath = path.join(this.targetDir, relativePath);
    try {
      const content = await readTextFile(filePath);
      return hasSyncMarkers(content);
    } catch {
      return false;
    }
  }

  /**
   * Write an agent config file.
   *
   * @param mode
   *  - `create`: new file, wrapped in SYNC markers
   *  - `overwrite`: full replacement, wrapped in SYNC markers
   *  - `update`: replace inside existing markers, or prepend wrapped block
   *    if no markers found (preserves user content outside markers)
   */
  async writeAgentFile(
    relativePath: string,
    content: string,
    mode: 'create' | 'overwrite' | 'update',
  ): Promise<void> {
    const filePath = path.join(this.targetDir, relativePath);
    await ensureDir(path.dirname(filePath));

    if (mode === 'update') {
      const existing = await readTextFile(filePath);
      content = updateRules(existing, content);
    } else {
      content = wrapRules(content);
    }

    await writeTextFile(filePath, content);
  }

  /**
   * Check whether a filename is listed in `.gitignore`.
   * Only matches exact lines (after trimming whitespace).
   */
  async isInGitignore(filename: string): Promise<boolean> {
    const gitignorePath = path.join(this.targetDir, '.gitignore');
    try {
      const content = await readTextFile(gitignorePath);
      const lines = content.split('\n');
      return lines.some((line) => line.trim() === filename);
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(
          `Cannot read .gitignore: ${(err as Error).message}. Suggest adding ai-rules-config.json manually.`,
        );
      }
      return false;
    }
  }
}
