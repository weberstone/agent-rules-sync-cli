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

import type { AgentFile, AgentGenerator, GeneratorContext } from './generator.types.js';

// ---- Priority Row Builder (shared across all generators) ----

interface PriorityRow {
  priority: string;
  file: string;
  description: string;
}

/**
 * Build an ordered list of priority rows from the generator context.
 * Rows are only included for files that actually exist (as determined
 * by the CompilerService output). Priorities are FIXED — missing files
 * simply skip their row, numbers don't renumber.
 */
function buildRows(ctx: GeneratorContext): PriorityRow[] {
  const rows: PriorityRow[] = [];

  if (ctx.hasUserprompt) {
    rows.push({
      priority: '1',
      file: 'userprompt.md',
      description: 'AI persona and role definition',
    });
  }

  if (ctx.hasWorkflow) {
    rows.push({
      priority: '2',
      file: 'workflow.md',
      description: 'Interaction protocol, TDD rules, commit standards',
    });
  }

  if (ctx.hasSpec) {
    rows.push({
      priority: '3',
      file: 'spec.md',
      description: 'Project-specific stack, folder structure, domain definitions',
    });
  }

  if (ctx.hasArchitecture) {
    rows.push({
      priority: '4',
      file: 'architecture.md',
      description: 'Architectural principles, SOLID, pattern constraints',
    });
  }

  for (const fw of ctx.frameworkFiles) {
    rows.push({
      priority: '5',
      file: fw,
      description: 'Framework-specific technical rules and best practices',
    });
  }

  if (ctx.hasPackageRules) {
    rows.push({
      priority: '6',
      file: 'package-rules.md',
      description: 'Tool-specific rules',
    });
  }

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
    .map((s) => `| ${s.name} | \`@.agents/skills/${s.path.split('/').pop()}\` | ${s.description} |`)
    .join('\n');

  return `## 🛠️ Skills\n\n${header}\n${body}`;
}

/** Shared footer for all generated agent files. */
function footer(): string {
  return '\n---\n*This file is managed by `agent-context-sync-cli`. Do not modify manually.*\n';
}

// ---- Claude Code: CLAUDE.md ----
// Format: Plain Markdown with inline priority table.
// Source: docs/agents/claude-code.md

