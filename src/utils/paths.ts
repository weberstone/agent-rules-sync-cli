import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

async function findProjectRoot(startDir: string): Promise<string> {
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, 'rules');
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) return dir;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw new Error(`Failed to read directory "${candidate}": ${(err as Error).message}`);
      }
      // ENOENT: no rules/ at this level, walk up to parent
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    'Cannot find rules/ directory. The package may be corrupted — reinstall agent-rules-sync-cli.',
  );
}

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = await findProjectRoot(sourceDir);
const rulesDir = path.join(projectRoot, 'rules');

export function getSourceDir(): string {
  return sourceDir;
}

export function getTargetDir(): string {
  return process.cwd();
}

export function getProjectName(): string {
  return path.basename(process.cwd());
}

export function getRulesDir(): string {
  return rulesDir;
}
