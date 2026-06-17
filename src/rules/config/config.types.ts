/**
 * Config type definitions for `ai-context-config.json`.
 *
 * Separated from the service to prevent circular imports: other modules
 * import only the type, not the entire service with its dependencies.
 */

/** Every supported architecture. Single source of truth — type, validation set, and labels all derive from this. */
export const ALL_ARCHITECTURES = ['frontend', 'backend', 'fullstack'] as const;

/** Supported architecture types — corresponds to `context/rules/<arch>/` directories. */
export type Architecture = (typeof ALL_ARCHITECTURES)[number];

/** Human-readable labels for each architecture. */
export const ARCH_LABELS: Record<Architecture, string> = {
  frontend: 'Frontend',
  backend: 'Backend',
  fullstack: 'Fullstack',
};

/**
 * Shape of the persisted configuration file.
 * Stored as `ai-context-config.json` in the target project root.
 *
 * `frameworks` is always an array: single-element for frontend/backend,
 * multi-element for fullstack (which allows selecting multiple frameworks).
 * `hasUserprompt` tracks whether a userprompt file was found during the
 * questionnaire — used on re-runs to re-derive the source.
 *
 * `syncSkills` and `skills` are Phase 2 fields. Older configs without them
 * default to `syncSkills: false` and `skills: []` (backward compatible).
 */
export interface Config {
  version: number;
  projectName: string;
  architecture: Architecture;
  frameworks: string[];
  packages: string[];
  agents: string[];
  hasUserprompt: boolean;
  userpromptFile: string | null;
  userpromptSource: 'project' | 'general' | null;
  hasArchitecture: boolean;
  architectureFile: string | null;
  architectureSource: 'project' | 'general' | null;
  hasWorkflow: boolean;
  workflowFile: string | null;
  workflowSource: 'project' | 'general' | null;
  hasProjectFramework: boolean;
  hasProjectPackages: boolean;
  syncSkills: boolean;
  skills: string[];
  lastSync: string;
}
