import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DiscoveryService } from './discovery.service.js';

let tmpDir: string;
let rulesDir: string;
let service: DiscoveryService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-rules-test-'));
  rulesDir = path.join(tmpDir, 'rules');
  service = new DiscoveryService(rulesDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

async function createFile(filePath: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');
}

// ---- getAvailableArchitectures ----

describe('getAvailableArchitectures', () => {
  it('returns only architectures whose directories exist', async () => {
    await fs.mkdir(path.join(rulesDir, 'frontend'), { recursive: true });
    await fs.mkdir(path.join(rulesDir, 'backend'), { recursive: true });
    // fullstack directory is NOT created

    const result = await service.getAvailableArchitectures();
    expect(result).toEqual(['frontend', 'backend']);
  });

  it('returns fullstack when its directory exists', async () => {
    await fs.mkdir(path.join(rulesDir, 'frontend'), { recursive: true });
    await fs.mkdir(path.join(rulesDir, 'backend'), { recursive: true });
    await fs.mkdir(path.join(rulesDir, 'fullstack'), { recursive: true });

    const result = await service.getAvailableArchitectures();
    expect(result).toEqual(['frontend', 'backend', 'fullstack']);
  });

  it('returns empty array when no architecture directories exist', async () => {
    const result = await service.getAvailableArchitectures();
    expect(result).toEqual([]);
  });

  it('ignores files (not directories) matching architecture names', async () => {
    await createFile(path.join(rulesDir, 'frontend'), 'not a dir');
    const result = await service.getAvailableArchitectures();
    // A file named "frontend" is not a directory, so it's skipped
    expect(result).toEqual([]);
  });
});

// ---- listFrameworks ----

describe('listFrameworks', () => {
  it('returns framework names without .md extension', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'frameworks', 'react.md'), '# React');
    await createFile(path.join(rulesDir, 'frontend', 'frameworks', 'vue.md'), '# Vue');

    const result = await service.listFrameworks('frontend');
    expect(result).toEqual(expect.arrayContaining(['react', 'vue']));
    expect(result).toHaveLength(2);
  });

  it('returns empty array when frameworks directory does not exist', async () => {
    const result = await service.listFrameworks('frontend');
    expect(result).toEqual([]);
  });

  it('returns empty array when frameworks directory is empty', async () => {
    await fs.mkdir(path.join(rulesDir, 'frontend', 'frameworks'), { recursive: true });
    const result = await service.listFrameworks('frontend');
    expect(result).toEqual([]);
  });

  it('ignores non-.md files', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'frameworks', 'react.md'), '# React');
    await createFile(path.join(rulesDir, 'frontend', 'frameworks', 'notes.txt'), 'notes');
    const result = await service.listFrameworks('frontend');
    expect(result).toEqual(['react']);
  });

  it('works for all architecture types', async () => {
    await createFile(path.join(rulesDir, 'backend', 'frameworks', 'express.md'), '# Express');
    await createFile(path.join(rulesDir, 'fullstack', 'frameworks', 'nextjs.md'), '# Next');

    const backendResult = await service.listFrameworks('backend');
    const fullstackResult = await service.listFrameworks('fullstack');
    expect(backendResult).toEqual(['express']);
    expect(fullstackResult).toEqual(['nextjs']);
  });
});

// ---- listPackages ----

describe('listPackages', () => {
  it('returns package names without .md extension', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'packages', 'tailwind.md'), '# Tailwind');
    await createFile(path.join(rulesDir, 'frontend', 'packages', 'typescript.md'), '# TS');

    const result = await service.listPackages('frontend');
    expect(result).toEqual(expect.arrayContaining(['tailwind', 'typescript']));
    expect(result).toHaveLength(2);
  });

  it('returns empty array when packages directory does not exist', async () => {
    const result = await service.listPackages('frontend');
    expect(result).toEqual([]);
  });

  it('returns empty array when packages directory is empty', async () => {
    await fs.mkdir(path.join(rulesDir, 'frontend', 'packages'), { recursive: true });
    const result = await service.listPackages('frontend');
    expect(result).toEqual([]);
  });
});

// ---- hasProjectOverride ----

