import pc from 'picocolors';
import type { Terminal } from './terminal.interface.js';
import type { CompiledFile } from '../rules/compiler/compiler.types.js';
import type { ParsedSkill } from '../skills/types/skills.types.js';
import { RULES_DIR, SKILLS_DIR } from '../output/content-wrapper.js';

const boldGreen = (s: string) => pc.bold(pc.green(s));
const boldMagenta = (s: string) => pc.bold(pc.magenta(s));
const boldCyan = (s: string) => pc.bold(pc.cyan(s));

export class FinalePresenter {
  constructor(
    private readonly terminal: Terminal,
    private readonly projectName: string,
  ) {}

  private hr(color: (s: string) => string): string {
    return color('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  }

  private padLine(raw: string, color: (s: string) => string): string {
    return '  ' + color(raw);
  }

  showFinale(ruleFiles: CompiledFile[], writtenFiles: string[], copiedSkills: ParsedSkill[]): void {
    const art = [
      pc.bold(pc.magenta('    ▄████▄     ')),
      pc.bold(pc.magenta('    ▄████████▄   ')),
      pc.bold(pc.magenta('   ███◣▛██▜◢███  ')),
      pc.bold(pc.magenta('   ███▒████▒███  ')),
      pc.bold(pc.magenta('    ▀████████▀   ')),
      pc.bold(pc.magenta('  ▄██▒▒██▒▒██▄   ')),
      pc.bold(pc.magenta(' ██▀╲╱╲╱╲╱╲╱▀██   ')),
      pc.bold(pc.magenta(' ▀  ╲  ╲╱  ╱  ▀   ')),
    ];

    const parts: string[] = [];
    if (ruleFiles.length > 0) parts.push(pc.dim(`📁 ${RULES_DIR}/ created`));
    if (copiedSkills.length > 0) parts.push(pc.dim(`🛠️  ${SKILLS_DIR}/ created`));
    parts.push(pc.dim('⚙️  Agent config files generated'));
    parts.push(pc.dim('💾 Configuration saved'));

    const info = [
      ' ' + pc.bold(pc.green('✨ Rules synchronized!')),
      '',
      ...parts.map((p) => ' ' + p),
      '',
      ' ' + pc.dim('📂 ' + this.projectName),
      '',
    ];

    this.terminal.outro(art.map((line, i) => line + (info[i] ?? '')).join('\n'));

    // Files box
    const files: string[] = [];
    if (ruleFiles.length > 0) {
      files.push(pc.bold(pc.green('Rules:')));
      files.push(...ruleFiles.map((f) => '  ' + f.filename));
    }
    if (copiedSkills.length > 0) {
      if (files.length > 0) files.push('');
      files.push(pc.bold(pc.green('Skills:')));
      files.push(...copiedSkills.map((s) => '  ' + s.name));
    }
    if (writtenFiles.length > 0) {
      files.push('');
      files.push(pc.bold(pc.green('Agent configs:')));
      files.push(...writtenFiles.map((f) => '  ' + f));
    }

    const lines: string[] = [
      this.hr(boldGreen),
      this.padLine('  Created files:', boldGreen),
      '',
      ...files.map((f) => this.padLine('      ' + f, pc.cyan)),
    ];

    this.terminal.outro(lines.join('\n'));
  }

  showGitignoreWarning(inGitignore: boolean): void {
    if (!inGitignore) {
      this.terminal.logPlain('');
      this.terminal.logPlain(
        this.padLine('ℹ️  "ai-context-config.json" was created to store your preferences.', pc.dim),
      );
      this.terminal.logPlain(
        this.padLine("   If you don't want to commit it, add it to your .gitignore file.", pc.dim),
      );
    }
  }

  showStarRequest(): void {
    this.terminal.logPlain('');
    this.terminal.logPlain(this.hr(boldMagenta));
    this.terminal.logPlain(this.padLine('🌟 LOVE THIS TOOL?', boldMagenta));
    this.terminal.logPlain('');
    this.terminal.logPlain(
      this.padLine('If this tool helps you build better projects,', pc.magenta),
    );
    this.terminal.logPlain(this.padLine('please consider giving us a star on GitHub!', pc.magenta));
    this.terminal.logPlain('');
    this.terminal.logPlain(
      this.padLine('👉 https://github.com/weberstone/agent-context-sync-cli', boldCyan),
    );
    this.terminal.logPlain(this.hr(boldMagenta));
    this.terminal.logPlain('');
  }
}
