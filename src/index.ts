/**
 * Entry point for the agent-context-sync-cli tool.
 *
 * Run via: `node dist/index.js` or `npx agent-context-sync-cli`
 */

import {
  initPaths,
  getTargetDir,
  getProjectName,
  getRulesDir,
  getSkillsDir,
  getProjectsDir,
  getContextDir,
} from './utils/paths.js';
import path from 'node:path';
import { ConfigService } from './rules/config/config.service.js';
import { DiscoveryService } from './rules/discovery/discovery.service.js';
import { PromptService } from './rules/prompts/prompts.service.js';
import { CompilerService } from './rules/compiler/compiler.service.js';
import { OutputService } from './output/output.service.js';
import { SkillsDiscoveryService } from './skills/discovery/skills-discovery.service.js';
import { SkillsPromptService } from './skills/prompts/skills-prompts.service.js';
import { SkillsCompilerService } from './skills/compiler/skills-compiler.service.js';
import { OrchestratorService } from './orchestrator/orchestrator.service.js';
import { ClackTerminal } from './orchestrator/clack-terminal.js';
import { logError } from './utils/log.js';

async function main() {
  await initPaths();

  const targetDir = getTargetDir();
  const projectName = getProjectName();
  const rulesDir = getRulesDir();
  const skillsDir = getSkillsDir();
  const projectsDir = getProjectsDir();
  const ctxName = path.basename(getContextDir());

  const configService = new ConfigService(targetDir);
  const discovery = new DiscoveryService(rulesDir, projectsDir);
  const promptService = new PromptService(discovery, ctxName);
  const compiler = new CompilerService(discovery);
  const output = new OutputService(targetDir);
  const skillsDiscovery = new SkillsDiscoveryService(skillsDir, projectsDir);
  const skillsPrompt = new SkillsPromptService(skillsDiscovery);
  const skillsCompiler = new SkillsCompilerService(targetDir);
  const terminal = new ClackTerminal();

  const orchestrator = new OrchestratorService(
    configService,
    discovery,
    promptService,
    compiler,
    output,
    skillsDiscovery,
    skillsPrompt,
    skillsCompiler,
    terminal,
    projectName,
    rulesDir,
    targetDir,
  );

  await orchestrator.run();
}

main().catch((err) => {
  logError(`Unexpected error: ${(err as Error).message}`);
  process.exit(1);
});
