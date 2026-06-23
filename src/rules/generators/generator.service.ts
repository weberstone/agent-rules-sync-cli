/**
 * Agent config file generators.
 *
 * Each generator is a pure function that takes a `GeneratorContext` and returns
 * one or more `AgentFile` objects. The `GeneratorRegistry` class maps agent keys
 * to generators — adding a new agent requires only a new function + one `set()` call.
 *
 * All generators share `buildRows()`: a single function that builds the priority
 * row list. This guarantees all agents use the same priority order and descriptions.
 * Individual generators format these rows according to each agent's spec
 * (Markdown table, YAML frontmatter, @import directives, etc.).
 *
 * Agent specifications are documented in `docs/agents/<agent>.md`.
 */

import { wrapSkills, RULES_DIR } from '../../output/content-wrapper.js';
import type { AgentFile, AgentGenerator, GeneratorContext } from './generator.types.js';
import { AGENT_META } from './generator.types.js';
import { F } from '../compiler/compiler.types.js';

// ---- Shared descriptions ----

const DESC_USERPROMPT = 'Agent role, persona, and behavioral guidelines';
const DESC_WORKFLOW = 'Task execution workflow and interaction protocols';
const DESC_SPEC = 'Project context, conventions, and domain knowledge';
const DESC_ARCHITECTURE = 'Architectural constraints and design principles';
const DESC_FRAMEWORK = 'Framework and library conventions and best practices';
const DESC_PACKAGE_RULES = 'Tool and package configuration rules';

// ---- Priority Row Builder ----

interface PriorityRow {
  priority: string;
  file: string;
  description: string;
}

function buildRows(ctx: GeneratorContext): PriorityRow[] {
  const rows: PriorityRow[] = [];

  if (ctx.hasUserprompt)
    rows.push({ priority: '1', file: F.USERPROMPT, description: DESC_USERPROMPT });
  if (ctx.hasWorkflow) rows.push({ priority: '2', file: F.WORKFLOW, description: DESC_WORKFLOW });
  if (ctx.hasSpec) rows.push({ priority: '3', file: F.SPEC, description: DESC_SPEC });
  if (ctx.hasArchitecture)
    rows.push({ priority: '4', file: F.ARCHITECTURE, description: DESC_ARCHITECTURE });

  for (const fw of ctx.frameworkFiles) {
    rows.push({ priority: '5', file: fw, description: DESC_FRAMEWORK });
  }

  if (ctx.hasPackageRules)
    rows.push({ priority: '6', file: F.PACKAGE_RULES, description: DESC_PACKAGE_RULES });

  return rows;
}

/**
 * Build a skills reference table from the generator context.
 * Returns `null` if no skills are present — the section is skipped entirely.
 */
function buildSkillsTable(ctx: GeneratorContext): string | null {
  if (ctx.skills.length === 0) return null;

  const header = '| Skill | Path | Description |\n' + '| :--- | :--- | :--- |';

  const body = ctx.skills
    .map((s) => `| ${s.name} | \`@${s.path}\` | ${s.description} |`)
    .join('\n');

  return wrapSkills(`## 🛠️ Skills\n\n` + SKILLS_INSTRUCTIONS + `${header}\n${body}`);
}

// ---- Shared string constants ----

const D_READ =
  '[ULTRA CRITICAL] At initialization, you MUST read EVERY .md file referenced below without exception; execution of ANY task is STRICTLY FORBIDDEN until you have fully adopted the assigned role and committed to unconditionally following these overriding rules in every action.';
const D_FOLLOW =
  'When executing tasks, follow the rules defined in these files. If a local rule conflicts with general knowledge, the local rule takes precedence.';
const RULES_LOCATION = `All rules are located in \`${RULES_DIR}/\`. Load them in priority order:\n\n`;
const TABLE_HEADER = '| Priority | File | Description |\n| :--- | :--- | :--- |';
const TABLE_HEADER_CLAUDE = '| Priority | File Path | Description |\n| :--- | :--- | :--- |';
const SKILLS_INSTRUCTIONS =
  'Load skills on demand — open a skill only when its functionality is needed for the current task. Do not read all skills at startup.\n\n';
const FOOTER =
  '\n---\n*This file is managed by `agent-context-sync-cli`. Do not modify manually.*\n';

/** Shared frontmatter description for Cursor, Windsurf, and Continue. */
const FRONTMATTER_DESC =
  'Project AI agent rules and conventions — always loaded into every session';

// ---- Formatting helpers ----

type RuleFormat = 'table' | 'table-claude' | 'numbered' | 'imports';

const TABLE_ROW: Record<RuleFormat, (r: PriorityRow) => string> = {
  table: (r) => `| ${r.priority} | \`${RULES_DIR}/${r.file}\` | ${r.description} |`,
  'table-claude': (r) => `| ${r.priority} | \`@${RULES_DIR}/${r.file}\` | ${r.description} |`,
  numbered: (r) => `${r.priority}. \`${RULES_DIR}/${r.file}\` — ${r.description}`,
  imports: (r) => `@${RULES_DIR}/${r.file} — ${r.description}`,
};

function formatRules(rows: PriorityRow[], fmt: RuleFormat): string {
  if (fmt === 'table' || fmt === 'table-claude') {
    const header = fmt === 'table-claude' ? TABLE_HEADER_CLAUDE : TABLE_HEADER;
    return header + '\n' + rows.map(TABLE_ROW[fmt]).join('\n');
  }
  return rows.map(TABLE_ROW[fmt]).join('\n');
}

// ---- Content assembler ----

interface ContentOpts {
  frontmatter?: string;
  heading: string;
  ruleFormat: RuleFormat;
}

