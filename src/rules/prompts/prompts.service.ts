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

import pc from 'picocolors';
import { intro, outro, cancel, isCancel, confirm, select, multiselect } from './clack-adapter.js';
import type { Architecture } from '../config/config.types.js';
import { ARCH_LABELS } from '../config/config.types.js';
import { F } from '../compiler/compiler.types.js';
import type { DiscoveryService } from '../discovery/discovery.service.js';
import type { Answers } from './prompts.types.js';

const SKIP_OPTION = { value: '__skip__', label: '⊘ Skip (no rules of this type)' };

/** Type-narrowing helper: returns true if the value is a `@clack/prompts` cancel symbol. */
function isCancelSignal(value: unknown): value is symbol {
  return isCancel(value);
}

export class PromptService {
  constructor(
    private readonly discovery: DiscoveryService,
    private readonly ctxName: string,
  ) {}

  /**
   * Run the full questionnaire.
   *
   * @param projectName — `path.basename(process.cwd())`, used to check for
   *                      per-project overrides.
   * @returns `Answers` with all user choices, or `null` if the user cancelled.
   */
  async run(projectName: string): Promise<Answers | null> {
    intro(pc.cyan('agent-context-sync-cli'));

    if (!(await this.stepCheckSpec(projectName))) return null;

    const architecture = await this.stepArchitecture();
    if (architecture === null) return null;

    const userpromptResult = await this.stepUserprompt(architecture, projectName);
    if (userpromptResult === null) return null;
    const { hasUserprompt, userpromptSource, userpromptFile } = userpromptResult;

    const architectureResult = await this.stepArchitectureFile(architecture, projectName);
    if (architectureResult === null) return null;
    const { hasArchitecture, architectureSource, architectureFile } = architectureResult;

    const frameworksResult = await this.stepFrameworks(architecture, projectName);
    if (frameworksResult === null) return null;
    const { frameworks, hasProjectFramework } = frameworksResult;

    const packagesResult = await this.stepPackages(architecture, projectName);
    if (packagesResult === null) return null;
    const { packages, hasProjectPackages } = packagesResult;

    const workflowResult = await this.stepWorkflow(architecture, projectName);
    if (workflowResult === null) return null;
    const { hasWorkflow, workflowSource, workflowFile } = workflowResult;

    outro('✨ Configuration complete!');

    return {
      architecture,
      hasUserprompt,
      userpromptSource,
      userpromptFile,
      hasArchitecture,
      architectureSource,
      architectureFile,
      hasWorkflow,
      workflowSource,
      workflowFile,
      hasProjectFramework,
      frameworks,
      hasProjectPackages,
      packages,
      agents: [],
    };
  }

  // ---- Step 2: Project spec check ----

