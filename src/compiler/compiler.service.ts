/**
 * Assembles the final rule files from user choices and discovered templates.
 *
 * The compiler is **pure computation** — it does not write to disk.
 * It takes `Answers` + `DiscoveryService` and returns a `CompiledFile[]`
 * array in priority order. `null` results (missing files) are filtered out.
 *
 * Priority order in the output array:
 *   userprompt → workflow → spec → architecture → frameworks → package-rules
 */

import type { DiscoveryService } from '../discovery/discovery.service.js';
import type { Answers } from '../prompts/prompts.types.js';
import type { CompiledFile } from './compiler.types.js';

const PACKAGE_RULES_HEADER = '# Code Style & Tools';

export class CompilerService {
  constructor(private readonly discovery: DiscoveryService) {}

  /**
   * Compile all rule files from the user's answers.
   *
   * @param answers — user choices from the questionnaire
   * @param projectName — used to resolve per-project overrides
   * @returns files in priority order, with `null` entries filtered out
   */
  async compile(answers: Answers, projectName: string): Promise<CompiledFile[]> {
    const results: (CompiledFile | null)[] = [
      await this.compileUserprompt(answers, projectName),
      await this.compileWorkflow(answers, projectName),
      await this.compileSpec(projectName),
      await this.compileArchitecture(answers, projectName),
      ...(await this.compileFrameworks(answers)),
      await this.compilePackageRules(answers),
    ];

    return results.filter((f): f is CompiledFile => f !== null);
  }

  /** Userprompt: project override → general template → skip. */
  private async compileUserprompt(
    answers: Answers,
    projectName: string,
  ): Promise<CompiledFile | null> {
    if (!answers.hasUserprompt) return null;

    const content =
      answers.userpromptSource === 'project'
        ? await this.discovery.getProjectOverride(projectName, 'userprompt.md')
        : await this.discovery.getArchFile(answers.architecture, 'userprompt.md');

    if (content === null) return null;

    return { filename: 'userprompt.md', content };
  }

  /** Spec: only from per-project override. No general spec exists. */
  private async compileSpec(projectName: string): Promise<CompiledFile | null> {
    const content = await this.discovery.getProjectOverride(projectName, 'spec.md');

    if (content === null) return null;

    return { filename: 'spec.md', content };
  }

  /** Architecture: project override → general template. Uses `??` for short-circuit. */
  private async compileArchitecture(
    answers: Answers,
    projectName: string,
  ): Promise<CompiledFile | null> {
    const content =
      (await this.discovery.getProjectOverride(projectName, 'architecture.md')) ??
      (await this.discovery.getArchFile(answers.architecture, 'architecture.md'));

    if (content === null) return null;

    return { filename: 'architecture.md', content };
  }

  /** Frameworks: one file per selected framework. Filename = original template name. */
  private async compileFrameworks(answers: Answers): Promise<CompiledFile[]> {
    const results: CompiledFile[] = [];
    for (const name of answers.frameworks) {
      const content = await this.discovery.getTemplateContent(
        answers.architecture,
        'frameworks',
        name,
      );
      if (content !== null) {
        results.push({ filename: `${name}.md`, content });
      }
    }
    return results;
  }

  /**
   * Package rules: concatenation of selected package files.
   * Header `# Code Style & Tools`, content separated by `\n\n`.
   * If nothing selected → `null` (file not created).
   */
  private async compilePackageRules(answers: Answers): Promise<CompiledFile | null> {
    if (answers.packages.length === 0) return null;

    const parts: string[] = [];
    for (const name of answers.packages) {
      const content = await this.discovery.getTemplateContent(
        answers.architecture,
        'packages',
        name,
      );
      if (content !== null) {
        parts.push(content);
      }
    }

    if (parts.length === 0) return null;

    const content = [PACKAGE_RULES_HEADER, '', ...parts].join('\n\n') + '\n';
    return { filename: 'package-rules.md', content };
  }

  /** Workflow: project override → general template → skip. */
  private async compileWorkflow(
    answers: Answers,
    projectName: string,
  ): Promise<CompiledFile | null> {
    const content =
      answers.workflowSource === 'project'
        ? await this.discovery.getProjectOverride(projectName, 'workflow.md')
        : answers.workflowSource === 'general'
          ? await this.discovery.getArchFile(answers.architecture, 'workflow.md')
          : null;

    if (content === null) return null;

    return { filename: 'workflow.md', content };
  }
}
