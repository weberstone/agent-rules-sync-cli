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
  it('returns a readable directory', async () => {
    const { getContextDir, initPaths } = await importPaths();
    await initPaths();
    expect(getContextDir()).toBeTruthy();
  });
});

describe('getRulesDir', () => {
  it('returns a path ending with /rules', async () => {
    const { getRulesDir, initPaths } = await importPaths();
    await initPaths();
    expect(getRulesDir()).toMatch(/\/rules$/);
  });
});

describe('getSkillsDir', () => {
  it('returns a path ending with /skills', async () => {
    const { getSkillsDir, initPaths } = await importPaths();
    await initPaths();
    expect(getSkillsDir()).toMatch(/\/skills$/);
  });
});

describe('getProjectsDir', () => {
  it('returns a path ending with /projects', async () => {
    const { getProjectsDir, initPaths } = await importPaths();
    await initPaths();
    expect(getProjectsDir()).toMatch(/\/projects$/);
  });
});

describe('path consistency', () => {
  it('rulesDir, skillsDir, and projectsDir are under contextDir', async () => {
    const { getContextDir, getRulesDir, getSkillsDir, getProjectsDir, initPaths } =
      await importPaths();
    await initPaths();
    const ctx = getContextDir();
    expect(getRulesDir().startsWith(ctx)).toBe(true);
    expect(getSkillsDir().startsWith(ctx)).toBe(true);
    expect(getProjectsDir().startsWith(ctx)).toBe(true);
  });
});
