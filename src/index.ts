import { getTargetDir, getProjectName, getRulesDir } from './utils/paths.js';
import { ConfigService } from './config/config.service.js';
import { DiscoveryService } from './discovery/discovery.service.js';
import { PromptService } from './prompts/prompts.service.js';
import { CompilerService } from './compiler/compiler.service.js';
import { OutputService } from './output/output.service.js';
import { OrchestratorService } from './orchestrator/orchestrator.service.js';

const targetDir = getTargetDir();
const projectName = getProjectName();
const rulesDir = getRulesDir();

const configService = new ConfigService(targetDir);
const discovery = new DiscoveryService(rulesDir);
const promptService = new PromptService(discovery);
const compiler = new CompilerService(discovery);
const output = new OutputService(targetDir);

const orchestrator = new OrchestratorService(
  configService,
  discovery,
  promptService,
  compiler,
  output,
  projectName,
);

orchestrator.run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