  /** Check if a per-project spec.md exists. If not, ask the user whether to continue. */
  private async stepCheckSpec(projectName: string): Promise<boolean> {
    const hasSpec = await this.discovery.hasProjectOverride(projectName, F.SPEC);

    if (hasSpec) return true;

    const proceed = await confirm({
      message:
        `📋 No project spec found.\n` +
        pc.dim(`   Create one at ${this.ctxName}/projects/${projectName}/rules/spec.md`) +
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
   * Options are dynamically built from which directories exist in `${this.ctxName}/rules/`.
   */
  private async stepArchitecture(): Promise<Architecture | null> {
    const available = await this.discovery.getAvailableArchitectures();

    if (available.length === 0) {
      cancel(
        `❌ No architecture directories found in ${this.ctxName}/rules/. At least one is required.`,
      );
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
   * Check for userprompt — project override (single file) → general folder (multiple files).
   * If neither has content, warn and ask whether to continue.
   */
  private async stepUserprompt(
    architecture: Architecture,
    projectName: string,
  ): Promise<{
    hasUserprompt: boolean;
    userpromptSource: 'project' | 'general' | null;
    userpromptFile: string | null;
  } | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, F.USERPROMPT);
    const available = await this.discovery.listUserprompts(architecture);

    if (hasProject) {
      if (available.length > 0) {
        const useProject = await confirm({
          message:
            '📄 Found userprompt.md in project overrides.\n' +
            pc.dim('   Use it or pick from general templates?'),
        });
        if (isCancelSignal(useProject)) {
          cancel('🚫 Cancelled by user.');
          return null;
        }
        if (!useProject) {
          // Fall through to general selection below
        } else {
          return { hasUserprompt: true, userpromptSource: 'project', userpromptFile: null };
        }
      } else {
        return { hasUserprompt: true, userpromptSource: 'project', userpromptFile: null };
      }
    }

    if (available.length > 0) {
      const options = [...available.map((name) => ({ value: name, label: name })), SKIP_OPTION];

      const choice = await select({
        message: '🧠 Select an AI persona:',
        options,
      });

      if (isCancelSignal(choice)) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      if (choice === '__skip__') {
        return { hasUserprompt: false, userpromptSource: null, userpromptFile: null };
      }

      return { hasUserprompt: true, userpromptSource: 'general', userpromptFile: choice };
    }

    const proceed = await confirm({
      message:
        `🧠 No userprompt files found.\n` +
        pc.yellow(
          '   It is highly recommended to define the AI persona.\n' +
            `   Add .md files to ${this.ctxName}/rules/${architecture}/userprompts/`,
        ) +
        `\n   Continue without it?`,
    });

    if (isCancelSignal(proceed) || !proceed) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return { hasUserprompt: false, userpromptSource: null, userpromptFile: null };
  }

  // ---- Step 3c: Architecture file check ----

  /**
   * Check for architecture.md — project override (single file) → general folder (multiple files).
   * If neither has content, warn and ask whether to continue.
   */
  private async stepArchitectureFile(
    architecture: Architecture,
    projectName: string,
  ): Promise<{
    hasArchitecture: boolean;
    architectureSource: 'project' | 'general' | null;
    architectureFile: string | null;
  } | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, F.ARCHITECTURE);
    const available = await this.discovery.listArchitectures(architecture);

    if (hasProject) {
      if (available.length > 0) {
        const useProject = await confirm({
          message:
            '📄 Found architecture.md in project overrides.\n' +
            pc.dim('   Use it or pick from general templates?'),
        });
        if (isCancelSignal(useProject)) {
          cancel('🚫 Cancelled by user.');
          return null;
        }
        if (!useProject) {
          // Fall through to general selection
        } else {
          return { hasArchitecture: true, architectureSource: 'project', architectureFile: null };
        }
      } else {
        return { hasArchitecture: true, architectureSource: 'project', architectureFile: null };
      }
    }

    if (available.length > 0) {
      const options = [...available.map((name) => ({ value: name, label: name })), SKIP_OPTION];

      const choice = await select({
        message: '🏛️  Select architecture guidelines:',
        options,
      });

      if (isCancelSignal(choice)) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      if (choice === '__skip__') {
        return { hasArchitecture: false, architectureSource: null, architectureFile: null };
      }

      return { hasArchitecture: true, architectureSource: 'general', architectureFile: choice };
    }

    // Priority 3: nothing found — warn and offer to skip
    const proceed = await confirm({
      message:
        `🏛️  No architecture files found.\n` +
        pc.yellow(
          '   It is recommended to define architecture guidelines.\n' +
            `   Add .md files to ${this.ctxName}/rules/${architecture}/architectures/`,
        ) +
        `\n   Continue without it?`,
    });

    if (isCancelSignal(proceed) || !proceed) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return { hasArchitecture: false, architectureSource: null, architectureFile: null };
  }

  // ---- Step 4: Framework selection ----

  /**
   * Framework selection. Project override (single framework.md file) takes priority.
   * Otherwise frontend/backend use radio (single choice),
   * fullstack uses multiselect (multiple frameworks from the fullstack directory only).
   */
  private async stepFrameworks(
    architecture: Architecture,
    projectName: string,
  ): Promise<{ frameworks: string[]; hasProjectFramework: boolean } | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, F.FRAMEWORK);
    const available = await this.discovery.listFrameworks(architecture);

    if (hasProject) {
      if (available.length > 0) {
        const useProject = await confirm({
          message:
            '📄 Found framework.md in project overrides.\n' +
            pc.dim('   Use it or pick from general templates?'),
        });
        if (isCancelSignal(useProject)) {
          cancel('🚫 Cancelled by user.');
          return null;
        }
        if (!useProject) {
          // Fall through to general selection
        } else {
          return { frameworks: [], hasProjectFramework: true };
        }
      } else {
        return { frameworks: [], hasProjectFramework: true };
      }
    }

    if (available.length === 0) {
      const proceed = await confirm({
        message:
          `📦 No framework rules found.\n` +
          pc.dim(`   Add .md files to ${this.ctxName}/rules/${architecture}/frameworks/`) +
          `\n   Continue without framework rules?`,
      });

      if (isCancelSignal(proceed) || !proceed) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      return { frameworks: [], hasProjectFramework: false };
    }

