/**
 * Orchestrator — ties all services together into the complete CLI flow.
 *
 * Lifecycle:
 *   preflight → config check → questionnaire (or skip) → compile →
 *   write .agents/rules/ → generate & write agent files (with conflict
 *   resolution) → save config → finale (ASCII Cthulhu + boxes)
 *
 * All services are injected via constructor (dependency injection),
 * making the orchestrator testable with mock services.
 */

import { select, confirm, isCancel, cancel, outro, spinner } from '../prompts/clack-adapter.js';
import { ConfigService } from '../config/config.service.js';
import type { Config } from '../config/config.types.js';
import { DiscoveryService } from '../discovery/discovery.service.js';
import { PromptService } from '../prompts/prompts.service.js';
import type { Answers } from '../prompts/prompts.types.js';
import { CompilerService } from '../compiler/compiler.service.js';
import type { CompiledFile } from '../compiler/compiler.types.js';
import { generatorRegistry } from '../generators/generator.service.js';
import type { GeneratorContext } from '../generators/generator.types.js';
import { OutputService } from '../output/output.service.js';
import { logError } from '../utils/log.js';
import fs from 'node:fs/promises';

/** Known rule file names — used to separate framework files from standard ones. */
const KNOWN_RULE_FILES = new Set([
  'userprompt.md',
  'workflow.md',
  'spec.md',
  'architecture.md',
  'package-rules.md',
]);

export class OrchestratorService {
  constructor(
    private readonly configService: ConfigService,
    private readonly discovery: DiscoveryService,
    private readonly promptService: PromptService,
    private readonly compiler: CompilerService,
    private readonly output: OutputService,
    private readonly projectName: string,
    private readonly rulesDir: string,
    private readonly targetDir: string,
  ) {}

  /** Run the full CLI lifecycle. Returns when done or on unrecoverable error. */
  async run(): Promise<void> {
    if (!(await this.preflightRulesDir())) return;
    if (!(await this.preflightWriteAccess())) return;

    const answers = await this.resolveAnswers();
    if (answers === null) return;

    const s = spinner();
    s.start('Compiling rules from templates...');
    const ruleFiles = await this.compiler.compile(answers, this.projectName);

    await this.output.writeRulesDir(ruleFiles);
    s.stop('Rules compiled and saved to .agents/rules/');

    // Agent files — interactive, spinner off
    const ctx = buildGeneratorContext(ruleFiles);
    const writtenFiles: string[] = [];
    for (const agentKey of answers.agents) {
      const generator = generatorRegistry.get(agentKey);
      if (!generator) continue;

      const agentFiles = generator(ctx);
      for (const file of agentFiles) {
        const mode = await this.resolveWriteMode(file.filename);
        if (mode === 'skip') continue;
        await this.output.writeAgentFile(file.filename, file.content, mode);
        writtenFiles.push(file.filename);
      }
    }

    await this.configService.write(buildConfig(answers, this.projectName));

    this.showFinale(ruleFiles, writtenFiles);
    this.showGitignoreWarning();
  }

  // ---- Pre-flight checks ----

  /** Verify the template directory is accessible. Fail fast if not. */
  private async preflightRulesDir(): Promise<boolean> {
    try {
      await fs.access(this.rulesDir, fs.constants.R_OK);
      return true;
    } catch (err) {
      logError(
        `Rules directory not accessible: ${this.rulesDir}\n` +
          `${(err as Error).message}\n` +
          'Make sure the agent-rules-sync-cli package includes the rules/ directory.',
      );
      return false;
    }
  }

  /** Verify the target directory is writable. Fail fast if not. */
  private async preflightWriteAccess(): Promise<boolean> {
    try {
      await fs.access(this.targetDir, fs.constants.W_OK);
      return true;
    } catch (err) {
      logError(
        `Cannot write to target directory: ${this.targetDir}\n` +
          `${(err as Error).message}\n` +
          'Check directory permissions and try again.',
      );
      return false;
    }
  }

