/**
 * Skills questionnaire — multiselect with conflict resolution.
 */

import {
  intro as clackIntro,
  outro,
  cancel,
  isCancel,
  confirm,
  select,
  multiselect,
} from '../../rules/prompts/clack-adapter.js';
import type { SkillsDiscoveryService } from '../discovery/skills-discovery.service.js';
import type { ParsedSkill, SkillAnswers } from '../types/skills.types.js';

function isCancelSignal(value: unknown): value is symbol {
  return isCancel(value);
}

export class SkillsPromptService {
  constructor(private readonly discovery: SkillsDiscoveryService) {}

  async run(projectName: string): Promise<SkillAnswers | null> {
    clackIntro('Skills configuration');

    // 1. Force-select project skills
    const projectSkills = await this.discovery.listProjectSkills(projectName);

    // 2. Scan general skills
    const generalSkills = await this.discovery.listGeneralSkills();

    // 3. Resolve name conflicts (folder vs file within general, project vs general)
    const resolvedGeneral = await this.resolveConflicts(generalSkills, projectSkills);

    // 4. Handle "no general, but have project" case
    if (resolvedGeneral.length === 0) {
      if (projectSkills.length > 0) {
        const proceed = await confirm({
          message:
            'No general skills found, but project skills were detected and will be installed. Continue?',
        });
        if (isCancelSignal(proceed) || !proceed) {
          cancel('Operation cancelled by user.');
          return null;
        }
        return {
          selectedSkills: projectSkills.map((s) => s.name),
        };
      }
      // No skills at all
      outro('No skills found.');
      return { selectedSkills: [] };
    }

    // 5. Multiselect general skills
    const options = resolvedGeneral.map((s) => ({
      value: s.name,
      label: `${s.name} — ${s.description}`,
      hint: s.source === 'general' ? undefined : 'project',
    }));

    const selected = await multiselect({
      message: 'Select skills to install:',
      options,
      required: false,
    });

    if (isCancelSignal(selected)) {
      cancel('Operation cancelled by user.');
      return null;
    }

    // 6. Merge: project skills always included, general skills from selection
    const allNames = new Set<string>([
      ...projectSkills.map((s) => s.name),
      ...(selected as string[]),
    ]);

    return { selectedSkills: [...allNames] };
  }

  private async resolveConflicts(
    generalSkills: ParsedSkill[],
    projectSkills: ParsedSkill[],
  ): Promise<ParsedSkill[]> {
    const projectNames = new Set(projectSkills.map((s) => s.name));

    // Group general skills by name
    const byName = new Map<string, ParsedSkill[]>();
    for (const skill of generalSkills) {
      const group = byName.get(skill.name) || [];
      group.push(skill);
      byName.set(skill.name, group);
    }

    const result: ParsedSkill[] = [];

    for (const [name, variants] of byName) {
      let chosen = variants[0];

      // Resolve folder-vs-file conflict if multiple variants
      if (variants.length > 1) {
        const choice = await select({
          message: `Two versions of "${name}" found. Which one to use?`,
          options: variants.map((v) => ({
            value: `${name}::${v.type}`,
            label: `${v.type} version — ${v.description}`,
          })),
        });

        if (isCancelSignal(choice)) {
          cancel('Operation cancelled by user.');
          return [];
        }

        const chosenType = typeof choice === 'string' ? choice.split('::')[1] : null;
        chosen = variants.find((v) => v.type === chosenType) || variants[0];
      }

      // Resolve project-vs-general conflict
      if (projectNames.has(name)) {
        const choice = await select({
          message: `Skill "${name}" exists in both project and general. Which one to use?`,
          options: [
            { value: 'project', label: 'Project version' },
            { value: 'general', label: `General version — ${chosen.description}` },
          ],
        });

        if (isCancelSignal(choice)) {
          cancel('Operation cancelled by user.');
          return [];
        }

        if (choice === 'project') continue; // project already force-selected
      }

      result.push(chosen);
    }

    return result;
  }
}
