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
  it('creates new file in create mode', async () => {
    await service.writeAgentFile('CLAUDE.md', '# Claude Rules', 'create');

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toBe('# Claude Rules');
  });

  it('replaces file in overwrite mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'old content', 'utf-8');
    await service.writeAgentFile('CLAUDE.md', '# New Rules', 'overwrite');

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toBe('# New Rules');
  });

  it('prepends content in append mode', async () => {
    await fs.writeFile(path.join(tmpDir, 'CLAUDE.md'), 'Existing content.', 'utf-8');
    await service.writeAgentFile('CLAUDE.md', '# New Rules', 'append');

    const content = await fs.readFile(path.join(tmpDir, 'CLAUDE.md'), 'utf-8');
    expect(content).toContain('# New Rules');
    expect(content).toContain('Existing content.');
    // New content should come first
    expect(content.indexOf('# New Rules')).toBeLessThan(content.indexOf('Existing'));
  });

  it('creates parent directories for nested paths', async () => {
    await service.writeAgentFile('.cursor/rules/00-agent-rules.mdc', '# Rules', 'create');

    const content = await fs.readFile(
      path.join(tmpDir, '.cursor', 'rules', '00-agent-rules.mdc'),
      'utf-8',
    );
    expect(content).toBe('# Rules');
  });
});

describe('isInGitignore', () => {
  it('returns false when .gitignore does not exist', async () => {
    const result = await service.isInGitignore('ai-rules-config.json');
    expect(result).toBe(false);
  });

  it('returns true when filename is in .gitignore', async () => {
    await fs.writeFile(
      path.join(tmpDir, '.gitignore'),
      'node_modules/\nai-rules-config.json\n.env',
      'utf-8',
    );
    const result = await service.isInGitignore('ai-rules-config.json');
    expect(result).toBe(true);
  });

  it('returns false when filename is not in .gitignore', async () => {
    await fs.writeFile(path.join(tmpDir, '.gitignore'), 'node_modules/\n.env', 'utf-8');
    const result = await service.isInGitignore('ai-rules-config.json');
    expect(result).toBe(false);
  });
});
