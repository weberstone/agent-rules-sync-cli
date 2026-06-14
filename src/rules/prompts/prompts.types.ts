/**
 * Types for the interactive questionnaire.
 */

import type { Architecture } from '../config/config.types.js';

/** An option presented to the user in a select/multiselect prompt. */
export interface AgentOption {
  value: string;
  label: string;
}

/**
 * The list of AI agents the user can choose to generate config files for.
 * Each `value` key must match a key in `GeneratorRegistry`.
 */
export const AVAILABLE_AGENTS: readonly AgentOption[] = [
  { value: 'claude-code', label: 'Claude Code' },
  { value: 'cursor', label: 'Cursor' },
  { value: 'gemini', label: 'Gemini' },
  { value: 'gemini-cli', label: 'Gemini CLI' },
  { value: 'codex', label: 'OpenAI Codex' },
  { value: 'continue', label: 'Continue' },
];

/**
 * The complete set of user choices from the questionnaire.
 * Passed from PromptService → CompilerService → Orchestrator.
 *
 * `userpromptSource` and `workflowSource` indicate where the content
 * came from: a per-project override (`project`), a general template
 * (`general`), or not found (`null` — user chose to continue without).
 */
export interface Answers {
  architecture: Architecture;
  hasUserprompt: boolean;
  userpromptSource: 'project' | 'general' | null;
  architectureSource?: 'project' | 'general';
  frameworks: string[];
  packages: string[];
  workflowSource: 'project' | 'general' | null;
  agents: string[];
}
