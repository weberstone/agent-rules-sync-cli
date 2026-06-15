/**
 * Orchestrator — ties all services together into the complete CLI flow.
 *
 * Lifecycle (Phase 2):
 *   preflight → config → agent conflict check →
 *   "Sync rules?" → Rules flow (questionnaire → compile → write) →
 *   "Sync skills?" → Skills flow (questionnaire → compile → copy) →
 *   Agent selection → Generate agent files (RULES + SKILLS) →
 *   Save config → Finale
 *
 * All services are injected via constructor (dependency injection).
 */

import {
  select,
  confirm,
  isCancel,
  cancel,
  outro,
  spinner,
  intro,
  multiselect,
} from '../rules/prompts/clack-adapter.js';
import { ConfigService } from '../rules/config/config.service.js';
import type { Config } from '../rules/config/config.types.js';
import { DiscoveryService } from '../rules/discovery/discovery.service.js';
import { PromptService } from '../rules/prompts/prompts.service.js';
import type { Answers } from '../rules/prompts/prompts.types.js';
import { AVAILABLE_AGENTS } from '../rules/prompts/prompts.types.js';
import { CompilerService } from '../rules/compiler/compiler.service.js';
import type { CompiledFile } from '../rules/compiler/compiler.types.js';
import { generatorRegistry } from '../rules/generators/generator.service.js';
import type { GeneratorContext } from '../rules/generators/generator.types.js';
import { OutputService } from '../output/output.service.js';

