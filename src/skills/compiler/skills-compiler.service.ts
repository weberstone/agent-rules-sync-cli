/**
 * Copies selected skills from `context/skills/` to `.agents/skills/`.
 *
 * Unlike the rules compiler (which returns in-memory CompiledFile[]),
 * the skills compiler writes directly to disk because folder-based skills
 * may contain arbitrary files (scripts, references, assets) that can't
 * be represented as { filename, content } pairs.
 */

import path from 'node:path';
import fs from 'node:fs/promises';
import { ensureDir } from '../../utils/fs.js';
import { logWarning } from '../../utils/log.js';
import { SKILLS_DIR } from '../../output/content-wrapper.js';
import type { ParsedSkill } from '../types/skills.types.js';

export class SkillsCompilerService {
  private readonly skillsDir: string;

  constructor(targetDir: string) {
    this.skillsDir = path.join(targetDir, SKILLS_DIR);
  }

  /**
   * Copy selected skills to `.agents/skills/`.
   *
   * @returns the names of successfully copied skills
   */
  async compile(skills: ParsedSkill[]): Promise<string[]> {
    await ensureDir(this.skillsDir);

    const copied: string[] = [];

    for (const skill of skills) {
      try {
        await this.copySkill(skill);
        copied.push(skill.name);
      } catch (err) {
        logWarning(`Failed to copy skill "${skill.name}": ${(err as Error).message}`);
      }
    }

    return copied;
  }

  private async copySkill(skill: ParsedSkill): Promise<void> {
    if (skill.type === 'folder') {
      const dest = path.join(this.skillsDir, path.basename(skill.diskPath));
      await fs.cp(skill.diskPath, dest, { recursive: true });
    } else {
      const dest = path.join(this.skillsDir, path.basename(skill.diskPath));
      await ensureDir(path.dirname(dest));
      await fs.copyFile(skill.diskPath, dest);
    }
  }
}