describe('hasProjectOverride', () => {
  it('returns true when file exists and is non-empty', async () => {
    await createFile(path.join(rulesDir, '..', 'projects', 'my-app', 'rules', 'spec.md'), '# Spec');
    const result = await service.hasProjectOverride('my-app', 'spec.md');
    expect(result).toBe(true);
  });

  it('returns false when project directory does not exist', async () => {
    const result = await service.hasProjectOverride('nonexistent', 'spec.md');
    expect(result).toBe(false);
  });

  it('returns false when file does not exist', async () => {
    await fs.mkdir(path.join(rulesDir, '..', 'projects', 'my-app', 'rules'), { recursive: true });
    const result = await service.hasProjectOverride('my-app', 'spec.md');
    expect(result).toBe(false);
  });

  it('returns false when file is empty or whitespace only', async () => {
    await createFile(path.join(rulesDir, '..', 'projects', 'my-app', 'rules', 'spec.md'), '   ');
    const result = await service.hasProjectOverride('my-app', 'spec.md');
    expect(result).toBe(false);
  });
});

// ---- getProjectOverride ----

describe('getProjectOverride', () => {
  it('returns file content when override exists', async () => {
    await createFile(
      path.join(rulesDir, '..', 'projects', 'my-app', 'rules', 'spec.md'),
      '# Custom Spec',
    );
    const result = await service.getProjectOverride('my-app', 'spec.md');
    expect(result).toBe('# Custom Spec');
  });

  it('returns null when override does not exist', async () => {
    const result = await service.getProjectOverride('my-app', 'spec.md');
    expect(result).toBe(null);
  });

  it('returns null when override is empty', async () => {
    await createFile(path.join(rulesDir, '..', 'projects', 'my-app', 'rules', 'spec.md'), '');
    const result = await service.getProjectOverride('my-app', 'spec.md');
    expect(result).toBe(null);
  });
});

// ---- getTemplateContent ----

describe('getTemplateContent', () => {
  it('returns content of a framework template', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'frameworks', 'react.md'), '# React Rules');
    const result = await service.getTemplateContent('frontend', 'frameworks', 'react');
    expect(result).toBe('# React Rules');
  });

  it('returns content of a package template', async () => {
    await createFile(path.join(rulesDir, 'backend', 'packages', 'typescript.md'), '# TS Rules');
    const result = await service.getTemplateContent('backend', 'packages', 'typescript');
    expect(result).toBe('# TS Rules');
  });

  it('returns null when template does not exist', async () => {
    const result = await service.getTemplateContent('frontend', 'frameworks', 'nonexistent');
    expect(result).toBe(null);
  });

  it('returns null when template is empty', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'frameworks', 'empty.md'), '');
    const result = await service.getTemplateContent('frontend', 'frameworks', 'empty');
    expect(result).toBe(null);
  });
});

// ---- listUserprompts ----

describe('listUserprompts', () => {
  it('returns userprompt names without .md extension', async () => {
    await createFile(
      path.join(rulesDir, 'frontend', 'userprompts', 'frontend-expert.md'),
      '# Expert',
    );
    await createFile(
      path.join(rulesDir, 'frontend', 'userprompts', 'react-specialist.md'),
      '# React',
    );
    const result = await service.listUserprompts('frontend');
    expect(result).toEqual(expect.arrayContaining(['frontend-expert', 'react-specialist']));
    expect(result).toHaveLength(2);
  });

  it('returns empty array when userprompts directory does not exist', async () => {
    const result = await service.listUserprompts('frontend');
    expect(result).toEqual([]);
  });

  it('returns empty array when userprompts directory is empty', async () => {
    await fs.mkdir(path.join(rulesDir, 'frontend', 'userprompts'), { recursive: true });
    const result = await service.listUserprompts('frontend');
    expect(result).toEqual([]);
  });

  it('ignores non-.md files', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'userprompts', 'expert.md'), '# Expert');
    await createFile(path.join(rulesDir, 'frontend', 'userprompts', 'notes.txt'), 'notes');
    const result = await service.listUserprompts('frontend');
    expect(result).toEqual(['expert']);
  });
});

// ---- getUserpromptContent ----

