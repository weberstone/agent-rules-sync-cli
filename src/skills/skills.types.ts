/**
 * Types for the skills system (Phase 2).
 */

/**
 * A parsed skill discovered in `context/skills/` or `context/projects/<name>/skills/`.
 *
 * - `type: 'folder'` — a directory containing a `SKILL.md` file. The entire folder
 *   is copied to `.agents/skills/`. The SKILL.md frontmatter provides metadata.
 * - `type: 'file'` — a standalone `.md` file. Copied as-is to `.agents/skills/`.
 *
 * `description` is required (from YAML frontmatter). Skills without a description
 * are ignored during discovery.
 */
export interface ParsedSkill {
  name: string;
  description: string;
  source: 'project' | 'general';
  type: 'folder' | 'file';
  /** Absolute path to the skill on disk (file or folder). */
  diskPath: string;
  /** True if the same name exists as both a folder and a file, requiring user resolution. */
  nameConflict?: boolean;
}

/**
 * User choices from the skills questionnaire.
 * `selectedSkills` contains skill names (from YAML `name` or folder/file name).
 */
export interface SkillAnswers {
  selectedSkills: string[];
}