  // ---- Config / Answers resolution ----

  /**
   * Determine the answers: from existing config (if found and user agrees),
   * or from a fresh questionnaire. Returns null if the user cancels.
   */
  private async resolveAnswers(): Promise<Answers | null> {
    const existingConfig = await this.configService.read();

    if (existingConfig === null) {
      if (!process.stdin.isTTY) {
        logError(
          'No configuration file found and no interactive terminal available. ' +
            'Run the script in a terminal for first-time setup, or create an ai-rules-config.json manually.',
        );
        return null;
      }
      return this.promptService.run(this.projectName);
    }

    // Non-interactive mode (CI/CD): auto-use existing config
    if (!process.stdin.isTTY) {
      return this.configToAnswers(existingConfig);
    }

    const useExisting = await confirm(
      'Existing configuration file found. Use it to regenerate rules, or start a fresh questionnaire?',
    );

    if (isCancel(useExisting)) {
      cancel('Operation cancelled by user.');
      return null;
    }

    if (useExisting) {
      return this.configToAnswers(existingConfig);
    }

    return this.promptService.run(this.projectName);
  }

  /**
   * Reconstruct `Answers` from a saved `Config` by re-deriving
   * `userpromptSource` and `workflowSource` from the file system.
   */
  private async configToAnswers(config: Config): Promise<Answers> {
    const projectName = config.projectName;
    const arch = config.architecture;

    const hasProjectUserprompt = await this.discovery.hasProjectOverride(
      projectName,
      'userprompt.md',
    );

    const hasProjectWorkflow = await this.discovery.hasProjectOverride(projectName, 'workflow.md');
    const hasGeneralWorkflow = await this.discovery.isFileNonEmpty(
      `${this.rulesDir}/${arch}/workflow.md`,
    );

    let userpromptSource: 'project' | 'general' | null = null;
    if (config.hasUserprompt) {
      userpromptSource = hasProjectUserprompt ? 'project' : 'general';
    }

    let workflowSource: 'project' | 'general' | null = null;
    if (hasProjectWorkflow) {
      workflowSource = 'project';
    } else if (hasGeneralWorkflow) {
      workflowSource = 'general';
    }

    return {
      architecture: arch,
      hasUserprompt: config.hasUserprompt,
      userpromptSource,
      frameworks: config.frameworks,
      packages: config.packages,
      workflowSource,
      agents: config.agents,
    };
  }

  // ---- Agent file conflict resolution ----

  /**
   * Determine how to write an agent file:
   * - File doesn't exist → `create`
   * - File exists with SYNC markers → `update` (silent, safe)
   * - File exists without markers → ask the user
   */
  private async resolveWriteMode(
    filename: string,
  ): Promise<'create' | 'overwrite' | 'update' | 'skip'> {
    const exists = await this.output.fileExists(filename);
    if (!exists) return 'create';

    const hasMarkers = await this.output.hasSyncMarkersInFile(filename);
    if (hasMarkers) return 'update';

    const choice = await select(`File "${filename}" already exists. What should be done?`, [
      {
        value: 'update',
        label: 'Update rules section — Add AGENT-CONTEXT-SYNC-CLI block (Recommended)',
      },
      {
        value: 'overwrite',
        label: 'Overwrite — Replace entire file with generated rules',
      },
      { value: 'skip', label: 'Skip — Do not touch this file' },
    ]);

    if (isCancel(choice)) return 'skip';

    return choice as 'update' | 'overwrite' | 'skip';
  }

  // ---- Finale rendering ----

