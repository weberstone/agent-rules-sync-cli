import type { AgentFile, AgentGenerator, GeneratorContext } from './generator.types.js';

// ---- Priority Row Builder ----

interface PriorityRow {
  priority: string;
  file: string;
  description: string;
}

function buildRows(ctx: GeneratorContext): PriorityRow[] {
  const rows: PriorityRow[] = [];

  if (ctx.hasUserprompt) {
    rows.push({
      priority: '1 (CRITICAL)',
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
      priority: '6 (OPTIONAL)',
      file: 'package-rules.md',
      description: 'Tool-specific rules',
    });
  }

  return rows;
}

function footer(): string {
  return '\n---\n*This file is managed by `agent-rules-sync-cli`. Do not modify manually.*\n';
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
    footer();

  return [{ filename: '.cursor/rules/00-agent-rules.mdc', content }];
}

// ---- Gemini CLI: GEMINI.md ----
// Format: Plain Markdown with @import directives.
// Source: docs/agents/gemini-cli.md

function generateGeminiMd(ctx: GeneratorContext): AgentFile[] {
  const rows = buildRows(ctx);

  const imports = rows
    .map(
      (r) =>
        `- **Priority ${r.priority.split(' ')[0]}**: @.agents/rules/${r.file} — ${r.description}`,
    )
    .join('\n');

  const content =
    `# GEMINI.md\n\n` +
    `This project uses a centralized AI rule management system.\n` +
    `All instructions live in \`.agents/rules/\`. Load these files in priority order:\n\n` +
    `## Rule Manifest & Priority\n\n` +
    `${imports}\n\n` +
    `## Usage\n` +
    `- Always read the priority list above before any task.\n` +
    `- If a local rule exists, it overrides any general knowledge or defaults.\n` +
    `- Do not suggest changes that deviate from the project structure.\n` +
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
    footer();

  return [{ filename: 'AGENTS.md', content }];
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
    footer();

  return [{ filename: '.continue/rules/00-agent-rules.md', content }];
}

// ---- Registry ----

export class GeneratorRegistry {
  private readonly generators = new Map<string, AgentGenerator>();

  constructor() {
    this.generators.set('claude-code', generateClaudeMd);
    this.generators.set('cursor', generateCursorRules);
    this.generators.set('gemini-cli', generateGeminiMd);
    this.generators.set('gemini', generateGeminiMd);
    this.generators.set('codex', generateAgentsMd);
    this.generators.set('continue', generateContinueRules);
  }

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
  generateContinueRules,
};
