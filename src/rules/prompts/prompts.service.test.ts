import { describe, it, expect, vi, beforeEach } from 'vitest';

const CANCEL = Symbol('cancel');

vi.mock('@clack/prompts', () => ({
  intro: vi.fn(),
  outro: vi.fn(),
  note: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  select: vi.fn(),
  multiselect: vi.fn(),
  spinner: vi.fn(() => ({ start: vi.fn(), stop: vi.fn() })),
  isCancel: vi.fn((value: unknown) => value === CANCEL),
}));

import * as mockClackRaw from '@clack/prompts';
import { PromptService } from './prompts.service.js';

const mockClack = mockClackRaw as unknown as {
  intro: ReturnType<typeof vi.fn>;
  outro: ReturnType<typeof vi.fn>;
  note: ReturnType<typeof vi.fn>;
  cancel: ReturnType<typeof vi.fn>;
  confirm: ReturnType<typeof vi.fn>;
  select: ReturnType<typeof vi.fn>;
  multiselect: ReturnType<typeof vi.fn>;
  spinner: ReturnType<typeof vi.fn>;
  isCancel: ReturnType<typeof vi.fn>;
};

function makeDiscovery(overrides: Record<string, unknown> = {}) {
  return {
    getAvailableArchitectures: vi.fn().mockResolvedValue(['frontend', 'backend']),
    listFrameworks: vi.fn().mockResolvedValue(['angular-guidelines', 'only-node']),
    listPackages: vi.fn().mockResolvedValue(['tailwind', 'typescript']),
    hasProjectOverride: vi.fn().mockResolvedValue(false),
    getProjectOverride: vi.fn().mockResolvedValue(null),
    getTemplateContent: vi.fn().mockResolvedValue(null),
    getArchFile: vi.fn().mockResolvedValue(null),
    listUserprompts: vi.fn().mockResolvedValue([]),
    getUserpromptContent: vi.fn().mockResolvedValue(null),
    listArchitectures: vi.fn().mockResolvedValue([]),
    getArchitectureContent: vi.fn().mockResolvedValue(null),
    listWorkflows: vi.fn().mockResolvedValue([]),
    getWorkflowContent: vi.fn().mockResolvedValue(null),
    isFileNonEmpty: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  (mockClack.confirm as ReturnType<typeof vi.fn>).mockReset();
  (mockClack.select as ReturnType<typeof vi.fn>).mockReset();
  (mockClack.multiselect as ReturnType<typeof vi.fn>).mockReset();
  (mockClack.cancel as ReturnType<typeof vi.fn>).mockReset();
  // Restore isCancel implementation after reset
  (mockClack.isCancel as ReturnType<typeof vi.fn>).mockImplementation(
    (value: unknown) => value === CANCEL,
  );
});

