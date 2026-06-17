import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { OutputService } from './output.service.js';

let tmpDir: string;
let service: OutputService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-rules-test-'));
  service = new OutputService(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('writeRulesDir', () => {
  it('writes files to .agents/rules/', async () => {
    const files = [
      { filename: 'workflow.md', content: '# Workflow' },
      { filename: 'architecture.md', content: '# Architecture' },
    ];

    await service.writeRulesDir(files);

    const workflow = await fs.readFile(
      path.join(tmpDir, '.agents', 'rules', 'workflow.md'),
      'utf-8',
    );
    const arch = await fs.readFile(
      path.join(tmpDir, '.agents', 'rules', 'architecture.md'),
      'utf-8',
    );

    expect(workflow).toBe('# Workflow');
    expect(arch).toBe('# Architecture');
  });

  it('overwrites existing files in .agents/rules/', async () => {
    await service.writeRulesDir([{ filename: 'test.md', content: 'old' }]);
    await service.writeRulesDir([{ filename: 'test.md', content: 'new' }]);

    const content = await fs.readFile(path.join(tmpDir, '.agents', 'rules', 'test.md'), 'utf-8');
    expect(content).toBe('new');
  });

  it('creates .agents/rules/ directory if not exists', async () => {
    await service.writeRulesDir([{ filename: 'test.md', content: 'data' }]);

    const stat = await fs.stat(path.join(tmpDir, '.agents', 'rules'));
    expect(stat.isDirectory()).toBe(true);
  });
});

describe('fileExists', () => {
  it('returns false for non-existent file', async () => {
    const result = await service.fileExists('nonexistent.md');
    expect(result).toBe(false);
  });

  it('returns true for existing file', async () => {
    await fs.writeFile(path.join(tmpDir, 'exists.md'), 'content', 'utf-8');
    const result = await service.fileExists('exists.md');
    expect(result).toBe(true);
  });
});

describe('writeAgentFile', () => {
  it('creates new file wrapped in SYNC markers (create mode)', async () => {
    await service.writeAgentFile('CLAUDE.md', '# Claude Rules', 'create');

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->');
    expect(content).toContain('# Claude Rules');
    expect(content).toContain('<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->');
  });

  it('replaces file with wrapped content in overwrite mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'old content', 'utf-8');
    await service.writeAgentFile('CLAUDE.md', '# New Rules', 'overwrite');

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# New Rules');
    expect(content).toContain('RULES:START');
    expect(content).not.toContain('old content');
  });

  it('replaces inside markers in update mode when markers exist', async () => {
    await service.writeAgentFile('CLAUDE.md', '# Initial Rules', 'create');
    // Write user content after the wrapper
    const filePath = path.join(tmpDir, 'CLAUDE.md');
    const existing = await fs.readFile(filePath, 'utf-8');
    await fs.writeFile(filePath, existing + '\nUser additions below.\n');

    await service.writeAgentFile('CLAUDE.md', '# Updated Rules', 'update');

    const content = await fs.readFile(filePath, 'utf-8');
    expect(content).toContain('# Updated Rules');
    expect(content).not.toContain('# Initial Rules');
    expect(content).toContain('User additions below.');
    expect(content).toContain('RULES:START');
    expect(content).toContain('RULES:END');
  });

  it('prepends wrapped content in update mode when no markers exist', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'User content.', 'utf-8');
    await service.writeAgentFile('CLAUDE.md', '# New Rules', 'update');

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('RULES:START');
    expect(content).toContain('# New Rules');
    expect(content).toContain('RULES:END');
    expect(content).toContain('User content.');
  });

  it('writes RULES and SKILLS as sibling sections (create mode)', async () => {
    const content =
      '# Claude Rules\n\n' +
      '<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:START -->\n' +
      '| Skill | Path | Description |\n' +
      '| test-skill | `@.agents/skills/test-skill.md` | Test |\n' +
      '<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:END -->\n';

    await service.writeAgentFile('CLAUDE.md', content, 'create');
    const text = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');

    // RULES and SKILLS are siblings, not nested
    const rulesStart = text.indexOf('RULES:START');
    const rulesEnd = text.indexOf('RULES:END');
    const skillsStart = text.indexOf('SKILLS:START');
    const skillsEnd = text.indexOf('SKILLS:END');

    expect(rulesStart).toBeLessThan(rulesEnd);
    expect(skillsStart).toBeLessThan(skillsEnd);
    // SKILLS comes after RULES (sibling)
    expect(rulesEnd).toBeLessThan(skillsStart);
  });

  it('updates both RULES and SKILLS sections in update mode', async () => {
    const initial =
      '<!-- AGENT-CONTEXT-SYNC-CLI:RULES:START -->\nold rules\n<!-- AGENT-CONTEXT-SYNC-CLI:RULES:END -->\n\n' +
      '<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:START -->\nold skills\n<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:END -->\n';
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), initial, 'utf-8');

    const newContent =
      '# New Rules\n\n' +
      '<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:START -->\nnew skills\n<!-- AGENT-CONTEXT-SYNC-CLI:SKILLS:END -->\n';

    await service.writeAgentFile('CLAUDE.md', newContent, 'update');
    const text = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');

    expect(text).toContain('New Rules');
    expect(text).not.toContain('old rules');
    expect(text).toContain('new skills');
    expect(text).not.toContain('old skills');
  });

  it('creates parent directories for nested paths', async () => {
    await service.writeAgentFile('.cursor/rules/00-agent-rules.mdc', '# Rules', 'create');

    const content = await fs.readFile(
      path.join(tmpDir, '.cursor', 'rules', '00-agent-rules.mdc'),
      'utf-8',
    );
    expect(content).toContain('# Rules');
    expect(content).toContain('RULES:START');
  });
});

describe('hasSyncMarkersInFile', () => {
  it('returns false for non-existent file', async () => {
    const result = await service.hasSyncMarkersInFile('nonexistent.md');
    expect(result).toBe(false);
  });

  it('returns true when file has SYNC markers', async () => {
    await service.writeAgentFile('test.md', '# content', 'create');
    const result = await service.hasSyncMarkersInFile('test.md');
    expect(result).toBe(true);
  });

  it('returns false when file has no SYNC markers', async () => {
    await fs.writeFile(path.join(tmpDir, 'test.md'), 'plain content', 'utf-8');
    const result = await service.hasSyncMarkersInFile('test.md');
    expect(result).toBe(false);
  });
});

describe('isInGitignore', () => {
  it('returns false when .gitignore does not exist', async () => {
    const result = await service.isInGitignore('ai-context-config.json');
    expect(result).toBe(false);
  });

  it('returns true when filename is in .gitignore', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\nai-context-config.json\n.env',
      'utf-8',
    );
    const result = await service.isInGitignore('ai-context-config.json');
    expect(result).toBe(true);
  });

  it('returns false when filename is not in .gitignore', async () => {
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'node_modules/\n.env', 'utf-8');
    const result = await service.isInGitignore('ai-context-config.json');
    expect(result).toBe(false);
  });
});
