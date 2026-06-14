/**
 * Config type definitions for `ai-rules-config.json`.
 *
 * Separated from the service to prevent circular imports: other modules
 * import only the type, not the entire service with its dependencies.
 */

/** Supported architecture types — corresponds to `context/rules/<arch>/` directories. */
export type Architecture = 'frontend' | 'backend' | 'fullstack';

/**
 * Shape of the persisted configuration file.
 * Stored as `ai-rules-config.json` in the target project root.
 *
 * `frameworks` is always an array: single-element for frontend/backend,
 * multi-element for fullstack (which allows selecting multiple frameworks).
 * `hasUserprompt` tracks whether a userprompt file was found during the
 * questionnaire — used on re-runs to re-derive the source.
 */
export interface Config {
  version: number;
  projectName: string;
  architecture: Architecture;
  frameworks: string[];
  packages: string[];
  agents: string[];
  hasUserprompt: boolean;
  lastSync: string;
}
