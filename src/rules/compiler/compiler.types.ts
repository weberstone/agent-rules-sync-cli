/**
 * A virtual file produced by the compiler before any disk writes happen.
 * The OutputService writes these to `.agents/rules/<filename>`.
 */
export interface CompiledFile {
  filename: string;
  content: string;
}

/** Rule file names — single source of truth. All modules reference these constants, not raw strings. */
export const F = {
  USERPROMPT: 'userprompt.md',
  WORKFLOW: 'workflow.md',
  SPEC: 'spec.md',
  ARCHITECTURE: 'architecture.md',
  FRAMEWORK: 'framework.md',
  PACKAGE_RULES: 'package-rules.md',
} as const;

export type RuleFileName = (typeof F)[keyof typeof F];

/** Set of all known rule file names — used for filtering/matching. */
export const RULE_FILE_SET: ReadonlySet<string> = new Set(Object.values(F));