import { SkillsDiscoveryService } from '../skills/discovery/skills-discovery.service.js';
import { SkillsPromptService } from '../skills/prompts/skills-prompts.service.js';
import { SkillsCompilerService } from '../skills/compiler/skills-compiler.service.js';
import type { ParsedSkill } from '../skills/types/skills.types.js';
import { logError } from '../utils/log.js';
import fs from 'node:fs/promises';

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
    private readonly skillsDiscovery: SkillsDiscoveryService,
    private readonly skillsPrompt: SkillsPromptService,
    private readonly skillsCompiler: SkillsCompilerService,
    private readonly projectName: string,
    private readonly rulesDir: string,
    private readonly targetDir: string,
  ) {}

  async run(): Promise<void> {
    if (!(await this.preflightRulesDir())) return;
    if (!(await this.preflightWriteAccess())) return;

    if (process.stdin.isTTY) intro('agent-context-sync-cli');

    // 1. Config discovery
    const configAnswers = await this.resolveConfig();
    if (configAnswers === null) return;

    // 2. Agent file conflict check (before rules/skills)
    // Handled during generation — no pre-check needed, resolveWriteMode handles it

    // 3. Rules branch
    let ruleFiles: CompiledFile[] = [];
    const syncRules = await this.askSyncRules();
    if (syncRules) {
      let rulesAnswers: Answers | null;
      if (configAnswers.architecture) {
        // Using existing config — skip questionnaire
        rulesAnswers = configAnswers as unknown as Answers;
      } else {
        rulesAnswers = await this.promptService.run(this.projectName);
      }
      if (rulesAnswers === null) return;

      // Resolve project-vs-general name conflicts before compiling
      await this.resolveRuleConflicts(rulesAnswers);

      const s = spinner();
      s.start('Compiling rules from templates...');
      ruleFiles = await this.compiler.compile(rulesAnswers, this.projectName);
      await this.output.writeRulesDir(ruleFiles);
      s.stop('Rules compiled and saved to .agents/rules/');

      // Merge rules answers into config answers
      Object.assign(configAnswers, rulesAnswers);
    }

    // 4. Skills branch
    let copiedSkills: ParsedSkill[] = [];
    const syncSkills = await this.askSyncSkills();
    if (syncSkills) {
      const skillsAnswers = await this.skillsPrompt.run(this.projectName);
      if (skillsAnswers === null) return;

      if (skillsAnswers.selectedSkills.length > 0) {
        const allSkills = [
          ...(await this.skillsDiscovery.listProjectSkills(this.projectName)),
          ...(await this.skillsDiscovery.listGeneralSkills()),
        ];
        const selected = allSkills.filter((s) => skillsAnswers.selectedSkills.includes(s.name));
        const s = spinner();
        s.start('Copying skills...');
        const names = await this.skillsCompiler.compile(selected);
        copiedSkills = selected.filter((s) => names.includes(s.name));
        s.stop('Skills copied to .agents/skills/');
      }

      configAnswers.syncSkills = true;
      configAnswers.skills = skillsAnswers.selectedSkills;
    }

    // 5. Agent selection (always, at the end)
    let agents: string[];
    if (!process.stdin.isTTY && Array.isArray(configAnswers.agents)) {
      agents = configAnswers.agents as string[];
    } else {
      const result = await this.stepAgentSelection();
      if (result === null) return;
      agents = result;
    }
    configAnswers.agents = agents;

    // 6. Generate & write agent files
    const ctx = buildGeneratorContext(ruleFiles, copiedSkills);
    const writtenFiles: string[] = [];
    for (const agentKey of agents) {
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

    // 7. Save config
    await this.configService.write(buildConfig(configAnswers, this.projectName));

    // 8. Grand finale (TTY only — non-TTY gets plain output)
    if (process.stdin.isTTY) {
      this.showFinale(ruleFiles, writtenFiles, copiedSkills);
      this.showGitignoreWarning();
    } else {
      console.log('Rules synchronized successfully.');
      if (ruleFiles.length > 0) console.log(`.agents/rules/: ${ruleFiles.length} files`);
      if (copiedSkills.length > 0) console.log(`.agents/skills/: ${copiedSkills.length} skills`);
      if (writtenFiles.length > 0) console.log(`Agent configs: ${writtenFiles.join(', ')}`);
    }
  }

  // ---- Pre-flight ----

  private async preflightRulesDir(): Promise<boolean> {
    try {
      await fs.access(this.rulesDir, fs.constants.R_OK);
      return true;
    } catch (err) {
      logError(
        `Rules directory not accessible: ${this.rulesDir}\n` +
          `${(err as Error).message}\n` +
          'Make sure the agent-context-sync-cli package includes the rules/ directory.',
      );
      return false;
    }
  }

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

  // ---- Config ----

  private async resolveConfig(): Promise<Record<string, unknown> | null> {
    const existingConfig = await this.configService.read();

    if (existingConfig === null) {
      if (!process.stdin.isTTY) {
        logError('No configuration file found and no interactive terminal available.');
        return null;
      }
      return {};
    }

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

    return {};
  }

  private async configToAnswers(config: Config): Promise<Record<string, unknown>> {
    const arch = config.architecture;

    const hasProjectUserprompt = await this.discovery.hasProjectOverride(
      config.projectName,
      'userprompt.md',
    );
    const hasProjectWorkflow = await this.discovery.hasProjectOverride(
      config.projectName,
      'workflow.md',
    );
    const hasProjectArchitecture = await this.discovery.hasProjectOverride(
      config.projectName,
      'architecture.md',
    );

    let userpromptSource: 'project' | 'general' | null = null;
    if (config.hasUserprompt) {
      userpromptSource = hasProjectUserprompt ? 'project' : (config.userpromptSource ?? 'general');
    }

    let architectureSource: 'project' | 'general' | null = null;
    if (config.hasArchitecture) {
      architectureSource = hasProjectArchitecture
        ? 'project'
        : (config.architectureSource ?? 'general');
    }

    let workflowSource: 'project' | 'general' | null = null;
    if (config.hasWorkflow) {
      workflowSource = hasProjectWorkflow ? 'project' : (config.workflowSource ?? 'general');
    }

    return {
      architecture: arch,
      hasUserprompt: config.hasUserprompt,
      userpromptSource,
      userpromptFile: config.userpromptFile ?? null,
      hasArchitecture: config.hasArchitecture,
      architectureSource,
      architectureFile: config.architectureFile ?? null,
      hasWorkflow: config.hasWorkflow,
      workflowSource,
      workflowFile: config.workflowFile ?? null,
      frameworks: config.frameworks,
      packages: config.packages,
      agents: config.agents,
      syncSkills: config.syncSkills,
      skills: config.skills,
    };
  }

  // ---- Rules / Skills sync prompts ----

  private async askSyncRules(): Promise<boolean> {
    if (!process.stdin.isTTY) {
      // In non-TTY mode, sync rules if the config has architecture data
      return true;
    }
    const proceed = await confirm({
      message: 'Sync rules for this project?',
    });
    return !isCancel(proceed) && !!proceed;
  }

  private async askSyncSkills(): Promise<boolean> {
    if (!process.stdin.isTTY) {
      // In non-TTY mode, sync skills only if config says so
      const config = await this.configService.read();
      return config?.syncSkills === true;
    }
    const proceed = await confirm({
      message: 'Sync skills for this project?',
    });
    return !isCancel(proceed) && !!proceed;
  }

  // ---- Agent selection ----

  private async stepAgentSelection(): Promise<string[] | null> {
    const options = AVAILABLE_AGENTS.map((a) => ({
      value: a.value,
      label: a.label,
    }));

    const choices = await multiselect({
      message: '🤖 Select AI agents to generate config files for:',
      options,
      required: false,
    });

    if (isCancel(choices)) {
      cancel('🚫 Cancelled by user.');
      return null;
    }

    return choices as string[];
  }

  // ---- Rule name conflict resolution ----

  /**
   * Check for name conflicts between project overrides and general templates.
   * If both exist for the same file, ask the user which source to use.
   */
  private async resolveRuleConflicts(rulesAnswers: Answers): Promise<void> {
    const arch = rulesAnswers.architecture;
    const projectName = this.projectName;

    // userprompt conflict: project override file vs general userprompts/ folder
    const hasProjectUserprompt = await this.discovery.hasProjectOverride(
      projectName,
      'userprompt.md',
    );
    const generalUserprompts = await this.discovery.listUserprompts(arch);
    const hasGeneralUserprompts = generalUserprompts.length > 0;

    if (hasProjectUserprompt && hasGeneralUserprompts) {
      const choice = await select({
        message:
          'userprompt exists in both project (userprompt.md) and general (userprompts/). Which one to use?',
        options: [
          { value: 'project', label: 'Project version (userprompt.md)' },
          { value: 'general', label: 'General (choose from userprompts/)' },
        ],
      });
      if (!isCancel(choice)) {
        if (choice === 'project') {
          rulesAnswers.userpromptSource = 'project';
          rulesAnswers.userpromptFile = null;
          rulesAnswers.hasUserprompt = true;
        } else {
          const fileOptions = generalUserprompts.map((name) => ({ value: name, label: name }));
          const fileChoice = await select({
            message: 'Select a userprompt from the general folder:',
            options: fileOptions,
          });
          if (!isCancel(fileChoice)) {
            rulesAnswers.userpromptSource = 'general';
            rulesAnswers.userpromptFile = fileChoice;
            rulesAnswers.hasUserprompt = true;
          }
        }
      }
    }

    // architecture conflict: project override file vs general architectures/ folder
    const hasProjectArch = await this.discovery.hasProjectOverride(projectName, 'architecture.md');
    const generalArchitectures = await this.discovery.listArchitectures(arch);
    const hasGeneralArchitectures = generalArchitectures.length > 0;

    if (hasProjectArch && hasGeneralArchitectures) {
      const choice = await select({
        message:
          'architecture.md exists in both project (architecture.md) and general (architectures/). Which one to use?',
        options: [
          { value: 'project', label: 'Project version (architecture.md)' },
          { value: 'general', label: 'General (choose from architectures/)' },
        ],
      });
      if (!isCancel(choice)) {
        if (choice === 'project') {
          rulesAnswers.architectureSource = 'project';
          rulesAnswers.architectureFile = null;
          rulesAnswers.hasArchitecture = true;
        } else {
          const fileOptions = generalArchitectures.map((name) => ({ value: name, label: name }));
          const fileChoice = await select({
            message: 'Select architecture guidelines from the general folder:',
            options: fileOptions,
          });
          if (!isCancel(fileChoice)) {
            rulesAnswers.architectureSource = 'general';
            rulesAnswers.architectureFile = fileChoice;
            rulesAnswers.hasArchitecture = true;
          }
        }
      }
    }

    // workflow conflict: project override file vs general workflows/ folder
    const hasProjectWf = await this.discovery.hasProjectOverride(projectName, 'workflow.md');
    const generalWorkflows = await this.discovery.listWorkflows(arch);
    const hasGeneralWorkflows = generalWorkflows.length > 0;

    if (hasProjectWf && hasGeneralWorkflows) {
      const choice = await select({
        message:
          'workflow.md exists in both project (workflow.md) and general (workflows/). Which one to use?',
        options: [
          { value: 'project', label: 'Project version (workflow.md)' },
          { value: 'general', label: 'General (choose from workflows/)' },
        ],
      });
      if (!isCancel(choice)) {
        if (choice === 'project') {
          rulesAnswers.workflowSource = 'project';
          rulesAnswers.workflowFile = null;
          rulesAnswers.hasWorkflow = true;
        } else {
          const fileOptions = generalWorkflows.map((name) => ({ value: name, label: name }));
          const fileChoice = await select({
            message: 'Select a workflow from the general folder:',
            options: fileOptions,
          });
          if (!isCancel(fileChoice)) {
            rulesAnswers.workflowSource = 'general';
            rulesAnswers.workflowFile = fileChoice;
            rulesAnswers.hasWorkflow = true;
          }
        }
      }
    }
  }

  // ---- Agent file conflict resolution ----

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

  // ---- Finale ----

  private hr(color: (s: string) => string): string {
    return color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  private padLine(raw: string, color: (s: string) => string): string {
    return '  ' + color(raw);
  }

  private showFinale(
    ruleFiles: CompiledFile[],
    writtenFiles: string[],
    copiedSkills: ParsedSkill[],
  ): void {
    const pc = this.colors;

    const art = [
      pc.boldMagenta('    ▄████▄     '),
      pc.boldMagenta('    ▄████████▄   '),
      pc.boldMagenta('   ███◣▛██▜◢███  '),
      pc.boldMagenta('   ███▒████▒███  '),
      pc.boldMagenta('    ▀████████▀   '),
      pc.boldMagenta('  ▄██▒▒██▒▒██▄   '),
      pc.boldMagenta(' ██▀╲╱╲╱╲╱╲╱▀██   '),
      pc.boldMagenta(' ▀  ╲  ╲╱  ╱  ▀   '),
    ];

    const parts: string[] = [];
    if (ruleFiles.length > 0) parts.push(pc.dim('📁 .agents/rules/ created'));
    if (copiedSkills.length > 0) parts.push(pc.dim('🛠️  .agents/skills/ created'));
    parts.push(pc.dim('⚙️  Agent config files generated'));
    parts.push(pc.dim('💾 Configuration saved'));

    const info = [
      ' ' + pc.boldGreen('✨ Rules synchronized!'),
      '',
      ...parts.map((p) => ' ' + p),
      '',
      ' ' + pc.dim('📂 ' + this.projectName),
      '',
    ];

    outro(art.map((line, i) => line + (info[i] ?? '')).join('\n'));

    // Files box
    const files: string[] = [];
    if (ruleFiles.length > 0) {
      files.push(pc.boldGreen('Rules:'));
      files.push(...ruleFiles.map((f) => '  ' + f.filename));
    }
    if (copiedSkills.length > 0) {
      if (files.length > 0) files.push('');
      files.push(pc.boldGreen('Skills:'));
      files.push(...copiedSkills.map((s) => '  ' + s.name));
    }
    if (writtenFiles.length > 0) {
      files.push('');
      files.push(pc.boldGreen('Agent configs:'));
      files.push(...writtenFiles.map((f) => '  ' + f));
    }

    const lines: string[] = [
      this.hr(pc.boldGreen),
      this.padLine('  Created files:', pc.boldGreen),
      '',
      ...files.map((f) => this.padLine('      ' + f, pc.cyan)),
    ];

    outro(lines.join('\n'));
  }

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
      ];

      outro(lines.join('\n'));
    }
  }

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

