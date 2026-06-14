import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

function findProjectRoot(startDir: string): string {
  let dir = startDir;
  const root = path.parse(dir).root;
  while (dir !== root) {
    const candidate = path.join(dir, 'rules');
    if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  throw new Error(
    'Cannot find rules/ directory. The package may be corrupted — reinstall agent-rules-sync-cli.',
  );
}

const sourceDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = findProjectRoot(sourceDir);
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