function assemble(ctx: GeneratorContext, opts: ContentOpts): string {
  const rows = buildRows(ctx);
  const skills = buildSkillsTable(ctx);

  let content = opts.frontmatter ?? '';
  content += opts.heading;
  content += `## Core Directives\n${D_READ}\n${D_FOLLOW}\n`;
  content += `\n## Rules\n\n${RULES_LOCATION}`;
  content += formatRules(rows, opts.ruleFormat);
  if (skills) content += `\n${skills}\n`;
  content += FOOTER;
  return content;
}

// ---- Generator functions ----

// Each generator is a thin wrapper around assemble(). The parameters encode
// what's different between agents; all shared text lives in the constants above.

const H = '# Project AI Rules\n\n';

function generateClaudeMd(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: 'CLAUDE.md',
      content: assemble(ctx, { heading: '# CLAUDE.md\n\n', ruleFormat: 'table-claude' }),
    },
  ];
}

function generateCursorRules(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: '.cursor/rules/00-agent-rules.mdc',
      content: assemble(ctx, {
        frontmatter: `---\ndescription: "${FRONTMATTER_DESC}"\nalwaysApply: true\n---\n\n`,
        heading: H,
        ruleFormat: 'numbered',
      }),
    },
  ];
}

function generateGeminiMd(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: 'GEMINI.md',
      content: assemble(ctx, { heading: '# GEMINI.md\n\n', ruleFormat: 'imports' }),
    },
  ];
}

function generateAgentsMd(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: 'AGENTS.md',
      content: assemble(ctx, { heading: '# AGENTS.md\n\n', ruleFormat: 'table' }),
    },
  ];
}

function generateCopilotInstructions(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: '.github/copilot-instructions.md',
      content: assemble(ctx, { heading: H, ruleFormat: 'table' }),
    },
  ];
}

function generateWindsurfRules(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: '.devin/rules/00-agent-rules.md',
      content: assemble(ctx, {
        frontmatter: `---\ntrigger: always_on\ndescription: "${FRONTMATTER_DESC}"\n---\n\n`,
        heading: H,
        ruleFormat: 'numbered',
      }),
    },
  ];
}

function generateContinueRules(ctx: GeneratorContext): AgentFile[] {
  return [
    {
      filename: '.continue/rules/00-agent-rules.md',
      content: assemble(ctx, {
        frontmatter: '---\n# Always apply these rules to every session\n---\n\n',
        heading: H,
        ruleFormat: 'numbered',
      }),
    },
  ];
}

function generateOpenCodeJson(ctx: GeneratorContext): AgentFile[] {
  const files: string[] = [];

  if (ctx.hasUserprompt) files.push(`${RULES_DIR}/${F.USERPROMPT}`);
  if (ctx.hasWorkflow) files.push(`${RULES_DIR}/${F.WORKFLOW}`);
  if (ctx.hasSpec) files.push(`${RULES_DIR}/${F.SPEC}`);
  if (ctx.hasArchitecture) files.push(`${RULES_DIR}/${F.ARCHITECTURE}`);
  for (const fw of ctx.frameworkFiles) files.push(`${RULES_DIR}/${fw}`);
  if (ctx.hasPackageRules) files.push(`${RULES_DIR}/${F.PACKAGE_RULES}`);

  const config: Record<string, unknown> = {
    $schema: 'https://opencode.ai/config.json',
    instructions: files,
    formatter: true,
    permission: {
      '*': 'ask',
      read: 'allow',
    },
  };

  return [
    {
      filename: 'AGENTS.md',
      content: assemble(ctx, { heading: '# AGENTS.md\n\n', ruleFormat: 'table' }),
    },
    {
      filename: 'opencode.json',
      content: JSON.stringify(config, null, 2) + '\n',
    },
  ];
}

// ---- Registry ----

/** Maps agent keys to generator functions. */
const GENERATOR_MAP: Record<string, AgentGenerator> = {
  'claude-code': generateClaudeMd,
  cursor: generateCursorRules,
  'gemini-cli': generateGeminiMd,
  gemini: generateGeminiMd,
  codex: generateAgentsMd,
  'github-copilot': generateCopilotInstructions,
  continue: generateContinueRules,
  windsurf: generateWindsurfRules,
  opencode: generateOpenCodeJson,
};

/**
 * Maps agent keys to generator functions (Strategy pattern).
 * Built from AGENT_META + GENERATOR_MAP — adding a new agent only requires
 * adding one entry to AGENT_META and one entry to GENERATOR_MAP.
 *
 * Singleton instance `generatorRegistry` is exported for convenience;
 * a new `GeneratorRegistry()` can also be instantiated for testing.
 */
export class GeneratorRegistry {
  private readonly generators = new Map<string, AgentGenerator>();

  constructor() {
    for (const { key } of AGENT_META) {
      const gen = GENERATOR_MAP[key];
      if (!gen) {
        throw new Error(
          `Agent "${key}" is defined in AGENT_META but has no entry in GENERATOR_MAP. ` +
            'Add an entry to GENERATOR_MAP in generator.service.ts.',
        );
      }
      this.generators.set(key, gen);
    }
  }

  /** Look up a generator by agent key. Returns `undefined` for unknown keys. */
  get(key: string): AgentGenerator | undefined {
    return this.generators.get(key);
  }
}

export const generatorRegistry = new GeneratorRegistry();

export {
  generateClaudeMd,
  generateCursorRules,
  generateGeminiMd,
  generateAgentsMd,
  generateCopilotInstructions,
  generateContinueRules,
  generateWindsurfRules,
  generateOpenCodeJson,
};