function generateClaudeMd(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const header = '| Priority | File Path | Description |\n' + '| :--- | :--- | :--- |';

  const body = rows
    .map((r) => `| ${r.priority} | \`@.agents/rules/${r.file}\` | ${r.description} |`)
    .join('\n');

  const table = `${header}\n${body}`;

  const content =
    `# CLAUDE.md\n\n` +
    `You are operating within a project that uses a centralized, modular AI rule management system.\n\n` +
    `## 🧠 Core Directives\n` +
    `1. **SSOT (Single Source of Truth)**: Your instructions live in \`.agents/rules/\`.\n` +
    `2. **Priority Order**: You must load and adhere to these files in the priority defined below.\n` +
    `3. **No Generalization**: If a local rule exists, it overrides any general knowledge, framework best practices, or default AI behavior.\n\n` +
    `## 🔗 Rule Manifest & Priority (Load in order)\n\n` +
    `${table}\n\n` +
    `## 🛠 Usage Instructions\n` +
    `- **Initialization**: Always read the priority list above before any task.\n` +
    `- **Pathing**: All paths in this project are relative to the project root.\n` +
    `- **Constraint Enforcement**: If you propose code that violates these rules, you must stop, self-reflect on the rules provided in \`.agents/rules/\`, and correct your proposal BEFORE outputting.\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: 'CLAUDE.md', content }];
}

// ---- Cursor: .cursor/rules/00-agent-rules.mdc ----
// Format: YAML frontmatter + Markdown. alwaysApply: true.
// Source: docs/agents/cursor.md

function generateCursorRules(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const lines = rows.map(
    (r) => `${r.priority.split(' ')[0]}. \`.agents/rules/${r.file}\` — ${r.description}`,
  );

  const content =
    `---\n` +
    `description: "Project AI agent rules and conventions — always loaded into every session"\n` +
    `alwaysApply: true\n` +
    `---\n\n` +
    `# Project AI Rules\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `All rules are located in \`.agents/rules/\`. Load them in priority order:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Refer to \`.agents/rules/\` for the complete set of rules.\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: '.cursor/rules/00-agent-rules.mdc', content }];
}

// ---- Gemini CLI: GEMINI.md ----
// Format: Plain Markdown with @import directives.
// Source: docs/agents/gemini-cli.md

function generateGeminiMd(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const imports = rows
    .map((r) => `@.agents/rules/${r.file}  (P${r.priority.split(' ')[0]} — ${r.description})`)
    .join('\n');

  const content =
    `# GEMINI.md\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `All instructions live in \`.agents/rules/\`. Load these files in priority order:\n\n` +
    `${imports}\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: 'GEMINI.md', content }];
}

// ---- Codex CLI: AGENTS.md ----
// Format: Plain Markdown with inline priority table (AGENTS.md open standard).
// Source: docs/agents/codex-cli.md

function generateAgentsMd(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const header = '| Priority | File | Description |\n' + '| :--- | :--- | :--- |';

  const body = rows
    .map((r) => `| ${r.priority} | \`.agents/rules/${r.file}\` | ${r.description} |`)
    .join('\n');

  const table = `${header}\n${body}`;

  const content =
    `# AGENTS.md\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `Your instructions live in \`.agents/rules/\`. Load these files in priority order:\n\n` +
    `${table}\n\n` +
    `## Working agreements\n` +
    `- Follow the priority order above for all tasks.\n` +
    `- If a local rule conflicts with general knowledge, the local rule wins.\n\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: 'AGENTS.md', content }];
}

// ---- GitHub Copilot: .github/copilot-instructions.md ----
// Format: Plain Markdown with inline priority table, no YAML frontmatter.
// Source: docs/agents/github-copilot.md

function generateCopilotInstructions(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const header = '| Priority | File | Description |\n' + '| :--- | :--- | :--- |';

  const body = rows
    .map((r) => `| ${r.priority} | \`.agents/rules/${r.file}\` | ${r.description} |`)
    .join('\n');

  const table = `${header}\n${body}`;

  const content =
    `# Project AI Rules\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `All rules are located in \`.agents/rules/\`. Load them in priority order:\n\n` +
    `${table}\n\n` +
    `Refer to \`.agents/rules/\` for the complete set of rules.\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: '.github/copilot-instructions.md', content }];
}

// ---- Windsurf / Devin: .devin/rules/00-agent-rules.md ----
// Format: YAML frontmatter (trigger: always_on) + Markdown numbered list.
// Source: docs/agents/windsurf.md

function generateWindsurfRules(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const lines = rows.map(
    (r) => `${r.priority.split(' ')[0]}. \`.agents/rules/${r.file}\` — ${r.description}`,
  );

  const content =
    `---\n` +
    `trigger: always_on\n` +
    `description: "Project AI agent rules and conventions — always loaded into every session"\n` +
    `---\n\n` +
    `# Project AI Rules\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `All rules are located in \`.agents/rules/\`. Load them in priority order:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Refer to \`.agents/rules/\` for the complete set of rules.\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: '.devin/rules/00-agent-rules.md', content }];
}

// ---- Continue.dev: .continue/rules/00-agent-rules.md ----
// Format: YAML frontmatter (no globs = always apply) + Markdown.
// Source: docs/agents/continue.md

function generateContinueRules(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const lines = rows.map(
    (r) => `${r.priority.split(' ')[0]}. \`.agents/rules/${r.file}\` — ${r.description}`,
  );

  const content =
    `---\n` +
    `# Always apply these rules to every session\n` +
    `---\n\n` +
    `# Project AI Rules\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `All rules are located in \`.agents/rules/\`. Load them in priority order:\n\n` +
    `${lines.join('\n')}\n\n` +
    `Refer to \`.agents/rules/\` for the complete set of rules.\n` +
    (buildSkillsTable(ctx) ? `\n${buildSkillsTable(ctx)}\n` : '') +
    footer();

  return [{ filename: '.continue/rules/00-agent-rules.md', content }];
}

// ---- Registry ----

/**
 * Maps agent keys to generator functions (Strategy pattern).
 * To add a new agent: write a generator function and call `set()` in the constructor.
 *
 * Singleton instance `generatorRegistry` is exported for convenience;
 * a new `GeneratorRegistry()` can also be instantiated for testing.
 */
export class GeneratorRegistry {
  private readonly generators = new Map<string, AgentGenerator>();

  constructor() {
    this.generators.set('claude-code', generateClaudeMd);
    this.generators.set('cursor', generateCursorRules);
    this.generators.set('gemini-cli', generateGeminiMd);
    this.generators.set('gemini', generateGeminiMd);
    this.generators.set('codex', generateAgentsMd);
    this.generators.set('github-copilot', generateCopilotInstructions);
    this.generators.set('continue', generateContinueRules);
    this.generators.set('windsurf', generateWindsurfRules);
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
};
