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

import { ConfigService } from '../rules/config/config.service.js';
import type { Architecture, Config } from '../rules/config/config.types.js';
import { DiscoveryService } from '../rules/discovery/discovery.service.js';
import { PromptService } from '../rules/prompts/prompts.service.js';
import type { Answers } from '../rules/prompts/prompts.types.js';
import { AVAILABLE_AGENTS } from '../rules/prompts/prompts.types.js';
import { CompilerService } from '../rules/compiler/compiler.service.js';
import type { CompiledFile } from '../rules/compiler/compiler.types.js';
import { RULE_FILE_SET, F } from '../rules/compiler/compiler.types.js';
import { FinalePresenter } from './finale.presenter.js';
import { generatorRegistry } from '../rules/generators/generator.service.js';
import type { GeneratorContext } from '../rules/generators/generator.types.js';
import { OutputService } from '../output/output.service.js';
import { RULES_DIR, SKILLS_DIR } from '../output/content-wrapper.js';

import { SkillsDiscoveryService } from '../skills/discovery/skills-discovery.service.js';
import { SkillsPromptService } from '../skills/prompts/skills-prompts.service.js';
import { SkillsCompilerService } from '../skills/compiler/skills-compiler.service.js';
import type { ParsedSkill } from '../skills/types/skills.types.js';

