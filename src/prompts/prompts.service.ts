import {
  intro,
  outro,
  cancel,
  isCancel,
  confirm,
  select,
  multiselect,
} from './clack-adapter.js';
import type { Architecture } from '../config/config.types.js';
import type { DiscoveryService } from '../discovery/discovery.service.js';
import type { Answers } from './prompts.types.js';
import { AVAILABLE_AGENTS } from './prompts.types.js';

const ARCH_LABELS: Record<Architecture, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
};

function isCancelSignal(value: unknown): value is symbol {
  return isCancel(value);
}

export class PromptService {
  constructor(private readonly discovery: DiscoveryService) {}

  async run(projectName: string): Promise<Answers | null> {
    intro('agent-rules-sync-cli');

    if (!(await this.stepCheckSpec(projectName))) return null;

    const architecture = await this.stepArchitecture();
    if (architecture === null) return null;

    const userpromptResult = await this.stepUserprompt(architecture, projectName);
    if (userpromptResult === null) return null;
    const { hasUserprompt, userpromptSource } = userpromptResult;

    const frameworks = await this.stepFrameworks(architecture);
    if (frameworks === null) return null;

    const packages = await this.stepPackages(architecture);
    if (packages === null) return null;

    const workflowSource = await this.stepWorkflow(architecture, projectName);
    if (workflowSource === null) return null;

    const agents = await this.stepAgents();
    if (agents === null) return null;

    outro('Configuration complete.');

    return {
      architecture,
      hasUserprompt,
      userpromptSource,
      frameworks,
      packages,
      workflowSource,
      agents,
    };
  }

  // ---- Step 2 ----

  private async stepCheckSpec(projectName: string): Promise<boolean> {
    const hasSpec = await this.discovery.hasProjectOverride(
      projectName,
      'spec.md',
    );

    if (hasSpec) return true;

    const proceed = await confirm(
      `No project spec found. You can create one at rules/projects/${projectName}/spec.md. ` +
        'Continue without project spec?',
    );

    if (isCancelSignal(proceed) || !proceed) {
      cancel('Operation cancelled by user.');
      return false;
    }

    return true;
  }

  // ---- Step 3 ----

  private async stepArchitecture(): Promise<Architecture | null> {
    const available = await this.discovery.getAvailableArchitectures();

    if (available.length === 0) {
      cancel(
        'No architecture directories found in rules/. At least one is required.',
      );
      return null;
    }

    const options = available.map((arch) => ({
      value: arch,
      label: ARCH_LABELS[arch],
    }));

    const choice = await select(
      'Select project architecture type:',
      options,
    );

    if (isCancelSignal(choice)) {
      cancel('Operation cancelled by user.');
      return null;
    }

    return choice as Architecture;
  }

  // ---- Step 3b ----

  private async stepUserprompt(
    architecture: Architecture,
    projectName: string,
  ): Promise<{
    hasUserprompt: boolean;
    userpromptSource: 'project' | 'general' | null;
  } | null> {
    const hasProject = await this.discovery.hasProjectOverride(
      projectName,
      'userprompt.md',
    );

    if (hasProject) {
      return { hasUserprompt: true, userpromptSource: 'project' };
    }

    const generalPath = `${architecture}/userprompt.md`;
    const hasGeneral = await this.discovery.isFileNonEmpty(generalPath);

    if (hasGeneral) {
      return { hasUserprompt: true, userpromptSource: 'general' };
    }

    const proceed = await confirm(
      'Userprompt file not found. It is highly recommended to create one ' +
        'to define the AI persona. Continue without it?',
    );

    if (isCancelSignal(proceed) || !proceed) {
      cancel('Operation cancelled by user.');
      return null;
    }

    return { hasUserprompt: false, userpromptSource: null };
  }

  // ---- Step 4 ----

  private async stepFrameworks(
    architecture: Architecture,
  ): Promise<string[] | null> {
    const available = await this.discovery.listFrameworks(architecture);

    if (available.length === 0) {
      const proceed = await confirm(
        `No framework rules found in rules/${architecture}/frameworks/. ` +
          'Continue without framework rules?',
      );

      if (isCancelSignal(proceed) || !proceed) {
        cancel('Operation cancelled by user.');
        return null;
      }

      return [];
    }

    const options = available.map((name) => ({ value: name, label: name }));

    if (architecture === 'fullstack') {
      const choices = await multiselect(
        'Select frameworks (fullstack — multiple allowed):',
        options,
      );

      if (isCancelSignal(choices)) {
        cancel('Operation cancelled by user.');
        return null;
      }

      return choices;
    }

    const choice = await select('Select a framework:', options);

    if (isCancelSignal(choice)) {
      cancel('Operation cancelled by user.');
      return null;
    }

    return [choice];
  }

  // ---- Step 5 ----

  private async stepPackages(
    architecture: Architecture,
  ): Promise<string[] | null> {
    const available = await this.discovery.listPackages(architecture);

    if (available.length === 0) {
      const proceed = await confirm(
        `No package rules found in rules/${architecture}/packages/. ` +
          'Continue without package rules?',
      );

      if (isCancelSignal(proceed) || !proceed) {
        cancel('Operation cancelled by user.');
        return null;
      }

      return [];
    }

    const options = available.map((name) => ({ value: name, label: name }));

    const choices = await multiselect(
      'Select packages and tools:',
      options,
      false,
    );

    if (isCancelSignal(choices)) {
      cancel('Operation cancelled by user.');
      return null;
    }

    return choices;
  }

  // ---- Step 6 ----

  private async stepWorkflow(
    architecture: Architecture,
    projectName: string,
  ): Promise<'project' | 'general' | null> {
    const hasProject = await this.discovery.hasProjectOverride(
      projectName,
      'workflow.md',
    );

    if (hasProject) return 'project';

    const generalPath = `${architecture}/workflow.md`;
    const hasGeneral = await this.discovery.isFileNonEmpty(generalPath);

    if (hasGeneral) return 'general';

    const proceed = await confirm(
      'Workflow file not found. Continue without workflow rules?',
    );

    if (isCancelSignal(proceed) || !proceed) {
      cancel('Operation cancelled by user.');
      return null;
    }

    return null;
  }

  // ---- Step 7 ----

  private async stepAgents(): Promise<string[] | null> {
    const options = AVAILABLE_AGENTS.map((a) => ({
      value: a.value,
      label: a.label,
    }));

    const choices = await multiselect(
      'Select AI agents to generate config files for:',
      options,
      false,
    );

    if (isCancelSignal(choices)) {
      cancel('Operation cancelled by user.');
      return null;
    }

    return choices;
  }
}