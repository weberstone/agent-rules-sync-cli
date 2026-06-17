import type { DiscoveryService } from '../discovery/discovery.service.js';
import type { Answers } from '../prompts/prompts.types.js';
import type { CompiledFile } from './compiler.types.js';
import { F } from './compiler.types.js';

const PACKAGE_RULES_HEADER = '# Code Style & Tools';

export class CompilerService {
  constructor(private readonly discovery: DiscoveryService) {}

  /**
   * Compile all rule files from the user's answers.
   * Priority order: userprompt → workflow → spec → architecture → frameworks → package-rules
   */
  async compile(answers: Answers, projectName: string): Promise<CompiledFile[]> {
    const results: (CompiledFile | null)[] = [
      await this.compileResource(
        F.USERPROMPT,
        answers.hasUserprompt,
        answers.userpromptSource,
        answers.userpromptFile,
        projectName,
        (arch, file) => this.discovery.getUserpromptContent(arch, file),
        answers.architecture,
      ),
      await this.compileResource(
        F.WORKFLOW,
        answers.hasWorkflow,
        answers.workflowSource,
        answers.workflowFile,
        projectName,
        (arch, file) => this.discovery.getWorkflowContent(arch, file),
        answers.architecture,
      ),
      await this.compileSpec(projectName),
      await this.compileResource(
        F.ARCHITECTURE,
        answers.hasArchitecture,
        answers.architectureSource,
        answers.architectureFile,
        projectName,
        (arch, file) => this.discovery.getArchitectureContent(arch, file),
        answers.architecture,
      ),
      ...(await this.compileFrameworks(answers, projectName)),
      await this.compilePackageRules(answers, projectName),
    ];

    return results.filter((f): f is CompiledFile => f !== null);
  }

  /** Generic compiler for standard resource types (project override vs general folder). */
  private async compileResource(
    filename: string,
    isEnabled: boolean,
    source: 'project' | 'general' | null,
    specificFile: string | null,
    projectName: string,
    fetchGeneral: (arch: Answers['architecture'], file: string) => Promise<string | null>,
    architecture: Answers['architecture'],
  ): Promise<CompiledFile | null> {
    if (!isEnabled) return null;

    const content =
      source === 'project'
        ? await this.discovery.getProjectOverride(projectName, filename)
        : specificFile
          ? await fetchGeneral(architecture, specificFile)
          : null;

    if (content === null) return null;
    return { filename, content };
  }

  /** Spec: only from per-project override. No general spec exists. */
  private async compileSpec(projectName: string): Promise<CompiledFile | null> {
    const content = await this.discovery.getProjectOverride(projectName, F.SPEC);
    if (content === null) return null;
    return { filename: F.SPEC, content };
  }

  /** Frameworks: project override → general frameworks folder. */
  private async compileFrameworks(answers: Answers, projectName: string): Promise<CompiledFile[]> {
    if (answers.hasProjectFramework) {
      const content = await this.discovery.getProjectOverride(projectName, F.FRAMEWORK);
      if (content === null) return [];
      return [{ filename: F.FRAMEWORK, content }];
    }

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

  /** Package rules: project override → general concatenation. */
  private async compilePackageRules(
    answers: Answers,
    projectName: string,
  ): Promise<CompiledFile | null> {
    if (answers.hasProjectPackages) {
      const content = await this.discovery.getProjectOverride(projectName, F.PACKAGE_RULES);
      if (content === null) return null;
      return { filename: F.PACKAGE_RULES, content };
    }

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

    const content = [PACKAGE_RULES_HEADER, ...parts].join('\n\n') + '\n';
    return { filename: F.PACKAGE_RULES, content };
  }
}