import fs from 'node:fs/promises';
import type { Terminal } from './terminal.interface.js';

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
    private readonly terminal: Terminal,
    private readonly projectName: string,
    private readonly rulesDir: string,
    private readonly targetDir: string,
  ) {}

  async run(): Promise<void> {
    if (!(await this.preflightRulesDir())) return;
    if (!(await this.preflightWriteAccess())) return;

    if (process.stdin.isTTY) this.terminal.intro('agent-context-sync-cli');

    // 1. Config discovery
    const configAnswers = await this.resolveConfig();
    if (configAnswers === null) return;

    // 2. Agent file conflict check (before rules/skills)
    // Handled during generation — no pre-check needed, resolveWriteMode handles it

    // 3. Rules branch
    const usingExistingConfig = !!configAnswers.architecture;
    let ruleFiles: CompiledFile[] = [];
    const syncRules = usingExistingConfig ? true : await this.askSyncRules();
    if (syncRules) {
      let rulesAnswers: Answers | null;
      if (configAnswers.architecture) {
        // Using existing config — skip questionnaire
        rulesAnswers = configAnswers as Answers;
      } else {
        rulesAnswers = await this.promptService.run(this.projectName);
      }
      if (rulesAnswers === null) return;

      // Resolve project-vs-general name conflicts before compiling
      await this.resolveRuleConflicts(rulesAnswers);

      const s = this.terminal.spinner();
      s.start('Compiling rules from templates...');
      ruleFiles = await this.compiler.compile(rulesAnswers, this.projectName);
      await this.output.writeRulesDir(ruleFiles);
      s.stop(`Rules compiled and saved to ${RULES_DIR}/`);

      // Merge rules answers into config answers
      Object.assign(configAnswers, rulesAnswers);
    }

    // 4. Skills branch
    let copiedSkills: ParsedSkill[] = [];
    const syncSkills = usingExistingConfig
      ? !!configAnswers.syncSkills
      : await this.askSyncSkills();
    if (syncSkills) {
      let selectedSkillNames: string[];
      if (usingExistingConfig && Array.isArray(configAnswers.skills)) {
        selectedSkillNames = configAnswers.skills as string[];
      } else {
        const skillsAnswers = await this.skillsPrompt.run(this.projectName);
        if (skillsAnswers === null) return;
        selectedSkillNames = skillsAnswers.selectedSkills;
      }

      if (selectedSkillNames.length > 0) {
        const allSkills = [
          ...(await this.skillsDiscovery.listProjectSkills(this.projectName)),
          ...(await this.skillsDiscovery.listGeneralSkills()),
        ];
        const selected = allSkills.filter((s) => selectedSkillNames.includes(s.name));
        const s = this.terminal.spinner();
        s.start('Copying skills...');
        const names = await this.skillsCompiler.compile(selected);
        copiedSkills = selected.filter((s) => names.includes(s.name));
        s.stop(`Skills copied to ${SKILLS_DIR}/`);
      }

      configAnswers.syncSkills = true;
      configAnswers.skills = selectedSkillNames;
    }

    // 5. Agent selection (always, at the end)
    let agents: string[];
    const useConfigAgents =
      (!process.stdin.isTTY || usingExistingConfig) &&
      Array.isArray(configAnswers.agents) &&
      (configAnswers.agents as string[]).length > 0;
    if (useConfigAgents) {
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
      const presenter = new FinalePresenter(this.terminal, this.projectName);
      presenter.showFinale(ruleFiles, writtenFiles, copiedSkills);
      const inGitignore = await this.output.isInGitignore('ai-context-config.json');
      presenter.showGitignoreWarning(inGitignore);
      presenter.showStarRequest();
    } else {
      this.terminal.logPlain('Rules synchronized successfully.');
      if (ruleFiles.length > 0) this.terminal.logPlain(`${RULES_DIR}/: ${ruleFiles.length} files`);
      if (copiedSkills.length > 0)
        this.terminal.logPlain(`${SKILLS_DIR}/: ${copiedSkills.length} skills`);
      if (writtenFiles.length > 0)
        this.terminal.logPlain(`Agent configs: ${writtenFiles.join(', ')}`);
    }
  }

  // ---- Pre-flight ----

  private async preflightRulesDir(): Promise<boolean> {
    try {
      await fs.access(this.rulesDir, fs.constants.R_OK);
      return true;
    } catch (err) {
      this.terminal.logError(
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
      this.terminal.logError(
        `Cannot write to target directory: ${this.targetDir}\n` +
          `${(err as Error).message}\n` +
          'Check directory permissions and try again.',
      );
      return false;
    }
  }

  // ---- Config ----

  private async resolveConfig(): Promise<
    (Partial<Answers> & { syncSkills?: boolean; skills?: string[] }) | null
  > {
    const existingConfig = await this.configService.read();

    if (existingConfig === null) {
      if (!process.stdin.isTTY) {
        this.terminal.logError(
          'No configuration file found and no interactive terminal available.',
        );
        return null;
      }
      return {};
    }

    if (!process.stdin.isTTY) {
      return this.configToAnswers(existingConfig);
    }

    const useExisting = await this.terminal.confirm(
      'Existing configuration file found. Use it to regenerate rules, or start a fresh questionnaire?',
    );

    if (this.terminal.isCancel(useExisting)) {
      this.terminal.cancel('Operation cancelled by user.');
      return null;
    }

    if (useExisting) {
      return this.configToAnswers(existingConfig);
    }

    return {};
  }

  private async configToAnswers(
    config: Config,
  ): Promise<Partial<Answers> & { syncSkills?: boolean; skills?: string[] }> {
    const arch = config.architecture;

    const hasProjectUserprompt = await this.discovery.hasProjectOverride(
      config.projectName,
      F.USERPROMPT,
    );
    const hasProjectWorkflow = await this.discovery.hasProjectOverride(
      config.projectName,
      F.WORKFLOW,
    );
    const hasProjectArchitecture = await this.discovery.hasProjectOverride(
      config.projectName,
      F.ARCHITECTURE,
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
      hasProjectFramework: config.hasProjectFramework,
      hasProjectPackages: config.hasProjectPackages,
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
    const proceed = await this.terminal.confirm({
      message: 'Sync rules for this project?',
    });
    return !this.terminal.isCancel(proceed) && !!proceed;
  }

  private async askSyncSkills(): Promise<boolean> {
    if (!process.stdin.isTTY) {
      // In non-TTY mode, sync skills only if config says so
      const config = await this.configService.read();
      return config?.syncSkills === true;
    }
    const proceed = await this.terminal.confirm({
      message: 'Sync skills for this project?',
    });
    return !this.terminal.isCancel(proceed) && !!proceed;
  }

  // ---- Agent selection ----

  private async stepAgentSelection(): Promise<string[] | null> {
    const options = AVAILABLE_AGENTS.map((a) => ({
      value: a.value,
      label: a.label,
    }));

    const choices = await this.terminal.multiselect({
      message: '🤖 Select AI agents to generate config files for:',
      options,
      required: false,
    });

    if (this.terminal.isCancel(choices)) {
      this.terminal.cancel('🚫 Cancelled by user.');
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

    await this.resolveFolderConflict({
      rulesAnswers,
      projectName,
      arch,
      fileName: F.USERPROMPT,
      folderName: 'userprompts',
      listFn: (a) => this.discovery.listUserprompts(a),
      selectMessage: 'Select a userprompt from the general folder:',
      applyProject: () => {
        rulesAnswers.userpromptSource = 'project';
        rulesAnswers.userpromptFile = null;
        rulesAnswers.hasUserprompt = true;
      },
      applyGeneral: (file) => {
        rulesAnswers.userpromptSource = 'general';
        rulesAnswers.userpromptFile = file;
        rulesAnswers.hasUserprompt = true;
      },
    });

    await this.resolveFolderConflict({
      rulesAnswers,
      projectName,
      arch,
      fileName: F.ARCHITECTURE,
      folderName: 'architectures',
      listFn: (a) => this.discovery.listArchitectures(a),
      selectMessage: 'Select architecture guidelines from the general folder:',
      applyProject: () => {
        rulesAnswers.architectureSource = 'project';
        rulesAnswers.architectureFile = null;
        rulesAnswers.hasArchitecture = true;
      },
      applyGeneral: (file) => {
        rulesAnswers.architectureSource = 'general';
        rulesAnswers.architectureFile = file;
        rulesAnswers.hasArchitecture = true;
      },
    });

    await this.resolveFolderConflict({
      rulesAnswers,
      projectName,
      arch,
      fileName: F.WORKFLOW,
      folderName: 'workflows',
      listFn: (a) => this.discovery.listWorkflows(a),
      selectMessage: 'Select a workflow from the general folder:',
      applyProject: () => {
        rulesAnswers.workflowSource = 'project';
        rulesAnswers.workflowFile = null;
        rulesAnswers.hasWorkflow = true;
      },
      applyGeneral: (file) => {
        rulesAnswers.workflowSource = 'general';
        rulesAnswers.workflowFile = file;
        rulesAnswers.hasWorkflow = true;
      },
    });

    // framework and package-rules use a simpler boolean-toggle conflict
    await this.resolveSimpleConflict({
      projectName,
      arch,
      fileName: F.FRAMEWORK,
      folderName: 'frameworks',
      listFn: (a) => this.discovery.listFrameworks(a),
      onResult: (useProject) => {
        rulesAnswers.hasProjectFramework = useProject;
      },
    });

    await this.resolveSimpleConflict({
      projectName,
      arch,
      fileName: F.PACKAGE_RULES,
      folderName: 'packages',
      listFn: (a) => this.discovery.listPackages(a),
      onResult: (useProject) => {
        rulesAnswers.hasProjectPackages = useProject;
      },
    });
  }

  private async resolveFolderConflict(params: {
    rulesAnswers: Answers;
    projectName: string;
    arch: Architecture;
    fileName: string;
    folderName: string;
    listFn: (arch: Architecture) => Promise<string[]>;
    selectMessage: string;
    applyProject: () => void;
    applyGeneral: (file: string) => void;
  }): Promise<void> {
    const {
      projectName,
      arch,
      fileName,
      folderName,
      listFn,
      selectMessage,
      applyProject,
      applyGeneral,
    } = params;
    const hasProject = await this.discovery.hasProjectOverride(projectName, fileName);
    const items = await listFn(arch);

    if (!hasProject || items.length === 0) return;

    const choice = await this.terminal.select({
      message: `${fileName} exists in both project (${fileName}) and general (${folderName}/). Which one to use?`,
      options: [
        { value: 'project', label: `Project version (${fileName})` },
        { value: 'general', label: `General (choose from ${folderName}/)` },
      ],
    });

    if (this.terminal.isCancel(choice)) return;

    if (choice === 'project') {
      applyProject();
    } else {
      const fileOptions = items.map((name) => ({ value: name, label: name }));
      const fileChoice = await this.terminal.select({
        message: selectMessage,
        options: fileOptions,
      });
      if (!this.terminal.isCancel(fileChoice)) {
        applyGeneral(fileChoice);
      }
    }
  }

  private async resolveSimpleConflict(params: {
    projectName: string;
    arch: Architecture;
    fileName: string;
    folderName: string;
    listFn: (arch: Architecture) => Promise<string[]>;
    onResult: (useProject: boolean) => void;
  }): Promise<void> {
    const { projectName, arch, fileName, folderName, listFn, onResult } = params;
    const hasProject = await this.discovery.hasProjectOverride(projectName, fileName);
    const items = await listFn(arch);

    if (!hasProject || items.length === 0) return;

    const choice = await this.terminal.select({
      message: `${fileName} exists in both project (${fileName}) and general (${folderName}/). Which one to use?`,
      options: [
        { value: 'project', label: `Project version (${fileName})` },
        { value: 'general', label: `General (choose from ${folderName}/)` },
      ],
    });

    if (!this.terminal.isCancel(choice)) {
      onResult(choice === 'project');
    }
  }

  private async resolveWriteMode(
    filename: string,
  ): Promise<'create' | 'overwrite' | 'update' | 'skip'> {
    const exists = await this.output.fileExists(filename);
    if (!exists) return 'create';

    const hasMarkers = await this.output.hasSyncMarkersInFile(filename);
    if (hasMarkers) return 'update';

    const choice = await this.terminal.select({
      message: `File "${filename}" already exists. What should be done?`,
      options: [
        {
          value: 'update',
          label: 'Update rules section — Add AGENT-CONTEXT-SYNC-CLI block (Recommended)',
        },
        {
          value: 'overwrite',
          label: 'Overwrite — Replace entire file with generated rules',
        },
        { value: 'skip', label: 'Skip — Do not touch this file' },
      ],
    });

    if (this.terminal.isCancel(choice)) return 'skip';

    return choice as 'update' | 'overwrite' | 'skip';
  }

  // ---- Finale removed (extracted to FinalePresenter) ----
}

// ---- Helpers ----

function buildGeneratorContext(ruleFiles: CompiledFile[], skills: ParsedSkill[]): GeneratorContext {
  const filenames = new Set(ruleFiles.map((f) => f.filename));

  return {
    hasUserprompt: filenames.has(F.USERPROMPT),
    hasWorkflow: filenames.has(F.WORKFLOW),
    hasSpec: filenames.has(F.SPEC),
    hasArchitecture: filenames.has(F.ARCHITECTURE),
    frameworkFiles: ruleFiles.filter((f) => !RULE_FILE_SET.has(f.filename)).map((f) => f.filename),
    hasPackageRules: filenames.has(F.PACKAGE_RULES),
    skills: skills.map((s) => ({
      name: s.name,
      path: `${SKILLS_DIR}/${s.name}${s.type === 'folder' ? '/SKILL.md' : '.md'}`,
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
    hasProjectFramework: (answers.hasProjectFramework as boolean) ?? false,
    hasProjectPackages: (answers.hasProjectPackages as boolean) ?? false,
    syncSkills: (answers.syncSkills as boolean) ?? false,
    skills: (answers.skills as string[]) ?? [],
    lastSync: new Date().toISOString(),
  };
}