describe('getUserpromptContent', () => {
  it('returns content of a userprompt file', async () => {
    await createFile(
      path.join(rulesDir, 'backend', 'userprompts', 'nodejs-expert.md'),
      '# Node.js Expert Persona',
    );
    const result = await service.getUserpromptContent('backend', 'nodejs-expert');
    expect(result).toBe('# Node.js Expert Persona');
  });

  it('returns null when file does not exist', async () => {
    const result = await service.getUserpromptContent('frontend', 'nonexistent');
    expect(result).toBe(null);
  });

  it('returns null when file is empty', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'userprompts', 'empty.md'), '');
    const result = await service.getUserpromptContent('frontend', 'empty');
    expect(result).toBe(null);
  });

  it('works for fullstack architecture', async () => {
    await createFile(
      path.join(rulesDir, 'fullstack', 'userprompts', 'fullstack-dev.md'),
      '# Fullstack Persona',
    );
    const result = await service.getUserpromptContent('fullstack', 'fullstack-dev');
    expect(result).toBe('# Fullstack Persona');
  });
});

// ---- listWorkflows ----

describe('listWorkflows', () => {
  it('returns workflow names without .md extension', async () => {
    await createFile(
      path.join(rulesDir, 'frontend', 'workflows', 'base-workflow.md'),
      '# Workflow',
    );
    await createFile(path.join(rulesDir, 'frontend', 'workflows', 'agile-workflow.md'), '# Agile');
    const result = await service.listWorkflows('frontend');
    expect(result).toEqual(expect.arrayContaining(['base-workflow', 'agile-workflow']));
    expect(result).toHaveLength(2);
  });

  it('returns empty array when workflows directory does not exist', async () => {
    const result = await service.listWorkflows('frontend');
    expect(result).toEqual([]);
  });

  it('returns empty array when workflows directory is empty', async () => {
    await fs.mkdir(path.join(rulesDir, 'frontend', 'workflows'), { recursive: true });
    const result = await service.listWorkflows('frontend');
    expect(result).toEqual([]);
  });

  it('ignores non-.md files', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'workflows', 'base-workflow.md'), '# WF');
    await createFile(path.join(rulesDir, 'frontend', 'workflows', 'notes.txt'), 'notes');
    const result = await service.listWorkflows('frontend');
    expect(result).toEqual(['base-workflow']);
  });
});

// ---- getWorkflowContent ----

describe('getWorkflowContent', () => {
  it('returns content of a workflow file', async () => {
    await createFile(
      path.join(rulesDir, 'backend', 'workflows', 'base-workflow.md'),
      '# Backend Workflow',
    );
    const result = await service.getWorkflowContent('backend', 'base-workflow');
    expect(result).toBe('# Backend Workflow');
  });

  it('returns null when file does not exist', async () => {
    const result = await service.getWorkflowContent('frontend', 'nonexistent');
    expect(result).toBe(null);
  });

  it('returns null when file is empty', async () => {
    await createFile(path.join(rulesDir, 'frontend', 'workflows', 'empty.md'), '');
    const result = await service.getWorkflowContent('frontend', 'empty');
    expect(result).toBe(null);
  });
});

// ---- isFileNonEmpty ----

describe('isFileNonEmpty', () => {
  it('returns true for a file with content', async () => {
    const filePath = path.join(tmpDir, 'test.md');
    await fs.writeFile(filePath, '# Hello', 'utf-8');
    const result = await service.isFileNonEmpty(filePath);
    expect(result).toBe(true);
  });

  it('returns false for a file that does not exist', async () => {
    const result = await service.isFileNonEmpty(path.join(tmpDir, 'nonexistent.md'));
    expect(result).toBe(false);
  });

  it('returns false for an empty file', async () => {
    const filePath = path.join(tmpDir, 'empty.md');
    await fs.writeFile(filePath, '', 'utf-8');
    const result = await service.isFileNonEmpty(filePath);
    expect(result).toBe(false);
  });

  it('returns false for a whitespace-only file', async () => {
    const filePath = path.join(tmpDir, 'whitespace.md');
    await fs.writeFile(filePath, '  \n  \t  ', 'utf-8');
    const result = await service.isFileNonEmpty(filePath);
    expect(result).toBe(false);
  });
});
