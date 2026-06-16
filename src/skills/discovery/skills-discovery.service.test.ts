import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { SkillsDiscoveryService } from '../discovery/skills-discovery.service.js';

let tmpDir: string;
let skillsDir: string;
let projectsDir: string;
let service: SkillsDiscoveryService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'skills-test-'));
  skillsDir = path.join(tmpDir, 'skills');
  projectsDir = path.join(tmpDir, 'projects');
  service = new SkillsDiscoveryService(skillsDir, projectsDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function createFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

describe('listGeneralSkills', () => {
  it('discovers folder-based skill with SKILL.md', async () => {
    await createFile(
      path.join(skillsDir, 'angular-dev', 'SKILL.md'),
      '---\nname: angular-developer\ndescription: Angular code generator\n---\n# Content',
    );

    const skills = await service.listGeneralSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('angular-developer');
    expect(skills[0].description).toBe('Angular code generator');
    expect(skills[0].type).toBe('folder');
    expect(skills[0].source).toBe('general');
    expect(skills[0].diskPath).toContain('angular-dev');
  });

  it('discovers file-based skill', async () => {
    await createFile(
      path.join(skillsDir, 'code-reviewer.md'),
      '---\ndescription: Reviews pull requests\n---\n# Content',
    );

    const skills = await service.listGeneralSkills();
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('code-reviewer'); // falls back to filename
    expect(skills[0].type).toBe('file');
    expect(skills[0].diskPath).toContain('code-reviewer.md');
  });

  it('falls back to folder name when frontmatter has no name', async () => {
    await createFile(
      path.join(skillsDir, 'my-skill', 'SKILL.md'),
      '---\ndescription: A useful skill\n---\n# Body',
    );

    const skills = await service.listGeneralSkills();
    expect(skills[0].name).toBe('my-skill');
  });

  it('ignores empty folders', async () => {
    await fs.mkdir(path.join(skillsDir, 'empty-dir'), { recursive: true });
    const skills = await service.listGeneralSkills();
    expect(skills).toHaveLength(0);
  });

  it('ignores files without description in frontmatter', async () => {
    await createFile(path.join(skillsDir, 'bad.md'), '---\nname: bad\n---\nNo description');
    const skills = await service.listGeneralSkills();
    expect(skills).toHaveLength(0);
  });

  it('returns empty array when skills directory does not exist', async () => {
    // skillsDir was never created
    const skills = await service.listGeneralSkills();
    expect(skills).toEqual([]);
  });

  it('discovers both folder and file skills with the same name', async () => {
    await createFile(
      path.join(skillsDir, 'my-skill', 'SKILL.md'),
      '---\ndescription: Folder version\n---\n',
    );
    await createFile(path.join(skillsDir, 'my-skill.md'), '---\ndescription: File version\n---\n');

    const skills = await service.listGeneralSkills();
    expect(skills).toHaveLength(2);
    expect(skills[0].name).toBe('my-skill');
    expect(skills[1].name).toBe('my-skill');
  });
});

describe('listProjectSkills', () => {
  it('discovers project skills', async () => {
    const projectSkillsDir = path.join(projectsDir, 'my-app', 'skills');
    await createFile(
      path.join(projectSkillsDir, 'custom-skill', 'SKILL.md'),
      '---\ndescription: Custom project skill\n---\n',
    );

    const skills = await service.listProjectSkills('my-app');
    expect(skills).toHaveLength(1);
    expect(skills[0].name).toBe('custom-skill');
    expect(skills[0].source).toBe('project');
  });

  it('returns empty when project skills dir does not exist', async () => {
    const skills = await service.listProjectSkills('nonexistent');
    expect(skills).toEqual([]);
  });
});
