import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CompilerService } from './compiler.service.js';
import type { Answers } from '../prompts/prompts.types.js';

import { DiscoveryService } from '../discovery/discovery.service.js';

function mockDiscovery(overrides: Record<string, unknown> = {}): DiscoveryService {
  return {
    getAvailableArchitectures: vi.fn(),
    listFrameworks: vi.fn(),
    listPackages: vi.fn(),
    hasProjectOverride: vi.fn().mockResolvedValue(false),
    getProjectOverride: vi.fn().mockResolvedValue(null),
    getTemplateContent: vi.fn().mockResolvedValue(null),
    listUserprompts: vi.fn().mockResolvedValue([]),
    getUserpromptContent: vi.fn().mockResolvedValue(null),
    listArchitectures: vi.fn().mockResolvedValue([]),
    getArchitectureContent: vi.fn().mockResolvedValue(null),
    listWorkflows: vi.fn().mockResolvedValue([]),
    getWorkflowContent: vi.fn().mockResolvedValue(null),
    isFileNonEmpty: vi.fn().mockResolvedValue(false),
    ...overrides,
  } as unknown as DiscoveryService;
}

function answers(overrides: Partial<Answers> = {}): Answers {
  return {
    architecture: 'frontend',
    hasUserprompt: true,
    userpromptSource: 'general',
    userpromptFile: 'frontend-expert',
    hasArchitecture: true,
    architectureSource: 'general',
    architectureFile: 'base-architecture',
    hasWorkflow: true,
    workflowSource: 'general',
    workflowFile: 'base-workflow',
    hasProjectFramework: false,
    hasProjectPackages: false,
    frameworks: ['angular-guidelines'],
    packages: ['tailwind'],
    agents: ['claude-code'],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('compile', () => {
  it('produces files in priority order', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi.fn().mockResolvedValueOnce('# Project Spec'), // spec
      getUserpromptContent: vi.fn().mockResolvedValueOnce('# Userprompt'), // userprompt general
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'), // architecture general
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'), // workflow general
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Framework') // frameworks
        .mockResolvedValueOnce('# Tailwind Rules'), // packages
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(answers(), 'my-app');

    expect(files).toHaveLength(6);
    expect(files[0].filename).toBe('userprompt.md');
    expect(files[1].filename).toBe('workflow.md');
    expect(files[2].filename).toBe('spec.md');
    expect(files[3].filename).toBe('architecture.md');
    expect(files[4].filename).toBe('angular-guidelines.md');
    expect(files[5].filename).toBe('package-rules.md');
  });

  it('skips spec when project override is null', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi.fn().mockResolvedValueOnce(null), // spec: not found
      getUserpromptContent: vi.fn().mockResolvedValueOnce('# Userprompt'),
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'),
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'),
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Framework')
        .mockResolvedValueOnce('# Tailwind'),
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(answers(), 'my-app');
    expect(files.map((f) => f.filename)).not.toContain('spec.md');
  });

  it('skips userprompt when hasUserprompt is false', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi.fn().mockResolvedValueOnce('# Spec'), // spec
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'), // architecture general
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'), // workflow general
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Framework')
        .mockResolvedValueOnce('# Tailwind'),
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(
      answers({ hasUserprompt: false, userpromptSource: null }),
      'my-app',
    );
    expect(files.map((f) => f.filename)).not.toContain('userprompt.md');
  });

  it('reads userprompt from project override', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi
        .fn()
        .mockResolvedValueOnce('# Project Userprompt') // 1st: userprompt (project)
        .mockResolvedValueOnce('# Spec'), // 2nd: spec
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'), // architecture general
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'), // workflow general
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Framework')
        .mockResolvedValueOnce('# Tailwind'),
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(answers({ userpromptSource: 'project' }), 'my-app');
    const u = files.find((f) => f.filename === 'userprompt.md');
    expect(u!.content).toBe('# Project Userprompt');
  });

  it('reads workflow from project override', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi
        .fn()
        .mockResolvedValueOnce('# Project Workflow') // 1st: workflow (project)
        .mockResolvedValueOnce('# Spec'), // 2nd: spec
      getUserpromptContent: vi.fn().mockResolvedValueOnce('# Userprompt'), // userprompt (general)
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'), // architecture general
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Framework')
        .mockResolvedValueOnce('# Tailwind'),
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(answers({ workflowSource: 'project' }), 'my-app');
    const w = files.find((f) => f.filename === 'workflow.md');
    expect(w!.content).toBe('# Project Workflow');
  });

  it('handles multiple frameworks for fullstack', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi.fn().mockResolvedValueOnce('# Spec'), // spec only, architecture uses getArchitectureContent
      getUserpromptContent: vi.fn().mockResolvedValueOnce('# Userprompt'),
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'),
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'),
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Angular') // framework 1
        .mockResolvedValueOnce('# Only Node') // framework 2
        .mockResolvedValueOnce('# Tailwind'), // packages
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(
      answers({
        architecture: 'fullstack',
        frameworks: ['angular-guidelines', 'only-node'],
      }),
      'my-app',
    );

    const frameworkFiles = files.filter((f) =>
      ['angular-guidelines.md', 'only-node.md'].includes(f.filename),
    );
    expect(frameworkFiles).toHaveLength(2);
  });

  it('skips package-rules when nothing selected', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi.fn().mockResolvedValueOnce('# Spec'), // spec only
      getUserpromptContent: vi.fn().mockResolvedValueOnce('# Userprompt'),
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'),
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'),
      getTemplateContent: vi.fn().mockResolvedValueOnce('# Framework'),
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(answers({ packages: [] }), 'my-app');
    expect(files.map((f) => f.filename)).not.toContain('package-rules.md');
  });

  it('compiles package-rules with header and concatenation', async () => {
    const discovery = mockDiscovery({
      getProjectOverride: vi.fn().mockResolvedValueOnce('# Spec'), // spec only
      getUserpromptContent: vi.fn().mockResolvedValueOnce('# Userprompt'),
      getArchitectureContent: vi.fn().mockResolvedValueOnce('# Architecture'),
      getWorkflowContent: vi.fn().mockResolvedValueOnce('# Workflow'),
      getTemplateContent: vi
        .fn()
        .mockResolvedValueOnce('# Framework')
        .mockResolvedValueOnce('# Tailwind Content')
        .mockResolvedValueOnce('# TypeScript Content'),
    });

    const service = new CompilerService(discovery as any);
    const files = await service.compile(
      answers({ packages: ['tailwind', 'typescript'] }),
      'my-app',
    );

    const pkg = files.find((f) => f.filename === 'package-rules.md');
    expect(pkg).toBeDefined();
    expect(pkg!.content).toContain('# Code Style & Tools');
    expect(pkg!.content).toContain('# Tailwind Content');
    expect(pkg!.content).toContain('# TypeScript Content');
  });
});
