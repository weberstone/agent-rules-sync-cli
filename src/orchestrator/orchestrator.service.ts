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
} from '../prompts/clack-adapter.js';
import { ConfigService } from '../config/config.service.js';
import type { Config } from '../config/config.types.js';
import { DiscoveryService } from '../discovery/discovery.service.js';
import { PromptService } from '../prompts/prompts.service.js';

import { AVAILABLE_AGENTS } from '../prompts/prompts.types.js';
import { CompilerService } from '../compiler/compiler.service.js';
import type { CompiledFile } from '../compiler/compiler.types.js';
import { generatorRegistry } from '../generators/generator.service.js';
import type { GeneratorContext } from '../generators/generator.types.js';
import { OutputService } from '../output/output.service.js';

import { SkillsDiscoveryService } from '../skills/skills-discovery.service.js';
import { SkillsPromptService } from '../skills/skills-prompts.service.js';
import { SkillsCompilerService } from '../skills/skills-compiler.service.js';
import type { ParsedSkill } from '../skills/skills.types.js';
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

    intro('agent-rules-sync-cli');

    // 1. Config discovery
    const configAnswers = await this.resolveConfig();
    if (configAnswers === null) return;

    // 2. Agent file conflict check (before rules/skills)
    // Handled during generation — no pre-check needed, resolveWriteMode handles it

    // 3. Rules branch
    let ruleFiles: CompiledFile[] = [];
    const syncRules = await this.askSyncRules();
    if (syncRules) {
      const rulesAnswers = await this.promptService.run(this.projectName);
      if (rulesAnswers === null) return;

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
    const agents = await this.stepAgentSelection();
    if (agents === null) return;
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

    // 8. Grand finale
    this.showFinale(ruleFiles, writtenFiles, copiedSkills);

    // 9. Gitignore warning
    this.showGitignoreWarning();
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
          'Make sure the agent-rules-sync-cli package includes the rules/ directory.',
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
      syncSkills: config.syncSkills,
      skills: config.skills,
    };
  }

  // ---- Rules / Skills sync prompts ----

  private async askSyncRules(): Promise<boolean> {
    const proceed = await confirm({
      message: 'Sync rules for this project?',
    });
    return !isCancel(proceed) && !!proceed;
  }

  private async askSyncSkills(): Promise<boolean> {
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
      pc.boldMagenta('        ▄████▄ '),
      pc.boldMagenta('    ▄████████▄   '),
      pc.boldMagenta('   ███◣▛██▜◢███  '),
      pc.boldMagenta('   ███▒████▒███  '),
      pc.boldMagenta('    ▀████████▀   '),
      pc.boldMagenta('  ▄██▒▒██▒▒██▄  '),
      pc.boldMagenta(' ██▀╲╱╲╱╲╱╲╱▀██  '),
      pc.boldMagenta(' ▀  ╲  ╲╱  ╱  ▀ '),
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
      this.hr(pc.boldGreen),
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
        this.hr(pc.boldYellow),
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
    syncSkills: (answers.syncSkills as boolean) ?? false,
    skills: (answers.skills as string[]) ?? [],
    lastSync: new Date().toISOString(),
  };
}
