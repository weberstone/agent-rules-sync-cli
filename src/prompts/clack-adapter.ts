import * as p from '@clack/prompts';

/**
 * Typed wrappers around @clack/prompts.
 *
 * The library uses complex constrained generics on select/multiselect
 * that don't infer cleanly from our simple { value, label } options.
 * Return-type assertions through `unknown` (not `any`) keep the adapter
 * boundary explicit and type-safe.
 */

export const { intro, outro, cancel, note, isCancel, spinner } = p;

export function confirm(
  message: string | { message: string },
): Promise<boolean | symbol> {
  return typeof message === 'string'
    ? p.confirm({ message })
    : p.confirm(message);
}

export function select(
  message: string | { message: string; options: { value: string; label: string }[] },
  options?: { value: string; label: string }[],
): Promise<string | symbol> {
  if (typeof message === 'object') {
    return p.select(message) as unknown as Promise<string | symbol>;
  }
  return p.select({ message, options }) as unknown as Promise<string | symbol>;
}

export function multiselect(
  message: string | { message: string; options: { value: string; label: string }[]; required?: boolean },
  options?: { value: string; label: string }[],
  required = false,
): Promise<string[] | symbol> {
  if (typeof message === 'object') {
    return p.multiselect(message) as unknown as Promise<string[] | symbol>;
  }
  return p.multiselect({
    message,
    options,
    required,
  }) as unknown as Promise<string[] | symbol>;
}