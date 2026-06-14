/**
 * Typed wrappers around `@clack/prompts`.
 *
 * The library uses complex constrained generics on `select` and `multiselect`
 * that don't infer cleanly from our simple `{ value, label }[]` options.
 * This adapter encapsulates those type assertions so the rest of the codebase
 * never touches `@clack/prompts` directly.
 *
 * All return-type assertions go through `unknown` (never `any`), which is
 * type-safe: `unknown` forces the caller to narrow before using the value.
 *
 * Each function accepts either a simple `string` message or an options object,
 * matching the dual calling style used across PromptService and Orchestrator.
 */

import * as p from '@clack/prompts';

export const { intro, outro, cancel, note, isCancel, spinner } = p;

/** Show a yes/no confirmation. Returns the user's choice, or a cancel symbol. */
export function confirm(message: string | { message: string }): Promise<boolean | symbol> {
  return typeof message === 'string' ? p.confirm({ message }) : p.confirm(message);
}

/** Show a single-select (radio) prompt. Returns the selected value, or a cancel symbol. */
export function select(
  message: string | { message: string; options: { value: string; label: string }[] },
  options?: { value: string; label: string }[],
): Promise<string | symbol> {
  if (typeof message === 'object') {
    return p.select(message) as unknown as Promise<string | symbol>;
  }
  return p.select({ message, options } as Parameters<typeof p.select>[0]) as unknown as Promise<
    string | symbol
  >;
}

/** Show a multi-select (checkbox) prompt. Returns an array of selected values, or a cancel symbol. */
export function multiselect(
  message:
    | string
    | {
        message: string;
        options: { value: string; label: string }[];
        required?: boolean;
      },
  options?: { value: string; label: string }[],
  required?: boolean,
): Promise<string[] | symbol> {
  if (typeof message === 'object') {
    return p.multiselect(message) as unknown as Promise<string[] | symbol>;
  }
  return p.multiselect({
    message,
    options,
    required,
  } as Parameters<typeof p.multiselect>[0]) as unknown as Promise<string[] | symbol>;
}