// ---- Helpers ----

function buildGeneratorContext(ruleFiles: CompiledFile[], skills: ParsedSkill[]): GeneratorContext {
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
    skills: skills.map((s) => ({
      name: s.name,
      path: `.agents/skills/${s.name}${s.type === 'folder' ? '/SKILL.md' : '.md'}`,
      description: s.description,
    })),
  };
}

function buildConfig(answers: Record<string, unknown>, projectName: string): Config {
  return {
    version: 1,
    projectName,
    architecture: (answers.architecture as 'frontend') ?? 'frontend',
    frameworks: (answers.frameworks as string[]) ?? [],
    packages: (answers.packages as string[]) ?? [],
    agents: (answers.agents as string[]) ?? [],
    hasUserprompt: (answers.hasUserprompt as boolean) ?? false,
    userpromptFile: (answers.userpromptFile as string) ?? null,
    userpromptSource: (answers.userpromptSource as 'project' | 'general' | null) ?? null,
    hasArchitecture: (answers.hasArchitecture as boolean) ?? false,
    architectureFile: (answers.architectureFile as string) ?? null,
    architectureSource: (answers.architectureSource as 'project' | 'general' | null) ?? null,
    hasWorkflow: (answers.hasWorkflow as boolean) ?? false,
    workflowFile: (answers.workflowFile as string) ?? null,
    workflowSource: (answers.workflowSource as 'project' | 'general' | null) ?? null,
    syncSkills: (answers.syncSkills as boolean) ?? false,
    skills: (answers.skills as string[]) ?? [],
    lastSync: new Date().toISOString(),
  };
}
