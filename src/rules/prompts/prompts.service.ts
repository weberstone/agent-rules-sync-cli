/**
 * Interactive questionnaire — steps 2 through 7 of the PRD flow.
 *
 * Uses `@clack/prompts` (via the typed adapter) for all user interaction.
 * Each step is a private method that returns its result or `null` on cancel.
 * The public `run()` method orchestrates the sequence and propagates
 * cancellation: any step returning `null` causes the entire flow to abort.
 *
 * Dependency: `DiscoveryService` is injected to scan available options
 * (architectures, frameworks, packages) and detect project overrides.
 */

import { intro, outro, cancel, isCancel, confirm, select, multiselect } from './clack-adapter.js';
import type { Architecture } from '../config/config.types.js';
import type { DiscoveryService } from '../discovery/discovery.service.js';
import type { Answers } from './prompts.types.js';
const ARCH_LABELS: Record<Architecture, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
};

const C = {
  dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
};

/** Type-narrowing helper: returns true if the value is a `@clack/prompts` cancel symbol. */
function isCancelSignal(value: unknown): value is symbol {
  return isCancel(value);
}

export class PromptService {
  constructor(private readonly discovery: DiscoveryService) {}

  /**
   * Run the full questionnaire.
   *
   * @param projectName — `path.basename(process.cwd())`, used to check for
   *                      per-project overrides.
   * @returns `Answers` with all user choices, or `null` if the user cancelled.
   */
  async run(projectName: string): Promise<Answers | null> {
    intro(C.cyan('agent-context-sync-cli'));

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

    outro('✨ Configuration complete!');

    return {
      architecture,
      hasUserprompt,
      userpromptSource,
      frameworks,
      packages,
      workflowSource,
      agents: [],
    };
  }

  // ---- Step 2: Project spec check ----

  /** Check if a per-project spec.md exists. If not, ask the user whether to continue. */
  private async stepCheckSpec(projectName: string): Promise<boolean> {
    const hasSpec = await this.discovery.hasProjectOverride(projectName, 'spec.md');

    if (hasSpec) return true;

    const proceed = await confirm({
      message:
        `📋 No project spec found.\n` +
        C.dim(`   Create one at context/projects/${projectName}/rules/spec.md`) +
        `\n   Continue without it?`,
    });

    if (isCancelSignal(proceed) || !proceed) {
      cancel('🚫 Cancelled by user.');
      return false;
    }

    return true;
  }

  // ---- Step 3: Architecture selection ----

  /**
   * Ask the user to pick an architecture type.
   * Options are dynamically built from which directories exist in `context/rules/`.
   */
  private async stepArchitecture(): Promise<Architecture | null> {
    const available = await this.discovery.getAvailableArchitectures();

    if (available.length === 0) {
      cancel('❌ No architecture directories found in context/rules/. At least one is required.');
      return null;
    }

    const options = available.map((arch) => ({
      value: arch,
      label: ARCH_LABELS[arch],
    }));

    const choice = await select({
      message: '🏗️  Select project architecture type:',
      options,
    });

    if (isCancelSignal(choice)) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return choice as Architecture;
  }

  // ---- Step 3b: Userprompt check ----

  /**
   * Check for userprompt.md (project override → general template).
   * If not found anywhere, warn and ask whether to continue.
   */
  private async stepUserprompt(
    architecture: Architecture,
    projectName: string,
  ): Promise<{
    hasUserprompt: boolean;
    userpromptSource: 'project' | 'general' | null;
  } | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, 'userprompt.md');

    if (hasProject) {
      return { hasUserprompt: true, userpromptSource: 'project' };
    }

    const generalContent = await this.discovery.getArchFile(architecture, 'userprompt.md');

    if (generalContent !== null) {
      return { hasUserprompt: true, userpromptSource: 'general' };
    }

    const proceed = await confirm({
      message:
        `🧠 Userprompt file not found.\n` +
        C.yellow(
          '   It is highly recommended to define the AI persona.\n' +
            `   Create context/rules/${architecture}/userprompt.md`,
        ) +
        `\n   Continue without it?`,
    });

    if (isCancelSignal(proceed) || !proceed) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return { hasUserprompt: false, userpromptSource: null };
  }

  // ---- Step 4: Framework selection ----

  /**
   * Framework selection. Frontend/Backend use radio (single choice),
   * Fullstack uses multiselect (multiple frameworks from the fullstack directory only).
   */
  private async stepFrameworks(architecture: Architecture): Promise<string[] | null> {
    const available = await this.discovery.listFrameworks(architecture);

    if (available.length === 0) {
      const proceed = await confirm({
        message:
          `📦 No framework rules found.\n` +
          C.dim(`   Add .md files to context/rules/${architecture}/frameworks/`) +
          `\n   Continue without framework rules?`,
      });

      if (isCancelSignal(proceed) || !proceed) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      return [];
    }

    const options = available.map((name) => ({ value: name, label: name }));

    if (architecture === 'fullstack') {
      const choices = await multiselect({
        message: '📦 Select frameworks (fullstack — multiple allowed):',
        options,
      });

      if (isCancelSignal(choices)) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      return choices;
    }

    const choice = await select({
      message: '📦 Select a framework:',
      options,
    });

    if (isCancelSignal(choice)) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return [choice];
  }

  // ---- Step 5: Package selection ----

  /** Package/tool multiselect. Nothing selected is valid (returns []). */
  private async stepPackages(architecture: Architecture): Promise<string[] | null> {
    const available = await this.discovery.listPackages(architecture);

    if (available.length === 0) {
      const proceed = await confirm({
        message:
          `📚 No package rules found.\n` +
          C.dim(`   Add .md files to context/rules/${architecture}/packages/`) +
          `\n   Continue without package rules?`,
      });

      if (isCancelSignal(proceed) || !proceed) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      return [];
    }

    const options = available.map((name) => ({ value: name, label: name }));

    const choices = await multiselect({
      message: '📚 Select packages and tools:',
      options,
      required: false,
    });

    if (isCancelSignal(choices)) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return choices;
  }

  // ---- Step 6: Workflow check ----

  /**
   * Check for workflow.md. Project override takes precedence over general.
   * If neither exists, warn and ask whether to continue.
   */
  private async stepWorkflow(
    architecture: Architecture,
    projectName: string,
  ): Promise<'project' | 'general' | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, 'workflow.md');

    if (hasProject) return 'project';

    const generalContent = await this.discovery.getArchFile(architecture, 'workflow.md');

    if (generalContent !== null) return 'general';

    const proceed = await confirm({
      message:
        `⚙️  Workflow file not found.\n` +
        C.dim(`   Create context/rules/${architecture}/workflow.md`) +
        `\n   Continue without workflow rules?`,
    });

    if (isCancelSignal(proceed) || !proceed) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return null;
  }
}