  /** Render a horizontal rule in the given color. */
  private hr(color: (s: string) => string): string {
    return color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  /** Render a padded line in the given color. */
  private padLine(raw: string, color: (s: string) => string): string {
    return '  ' + color(raw);
  }

  /** Show the Cthulhu ASCII art, success box, and file listing. */
  private showFinale(ruleFiles: CompiledFile[], writtenFiles: string[]): void {
    const pc = this.colors;

    const art = [
      pc.boldMagenta('   ▄████▄     '),
      pc.boldMagenta('    ▄████████▄   '),
      pc.boldMagenta('   ███◣▛██▜◢███  '),
      pc.boldMagenta('   ███▒████▒███  '),
      pc.boldMagenta('    ▀████████▀   '),
      pc.boldMagenta('  ▄██▒▒██▒▒██▄  '),
      pc.boldMagenta(' ██▀╲╱╲╱╲╱╲╱▀██  '),
      pc.boldMagenta(' ▀  ╲  ╲╱  ╱  ▀ '),
    ];

    const info = [
      ' ' + pc.boldGreen('✨ Rules synchronized!'),
      '',
      ' ' + pc.dim('📁 .agents/rules/ created'),
      ' ' + pc.dim('⚙️  Agent config files generated'),
      ' ' + pc.dim('💾 Configuration saved'),
      '',
      ' ' + pc.dim('📂 ' + this.projectName),
      '',
    ];

    outro(art.map((line, i) => line + (info[i] ?? '')).join('\n'));

    const files: string[] = ruleFiles.map((f) => f.filename);
    if (writtenFiles.length > 0) files.push(...writtenFiles);

    const lines: string[] = [
      this.hr(pc.boldGreen),
      this.padLine('  Created files:', pc.boldGreen),
      '',
      ...files.map((f) => this.padLine('      • ' + f, pc.cyan)),
      this.hr(pc.boldGreen),
    ];

    outro(lines.join('\n'));
  }

  /** Show the .gitignore recommendation box. */
  private async showGitignoreWarning(): Promise<void> {
    const pc = this.colors;
    const inGitignore = await this.output.isInGitignore('ai-rules-config.json');
    if (!inGitignore) {
      const lines: string[] = [
        this.hr(pc.boldYellow),
        this.padLine('  ⚠️  IMPORTANT', pc.boldYellow),
        '',
        this.padLine('  Add "ai-rules-config.json"', pc.yellow),
        this.padLine('  to your .gitignore file', pc.yellow),
        this.padLine('  to keep it private.', pc.yellow),
        this.hr(pc.boldYellow),
      ];

      outro(lines.join('\n'));
    }
  }

  // ANSI color helpers — inline to avoid `this` binding issues after minification.
  private colors = {
    dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
    cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
    green: (s: string) => `\x1b[32m${s}\x1b[39m`,
    magenta: (s: string) => `\x1b[35m${s}\x1b[39m`,
    yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
    boldGreen: (s: string) => `\x1b[1m\x1b[32m${s}\x1b[39m\x1b[22m`,
    boldMagenta: (s: string) => `\x1b[1m\x1b[35m${s}\x1b[39m\x1b[22m`,
    boldYellow: (s: string) => `\x1b[1m\x1b[33m${s}\x1b[39m\x1b[22m`,
  };
}

// ---- Free functions (not stateful, shared across the orchestrator) ----

/** Build GeneratorContext from the actual CompiledFile[] output — single source of truth. */
function buildGeneratorContext(ruleFiles: CompiledFile[]): GeneratorContext {
  const filenames = new Set(ruleFiles.map((f) => f.filename));

  return {
    hasUserprompt: filenames.has('userprompt.md'),
    hasWorkflow: filenames.has('workflow.md'),
    hasSpec: filenames.has('spec.md'),
    hasArchitecture: filenames.has('architecture.md'),
    frameworkFiles: ruleFiles
      .filter((f) => !KNOWN_RULE_FILES.has(f.filename))
      .map((f) => f.filename),
    hasPackageRules: filenames.has('package-rules.md'),
  };
}

/** Build a Config object from Answers — ready for persistence. */
function buildConfig(answers: Answers, projectName: string): Config {
  return {
    version: 1,
    projectName,
    architecture: answers.architecture,
    frameworks: answers.frameworks,
    packages: answers.packages,
    agents: answers.agents,
    hasUserprompt: answers.hasUserprompt,
    lastSync: new Date().toISOString(),
  };
}
