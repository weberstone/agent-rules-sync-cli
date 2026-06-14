import { select, confirm, isCancel, cancel, outro, note, spinner } from '../prompts/clack-adapter.js';
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

  async run(): Promise<void> {
    if (!(await this.preflightRulesDir())) return;
    if (!(await this.preflightWriteAccess())) return;

    // 1. Config discovery
    const answers = await this.resolveAnswers();
    if (answers === null) return;

    // 2. Compile rules
    const s = spinner();
    s.start('Compiling rules from templates...');
    const ruleFiles = await this.compiler.compile(answers, this.projectName);

    // 3. Write .agents/rules/
    await this.output.writeRulesDir(ruleFiles);

    // 4. Generate & write agent files
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

    // 5. Save config
    await this.configService.write(buildConfig(answers, this.projectName));
    s.stop('Rules generated successfully.');

    // 6. Grand finale
    this.showFinale(ruleFiles, writtenFiles);

    // 7. Gitignore warning
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

  // ---- Private ----

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

    // Non-interactive mode: auto-use existing config
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

  private showFinale(ruleFiles: CompiledFile[], writtenFiles: string[]): void {
    const pc = this.colors();

    const art = [
      pc.bold(pc.magenta('        ▄████▄    ')),
      pc.bold(pc.magenta('    ▄████████▄   ')),
      pc.bold(pc.magenta('   ███◣▛██▜◢███  ')),
      pc.bold(pc.magenta('   ███▒████▒███  ')),
      pc.bold(pc.magenta('    ▀████████▀   ')),
      pc.bold(pc.magenta('  ▄██▒▒██▒▒██▄  ')),
      pc.bold(pc.magenta(' ██▀╲╱╲╱╲╱╲╱▀██ ')),
      pc.bold(pc.magenta(' ▀  ╲  ╲╱  ╱  ▀ ')),
    ];

    const info = [
      '  ' + pc.bold(pc.green('✨ Rules synchronized!')),
      '',
      '  ' + pc.dim('📁 .agents/rules/ created'),
      '  ' + pc.dim('⚙️  Agent config files generated'),
      '  ' + pc.dim('💾 Configuration saved'),
      '',
      '  ' + pc.dim('📂 ' + this.projectName),
      '',
    ];

    const combined = art.map((line, i) => line + (info[i] ?? ''));
    outro(combined.join('\n'));

    // File listing in a double-line box — compute width from longest raw name
    const files: string[] = ruleFiles.map((f) => f.filename);
    if (writtenFiles.length > 0) files.push(...writtenFiles);
    const prefix = '    • ';
    const title = 'Created files:';
    const innerW = Math.max(
      title.length,
      ...files.map((f) => prefix.length + f.length),
    );
    const W = innerW + 4;

    const b = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' };
    const border = pc.bold(pc.green);

    const boxLine = (raw: string, color: 'title' | 'item'): string => {
      const content =
        color === 'title'
          ? pc.bold(pc.green(raw))
          : pc.cyan(raw);
      const pad = W - 3 - raw.length;
      return (
        border(b.v) +
        '  ' +
        content +
        ' '.repeat(Math.max(0, pad)) +
        ' ' +
        border(b.v)
      );
    };

    const lines: string[] = [
      border(b.tl + b.h.repeat(W) + b.tr),
      boxLine('', 'item'),
      boxLine(title, 'title'),
      boxLine('', 'item'),
      ...files.map((f) => boxLine(prefix + f, 'item')),
      boxLine('', 'item'),
      border(b.bl + b.h.repeat(W) + b.br),
    ];

    outro(lines.join('\n'));
  }

  private async showGitignoreWarning(): Promise<void> {
    const pc = this.colors();
    const inGitignore = await this.output.isInGitignore('ai-rules-config.json');
    if (!inGitignore) {
      const raw = [
        ['⚠️  IMPORTANT', true],
        ['', false],
        ['Add "ai-rules-config.json"', false],
        ['to your .gitignore file', false],
        ['to keep it private.', false],
      ] as const;

      const innerW = Math.max(36, ...raw.map(([m]) => m.length));
      const W = innerW + 4;

      const b = { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' };
      const border = pc.bold(pc.yellow);

      const boxLine = (text: string, bold: boolean): string => {
        const colored = bold
          ? pc.bold(pc.yellow(text))
          : pc.yellow(text);
        const pad = W - 3 - text.length;
        return (
          border(b.v) +
          '  ' +
          colored +
          ' '.repeat(Math.max(0, pad)) +
          ' ' +
          border(b.v)
        );
      };

      const lines: string[] = [
        border(b.tl + b.h.repeat(W) + b.tr),
        ...raw.map(([m, bold]) => boxLine(m, bold)),
        border(b.bl + b.h.repeat(W) + b.br),
      ];
      note(lines.join('\n'));
    }
  }

  private colors() {
    return {
      dim: (s: string) => `\x1b[2m${s}\x1b[22m`,
      cyan: (s: string) => `\x1b[36m${s}\x1b[39m`,
      green: (s: string) => `\x1b[32m${s}\x1b[39m`,
      magenta: (s: string) => `\x1b[35m${s}\x1b[39m`,
      yellow: (s: string) => `\x1b[33m${s}\x1b[39m`,
      bold: (s: string) => `\x1b[1m${s}\x1b[22m`,
    };
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
