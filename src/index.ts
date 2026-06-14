/**
 * Entry point for the agent-rules-sync-cli tool.
 *
 * Run via: `node dist/index.js` or `npx agent-rules-sync-cli`
 */

import path from 'node:path';
import { getTargetDir, getProjectName, getRulesDir } from './utils/paths.js';
import { ConfigService } from './config/config.service.js';
import { DiscoveryService } from './discovery/discovery.service.js';
import { PromptService } from './prompts/prompts.service.js';
import { CompilerService } from './compiler/compiler.service.js';
import { OutputService } from './output/output.service.js';
import { SkillsDiscoveryService } from './skills/skills-discovery.service.js';
import { SkillsPromptService } from './skills/skills-prompts.service.js';
import { SkillsCompilerService } from './skills/skills-compiler.service.js';
import { OrchestratorService } from './orchestrator/orchestrator.service.js';

const targetDir = getTargetDir();
const projectName = getProjectName();
const rulesDir = getRulesDir();
const skillsDir = path.join(rulesDir, '..', 'skills');

const configService = new ConfigService(targetDir);
const discovery = new DiscoveryService(rulesDir);
const promptService = new PromptService(discovery);
const compiler = new CompilerService(discovery);
const output = new OutputService(targetDir);
const skillsDiscovery = new SkillsDiscoveryService(skillsDir);
const skillsPrompt = new SkillsPromptService(skillsDiscovery);
const skillsCompiler = new SkillsCompilerService(targetDir);

const orchestrator = new OrchestratorService(
  configService,
  discovery,
  promptService,
  compiler,
  output,
  skillsDiscovery,
  skillsPrompt,
  skillsCompiler,
  projectName,
  rulesDir,
  targetDir,
);

orchestrator.run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