    if (architecture === 'fullstack') {
      const multiOptions = available.map((name) => ({ value: name, label: name }));
      const choices = await multiselect({
        message: '📦 Select frameworks:',
        options: multiOptions,
        required: false,
      });

      if (isCancelSignal(choices)) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      return { frameworks: choices, hasProjectFramework: false };
    }

    const options = [...available.map((name) => ({ value: name, label: name })), SKIP_OPTION];
    const choice = await select({
      message: '📦 Select a framework:',
      options,
    });

    if (isCancelSignal(choice)) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    if (choice === '__skip__') {
      return { frameworks: [], hasProjectFramework: false };
    }

    return { frameworks: [choice], hasProjectFramework: false };
  }

  // ---- Step 5: Package selection ----

  /** Package/tool selection. Project override (single file) → general multiselect. */
  private async stepPackages(
    architecture: Architecture,
    projectName: string,
  ): Promise<{ packages: string[]; hasProjectPackages: boolean } | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, F.PACKAGE_RULES);
    const available = await this.discovery.listPackages(architecture);

    if (hasProject) {
      if (available.length > 0) {
        const useProject = await confirm({
          message:
            '📄 Found package-rules.md in project overrides.\n' +
            pc.dim('   Use it or pick from general templates?'),
        });
        if (isCancelSignal(useProject)) {
          cancel('🚫 Cancelled by user.');
          return null;
        }
        if (!useProject) {
          // Fall through to general selection
        } else {
          return { packages: [], hasProjectPackages: true };
        }
      } else {
        return { packages: [], hasProjectPackages: true };
      }
    }

    if (available.length === 0) {
      const proceed = await confirm({
        message:
          `📚 No package rules found.\n` +
          pc.dim(`   Add .md files to ${this.ctxName}/rules/${architecture}/packages/`) +
          `\n   Continue without package rules?`,
      });

      if (isCancelSignal(proceed) || !proceed) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      return { packages: [], hasProjectPackages: false };
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

    return { packages: choices, hasProjectPackages: false };
  }

  // ---- Step 6: Workflow check ----

  /**
   * Check for workflow — project override (single file) → general folder (multiple files).
   * If neither has content, warn and ask whether to continue.
   */
  private async stepWorkflow(
    architecture: Architecture,
    projectName: string,
  ): Promise<{
    hasWorkflow: boolean;
    workflowSource: 'project' | 'general' | null;
    workflowFile: string | null;
  } | null> {
    const hasProject = await this.discovery.hasProjectOverride(projectName, F.WORKFLOW);
    const available = await this.discovery.listWorkflows(architecture);

    if (hasProject) {
      if (available.length > 0) {
        const useProject = await confirm({
          message:
            '📄 Found workflow.md in project overrides.\n' +
            pc.dim('   Use it or pick from general templates?'),
        });
        if (isCancelSignal(useProject)) {
          cancel('🚫 Cancelled by user.');
          return null;
        }
        if (!useProject) {
          // Fall through to general selection
        } else {
          return { hasWorkflow: true, workflowSource: 'project', workflowFile: null };
        }
      } else {
        return { hasWorkflow: true, workflowSource: 'project', workflowFile: null };
      }
    }

    if (available.length > 0) {
      const options = [...available.map((name) => ({ value: name, label: name })), SKIP_OPTION];

      const choice = await select({
        message: '⚙️  Select a workflow protocol:',
        options,
      });

      if (isCancelSignal(choice)) {
        cancel('🚫 Cancelled by user.');
        return null;
      }

      if (choice === '__skip__') {
        return { hasWorkflow: false, workflowSource: null, workflowFile: null };
      }

      return { hasWorkflow: true, workflowSource: 'general', workflowFile: choice };
    }

    // Priority 3: nothing found — warn and offer to skip
    const proceed = await confirm({
      message:
        `⚙️  No workflow files found.\n` +
        pc.yellow(
          '   It is recommended to define a workflow protocol.\n' +
            `   Add .md files to ${this.ctxName}/rules/${architecture}/workflows/`,
        ) +
        `\n   Continue without it?`,
    });

    if (isCancelSignal(proceed) || !proceed) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return { hasWorkflow: false, workflowSource: null, workflowFile: null };
  }
}
