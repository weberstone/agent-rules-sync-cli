import path from 'node:path';
import { writeTextFile, ensureDir, readTextFile, isEnoent } from '../utils/fs.js';
import { logWarning } from '../utils/log.js';
import type { CompiledFile } from '../compiler/compiler.types.js';

const RULES_DIR = '.agents/rules';

export class OutputService {
  private readonly rulesDir: string;

  constructor(private readonly targetDir: string) {
    this.rulesDir = path.join(targetDir, RULES_DIR);
  }

  async writeRulesDir(files: CompiledFile[]): Promise<void> {
    await ensureDir(this.rulesDir);
    for (const file of files) {
      const filePath = path.join(this.rulesDir, file.filename);
      await writeTextFile(filePath, file.content);
    }
  }

  async fileExists(relativePath: string): Promise<boolean> {
    const filePath = path.join(this.targetDir, relativePath);
    try {
      const { stat } = await import('node:fs/promises');
      await stat(filePath);
      return true;
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(
          `Cannot check if file exists "${relativePath}": ${(err as Error).message}. Assuming it does to avoid accidental overwrite.`,
        );
        return true;
      }
      return false;
    }
  }

  async writeAgentFile(
    relativePath: string,
    content: string,
    mode: 'create' | 'overwrite' | 'append',
  ): Promise<void> {
    const filePath = path.join(this.targetDir, relativePath);
    await ensureDir(path.dirname(filePath));

    if (mode === 'append') {
      const existing = await readTextFile(filePath);
      content = `${content}\n\n---\n\n${existing}`;
    }

    await writeTextFile(filePath, content);
  }

  async isInGitignore(filename: string): Promise<boolean> {
    const gitignorePath = path.join(this.targetDir, '.gitignore');
    try {
      const content = await readTextFile(gitignorePath);
      const lines = content.split('\n');
      return lines.some((line) => line.trim() === filename);
    } catch (err) {
      if (!isEnoent(err)) {
        logWarning(
          `Cannot read .gitignore: ${(err as Error).message}. Suggest adding ai-rules-config.json manually.`,
        );
      }
      return false;
    }
  }
}
