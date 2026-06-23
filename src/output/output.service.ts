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
import type { Dirent } from 'node:fs';
import { writeTextFile, ensureDir, readTextFile, isEnoent } from '../utils/fs.js';
import { logWarning, logPlain } from '../utils/log.js';
import type { CompiledFile } from '../rules/compiler/compiler.types.js';
import {
  wrapRules,
  updateRules,
  hasSyncMarkers,
  wrapSkills,
  updateSkills,
  SKILLS_START,
  SKILLS_END,
  RULES_DIR,
} from './content-wrapper.js';

/**
 * Split generator output into rules and skills portions.
 * The generator output may contain pre-wrapped SKILLS markers.
 * Returns { rules, skills } where skills is bare content (null if none).
 */
function splitContent(content: string): { rules: string; skills: string | null } {
  const startIdx = content.indexOf(SKILLS_START);
  if (startIdx === -1) return { rules: content, skills: null };

  const endIdx = content.indexOf(SKILLS_END, startIdx);
  if (endIdx === -1) return { rules: content, skills: null };

  const before = content.slice(0, startIdx);
  const skillsBody = content.slice(startIdx + SKILLS_START.length, endIdx).trim();
  const after = content.slice(endIdx + SKILLS_END.length);

  return {
    rules: (before + after).trim(),
    skills: skillsBody || null,
  };
}

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
   * Cleans up stale files from previous syncs before writing the new set.
   */
  async writeRulesDir(files: CompiledFile[]): Promise<void> {
    await ensureDir(this.rulesDir);

    const incomingNames = new Set(files.map((f) => f.filename));
    await this.pruneStaleFiles(this.rulesDir, incomingNames);

    for (const file of files) {
      const filePath = path.join(this.rulesDir, file.filename);
      await writeTextFile(filePath, file.content);
    }
  }

  /**
   * Remove files from a directory whose names are not in the `keep` set.
   * Skips directories — only removes regular files.
   */
  private async pruneStaleFiles(dir: string, keep: ReadonlySet<string>): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch (err) {
      if (isEnoent(err)) return;
      throw err;
    }
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      if (keep.has(entry.name)) continue;
      await fs.unlink(path.join(dir, entry.name));
      logPlain(`Removed stale rule file: ${entry.name}`);
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
      if (hasSyncMarkers(content)) return true;
      if (this.isJsonFile(relativePath)) return this.isGeneratedJson(content);
      return false;
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(`Cannot read file to check markers "${filePath}": ${(err as Error).message}`);
      }
      return false;
    }
  }

  /**
   * Write an agent config file.
   *
   * RULES and SKILLS are written as sibling sections (not nested).
   *
   * @param mode
   *  - `create`: new file with RULES and SKILLS wrapped separately
   *  - `overwrite`: full replacement
   *  - `update`: replace inside existing markers, preserving user content
   *    outside both RULES and SKILLS markers
   */
  async writeAgentFile(
    relativePath: string,
    content: string,
    mode: 'create' | 'overwrite' | 'update',
  ): Promise<void> {
    const filePath = path.join(this.targetDir, relativePath);
    await ensureDir(path.dirname(filePath));

    if (this.isJsonFile(relativePath)) {
      await this.writeJsonFile(filePath, content, mode);
      return;
    }

    const { rules, skills } = splitContent(content);

    if (mode === 'update') {
      const existing = await readTextFile(filePath);
      let result = updateRules(existing, rules);
      if (skills) {
        result = updateSkills(result, skills);
      }
      content = result;
    } else {
      content = wrapRules(rules);
      if (skills) {
        content += '\n' + wrapSkills(skills);
      }
    }

    await writeTextFile(filePath, content);
  }

  private isJsonFile(filename: string): boolean {
    return filename.endsWith('.json') || filename.endsWith('.jsonc');
  }

  /**
   * Strip JSONC comments and trailing commas from a string.
   * Operates character-by-character to avoid mangling URLs inside strings.
   */
  private cleanJsonc(raw: string): string {
    const chars: string[] = [];
    let inString = false;
    let stringChar = '';
    let i = 0;

    while (i < raw.length) {
      const ch = raw[i];

      if (inString) {
        chars.push(ch);
        if (ch === '\\') {
          i++;
          if (i < raw.length) {
            chars.push(raw[i]);
          }
        } else if (ch === stringChar) {
          inString = false;
        }
        i++;
        continue;
      }

      if (ch === '"' || ch === "'") {
        inString = true;
        stringChar = ch;
        chars.push(ch);
        i++;
        continue;
      }

      if (ch === '/' && raw[i + 1] === '/') {
        i += 2;
        while (i < raw.length && raw[i] !== '\n') i++;
        continue;
      }

      if (ch === '/' && raw[i + 1] === '*') {
        i += 2;
        while (i < raw.length && !(raw[i] === '*' && raw[i + 1] === '/')) i++;
        i += 2;
        continue;
      }

      chars.push(ch);
      i++;
    }

    return chars.join('').replace(/,(\s*[}\]])/g, '$1');
  }

  /**
   * Parse a JSON or JSONC string, handling comments and trailing commas.
   * Falls back to JSONC cleaning only when `JSON.parse` fails on the raw content.
   * Returns `null` on parse failure.
   */
  private tryParseJson(raw: string): unknown {
    try {
      return JSON.parse(raw);
    } catch {
      try {
        return JSON.parse(this.cleanJsonc(raw));
      } catch {
        return null;
      }
    }
  }

  /**
   * Check whether a JSON file was generated by our tool.
   * Recognised by the `instructions` field referencing `.agents/rules/`.
   */
  private isGeneratedJson(content: string): boolean {
    const parsed = this.tryParseJson(content);
    if (!parsed || typeof parsed !== 'object') return false;
    const instructions = (parsed as Record<string, unknown>).instructions;
    return (
      Array.isArray(instructions) &&
      (instructions as unknown[]).every(
        (entry: unknown) => typeof entry === 'string' && entry.startsWith('.agents/rules/'),
      )
    );
  }

  /**
   * Write a JSON config file without marker wrapping.
   * For `update` mode, merges `instructions` into the existing config.
   * For `create`/`overwrite`, writes the content as-is.
   */
  private async writeJsonFile(
    filePath: string,
    content: string,
    mode: 'create' | 'overwrite' | 'update',
  ): Promise<void> {
    if (mode === 'update') {
      const existingRaw = await readTextFile(filePath).catch(() => null);
      if (existingRaw !== null) {
        const existing = this.tryParseJson(existingRaw);
        const incoming = this.tryParseJson(content);

        if (existing && incoming && typeof existing === 'object' && typeof incoming === 'object') {
          const existingObj = existing as Record<string, unknown>;
          const incomingObj = incoming as Record<string, unknown>;

          const merged = { ...existingObj };
          for (const key of Object.keys(incomingObj)) {
            if (Array.isArray(incomingObj[key]) && Array.isArray(existingObj[key])) {
              const existingSet = new Set(existingObj[key]);
              for (const item of incomingObj[key]) {
                if (!existingSet.has(item)) {
                  (merged[key] as unknown[]).push(item);
                }
              }
            } else {
              merged[key] = incomingObj[key];
            }
          }

          content = JSON.stringify(merged, null, 2) + '\n';
        } else {
          logWarning(
            `Failed to parse existing JSON at "${filePath}". Writing new content directly.`,
          );
        }
      }
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
          `Cannot read .gitignore: ${(err as Error).message}. Suggest adding ai-context-config.json manually.`,
        );
      }
      return false;
    }
  }
}
