/**
 * Types for the agent file generators.
 *
 * Generators are pure functions: `GeneratorContext → AgentFile[]`.
 * The `GeneratorRegistry` maps agent keys to the appropriate generator function.
 *
 * `AGENT_META` is the single source of truth for agent keys and labels.
 * `AgentKey` and `GeneratorRegistry` both derive from it.
 */

/** Metadata for one AI agent — single source of truth. */
export interface AgentMeta {
  readonly key: string;
  readonly label: string;
}

/** Every supported AI agent. Adding an agent here is the ONLY change needed. */
export const AGENT_META: readonly AgentMeta[] = [
  { key: 'claude-code', label: 'Claude Code' },
  { key: 'cursor', label: 'Cursor' },
  { key: 'gemini', label: 'Gemini' },
  { key: 'gemini-cli', label: 'Gemini CLI' },
  { key: 'codex', label: 'OpenAI Codex' },
  { key: 'github-copilot', label: 'GitHub Copilot' },
  { key: 'continue', label: 'Continue' },
  { key: 'windsurf', label: 'Windsurf / Devin' },
] as const;

/** Agent key union derived from AGENT_META — stays in sync automatically. */
export type AgentKey = (typeof AGENT_META)[number]['key'];

/**
 * Describes which files were actually produced by the CompilerService.
 * Built from `CompiledFile[]` by `buildGeneratorContext()` in the orchestrator.
 * This is the single source of truth — the generator only creates rows for
 * files that really exist.
 */
export interface GeneratorContext {
  hasUserprompt: boolean;
  hasWorkflow: boolean;
  hasSpec: boolean;
  hasArchitecture: boolean;
  frameworkFiles: string[];
  hasPackageRules: boolean;
  skills: { name: string; path: string; description: string }[];
}

/** A single agent config file to be written to the project root. */
export interface AgentFile {
  filename: string;
  content: string;
}

/**
 * A generator function: takes context, returns one or more agent files.
 * Returns an array because some agents need multiple files
 * (e.g. claude-code could produce both CLAUDE.md and AGENTS.md).
 */
export type AgentGenerator = (ctx: GeneratorContext) => AgentFile[];
