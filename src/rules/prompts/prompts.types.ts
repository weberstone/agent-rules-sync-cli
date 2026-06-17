/**
 * Types for the interactive questionnaire.
 */

import type { Architecture } from '../config/config.types.js';
import type { AgentMeta } from '../generators/generator.types.js';
import { AGENT_META } from '../generators/generator.types.js';

/** An option presented to the user in a select/multiselect prompt. */
export interface AgentOption {
  value: string;
  label: string;
}

/**
 * The list of AI agents the user can choose to generate config files for.
 * Derived from AGENT_META — the single source of truth for agent keys and labels.
 */
export const AVAILABLE_AGENTS: readonly AgentOption[] = AGENT_META.map(
  ({ key, label }: AgentMeta) => ({ value: key, label }),
);

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
  userpromptFile: string | null;
  hasArchitecture: boolean;
  architectureSource: 'project' | 'general' | null;
  architectureFile: string | null;
  hasProjectFramework: boolean;
  frameworks: string[];
  hasProjectPackages: boolean;
  packages: string[];
  hasWorkflow: boolean;
  workflowSource: 'project' | 'general' | null;
  workflowFile: string | null;
  agents: string[];
}