describe('run', () => {
  it('completes full questionnaire and returns Answers', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi
        .fn()
        .mockResolvedValueOnce(true) // spec
        .mockResolvedValueOnce(false) // userprompt project
        .mockResolvedValueOnce(false) // architecture project
        .mockResolvedValueOnce(false), // workflow project
      listUserprompts: vi.fn().mockResolvedValue(['frontend-expert', 'react-specialist']),
      listArchitectures: vi.fn().mockResolvedValue(['base-architecture']),
      listWorkflows: vi.fn().mockResolvedValue(['base-workflow']),
      listFrameworks: vi.fn().mockResolvedValue(['angular-guidelines', 'only-node']),
      listPackages: vi.fn().mockResolvedValue(['tailwind', 'typescript']),
      getAvailableArchitectures: vi.fn().mockResolvedValue(['frontend', 'backend']),
    });

    (mockClack.select as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('frontend') // architecture type
      .mockResolvedValueOnce('frontend-expert') // userprompt
      .mockResolvedValueOnce('base-architecture') // architecture file
      .mockResolvedValueOnce('angular-guidelines') // framework
      .mockResolvedValueOnce('base-workflow'); // workflow
    (mockClack.multiselect as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(['tailwind', 'typescript']) // packages
      .mockResolvedValueOnce(['claude-code', 'cursor']); // agents

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers).not.toBe(null);
    expect(answers!.architecture).toBe('frontend');
    expect(answers!.hasUserprompt).toBe(true);
    expect(answers!.userpromptSource).toBe('general');
    expect(answers!.userpromptFile).toBe('frontend-expert');
    expect(answers!.hasArchitecture).toBe(true);
    expect(answers!.architectureSource).toBe('general');
    expect(answers!.architectureFile).toBe('base-architecture');
    expect(answers!.hasWorkflow).toBe(true);
    expect(answers!.workflowSource).toBe('general');
    expect(answers!.workflowFile).toBe('base-workflow');
    expect(answers!.frameworks).toEqual(['angular-guidelines']);
    expect(answers!.packages).toEqual(['tailwind', 'typescript']);
    expect(answers!.agents).toEqual([]);
  });

  it('returns null when user cancels at spec step', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi.fn().mockResolvedValue(false), // spec not found
    });

    (mockClack.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers).toBe(null);
    expect(mockClack.cancel).toHaveBeenCalled();
  });

  it('returns null when user cancels at architecture step', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi.fn().mockResolvedValue(true),
      getAvailableArchitectures: vi.fn().mockResolvedValue(['frontend']),
    });

    (mockClack.select as ReturnType<typeof vi.fn>).mockResolvedValueOnce(CANCEL);

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers).toBe(null);
  });

  it('shows fullstack when available and uses multiselect for frameworks', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi
        .fn()
        .mockResolvedValueOnce(true) // spec
        .mockResolvedValueOnce(false) // userprompt project
        .mockResolvedValueOnce(false) // architecture project
        .mockResolvedValueOnce(false), // workflow project
      listUserprompts: vi.fn().mockResolvedValue(['fullstack-dev']),
      listArchitectures: vi.fn().mockResolvedValue(['base-architecture']),
      listWorkflows: vi.fn().mockResolvedValue(['base-workflow']),
      getAvailableArchitectures: vi.fn().mockResolvedValue(['frontend', 'backend', 'fullstack']),
      listFrameworks: vi.fn().mockResolvedValue(['angular-guidelines', 'only-node']),
      listPackages: vi.fn().mockResolvedValue(['tailwind']),
    });

    (mockClack.select as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('fullstack') // architecture type
      .mockResolvedValueOnce('fullstack-dev') // userprompt
      .mockResolvedValueOnce('base-architecture') // architecture file
      .mockResolvedValueOnce('base-workflow'); // workflow
    (mockClack.multiselect as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(['angular-guidelines', 'only-node']) // frameworks
      .mockResolvedValueOnce(['tailwind']) // packages
      .mockResolvedValueOnce(['claude-code']); // agents

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers!.architecture).toBe('fullstack');
    expect(answers!.frameworks).toEqual(['angular-guidelines', 'only-node']);
  });

  it('warns and continues when userprompt not found', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi
        .fn()
        .mockResolvedValueOnce(true) // spec
        .mockResolvedValueOnce(false) // userprompt project
        .mockResolvedValueOnce(false) // architecture project
        .mockResolvedValueOnce(false), // workflow project
      listUserprompts: vi.fn().mockResolvedValue([]), // userprompt folder: empty
      listArchitectures: vi.fn().mockResolvedValue([]), // architectures folder: empty
      listWorkflows: vi.fn().mockResolvedValue([]), // workflows folder: empty
      listFrameworks: vi.fn().mockResolvedValue(['only-node']),
      listPackages: vi.fn().mockResolvedValue([]), // empty — goes to confirm branch
    });

    (mockClack.confirm as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(true) // userprompt: continue
      .mockResolvedValueOnce(true) // architecture: continue
      .mockResolvedValueOnce(true) // workflow: continue
      .mockResolvedValueOnce(true); // packages empty: continue
    (mockClack.select as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('backend')
      .mockResolvedValueOnce('only-node');
    (mockClack.multiselect as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['cursor']);

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers).not.toBe(null);
    expect(answers!.hasUserprompt).toBe(false);
    expect(answers!.userpromptSource).toBe(null);
    expect(answers!.userpromptFile).toBe(null);
    expect(answers!.hasArchitecture).toBe(false);
    expect(answers!.architectureSource).toBe(null);
    expect(answers!.architectureFile).toBe(null);
    expect(answers!.hasWorkflow).toBe(false);
    expect(answers!.workflowSource).toBe(null);
    expect(answers!.workflowFile).toBe(null);
  });

  it('returns empty arrays when directories are empty and user continues', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi
        .fn()
        .mockResolvedValueOnce(true) // spec
        .mockResolvedValueOnce(false) // userprompt project
        .mockResolvedValueOnce(false) // architecture project
        .mockResolvedValueOnce(false), // workflow project
      listUserprompts: vi.fn().mockResolvedValue(['frontend-expert']),
      listArchitectures: vi.fn().mockResolvedValue(['base-architecture']),
      listWorkflows: vi.fn().mockResolvedValue(['base-workflow']),
      listFrameworks: vi.fn().mockResolvedValue([]),
      listPackages: vi.fn().mockResolvedValue([]),
    });

    (mockClack.confirm as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(true) // empty frameworks: continue
      .mockResolvedValueOnce(true); // empty packages: continue
    (mockClack.select as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('frontend') // architecture type
      .mockResolvedValueOnce('frontend-expert') // userprompt
      .mockResolvedValueOnce('base-architecture') // architecture file
      .mockResolvedValueOnce('base-workflow'); // workflow
    (mockClack.multiselect as ReturnType<typeof vi.fn>).mockResolvedValueOnce(['claude-code']);

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers!.frameworks).toEqual([]);
    expect(answers!.packages).toEqual([]);
  });

  it('returns null when no architecture directories exist', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi.fn().mockResolvedValue(false),
      getAvailableArchitectures: vi.fn().mockResolvedValue([]),
    });

    (mockClack.confirm as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers).toBe(null);
    expect(mockClack.cancel).toHaveBeenCalled();
  });

  it('allows empty agent selection', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi
        .fn()
        .mockResolvedValueOnce(true) // spec
        .mockResolvedValueOnce(false) // userprompt project
        .mockResolvedValueOnce(false) // architecture project
        .mockResolvedValueOnce(false), // workflow project
      listUserprompts: vi.fn().mockResolvedValue(['backend-expert']),
      listArchitectures: vi.fn().mockResolvedValue(['base-architecture']),
      listWorkflows: vi.fn().mockResolvedValue(['base-workflow']),
      listFrameworks: vi.fn().mockResolvedValue(['only-node']),
      listPackages: vi.fn().mockResolvedValue(['typescript']),
    });

    (mockClack.select as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('backend')
      .mockResolvedValueOnce('backend-expert')
      .mockResolvedValueOnce('base-architecture')
      .mockResolvedValueOnce('only-node')
      .mockResolvedValueOnce('base-workflow');
    (mockClack.multiselect as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(['typescript']) // packages
      .mockResolvedValueOnce([]); // agents: none

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers!.agents).toEqual([]);
  });

  it('uses project overrides when available', async () => {
    const discovery = makeDiscovery({
      hasProjectOverride: vi
        .fn()
        .mockResolvedValueOnce(true) // spec: project
        .mockResolvedValueOnce(true) // userprompt: project
        .mockResolvedValueOnce(true) // architecture: project
        .mockResolvedValueOnce(true), // workflow: project
      listFrameworks: vi.fn().mockResolvedValue(['angular-guidelines']),
      listPackages: vi.fn().mockResolvedValue(['tailwind']),
    });

    (mockClack.select as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce('frontend')
      .mockResolvedValueOnce('angular-guidelines');
    (mockClack.multiselect as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(['tailwind'])
      .mockResolvedValueOnce(['claude-code']);

    const service = new PromptService(discovery as any);
    const answers = await service.run('my-app');

    expect(answers!.userpromptSource).toBe('project');
    expect(answers!.userpromptFile).toBe(null); // project override doesn't set filename
    expect(answers!.architectureSource).toBe('project');
    expect(answers!.architectureFile).toBe(null);
    expect(answers!.hasWorkflow).toBe(true);
    expect(answers!.workflowSource).toBe('project');
    expect(answers!.workflowFile).toBe(null);
  });
});
