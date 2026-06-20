/**
 * Scans the skills directory to discover available skills.
 *
 * Receives `skillsDir` for general skills and `projectsDir` for
 * per-project overrides — no phantom `path.join(x, '..', ...)` references.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { isEnoent } from '../../utils/fs.js';
import { logWarning } from '../../utils/log.js';
import type { ParsedSkill } from '../types/skills.types.js';

export class SkillsDiscoveryService {
  /**
   * @param skillsDir — absolute path to general skills (e.g. `context/skills/`)
   * @param projectsDir — absolute path to projects directory (e.g. `context/projects/`)
   */
  constructor(
    private readonly skillsDir: string,
    private readonly projectsDir: string,
  ) {}

  /** Scan the general skills directory. */
  async listGeneralSkills(): Promise<ParsedSkill[]> {
    return this.scanSkillsDir(this.skillsDir, 'general');
  }

  /** Scan `<projectsDir>/<projectName>/skills/` for project skills. */
  async listProjectSkills(projectName: string): Promise<ParsedSkill[]> {
    const dirPath = path.join(this.projectsDir, projectName, 'skills');
    return this.scanSkillsDir(dirPath, 'project');
  }

  private async scanSkillsDir(
    dirPath: string,
    source: 'project' | 'general',
  ): Promise<ParsedSkill[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(`Cannot read skills directory "${dirPath}": ${(err as Error).message}`);
      }
      return [];
    }

    const skills: ParsedSkill[] = [];

    for (const entry of entries) {
      const entryPath = path.join(dirPath, entry);
      let entryStat;
      try {
        entryStat = await fs.stat(entryPath);
      } catch (err) {
        if (!isEnoent(err)) {
          logWarning(`Cannot stat skill entry "${entryPath}": ${(err as Error).message}`);
        }
        continue;
      }

      if (entryStat.isDirectory()) {
        const skillMdPath = path.join(entryPath, 'SKILL.md');
        const skill = await this.parseSkillFile(skillMdPath, source, 'folder', entry, entryPath);
        if (skill) {
          skills.push(skill);
        }
      } else if (entryStat.isFile() && entry.endsWith('.md')) {
        const baseName = entry.replace(/\.md$/, '');
        const skill = await this.parseSkillFile(entryPath, source, 'file', baseName, entryPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }

    return skills;
  }

  private async parseSkillFile(
    filePath: string,
    source: 'project' | 'general',
    type: 'folder' | 'file',
    fallbackName: string,
    diskPath: string,
  ): Promise<ParsedSkill | null> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(`Cannot read skill file "${filePath}": ${(err as Error).message}`);
      }
      return null;
    }

    const frontmatter = parseFrontmatter(content);
    if (!frontmatter || !frontmatter.description) {
      return null;
    }

    return {
      name: frontmatter.name || fallbackName,
      description: frontmatter.description,
      source,
      type,
      diskPath,
    };
  }
}

/**
 * Parse YAML-like frontmatter from a Markdown file.
 * Expects content between `---` delimiters at the top of the file.
 * Only extracts top-level `key: value` pairs — no nested YAML.
 */
function parseFrontmatter(content: string): Record<string, string> | null {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith('---')) return null;

  const endIdx = trimmed.indexOf('---', 3);
  if (endIdx === -1) return null;

  const block = trimmed.slice(3, endIdx);
  const result: Record<string, string> = {};

  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key && value) result[key] = value;
  }

  return result;
}
