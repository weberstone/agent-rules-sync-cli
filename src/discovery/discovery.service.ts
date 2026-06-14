import path from 'node:path';
import fs from 'node:fs/promises';
import type { Architecture } from '../config/config.types.js';
import type { TemplateCategory } from './discovery.types.js';

const ALL_ARCHITECTURES: readonly Architecture[] = [
  'frontend',
  'backend',
  'fullstack',
];

export class DiscoveryService {
  constructor(private readonly rulesDir: string) {}

  async getAvailableArchitectures(): Promise<Architecture[]> {
    const available: Architecture[] = [];
    for (const arch of ALL_ARCHITECTURES) {
      try {
        const stat = await fs.stat(path.join(this.rulesDir, arch));
        if (stat.isDirectory()) {
          available.push(arch);
        }
      } catch {
        // directory does not exist — skip this architecture
      }
    }
    return available;
  }

  async listFrameworks(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'frameworks'));
  }

  async listPackages(arch: Architecture): Promise<string[]> {
    return this.listDir(path.join(this.rulesDir, arch, 'packages'));
  }

  async hasProjectOverride(
    projectName: string,
    fileName: string,
  ): Promise<boolean> {
    const filePath = path.join(
      this.rulesDir,
      'projects',
      projectName,
      fileName,
    );
    return this.isFileNonEmpty(filePath);
  }

  async getProjectOverride(
    projectName: string,
    fileName: string,
  ): Promise<string | null> {
    const filePath = path.join(
      this.rulesDir,
      'projects',
      projectName,
      fileName,
    );
    return this.readIfNonEmpty(filePath);
  }

  async getTemplateContent(
    arch: Architecture,
    category: TemplateCategory,
    name: string,
  ): Promise<string | null> {
    const filePath = path.join(
      this.rulesDir,
      arch,
      category,
      `${name}.md`,
    );
    return this.readIfNonEmpty(filePath);
  }

  async isFileNonEmpty(filePath: string): Promise<boolean> {
    const content = await this.readIfNonEmpty(filePath);
    return content !== null;
  }

  // ---- private helpers ----

  private async listDir(dirPath: string): Promise<string[]> {
    let entries: string[];
    try {
      entries = await fs.readdir(dirPath);
    } catch {
      return [];
    }

    return entries
      .filter((name) => name.endsWith('.md'))
      .map((name) => name.replace(/\.md$/, ''));
  }

  private async readIfNonEmpty(
    filePath: string,
  ): Promise<string | null> {
    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      return null;
    }

    if (content.trim().length === 0) {
      return null;
    }

    return content;
  }
}