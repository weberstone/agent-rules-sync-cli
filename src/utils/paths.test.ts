import { describe, it, expect, vi, beforeEach } from 'vitest';

// Dynamic import so we can mock process.cwd before loading the module
const importPaths = () => import('./paths.js');

beforeEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('getTargetDir', () => {
  it('returns process.cwd()', async () => {
    vi.stubGlobal('process', { ...process, cwd: () => '/fake/project' });
    const { getTargetDir } = await importPaths();
    expect(getTargetDir()).toBe('/fake/project');
  });
});

describe('getProjectName', () => {
  it('returns basename of cwd', async () => {
    vi.stubGlobal('process', { ...process, cwd: () => '/Users/dev/my-app' });
    const { getProjectName } = await importPaths();
    expect(getProjectName()).toBe('my-app');
  });

  it('handles trailing slash', async () => {
    vi.stubGlobal('process', { ...process, cwd: () => '/Users/dev/my-app/' });
    const { getProjectName } = await importPaths();
    expect(getProjectName()).toBe('my-app');
  });
});

describe('getSourceDir', () => {
  it('returns a directory path ending with src', async () => {
    const { getSourceDir } = await importPaths();
    // When running from the project, the source dir should be the src/ directory
    expect(getSourceDir()).toMatch(/src\/utils$/);
  });
});

describe('getContextDir', () => {
  it('returns a path ending with context', async () => {
    const { getContextDir } = await importPaths();
    expect(getContextDir()).toMatch(/context$/);
  });
});

describe('getRulesDir', () => {
  it('returns context/rules/ directory', async () => {
    const { getRulesDir } = await importPaths();
    expect(getRulesDir()).toMatch(/context\/rules$/);
  });
});

describe('getSkillsDir', () => {
  it('returns context/skills/ directory', async () => {
    const { getSkillsDir } = await importPaths();
    expect(getSkillsDir()).toMatch(/context\/skills$/);
  });
});

describe('getProjectsDir', () => {
  it('returns context/projects/ directory', async () => {
    const { getProjectsDir } = await importPaths();
    expect(getProjectsDir()).toMatch(/context\/projects$/);
  });
});

describe('path consistency', () => {
  it('rulesDir, skillsDir, and projectsDir share the same parent (contextDir)', async () => {
    const { getContextDir, getRulesDir, getSkillsDir, getProjectsDir } = await importPaths();
    const context = getContextDir();
    expect(getRulesDir()).toBe(`${context}/rules`);
    expect(getSkillsDir()).toBe(`${context}/skills`);
    expect(getProjectsDir()).toBe(`${context}/projects`);
  });
});
