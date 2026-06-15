/**
 * Types for the agent file generators.
 *
 * Generators are pure functions: `GeneratorContext → AgentFile[]`.
 * The `GeneratorRegistry` maps agent keys (from `AVAILABLE_AGENTS`)
 * to the appropriate generator function.
 */

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

/** Supported agent keys — must match `GeneratorRegistry` entries and `AVAILABLE_AGENTS`. */
export type AgentKey =
  | 'claude-code'
  | 'cursor'
  | 'gemini'
  | 'gemini-cli'
  | 'codex'
  | 'continue'
  | 'github-copilot'
  | 'windsurf';
