import { select, confirm, isCancel, cancel, outro, note } from '../prompts/clack-adapter.js';
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
  ) {}

  async run(): Promise<void> {
    // 1. Config discovery
    const answers = await this.resolveAnswers();
    if (answers === null) return;

    // 2. Compile rules
    const ruleFiles = await this.compiler.compile(answers, this.projectName);

    // 3. Write .agents/rules/
    await this.output.writeRulesDir(ruleFiles);

    // 4. Generate & write agent files
    const ctx = buildGeneratorContext(ruleFiles);
    for (const agentKey of answers.agents) {
      const generator = generatorRegistry.get(agentKey);
      if (!generator) continue;

      const agentFiles = generator(ctx);
      for (const file of agentFiles) {
        const mode = await this.resolveWriteMode(file.filename);
        if (mode === 'skip') continue;
        await this.output.writeAgentFile(file.filename, file.content, mode);
      }
    }

    // 5. Save config
    await this.configService.write(buildConfig(answers, this.projectName));

    // 6. Gitignore suggestion
    await this.suggestGitignore();

    // 7. Success
    outro('All rules have been generated successfully.');
    outro('Files created in .agents/rules/ and agent config files in project root.');
    note('Add ai-rules-config.json to .gitignore to keep it local.');
  }

  // ---- Private ----

  private async resolveAnswers(): Promise<Answers | null> {
    const existingConfig = await this.configService.read();

    if (existingConfig === null) {
      return this.promptService.run(this.projectName);
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

  private async configToAnswers(config: Config): Promise<Answers> {
    const projectName = config.projectName;
    const arch = config.architecture;

    const hasProjectUserprompt = await this.discovery.hasProjectOverride(
      projectName,
      'userprompt.md',
    );

    const hasProjectWorkflow = await this.discovery.hasProjectOverride(projectName, 'workflow.md');
    const hasGeneralWorkflow = await this.discovery.isFileNonEmpty(`${arch}/workflow.md`);

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

  private async resolveWriteMode(
    filename: string,
  ): Promise<'create' | 'overwrite' | 'append' | 'skip'> {
    const exists = await this.output.fileExists(filename);
    if (!exists) return 'create';

    const choice = await select(`File "${filename}" already exists. What should be done?`, [
      { value: 'overwrite', label: 'Overwrite — Replace with generated rules (Recommended)' },
      { value: 'append', label: 'Append — Keep current content, prepend a link to .agents/rules/' },
      { value: 'skip', label: 'Skip — Do not touch this file' },
    ]);

    if (isCancel(choice)) return 'skip';

    return choice as 'overwrite' | 'append' | 'skip';
  }

  private async suggestGitignore(): Promise<void> {
    const inGitignore = await this.output.isInGitignore('ai-rules-config.json');
    if (!inGitignore) {
      note(
        'IMPORTANT: Add "ai-rules-config.json" to your .gitignore file to keep local configuration private.',
      );
    }
  }
}

// ---- Helpers ----

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
